"""Schemas de validación para Ingredientes."""

from pydantic import BaseModel, Field, model_validator
from uuid import UUID
from datetime import datetime
from typing import Optional

UNIDADES_VALIDAS = "^(kg|g|lts|ml|und|hoj)$"


# --- Request schemas ---

class IngredienteCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=200, examples=["Harina de trigo"])
    unidad_medida: str = Field(..., pattern=UNIDADES_VALIDAS, examples=["kg"])
    stock_actual: float = Field(default=0, ge=0)
    stock_minimo: float = Field(default=0, ge=0)
    costo_unitario: float = Field(default=0, ge=0)


class IngredienteUpdate(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=200)
    unidad_medida: str | None = Field(None, pattern=UNIDADES_VALIDAS)
    stock_minimo: float | None = Field(None, ge=0)
    costo_unitario: float | None = Field(None, ge=0)


class CompraIngrediente(BaseModel):
    """
    Registrar una compra de ingrediente.

    Modo A — Compra directa:
        cantidad + costo_total  (en la unidad base del ingrediente)

    Modo B — Compra por presentación (sacos, cajas, paquetes):
        cantidad_presentacion + peso_por_presentacion + costo_por_presentacion
        Ej: 50 sacos × 50 kg/saco × R$260/saco = 2500 kg por R$13.000
    """
    # Modo A
    cantidad: Optional[float] = Field(None, gt=0, examples=[25])
    costo_total: Optional[float] = Field(None, gt=0, examples=[260])
    nota: Optional[str] = Field(None, max_length=200)

    # Modo B
    cantidad_presentacion: Optional[float] = Field(None, gt=0, examples=[50], description="Cantidad de sacos/cajas/paquetes")
    unidad_presentacion: Optional[str] = Field(None, max_length=50, examples=["saco"], description="Nombre de la presentación (saco, caja, paquete...)")
    peso_por_presentacion: Optional[float] = Field(None, gt=0, examples=[50], description="Peso/volumen por presentación en la unidad base del ingrediente")
    costo_por_presentacion: Optional[float] = Field(None, gt=0, examples=[260], description="Precio por presentación en R$")

    @model_validator(mode='after')
    def validar_modo(self):
        tiene_directo = self.cantidad is not None and self.costo_total is not None
        tiene_presentacion = (
            self.cantidad_presentacion is not None and
            self.peso_por_presentacion is not None and
            self.costo_por_presentacion is not None
        )
        if not tiene_directo and not tiene_presentacion:
            raise ValueError(
                "Debe proveer (cantidad + costo_total) para compra directa, "
                "o (cantidad_presentacion + peso_por_presentacion + costo_por_presentacion) "
                "para compra por presentación."
            )
        return self


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
        if self.stock_actual <= self.stock_minimo:
            self.alerta_stock = True
