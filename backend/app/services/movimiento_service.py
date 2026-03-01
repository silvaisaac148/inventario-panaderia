"""Servicio: Movimientos de Stock — consulta y auditoría."""

from datetime import datetime
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.movimiento import MovimientoStock
from app.models.ingrediente import Ingrediente


async def historial_por_ingrediente(
    db: AsyncSession,
    ingrediente_id: UUID,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
    tipo: str | None = None,
) -> list[MovimientoStock]:
    """Movimientos de un ingrediente específico con filtros opcionales."""
    query = (
        select(MovimientoStock)
        .where(MovimientoStock.ingrediente_id == ingrediente_id)
    )

    if fecha_desde:
        query = query.where(MovimientoStock.fecha >= fecha_desde)
    if fecha_hasta:
        query = query.where(MovimientoStock.fecha <= fecha_hasta)
    if tipo:
        query = query.where(MovimientoStock.tipo == tipo.upper())

    query = query.order_by(MovimientoStock.fecha.desc())
    result = await db.execute(query)
    return result.scalars().all()


async def historial_global(
    db: AsyncSession,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
    tipo: str | None = None,
    limit: int = 50,
) -> list[MovimientoStock]:
    """Historial global de movimientos con relación al ingrediente."""
    query = (
        select(MovimientoStock)
        .options(selectinload(MovimientoStock.ingrediente))
    )

    if fecha_desde:
        query = query.where(MovimientoStock.fecha >= fecha_desde)
    if fecha_hasta:
        query = query.where(MovimientoStock.fecha <= fecha_hasta)
    if tipo:
        query = query.where(MovimientoStock.tipo == tipo.upper())

    query = query.order_by(MovimientoStock.fecha.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


async def actividad_reciente(db: AsyncSession, limit: int = 10) -> list[dict]:
    """Últimos movimientos formateados para el dashboard."""
    movimientos = await historial_global(db, limit=limit)
    return [
        {
            "id": str(m.id),
            "ingrediente": m.ingrediente.nombre if m.ingrediente else "—",
            "tipo": m.tipo,
            "cantidad": float(m.cantidad),
            "costo_total": float(m.costo_total) if m.costo_total else 0,
            "referencia": m.referencia or "",
            "fecha": m.fecha.isoformat(),
        }
        for m in movimientos
    ]


def serializar_movimiento(m: MovimientoStock, incluir_ingrediente: bool = False) -> dict:
    """Convierte un MovimientoStock a dict para respuesta JSON."""
    data = {
        "id": str(m.id),
        "tipo": m.tipo,
        "cantidad": float(m.cantidad),
        "costo_total": float(m.costo_total) if m.costo_total else 0,
        "referencia": m.referencia or "",
        "referencia_id": str(m.referencia_id) if m.referencia_id else None,
        "fecha": m.fecha.isoformat(),
    }
    if incluir_ingrediente and m.ingrediente:
        data["ingrediente"] = m.ingrediente.nombre
        data["ingrediente_id"] = str(m.ingrediente_id)
        data["unidad"] = m.ingrediente.unidad_medida
    return data
