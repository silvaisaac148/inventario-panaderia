"""Rutas API: Producción."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.produccion import ProduccionCreate
from app.services import produccion_service as service

router = APIRouter(prefix="/produccion", tags=["Producción"])


@router.post("/verificar")
async def verificar_stock(data: ProduccionCreate, db: AsyncSession = Depends(get_db)):
    """Verifica si hay stock suficiente antes de producir."""
    try:
        return await service.verificar_stock(db, data.receta_id, data.cantidad_producida)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.post("/")
async def producir(data: ProduccionCreate, db: AsyncSession = Depends(get_db)):
    """Ejecuta la producción: descuenta ingredientes y suma producto terminado."""
    try:
        return await service.registrar_produccion(db, data.receta_id, data.cantidad_producida)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/historial")
async def historial(db: AsyncSession = Depends(get_db)):
    producciones = await service.historial_producciones(db)
    result = []
    for p in producciones:
        result.append({
            "id": str(p.id),
            "receta_nombre": p.receta.nombre if p.receta else None,
            "producto_nombre": p.receta.producto.nombre if p.receta and p.receta.producto else None,
            "cantidad_producida": p.cantidad_producida,
            "costo_total": float(p.costo_total),
            "costo_unitario": round(float(p.costo_total) / p.cantidad_producida, 4) if p.cantidad_producida > 0 else 0,
            "estado": p.estado,
            "fecha": p.fecha.isoformat(),
        })
    return result
