"""Modelo: Notificacion (alertas proactivas del sistema)."""

import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Notificacion(Base):
    __tablename__ = "notificaciones"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    tipo: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # STOCK_BAJO, STOCK_REPUESTO, PRODUCCION, INFO
    mensaje: Mapped[str] = mapped_column(
        Text, nullable=False
    )
    leida: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    referencia_tipo: Mapped[str | None] = mapped_column(
        String(30), nullable=True
    )  # ingrediente, producto, produccion
    referencia_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, nullable=True
    )
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self):
        return f"<Notificacion {self.tipo}: {self.mensaje[:50]}>"
