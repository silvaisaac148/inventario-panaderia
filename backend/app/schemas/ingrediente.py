"""Schemas de validación para Ingredientes."""

from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


# --- Request schemas ---

class IngredienteCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=200, examples=["Harina de trigo"])
    unidad_medida: str = Field(..., pattern="^(kg|g|lts|ml|und)$", examples=["kg"])
    stock_actual: float = Field(default=0, ge=0)
    stock_minimo: float = Field(default=0, ge=0)
    costo_unitario: float = Field(default=0, ge=0)


class IngredienteUpdate(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=200)
    unidad_medida: str | None = Field(None, pattern="^(kg|g|lts|ml|und)$")
    stock_minimo: float | None = Field(None, ge=0)
    costo_unitario: float | None = Field(None, ge=0)


class CompraIngrediente(BaseModel):
    """Registrar una compra de ingrediente."""
    cantidad: float = Field(..., gt=0, examples=[25])
    costo_total: float = Field(..., gt=0, examples=[260])
    nota: str | None = Field(None, max_length=200)


# --- Response schemas ---

class IngredienteResponse(BaseModel):
    id: UUID
    nombre: str
    unidad_medida: str
    stock_actual: float
    stock_minimo: float
    costo_unitario: float
    costo_por_gramo: float
    creado_en: datetime
    actualizado_en: datetime
    alerta_stock: bool = False

    model_config = {"from_attributes": True}

    def __init__(self, **data):
        super().__init__(**data)
        # Marcar alerta si stock está por debajo del mínimo
        if self.stock_actual <= self.stock_minimo:
            self.alerta_stock = True
