"""Servicio: Ingredientes — CRUD + compras con costo ponderado."""

from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.ingrediente import Ingrediente
from app.models.movimiento import MovimientoStock
from app.schemas.ingrediente import IngredienteCreate, IngredienteUpdate, CompraIngrediente
from app.services import notificacion_service


# --------------- Conversión de unidades ---------------

FACTORES_A_GRAMOS = {
    "kg": 1000,
    "g": 1,
    "lts": 1000,  # 1 litro ≈ 1000 g (aproximación)
    "ml": 1,
    "und": 1,
}


def calcular_costo_por_gramo(costo_unitario: float, unidad: str) -> float:
    """Convierte el costo unitario a costo por gramo para estandarizar recetas."""
    factor = FACTORES_A_GRAMOS.get(unidad, 1)
    if factor == 0:
        return 0
    return costo_unitario / factor


# --------------- CRUD ---------------

async def listar_ingredientes(db: AsyncSession) -> list[Ingrediente]:
    result = await db.execute(
        select(Ingrediente).order_by(Ingrediente.nombre)
    )
    return result.scalars().all()


async def obtener_ingrediente(db: AsyncSession, ingrediente_id: UUID) -> Ingrediente | None:
    return await db.get(Ingrediente, ingrediente_id)


async def crear_ingrediente(db: AsyncSession, data: IngredienteCreate) -> Ingrediente:
    costo_gramo = calcular_costo_por_gramo(data.costo_unitario, data.unidad_medida)

    ingrediente = Ingrediente(
        nombre=data.nombre,
        unidad_medida=data.unidad_medida,
        stock_actual=data.stock_actual,
        stock_minimo=data.stock_minimo,
        costo_unitario=data.costo_unitario,
        costo_por_gramo=costo_gramo,
    )
    db.add(ingrediente)
    await db.flush()

    # Si tiene stock inicial, registrar movimiento
    if data.stock_actual > 0:
        movimiento = MovimientoStock(
            ingrediente_id=ingrediente.id,
            tipo="AJUSTE",
            cantidad=data.stock_actual,
            costo_total=data.stock_actual * data.costo_unitario,
            referencia="Stock inicial",
        )
        db.add(movimiento)

    return ingrediente


async def actualizar_ingrediente(
    db: AsyncSession, ingrediente_id: UUID, data: IngredienteUpdate
) -> Ingrediente | None:
    ingrediente = await db.get(Ingrediente, ingrediente_id)
    if not ingrediente:
        return None

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ingrediente, field, value)

    # Recalcular costo por gramo si cambió el costo unitario
    if "costo_unitario" in update_data:
        ingrediente.costo_por_gramo = calcular_costo_por_gramo(
            ingrediente.costo_unitario, ingrediente.unidad_medida
        )

    await db.flush()
    # Trigger Auto-Check de Inventario si se rebajó material manualmente
    await notificacion_service.verificar_stock_y_notificar(db)

    await db.refresh(ingrediente)
    return ingrediente


async def eliminar_ingrediente(db: AsyncSession, ingrediente_id: UUID) -> bool:
    ingrediente = await db.get(Ingrediente, ingrediente_id)
    if not ingrediente:
        return False
        
    from sqlalchemy import delete
    from app.models.movimiento import MovimientoStock
    from app.models.receta import RecetaDetalle
    
    # ⚠️ Forzar borrado en cascada para SQLite (historial y recetas)
    await db.execute(delete(MovimientoStock).where(MovimientoStock.ingrediente_id == ingrediente_id))
    await db.execute(delete(RecetaDetalle).where(RecetaDetalle.ingrediente_id == ingrediente_id))
    
    await db.delete(ingrediente)
    return True


# --------------- COMPRAS (Costo Promedio Ponderado) ---------------

async def registrar_compra(
    db: AsyncSession, ingrediente_id: UUID, data: CompraIngrediente
) -> dict:
    """
    Registra una compra y recalcula el costo promedio ponderado.

    Fórmula:
        nuevo_costo = (stock_actual * costo_actual + cantidad_nueva * costo_nuevo)
                      / (stock_actual + cantidad_nueva)
    """
    ingrediente = await db.get(Ingrediente, ingrediente_id)
    if not ingrediente:
        raise ValueError("Ingrediente no encontrado")

    # Costo unitario de la compra
    costo_unitario_compra = data.costo_total / data.cantidad

    # Calcular costo promedio ponderado
    stock_anterior = float(ingrediente.stock_actual)
    costo_anterior = float(ingrediente.costo_unitario)

    valor_stock_anterior = stock_anterior * costo_anterior
    valor_compra = data.cantidad * costo_unitario_compra
    stock_nuevo = stock_anterior + data.cantidad

    if stock_nuevo > 0:
        nuevo_costo = (valor_stock_anterior + valor_compra) / stock_nuevo
    else:
        nuevo_costo = costo_unitario_compra

    # Actualizar ingrediente
    ingrediente.stock_actual = stock_nuevo
    ingrediente.costo_unitario = round(nuevo_costo, 4)
    ingrediente.costo_por_gramo = calcular_costo_por_gramo(
        nuevo_costo, ingrediente.unidad_medida
    )

    # Registrar movimiento
    movimiento = MovimientoStock(
        ingrediente_id=ingrediente_id,
        tipo="COMPRA",
        cantidad=data.cantidad,
        costo_total=data.costo_total,
        referencia=data.nota or "Compra de insumo",
    )
    db.add(movimiento)
    res = {
        "ingrediente": ingrediente.nombre,
        "stock_anterior": stock_anterior,
        "stock_nuevo": stock_nuevo,
        "costo_anterior": costo_anterior,
        "costo_nuevo": round(nuevo_costo, 4),
        "cantidad_comprada": data.cantidad,
        "costo_compra": data.costo_total,
    }

    # Verificar stock bajo para ingredientes o crear alerta de repuesto
    if stock_anterior <= ingrediente.stock_minimo and stock_nuevo > ingrediente.stock_minimo:
        await notificacion_service.crear_notificacion(
            db,
            tipo="STOCK_REPUESTO",
            mensaje=f"✅ {ingrediente.nombre}: stock repuesto ({stock_nuevo} {ingrediente.unidad_medida})",
            referencia_tipo="ingrediente",
            referencia_id=ingrediente.id,
        )
    await notificacion_service.verificar_stock_y_notificar(db)

    return res


# --------------- ALERTAS ---------------

async def obtener_alertas_stock(db: AsyncSession) -> list[Ingrediente]:
    """Retorna ingredientes con stock por debajo del mínimo."""
    result = await db.execute(
        select(Ingrediente).where(
            Ingrediente.stock_actual <= Ingrediente.stock_minimo
        )
    )
    return result.scalars().all()
