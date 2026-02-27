"""Schemas de validación para Producción."""

from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


class ProduccionCreate(BaseModel):
    receta_id: UUID
    cantidad_producida: int = Field(..., gt=0, examples=[35])


class ProduccionResponse(BaseModel):
    id: UUID
    receta_id: UUID
    receta_nombre: str | None = None
    producto_nombre: str | None = None
    cantidad_producida: int
    costo_total: float
    costo_unitario: float = 0
    estado: str
    fecha: datetime
    ingredientes_usados: list[dict] = []

    model_config = {"from_attributes": True}
