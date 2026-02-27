"""Modelo: Ingrediente (materia prima)."""

import uuid
from datetime import datetime
from sqlalchemy import String, Numeric, DateTime, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Ingrediente(Base):
    __tablename__ = "ingredientes"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    nombre: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    unidad_medida: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # kg, g, lts, und, ml
    stock_actual: Mapped[float] = mapped_column(
        Numeric(12, 4), nullable=False, default=0
    )
    stock_minimo: Mapped[float] = mapped_column(
        Numeric(12, 4), nullable=False, default=0
    )
    costo_unitario: Mapped[float] = mapped_column(
        Numeric(12, 4), nullable=False, default=0
    )
    costo_por_gramo: Mapped[float] = mapped_column(
        Numeric(12, 6), nullable=False, default=0
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relaciones
    movimientos = relationship("MovimientoStock", back_populates="ingrediente", cascade="all, delete-orphan")
    receta_detalles = relationship("RecetaDetalle", back_populates="ingrediente", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Ingrediente {self.nombre} ({self.stock_actual} {self.unidad_medida})>"
