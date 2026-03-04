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
        mano_de_obra=getattr(data, 'mano_de_obra', 0) or 0,
        porcentaje_ganancia=getattr(data, 'porcentaje_ganancia', 0) or 0,
        porcentaje_merma=getattr(data, 'porcentaje_merma', 0) or 0,
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
    from app.services.ingrediente_service import FACTORES_A_GRAMOS

    receta = await obtener_receta(db, receta_id)
    if not receta:
        raise ValueError("Receta no encontrada")

    costo_total = 0
    detalles_costo = []

    for detalle in receta.detalles:
        ingrediente = detalle.ingrediente
        # Convertir cantidad del detalle a la unidad base del ingrediente, luego multiplicar por costo
        factor_detalle = FACTORES_A_GRAMOS.get(detalle.unidad, 1)
        factor_ingrediente = FACTORES_A_GRAMOS.get(ingrediente.unidad_medida, 1)
        cantidad_en_unidad_ingrediente = (float(detalle.cantidad) * factor_detalle) / factor_ingrediente
        costo_ingrediente = cantidad_en_unidad_ingrediente * float(ingrediente.costo_unitario)
        costo_total += costo_ingrediente

        detalles_costo.append({
            "ingrediente": ingrediente.nombre,
            "cantidad": float(detalle.cantidad),
            "unidad": detalle.unidad,
            "costo_unitario_ingrediente": float(ingrediente.costo_unitario),
            "unidad_ingrediente": ingrediente.unidad_medida,
            "costo_por_gramo": float(ingrediente.costo_por_gramo),
            "costo_total": round(costo_ingrediente, 4),
        })

    rendimiento = receta.rendimiento if receta.rendimiento > 0 else 1
    mano_de_obra = float(receta.mano_de_obra) if getattr(receta, 'mano_de_obra', None) else 0
    porcentaje_ganancia = float(receta.porcentaje_ganancia) if getattr(receta, 'porcentaje_ganancia', None) else 0
    porcentaje_merma = float(receta.porcentaje_merma) if getattr(receta, 'porcentaje_merma', None) else 0

    # Ajuste por merma: si hay 10% de merma el costo real sube
    factor_merma = 1 / (1 - porcentaje_merma / 100) if 0 < porcentaje_merma < 100 else 1
    costo_ingredientes_ajustado = costo_total * factor_merma
    costo_ingredientes_por_unidad = costo_ingredientes_ajustado / rendimiento
    costo_total_por_unidad = costo_ingredientes_por_unidad + mano_de_obra
    precio_sugerido = costo_total_por_unidad * (1 + porcentaje_ganancia / 100)
    precio_venta_actual = float(receta.producto.precio_venta) if receta.producto else 0

    return {
        "receta": receta.nombre,
        "rendimiento": rendimiento,
        "costo_ingredientes": round(costo_total, 4),
        "costo_ingredientes_por_unidad": round(costo_total / rendimiento, 4),
        "porcentaje_merma": porcentaje_merma,
        "costo_ingredientes_ajustado_merma": round(costo_ingredientes_ajustado, 4),
        "mano_de_obra_por_unidad": round(mano_de_obra, 4),
        "costo_total_por_unidad": round(costo_total_por_unidad, 4),
        "porcentaje_ganancia": porcentaje_ganancia,
        "precio_sugerido": round(precio_sugerido, 4),
        "precio_venta_actual": round(precio_venta_actual, 4),
        "diferencia_precio": round(precio_venta_actual - precio_sugerido, 4),
        # Compatibilidad con versión anterior
        "costo_total": round(costo_total, 4),
        "costo_unitario": round(costo_total / rendimiento, 4),
        "detalles": detalles_costo,
    }
