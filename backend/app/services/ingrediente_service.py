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
    "lts": 1000,  # 1 litro ≈ 1000 ml (para ingredientes volumétricos)
    "ml": 1,
    "und": 1,     # unidades contables (huevos, bolsas, etc.)
    "hoj": 1,     # hojas (etiquetas, papel)
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


async def eliminar_ingrediente(db: AsyncSession, ingrediente_id: UUID) -> dict:
    """
    Elimina un ingrediente solo si no está en uso.
    Retorna {"ok": True} o lanza ValueError con el motivo.
    """
    from sqlalchemy import func
    from app.models.movimiento import MovimientoStock
    from app.models.receta import RecetaDetalle

    ingrediente = await db.get(Ingrediente, ingrediente_id)
    if not ingrediente:
        return {"ok": False, "not_found": True}

    # Contar movimientos de stock
    res_mov = await db.execute(
        select(func.count()).where(MovimientoStock.ingrediente_id == ingrediente_id)
    )
    num_movimientos = res_mov.scalar_one()

    # Contar recetas que lo usan
    res_rec = await db.execute(
        select(func.count()).where(RecetaDetalle.ingrediente_id == ingrediente_id)
    )
    num_recetas = res_rec.scalar_one()

    if num_movimientos > 0 or num_recetas > 0:
        partes = []
        if num_recetas > 0:
            partes.append(f"{num_recetas} receta{'s' if num_recetas > 1 else ''}")
        if num_movimientos > 0:
            partes.append(f"{num_movimientos} movimiento{'s' if num_movimientos > 1 else ''} de stock")
        raise ValueError(
            f"No se puede eliminar '{ingrediente.nombre}': está vinculado a " + " y ".join(partes) + "."
        )

    await db.delete(ingrediente)
    return {"ok": True}


# --------------- COMPRAS (Costo Promedio Ponderado) ---------------

async def registrar_compra(
    db: AsyncSession, ingrediente_id: UUID, data: CompraIngrediente
) -> dict:
    """
    Registra una compra y recalcula el costo promedio ponderado.

    Soporta dos modos:
      - Directo: cantidad + costo_total (en unidad base del ingrediente)
      - Presentación: cantidad_presentacion + peso_por_presentacion + costo_por_presentacion
        Ej: 50 sacos × 50 kg/saco × R$260/saco → 2500 kg por R$13.000

    Fórmula costo ponderado:
        nuevo_costo = (stock_actual * costo_actual + cantidad_nueva * costo_nuevo)
                      / (stock_actual + cantidad_nueva)
    """
    ingrediente = await db.get(Ingrediente, ingrediente_id)
    if not ingrediente:
        raise ValueError("Ingrediente no encontrado")

    # Resolver cantidad y costo_total según el modo
    info_presentacion = None
    if data.cantidad_presentacion is not None:
        # Modo presentación
        cantidad = data.cantidad_presentacion * data.peso_por_presentacion
        costo_total_compra = data.cantidad_presentacion * data.costo_por_presentacion
        info_presentacion = {
            "cantidad_presentaciones": data.cantidad_presentacion,
            "unidad_presentacion": data.unidad_presentacion or "unidad",
            "peso_por_presentacion": data.peso_por_presentacion,
            "costo_por_presentacion": round(data.costo_por_presentacion, 4),
            "peso_total": round(cantidad, 4),
            "costo_total": round(costo_total_compra, 4),
        }
        nota = data.nota or (
            f"Compra: {data.cantidad_presentacion} {data.unidad_presentacion or 'unidades'} "
            f"× {data.peso_por_presentacion} {ingrediente.unidad_medida}/{data.unidad_presentacion or 'unidad'} "
            f"@ R${data.costo_por_presentacion:.2f}/{data.unidad_presentacion or 'unidad'}"
        )
    else:
        cantidad = data.cantidad
        costo_total_compra = data.costo_total
        nota = data.nota or "Compra de insumo"

    # Costo unitario de esta compra (en la unidad base del ingrediente)
    costo_unitario_compra = costo_total_compra / cantidad

    # Calcular costo promedio ponderado
    stock_anterior = float(ingrediente.stock_actual)
    costo_anterior = float(ingrediente.costo_unitario)

    valor_stock_anterior = stock_anterior * costo_anterior
    valor_compra = cantidad * costo_unitario_compra
    stock_nuevo = stock_anterior + cantidad

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
        cantidad=cantidad,
        costo_total=costo_total_compra,
        referencia=nota,
    )
    db.add(movimiento)

    res = {
        "ingrediente": ingrediente.nombre,
        "unidad": ingrediente.unidad_medida,
        "stock_anterior": round(stock_anterior, 4),
        "stock_nuevo": round(stock_nuevo, 4),
        "costo_anterior": round(costo_anterior, 4),
        "costo_nuevo": round(nuevo_costo, 4),
        "costo_por_gramo_nuevo": round(ingrediente.costo_por_gramo, 6),
        "cantidad_comprada": round(cantidad, 4),
        "costo_compra": round(costo_total_compra, 4),
        "costo_unitario_compra": round(costo_unitario_compra, 4),
    }
    if info_presentacion:
        res["detalle_presentacion"] = info_presentacion

    # Verificar stock bajo y generar alerta si se repuso
    if stock_anterior <= float(ingrediente.stock_minimo) and stock_nuevo > float(ingrediente.stock_minimo):
        await notificacion_service.crear_notificacion(
            db,
            tipo="STOCK_REPUESTO",
            mensaje=f"✅ {ingrediente.nombre}: stock repuesto ({round(stock_nuevo, 2)} {ingrediente.unidad_medida})",
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
