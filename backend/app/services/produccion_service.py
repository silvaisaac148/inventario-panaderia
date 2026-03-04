"""Servicio: Producción — el corazón del sistema.

Flujo:
1. Usuario selecciona receta + cantidad
2. Sistema verifica stock de cada ingrediente
3. Descuenta ingredientes del stock
4. Registra movimientos de stock (auditoría)
5. Suma productos terminados al stock
6. Calcula costo de producción
"""

from datetime import datetime
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
from app.services import notificacion_service


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

    # Verificar stock bajo para ingredientes que acaban de descontarse
    await notificacion_service.verificar_stock_y_notificar(db)

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


async def anular_produccion(db: AsyncSession, produccion_id: UUID) -> dict:
    """Anula una producción devolviendo los ingredientes al stock y restando los productos terminados."""
    query = select(Produccion).options(
        selectinload(Produccion.receta).selectinload(Receta.detalles).selectinload(RecetaDetalle.ingrediente),
        selectinload(Produccion.receta).selectinload(Receta.producto)
    ).where(Produccion.id == produccion_id)
    
    result = await db.execute(query)
    produccion = result.scalar_one_or_none()

    if not produccion:
        raise ValueError("Producción no encontrada")

    if produccion.estado == "ANULADA":
        raise ValueError("Esta producción ya fue anulada")

    receta = produccion.receta
    producto = receta.producto
    cantidad = produccion.cantidad_producida

    # 1. Verificar si hay suficente stock de producto terminado para descontar
    if float(producto.stock_actual) < cantidad:
        raise ValueError(f"No se puede anular porque ya se han vendido o usado {cantidad - float(producto.stock_actual)} unidades del producto terminado. Debe haber al menos {cantidad} en stock.")

    # 2. Descontar stock de producto terminado
    producto.stock_actual = float(producto.stock_actual) - cantidad

    # 3. Reintegrar ingredientes
    ingredientes_devueltos = []
    for detalle in receta.detalles:
        ingrediente = detalle.ingrediente
        cantidad_necesaria = float(detalle.cantidad) * cantidad / receta.rendimiento

        # Convertir a unidad del ingrediente
        factor_detalle = FACTORES_A_GRAMOS.get(detalle.unidad, 1)
        factor_ingrediente = FACTORES_A_GRAMOS.get(ingrediente.unidad_medida, 1)
        cantidad_a_devolver = (cantidad_necesaria * factor_detalle) / factor_ingrediente

        # Reintegrar stock
        ingrediente.stock_actual = float(ingrediente.stock_actual) + cantidad_a_devolver
        
        # Calcular costo devuelto
        costo_ingrediente = cantidad_a_devolver * float(ingrediente.costo_unitario)

        # Registrar movimiento de entrada manual
        movimiento = MovimientoStock(
            ingrediente_id=ingrediente.id,
            tipo="AJUSTE", # Ajuste positivo 
            cantidad=cantidad_a_devolver,
            costo_total=costo_ingrediente,
            referencia=f"Anulación de producción: {receta.nombre} x{cantidad}",
        )
        db.add(movimiento)
        ingredientes_devueltos.append({"ingrediente": ingrediente.nombre, "cantidad_devuelta": cantidad_a_devolver})

    produccion.estado = "ANULADA"

    # Recalcular costo promedio ponderado del producto tras quitar el lote anulado
    stock_post_anulacion = float(producto.stock_actual)  # ya descontado arriba
    costo_actual = float(producto.costo_unitario)
    costo_lote = float(produccion.costo_total) / cantidad if cantidad > 0 else 0

    if stock_post_anulacion > 0:
        # Revertir el aporte del lote anulado al promedio ponderado
        valor_total_pre = (stock_post_anulacion + cantidad) * costo_actual
        valor_lote_anulado = cantidad * costo_lote
        valor_restante = valor_total_pre - valor_lote_anulado
        producto.costo_unitario = round(max(valor_restante / stock_post_anulacion, 0), 4)
    # Si stock_post_anulacion == 0, no hay nada que recalcular

    await db.flush()

    return {
        "produccion_id": str(produccion.id),
        "receta": receta.nombre,
        "estado": "ANULADA",
        "productos_descontados": cantidad,
        "ingredientes_devueltos": ingredientes_devueltos
    }


async def historial_producciones(
    db: AsyncSession,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
) -> list[Produccion]:
    query = (
        select(Produccion)
        .options(
            selectinload(Produccion.receta).selectinload(Receta.producto)
        )
    )

    if fecha_desde:
        query = query.where(Produccion.fecha >= fecha_desde)
    if fecha_hasta:
        query = query.where(Produccion.fecha <= fecha_hasta)

    query = query.order_by(Produccion.fecha.desc())
    result = await db.execute(query)
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
