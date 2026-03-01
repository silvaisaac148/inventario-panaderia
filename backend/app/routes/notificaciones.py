"""Rutas API: Notificaciones."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.notificacion import NotificacionResponse, MarcarLeidasRequest
from app.services import notificacion_service as service

router = APIRouter(prefix="/notificaciones", tags=["Notificaciones"])


@router.get("/", response_model=list[NotificacionResponse])
async def listar(db: AsyncSession = Depends(get_db)):
    """Lista todas las notificaciones no leídas."""
    return await service.listar_no_leidas(db)


@router.get("/conteo")
async def conteo(db: AsyncSession = Depends(get_db)):
    """Número de notificaciones no leídas."""
    count = await service.conteo_no_leidas(db)
    return {"count": count}


@router.put("/leer")
async def marcar_leidas(data: MarcarLeidasRequest, db: AsyncSession = Depends(get_db)):
    """Marca notificaciones específicas como leídas."""
    updated = await service.marcar_leidas(db, data.ids)
    return {"updated": updated}


@router.put("/leer-todas")
async def marcar_todas_leidas(db: AsyncSession = Depends(get_db)):
    """Marca todas las notificaciones como leídas."""
    updated = await service.marcar_todas_leidas(db)
    return {"updated": updated}


@router.post("/verificar-stock")
async def verificar_stock(db: AsyncSession = Depends(get_db)):
    """Verifica stock bajo y crea notificaciones si es necesario."""
    nuevas = await service.verificar_stock_y_notificar(db)
    return {"nuevas_alertas": len(nuevas)}
