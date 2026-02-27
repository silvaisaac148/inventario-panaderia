"""Rutas API: Recetas."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.receta import RecetaCreate, RecetaUpdate, RecetaResponse
from app.services import receta_service as service

router = APIRouter(prefix="/recetas", tags=["Recetas"])


@router.get("/", response_model=list[RecetaResponse])
async def listar(db: AsyncSession = Depends(get_db)):
    recetas = await service.listar_recetas(db)
    # Enriquecer con datos de producto e ingredientes
    result = []
    for r in recetas:
        data = RecetaResponse.model_validate(r)
        data.producto_nombre = r.producto.nombre if r.producto else None
        for i, d in enumerate(data.detalles):
            if i < len(r.detalles) and r.detalles[i].ingrediente:
                d.ingrediente_nombre = r.detalles[i].ingrediente.nombre
        result.append(data)
    return result


@router.get("/{receta_id}", response_model=RecetaResponse)
async def obtener(receta_id: UUID, db: AsyncSession = Depends(get_db)):
    receta = await service.obtener_receta(db, receta_id)
    if not receta:
        raise HTTPException(404, "Receta no encontrada")
    data = RecetaResponse.model_validate(receta)
    data.producto_nombre = receta.producto.nombre if receta.producto else None
    for i, d in enumerate(data.detalles):
        if i < len(receta.detalles) and receta.detalles[i].ingrediente:
            d.ingrediente_nombre = receta.detalles[i].ingrediente.nombre
    return data


@router.get("/{receta_id}/costo")
async def calcular_costo(receta_id: UUID, db: AsyncSession = Depends(get_db)):
    try:
        return await service.calcular_costo_receta(db, receta_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.post("/", response_model=RecetaResponse, status_code=201)
async def crear(data: RecetaCreate, db: AsyncSession = Depends(get_db)):
    try:
        return await service.crear_receta(db, data)
    except Exception as e:
        raise HTTPException(400, str(e))


@router.put("/{receta_id}", response_model=RecetaResponse)
async def actualizar(
    receta_id: UUID, data: RecetaUpdate, db: AsyncSession = Depends(get_db)
):
    result = await service.actualizar_receta(db, receta_id, data)
    if not result:
        raise HTTPException(404, "Receta no encontrada")
    return result


@router.delete("/{receta_id}")
async def eliminar(receta_id: UUID, db: AsyncSession = Depends(get_db)):
    if not await service.eliminar_receta(db, receta_id):
        raise HTTPException(404, "Receta no encontrada")
    return {"message": "Receta eliminada"}
