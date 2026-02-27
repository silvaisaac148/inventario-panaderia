"""Schemas de validación para Ventas."""

from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


class VentaCreate(BaseModel):
    producto_id: UUID
    cantidad: int = Field(..., gt=0, examples=[10])
    precio_unitario: float | None = None  # Si es None, usa precio_venta del producto
    nota: str | None = None


class VentaResponse(BaseModel):
    id: UUID
    producto_id: UUID
    producto_nombre: str | None = None
    cantidad: int
    precio_unitario: float
    total: float
    nota: str | None
    fecha: datetime

    model_config = {"from_attributes": True}
