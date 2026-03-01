"""Rutas API: Ventas."""

from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.venta import VentaCreate, VentaUpdate
from app.services import venta_service as service

router = APIRouter(prefix="/ventas", tags=["Ventas"])


@router.post("/")
async def registrar_venta(data: VentaCreate, db: AsyncSession = Depends(get_db)):
    try:
        return await service.registrar_venta(db, data)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{venta_id}")
async def editar_venta(venta_id: UUID, data: VentaUpdate, db: AsyncSession = Depends(get_db)):
    """Edita una venta existente y ajusta el stock."""
    try:
        return await service.editar_venta(db, venta_id, data)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/{venta_id}/anular")
async def anular_venta(venta_id: UUID, db: AsyncSession = Depends(get_db)):
    """Anula una venta y devuelve el stock al producto."""
    try:
        return await service.anular_venta(db, venta_id)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/historial")
async def historial(
    fecha_desde: datetime | None = Query(None, description="Fecha inicio (ISO)"),
    fecha_hasta: datetime | None = Query(None, description="Fecha fin (ISO)"),
    db: AsyncSession = Depends(get_db),
):
    ventas = await service.historial_ventas(db, fecha_desde, fecha_hasta)
    return [
        {
            "id": str(v.id),
            "producto_nombre": v.producto.nombre if v.producto else None,
            "cantidad": v.cantidad,
            "precio_unitario": float(v.precio_unitario),
            "total": float(v.total),
            "nota": v.nota,
            "estado": getattr(v, 'estado', 'ACTIVA'),
            "fecha": v.fecha.isoformat(),
        }
        for v in ventas
    ]

