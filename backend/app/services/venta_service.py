"""Servicio: Ventas — registrar y descontar stock de producto terminado."""

from datetime import datetime
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.venta import Venta
from app.models.producto import Producto
from app.schemas.venta import VentaCreate, VentaUpdate
from app.services.notificacion_service import verificar_stock_y_notificar


async def registrar_venta(db: AsyncSession, data: VentaCreate) -> dict:
    """Registra una venta y descuenta stock del producto."""
    producto = await db.get(Producto, data.producto_id)
    if not producto:
        raise ValueError("Producto no encontrado")

    # Verificar stock
    if float(producto.stock_actual) < data.cantidad:
        raise ValueError(
            f"Stock insuficiente. Disponible: {producto.stock_actual}, "
            f"solicitado: {data.cantidad}"
        )

    # Precio unitario (usa el precio del producto si no se especifica)
    precio = data.precio_unitario if data.precio_unitario else float(producto.precio_venta)
    costo_unit = float(producto.costo_unitario)
    total = precio * data.cantidad

    # Registrar venta
    venta = Venta(
        producto_id=data.producto_id,
        cantidad=data.cantidad,
        precio_unitario=precio,
        costo_unitario=costo_unit,
        total=total,
        nota=data.nota,
    )
    db.add(venta)

    # Descontar stock
    producto.stock_actual = float(producto.stock_actual) - data.cantidad

    await db.flush()
    await verificar_stock_y_notificar(db)

    return {
        "venta_id": str(venta.id),
        "producto": producto.nombre,
        "cantidad": data.cantidad,
        "precio_unitario": precio,
        "total": total,
        "stock_restante": float(producto.stock_actual),
    }


async def anular_venta(db: AsyncSession, venta_id: UUID) -> dict:
    """Anula una venta y devuelve el stock al producto."""
    venta = await db.get(Venta, venta_id)
    if not venta:
        raise ValueError("Venta no encontrada")

    if venta.estado == "ANULADA":
        raise ValueError("Esta venta ya fue anulada")

    # Devolver stock al producto
    producto = await db.get(Producto, venta.producto_id)
    if producto:
        producto.stock_actual = float(producto.stock_actual) + venta.cantidad

    # Marcar como anulada
    venta.estado = "ANULADA"
    await db.flush()

    return {
        "venta_id": str(venta.id),
        "producto": producto.nombre if producto else None,
        "cantidad_devuelta": venta.cantidad,
        "stock_actual": float(producto.stock_actual) if producto else None,
        "estado": "ANULADA",
    }


async def editar_venta(db: AsyncSession, venta_id: UUID, data: VentaUpdate) -> dict:
    """Edita una venta y ajusta la diferencia de stock."""
    venta = await db.get(Venta, venta_id)
    if not venta:
        raise ValueError("Venta no encontrada")

    if venta.estado == "ANULADA":
        raise ValueError("No se puede editar una venta anulada")

    producto = await db.get(Producto, venta.producto_id)
    if not producto:
        raise ValueError("Producto no encontrado")

    # Calcular diferencia de cantidad
    diferencia = data.cantidad - venta.cantidad  # positivo = vendió más, negativo = vendió menos

    # Verificar que hay stock si se aumenta cantidad
    if diferencia > 0 and float(producto.stock_actual) < diferencia:
        raise ValueError(
            f"Stock insuficiente para ajustar. Disponible: {producto.stock_actual}, "
            f"necesario adicional: {diferencia}"
        )

    # Ajustar stock del producto
    producto.stock_actual = float(producto.stock_actual) - diferencia

    # Actualizar la venta
    precio = data.precio_unitario if data.precio_unitario else float(venta.precio_unitario)
    venta.cantidad = data.cantidad
    venta.precio_unitario = precio
    venta.total = precio * data.cantidad
    if data.nota is not None:
        venta.nota = data.nota

    await db.flush()
    await verificar_stock_y_notificar(db)

    return {
        "venta_id": str(venta.id),
        "producto": producto.nombre,
        "cantidad": data.cantidad,
        "precio_unitario": precio,
        "total": float(venta.total),
        "stock_actual": float(producto.stock_actual),
    }


async def historial_ventas(
    db: AsyncSession,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
) -> list[Venta]:
    query = select(Venta).options(selectinload(Venta.producto))

    if fecha_desde:
        query = query.where(Venta.fecha >= fecha_desde)
    if fecha_hasta:
        query = query.where(Venta.fecha <= fecha_hasta)

    query = query.order_by(Venta.fecha.desc())
    result = await db.execute(query)
    return result.scalars().all()

