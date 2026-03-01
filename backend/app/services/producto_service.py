"""Servicio: Productos — CRUD."""

from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.producto import Producto
from app.schemas.producto import ProductoCreate, ProductoUpdate


async def listar_productos(db: AsyncSession) -> list[Producto]:
    result = await db.execute(
        select(Producto).order_by(Producto.nombre)
    )
    return result.scalars().all()


async def obtener_producto(db: AsyncSession, producto_id: UUID) -> Producto | None:
    return await db.get(Producto, producto_id)


async def crear_producto(db: AsyncSession, data: ProductoCreate) -> Producto:
    producto = Producto(
        nombre=data.nombre,
        precio_venta=data.precio_venta,
        stock_minimo=data.stock_minimo,
    )
    db.add(producto)
    await db.flush()
    return producto


async def actualizar_producto(
    db: AsyncSession, producto_id: UUID, data: ProductoUpdate
) -> Producto | None:
    producto = await db.get(Producto, producto_id)
    if not producto:
        return None

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(producto, field, value)

    return producto


async def eliminar_producto(db: AsyncSession, producto_id: UUID) -> bool:
    producto = await db.get(Producto, producto_id)
    if not producto:
        return False
        
    from sqlalchemy import delete
    from app.models.venta import Venta
    from app.models.receta import Receta, RecetaDetalle
    from app.models.produccion import Produccion
    
    # ⚠️ Forzar borrado en cascada para SQLite (Ventas históricas del producto)
    await db.execute(delete(Venta).where(Venta.producto_id == producto_id))
    
    # Localizar si tiene una receta para borrar todo su historial de producción
    rec_q = await db.execute(select(Receta.id).where(Receta.producto_id == producto_id))
    rec_id = rec_q.scalar_one_or_none()
    
    if rec_id:
        await db.execute(delete(Produccion).where(Produccion.receta_id == rec_id))
        await db.execute(delete(RecetaDetalle).where(RecetaDetalle.receta_id == rec_id))
        await db.execute(delete(Receta).where(Receta.producto_id == producto_id))

    await db.delete(producto)
    return True
