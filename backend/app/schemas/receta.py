"""Schemas de validación para Recetas."""

from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


class RecetaDetalleCreate(BaseModel):
    ingrediente_id: UUID
    cantidad: float = Field(..., gt=0)
    unidad: str = Field(default="g", pattern="^(kg|g|lts|ml|und)$")


class RecetaDetalleResponse(BaseModel):
    id: UUID
    ingrediente_id: UUID
    ingrediente_nombre: str | None = None
    cantidad: float
    unidad: str

    model_config = {"from_attributes": True}


class RecetaCreate(BaseModel):
    producto_id: UUID
    nombre: str = Field(..., min_length=1, max_length=200, examples=["Pan Integral Fibra"])
    rendimiento: int = Field(..., gt=0, examples=[35])
    notas: str | None = None
    detalles: list[RecetaDetalleCreate] = Field(..., min_length=1)


class RecetaUpdate(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=200)
    rendimiento: int | None = Field(None, gt=0)
    notas: str | None = None
    activa: bool | None = None
    detalles: list[RecetaDetalleCreate] | None = None


class RecetaResponse(BaseModel):
    id: UUID
    producto_id: UUID
    producto_nombre: str | None = None
    nombre: str
    rendimiento: int
    notas: str | None
    activa: bool
    creado_en: datetime
    detalles: list[RecetaDetalleResponse] = []
    costo_total: float = 0
    costo_unitario: float = 0

    model_config = {"from_attributes": True}
