"""Servicio: Ventas — registrar y descontar stock de producto terminado."""

from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.venta import Venta
from app.models.producto import Producto
from app.schemas.venta import VentaCreate


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
    total = precio * data.cantidad

    # Registrar venta
    venta = Venta(
        producto_id=data.producto_id,
        cantidad=data.cantidad,
        precio_unitario=precio,
        total=total,
        nota=data.nota,
    )
    db.add(venta)

    # Descontar stock
    producto.stock_actual = float(producto.stock_actual) - data.cantidad

    await db.flush()

    return {
        "venta_id": str(venta.id),
        "producto": producto.nombre,
        "cantidad": data.cantidad,
        "precio_unitario": precio,
        "total": total,
        "stock_restante": float(producto.stock_actual),
    }


async def historial_ventas(db: AsyncSession) -> list[Venta]:
    result = await db.execute(
        select(Venta)
        .options(selectinload(Venta.producto))
        .order_by(Venta.fecha.desc())
    )
    return result.scalars().all()
