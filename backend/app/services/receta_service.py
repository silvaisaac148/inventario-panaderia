"""Servicio: Recetas — CRUD con cálculo de costos."""

from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.receta import Receta, RecetaDetalle
from app.models.ingrediente import Ingrediente
from app.schemas.receta import RecetaCreate, RecetaUpdate


async def listar_recetas(db: AsyncSession) -> list[Receta]:
    result = await db.execute(
        select(Receta)
        .options(
            selectinload(Receta.detalles).selectinload(RecetaDetalle.ingrediente),
            selectinload(Receta.producto),
        )
        .order_by(Receta.nombre)
    )
    return result.scalars().all()


async def obtener_receta(db: AsyncSession, receta_id: UUID) -> Receta | None:
    result = await db.execute(
        select(Receta)
        .options(
            selectinload(Receta.detalles).selectinload(RecetaDetalle.ingrediente),
            selectinload(Receta.producto),
        )
        .where(Receta.id == receta_id)
    )
    return result.scalar_one_or_none()


async def crear_receta(db: AsyncSession, data: RecetaCreate) -> Receta:
    receta = Receta(
        producto_id=data.producto_id,
        nombre=data.nombre,
        rendimiento=data.rendimiento,
        notas=data.notas,
    )
    db.add(receta)
    await db.flush()

    # Crear detalles (ingredientes de la receta)
    for detalle_data in data.detalles:
        detalle = RecetaDetalle(
            receta_id=receta.id,
            ingrediente_id=detalle_data.ingrediente_id,
            cantidad=detalle_data.cantidad,
            unidad=detalle_data.unidad,
        )
        db.add(detalle)

    await db.flush()

    # Recargar con relaciones
    return await obtener_receta(db, receta.id)


async def actualizar_receta(
    db: AsyncSession, receta_id: UUID, data: RecetaUpdate
) -> Receta | None:
    receta = await obtener_receta(db, receta_id)
    if not receta:
        return None

    update_data = data.model_dump(exclude_unset=True, exclude={"detalles"})
    for field, value in update_data.items():
        setattr(receta, field, value)

    # Si se enviaron nuevos detalles, reemplazar
    if data.detalles is not None:
        # Eliminar detalles anteriores
        for detalle in receta.detalles:
            await db.delete(detalle)

        # Crear nuevos detalles
        for detalle_data in data.detalles:
            detalle = RecetaDetalle(
                receta_id=receta.id,
                ingrediente_id=detalle_data.ingrediente_id,
                cantidad=detalle_data.cantidad,
                unidad=detalle_data.unidad,
            )
            db.add(detalle)

    await db.flush()
    return await obtener_receta(db, receta_id)


async def eliminar_receta(db: AsyncSession, receta_id: UUID) -> bool:
    receta = await db.get(Receta, receta_id)
    if not receta:
        return False
        
    from sqlalchemy import delete
    from app.models.receta import RecetaDetalle
    from app.models.produccion import Produccion
    
    # ⚠️ Forzar borrado en cascada para SQLite
    await db.execute(delete(Produccion).where(Produccion.receta_id == receta_id))
    await db.execute(delete(RecetaDetalle).where(RecetaDetalle.receta_id == receta_id))
        
    await db.delete(receta)
    return True


async def calcular_costo_receta(db: AsyncSession, receta_id: UUID) -> dict:
    """Calcula el costo total de una receta según los precios actuales de ingredientes."""
    receta = await obtener_receta(db, receta_id)
    if not receta:
        raise ValueError("Receta no encontrada")

    costo_total = 0
    detalles_costo = []

    for detalle in receta.detalles:
        ingrediente = detalle.ingrediente
        # Costo = costo_por_gramo × cantidad (en la unidad del detalle)
        costo_ingrediente = float(ingrediente.costo_por_gramo) * float(detalle.cantidad)
        costo_total += costo_ingrediente

        detalles_costo.append({
            "ingrediente": ingrediente.nombre,
            "cantidad": float(detalle.cantidad),
            "unidad": detalle.unidad,
            "costo_por_gramo": float(ingrediente.costo_por_gramo),
            "costo_total": round(costo_ingrediente, 4),
        })

    costo_unitario = costo_total / receta.rendimiento if receta.rendimiento > 0 else 0

    return {
        "receta": receta.nombre,
        "rendimiento": receta.rendimiento,
        "costo_total": round(costo_total, 4),
        "costo_unitario": round(costo_unitario, 4),
        "detalles": detalles_costo,
    }
