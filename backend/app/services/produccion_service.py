"""Servicio: Producción — el corazón del sistema.

Flujo:
1. Usuario selecciona receta + cantidad
2. Sistema verifica stock de cada ingrediente
3. Descuenta ingredientes del stock
4. Registra movimientos de stock (auditoría)
5. Suma productos terminados al stock
6. Calcula costo de producción
"""

from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.receta import Receta, RecetaDetalle
from app.models.ingrediente import Ingrediente
from app.models.producto import Producto
from app.models.produccion import Produccion
from app.models.movimiento import MovimientoStock
from app.services.ingrediente_service import FACTORES_A_GRAMOS


async def verificar_stock(
    db: AsyncSession, receta_id: UUID, cantidad: int
) -> dict:
    """Verifica si hay suficiente stock para producir la cantidad deseada."""
    receta = await _obtener_receta_con_detalles(db, receta_id)
    if not receta:
        raise ValueError("Receta no encontrada")

    faltantes = []
    suficientes = []

    for detalle in receta.detalles:
        ingrediente = detalle.ingrediente
        cantidad_necesaria = float(detalle.cantidad) * cantidad / receta.rendimiento

        # Convertir a la unidad del ingrediente para comparar
        factor_detalle = FACTORES_A_GRAMOS.get(detalle.unidad, 1)
        factor_ingrediente = FACTORES_A_GRAMOS.get(ingrediente.unidad_medida, 1)
        cantidad_en_unidad_ingrediente = (cantidad_necesaria * factor_detalle) / factor_ingrediente

        stock_disponible = float(ingrediente.stock_actual)

        item = {
            "ingrediente": ingrediente.nombre,
            "necesario": round(cantidad_en_unidad_ingrediente, 4),
            "disponible": round(stock_disponible, 4),
            "unidad": ingrediente.unidad_medida,
        }

        if stock_disponible < cantidad_en_unidad_ingrediente:
            item["faltante"] = round(cantidad_en_unidad_ingrediente - stock_disponible, 4)
            faltantes.append(item)
        else:
            suficientes.append(item)

    return {
        "puede_producir": len(faltantes) == 0,
        "receta": receta.nombre,
        "cantidad_solicitada": cantidad,
        "ingredientes_ok": suficientes,
        "ingredientes_faltantes": faltantes,
    }


async def registrar_produccion(
    db: AsyncSession, receta_id: UUID, cantidad: int
) -> dict:
    """
    Ejecuta la producción:
    1. Verifica stock
    2. Descuenta ingredientes
    3. Suma producto terminado al stock
    4. Registra en producciones y movimientos
    """
    # 1. Verificar stock
    verificacion = await verificar_stock(db, receta_id, cantidad)
    if not verificacion["puede_producir"]:
        raise ValueError(
            f"Stock insuficiente. Faltan: "
            + ", ".join(
                f"{f['ingrediente']}: {f['faltante']} {f['unidad']}"
                for f in verificacion["ingredientes_faltantes"]
            )
        )

    receta = await _obtener_receta_con_detalles(db, receta_id)

    # 2. Descontar ingredientes y calcular costo
    costo_total = 0
    ingredientes_usados = []

    for detalle in receta.detalles:
        ingrediente = detalle.ingrediente
        cantidad_necesaria = float(detalle.cantidad) * cantidad / receta.rendimiento

        # Convertir a unidad del ingrediente
        factor_detalle = FACTORES_A_GRAMOS.get(detalle.unidad, 1)
        factor_ingrediente = FACTORES_A_GRAMOS.get(ingrediente.unidad_medida, 1)
        cantidad_a_descontar = (cantidad_necesaria * factor_detalle) / factor_ingrediente

        # Calcular costo de este ingrediente en esta producción
        costo_ingrediente = cantidad_a_descontar * float(ingrediente.costo_unitario)
        costo_total += costo_ingrediente

        # Descontar stock
        ingrediente.stock_actual = float(ingrediente.stock_actual) - cantidad_a_descontar

        # Registrar movimiento de salída
        movimiento = MovimientoStock(
            ingrediente_id=ingrediente.id,
            tipo="PRODUCCION",
            cantidad=-cantidad_a_descontar,  # Negativo = salida
            costo_total=costo_ingrediente,
            referencia=f"Producción: {receta.nombre} x{cantidad}",
        )
        db.add(movimiento)

        ingredientes_usados.append({
            "ingrediente": ingrediente.nombre,
            "cantidad_usada": round(cantidad_a_descontar, 4),
            "unidad": ingrediente.unidad_medida,
            "costo": round(costo_ingrediente, 4),
        })

    # 3. Registrar producción
    produccion = Produccion(
        receta_id=receta.id,
        cantidad_producida=cantidad,
        costo_total=round(costo_total, 4),
        estado="COMPLETADA",
    )
    db.add(produccion)

    # 4. Sumar stock de producto terminado y actualizar costo
    producto = receta.producto
    costo_unitario_produccion = costo_total / cantidad if cantidad > 0 else 0

    # Promedio ponderado del costo del producto
    stock_anterior = float(producto.stock_actual)
    costo_anterior = float(producto.costo_unitario)

    if stock_anterior + cantidad > 0:
        nuevo_costo = (
            (stock_anterior * costo_anterior) + (cantidad * costo_unitario_produccion)
        ) / (stock_anterior + cantidad)
    else:
        nuevo_costo = costo_unitario_produccion

    producto.stock_actual = stock_anterior + cantidad
    producto.costo_unitario = round(nuevo_costo, 4)

    await db.flush()

    return {
        "produccion_id": str(produccion.id),
        "receta": receta.nombre,
        "producto": producto.nombre,
        "cantidad_producida": cantidad,
        "costo_total": round(costo_total, 4),
        "costo_unitario": round(costo_unitario_produccion, 4),
        "stock_producto": float(producto.stock_actual),
        "ingredientes_usados": ingredientes_usados,
    }


async def historial_producciones(db: AsyncSession) -> list[Produccion]:
    result = await db.execute(
        select(Produccion)
        .options(
            selectinload(Produccion.receta).selectinload(Receta.producto)
        )
        .order_by(Produccion.fecha.desc())
    )
    return result.scalars().all()


# --------------- Helpers ---------------

async def _obtener_receta_con_detalles(db: AsyncSession, receta_id: UUID) -> Receta | None:
    result = await db.execute(
        select(Receta)
        .options(
            selectinload(Receta.detalles).selectinload(RecetaDetalle.ingrediente),
            selectinload(Receta.producto),
        )
        .where(Receta.id == receta_id)
    )
    return result.scalar_one_or_none()
