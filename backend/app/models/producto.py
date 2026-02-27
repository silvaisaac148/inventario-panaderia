"""Modelo: Producto (producto terminado para venta)."""

import uuid
from datetime import datetime
from sqlalchemy import String, Numeric, DateTime, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Producto(Base):
    __tablename__ = "productos"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    nombre: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    precio_venta: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, default=0
    )
    stock_actual: Mapped[float] = mapped_column(
        Numeric(12, 4), nullable=False, default=0
    )
    stock_minimo: Mapped[float] = mapped_column(
        Numeric(12, 4), nullable=False, default=0
    )
    costo_unitario: Mapped[float] = mapped_column(
        Numeric(12, 4), nullable=False, default=0
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relaciones
    recetas = relationship("Receta", back_populates="producto")
    ventas = relationship("Venta", back_populates="producto")

    def __repr__(self):
        return f"<Producto {self.nombre} (stock: {self.stock_actual})>"
