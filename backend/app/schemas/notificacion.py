"""Schemas de validación para Notificaciones."""

from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class NotificacionResponse(BaseModel):
    id: UUID
    tipo: str
    mensaje: str
    leida: bool
    referencia_tipo: str | None = None
    referencia_id: UUID | None = None
    fecha: datetime

    model_config = {"from_attributes": True}


class MarcarLeidasRequest(BaseModel):
    ids: list[UUID]
