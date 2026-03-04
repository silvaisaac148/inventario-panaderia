"""Schemas de validación para Recetas."""

from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime

UNIDADES_VALIDAS = "^(kg|g|lts|ml|und|hoj)$"


class RecetaDetalleCreate(BaseModel):
    ingrediente_id: UUID
    cantidad: float = Field(..., gt=0)
    unidad: str = Field(default="g", pattern=UNIDADES_VALIDAS)


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
    mano_de_obra: float = Field(default=0, ge=0, description="Costo de mano de obra por unidad producida (R$)")
    porcentaje_ganancia: float = Field(default=0, ge=0, le=10000, description="Porcentaje de ganancia markup sobre costo total (%)")
    porcentaje_merma: float = Field(default=0, ge=0, lt=100, description="Porcentaje de pérdida/merma esperada (%)")
    detalles: list[RecetaDetalleCreate] = Field(..., min_length=1)


class RecetaUpdate(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=200)
    rendimiento: int | None = Field(None, gt=0)
    notas: str | None = None
    activa: bool | None = None
    mano_de_obra: float | None = Field(None, ge=0)
    porcentaje_ganancia: float | None = Field(None, ge=0, le=10000)
    porcentaje_merma: float | None = Field(None, ge=0, lt=100)
    detalles: list[RecetaDetalleCreate] | None = None


class RecetaResponse(BaseModel):
    id: UUID
    producto_id: UUID
    producto_nombre: str | None = None
    nombre: str
    rendimiento: int
    notas: str | None
    activa: bool
    mano_de_obra: float = 0
    porcentaje_ganancia: float = 0
    porcentaje_merma: float = 0
    creado_en: datetime
    detalles: list[RecetaDetalleResponse] = []
    costo_total: float = 0
    costo_unitario: float = 0

    model_config = {"from_attributes": True}
