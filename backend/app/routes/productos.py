"""Rutas API: Productos."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.producto import ProductoCreate, ProductoUpdate, ProductoResponse
from app.services import producto_service as service

router = APIRouter(prefix="/productos", tags=["Productos"])


@router.get("/", response_model=list[ProductoResponse])
async def listar(db: AsyncSession = Depends(get_db)):
    return await service.listar_productos(db)


@router.get("/{producto_id}", response_model=ProductoResponse)
async def obtener(producto_id: UUID, db: AsyncSession = Depends(get_db)):
    prod = await service.obtener_producto(db, producto_id)
    if not prod:
        raise HTTPException(404, "Producto no encontrado")
    return prod


@router.post("/", response_model=ProductoResponse, status_code=201)
async def crear(data: ProductoCreate, db: AsyncSession = Depends(get_db)):
    return await service.crear_producto(db, data)


@router.put("/{producto_id}", response_model=ProductoResponse)
async def actualizar(
    producto_id: UUID, data: ProductoUpdate, db: AsyncSession = Depends(get_db)
):
    result = await service.actualizar_producto(db, producto_id, data)
    if not result:
        raise HTTPException(404, "Producto no encontrado")
    return result


@router.delete("/{producto_id}")
async def eliminar(producto_id: UUID, db: AsyncSession = Depends(get_db)):
    if not await service.eliminar_producto(db, producto_id):
        raise HTTPException(404, "Producto no encontrado")
    return {"message": "Producto eliminado"}
