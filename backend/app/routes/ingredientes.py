"""Rutas API: Ingredientes."""

from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.ingrediente import (
    IngredienteCreate, IngredienteUpdate, IngredienteResponse, CompraIngrediente
)
from app.services import ingrediente_service as service

router = APIRouter(prefix="/ingredientes", tags=["Ingredientes"])


@router.get("/", response_model=list[IngredienteResponse])
async def listar(db: AsyncSession = Depends(get_db)):
    return await service.listar_ingredientes(db)


@router.get("/alertas", response_model=list[IngredienteResponse])
async def alertas(db: AsyncSession = Depends(get_db)):
    return await service.obtener_alertas_stock(db)


@router.get("/{ingrediente_id}", response_model=IngredienteResponse)
async def obtener(ingrediente_id: UUID, db: AsyncSession = Depends(get_db)):
    ing = await service.obtener_ingrediente(db, ingrediente_id)
    if not ing:
        raise HTTPException(404, "Ingrediente no encontrado")
    return ing


@router.post("/", response_model=IngredienteResponse, status_code=201)
async def crear(data: IngredienteCreate, db: AsyncSession = Depends(get_db)):
    try:
        return await service.crear_ingrediente(db, data)
    except Exception as e:
        raise HTTPException(400, str(e))


@router.put("/{ingrediente_id}", response_model=IngredienteResponse)
async def actualizar(
    ingrediente_id: UUID, data: IngredienteUpdate, db: AsyncSession = Depends(get_db)
):
    result = await service.actualizar_ingrediente(db, ingrediente_id, data)
    if not result:
        raise HTTPException(404, "Ingrediente no encontrado")
    return result


@router.delete("/{ingrediente_id}")
async def eliminar(ingrediente_id: UUID, db: AsyncSession = Depends(get_db)):
    if not await service.eliminar_ingrediente(db, ingrediente_id):
        raise HTTPException(404, "Ingrediente no encontrado")
    return {"message": "Ingrediente eliminado"}


@router.post("/{ingrediente_id}/compra")
async def registrar_compra(
    ingrediente_id: UUID, data: CompraIngrediente, db: AsyncSession = Depends(get_db)
):
    try:
        return await service.registrar_compra(db, ingrediente_id, data)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/{ingrediente_id}/movimientos")
async def movimientos_ingrediente(
    ingrediente_id: UUID,
    fecha_desde: datetime | None = Query(None, description="Fecha inicio (ISO)"),
    fecha_hasta: datetime | None = Query(None, description="Fecha fin (ISO)"),
    tipo: str | None = Query(None, description="COMPRA, PRODUCCION, AJUSTE, MERMA"),
    db: AsyncSession = Depends(get_db),
):
    """Historial de movimientos de stock para un ingrediente."""
    from app.services import movimiento_service
    movimientos = await movimiento_service.historial_por_ingrediente(
        db, ingrediente_id, fecha_desde, fecha_hasta, tipo
    )
    return [
        movimiento_service.serializar_movimiento(m)
        for m in movimientos
    ]

