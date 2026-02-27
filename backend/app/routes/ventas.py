"""Rutas API: Ventas."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.venta import VentaCreate
from app.services import venta_service as service

router = APIRouter(prefix="/ventas", tags=["Ventas"])


@router.post("/")
async def registrar_venta(data: VentaCreate, db: AsyncSession = Depends(get_db)):
    try:
        return await service.registrar_venta(db, data)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/historial")
async def historial(db: AsyncSession = Depends(get_db)):
    ventas = await service.historial_ventas(db)
    return [
        {
            "id": str(v.id),
            "producto_nombre": v.producto.nombre if v.producto else None,
            "cantidad": v.cantidad,
            "precio_unitario": float(v.precio_unitario),
            "total": float(v.total),
            "nota": v.nota,
            "fecha": v.fecha.isoformat(),
        }
        for v in ventas
    ]
