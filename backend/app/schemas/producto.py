"""Schemas de validación para Productos."""

from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


class ProductoCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=200, examples=["Pan Integral"])
    precio_venta: float = Field(default=0, ge=0, examples=[15.00])
    stock_minimo: float = Field(default=0, ge=0)


class ProductoUpdate(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=200)
    precio_venta: float | None = Field(None, ge=0)
    stock_minimo: float | None = Field(None, ge=0)


class ProductoResponse(BaseModel):
    id: UUID
    nombre: str
    precio_venta: float
    stock_actual: float
    stock_minimo: float
    costo_unitario: float
    creado_en: datetime
    actualizado_en: datetime
    alerta_stock: bool = False
    margen: float = 0  # margen de ganancia %

    model_config = {"from_attributes": True}

    def __init__(self, **data):
        super().__init__(**data)
        if self.stock_actual <= self.stock_minimo:
            self.alerta_stock = True
        if self.costo_unitario > 0 and self.precio_venta > 0:
            self.margen = round(
                ((self.precio_venta - self.costo_unitario) / self.precio_venta) * 100, 2
            )
