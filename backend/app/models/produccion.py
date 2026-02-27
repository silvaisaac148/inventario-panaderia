"""Modelo: Producción (registro de lotes producidos)."""

import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Numeric, DateTime, ForeignKey, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Produccion(Base):
    __tablename__ = "producciones"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    receta_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("recetas.id"), nullable=False
    )
    cantidad_producida: Mapped[int] = mapped_column(
        Integer, nullable=False
    )
    costo_total: Mapped[float] = mapped_column(
        Numeric(12, 4), nullable=False, default=0
    )
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, default="COMPLETADA"
    )  # COMPLETADA, CANCELADA
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relaciones
    receta = relationship("Receta", back_populates="producciones")

    def __repr__(self):
        return f"<Produccion {self.cantidad_producida} unidades ({self.estado})>"
