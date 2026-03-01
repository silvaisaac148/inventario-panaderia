"""Modelo: Venta (registro de ventas de productos terminados)."""

import uuid
from datetime import datetime
from sqlalchemy import Integer, Numeric, DateTime, ForeignKey, Text, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Venta(Base):
    __tablename__ = "ventas"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    producto_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("productos.id"), nullable=False
    )
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)
    precio_unitario: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    costo_unitario: Mapped[float] = mapped_column(
        Numeric(12, 4), nullable=False, server_default="0.0000"
    )
    total: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    nota: Mapped[str | None] = mapped_column(Text, nullable=True)
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="ACTIVA"
    )  # ACTIVA, ANULADA
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relaciones
    producto = relationship("Producto", back_populates="ventas")

    def __repr__(self):
        return f"<Venta {self.cantidad}x ${self.precio_unitario} ({self.estado})>"

