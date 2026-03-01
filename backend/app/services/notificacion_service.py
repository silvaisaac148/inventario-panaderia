"""Servicio: Notificaciones — crear, listar y marcar alertas."""

from uuid import UUID
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.notificacion import Notificacion
from app.models.ingrediente import Ingrediente


async def crear_notificacion(
    db: AsyncSession,
    tipo: str,
    mensaje: str,
    referencia_tipo: str | None = None,
    referencia_id: UUID | None = None,
) -> Notificacion:
    """Crea una nueva notificación."""
    notif = Notificacion(
        tipo=tipo,
        mensaje=mensaje,
        referencia_tipo=referencia_tipo,
        referencia_id=referencia_id,
    )
    db.add(notif)
    return notif


async def listar_no_leidas(db: AsyncSession, limit: int = 20) -> list[Notificacion]:
    """Lista las notificaciones no leídas, ordenadas por fecha."""
    result = await db.execute(
        select(Notificacion)
        .where(Notificacion.leida == False)
        .order_by(Notificacion.fecha.desc())
        .limit(limit)
    )
    return result.scalars().all()


async def listar_todas(db: AsyncSession, limit: int = 50) -> list[Notificacion]:
    """Lista todas las notificaciones recientes."""
    result = await db.execute(
        select(Notificacion)
        .order_by(Notificacion.fecha.desc())
        .limit(limit)
    )
    return result.scalars().all()


async def conteo_no_leidas(db: AsyncSession) -> int:
    """Cuenta las notificaciones no leídas."""
    result = await db.execute(
        select(func.count(Notificacion.id))
        .where(Notificacion.leida == False)
    )
    return result.scalar() or 0


async def marcar_leidas(db: AsyncSession, ids: list[UUID]) -> int:
    """Marca las notificaciones indicadas como leídas."""
    result = await db.execute(
        update(Notificacion)
        .where(Notificacion.id.in_(ids))
        .values(leida=True)
    )
    return result.rowcount


async def marcar_todas_leidas(db: AsyncSession) -> int:
    """Marca todas las notificaciones como leídas."""
    result = await db.execute(
        update(Notificacion)
        .where(Notificacion.leida == False)
        .values(leida=True)
    )
    return result.rowcount


async def verificar_stock_y_notificar(db: AsyncSession) -> list[Notificacion]:
    """Verifica stock bajo y crea notificaciones para nuevas alertas.

    Solo crea notificación si no existe una no leída para el mismo ingrediente.
    """
    # Ingredientes con stock bajo
    result = await db.execute(
        select(Ingrediente).where(
            Ingrediente.stock_actual <= Ingrediente.stock_minimo
        )
    )
    ingredientes_bajos = result.scalars().all()

    # Buscar notificaciones existentes no leídas de stock bajo
    result_existentes = await db.execute(
        select(Notificacion.referencia_id).where(
            Notificacion.tipo == "STOCK_BAJO",
            Notificacion.leida == False,
            Notificacion.referencia_tipo == "ingrediente",
        )
    )
    ids_ya_notificados = {r[0] for r in result_existentes.all()}

    nuevas = []
    for ing in ingredientes_bajos:
        if ing.id not in ids_ya_notificados:
            notif = await crear_notificacion(
                db,
                tipo="STOCK_BAJO",
                mensaje=f"⚠️ {ing.nombre}: stock bajo ({float(ing.stock_actual):.2f} {ing.unidad_medida}, mín: {float(ing.stock_minimo):.2f})",
                referencia_tipo="ingrediente",
                referencia_id=ing.id,
            )
            nuevas.append(notif)

    return nuevas
