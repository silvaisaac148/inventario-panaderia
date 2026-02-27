"""Modelo: Venta (registro de ventas de productos terminados)."""

import uuid
from datetime import datetime
from sqlalchemy import Integer, Numeric, DateTime, ForeignKey, Text, Uuid, func
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
    total: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    nota: Mapped[str | None] = mapped_column(Text, nullable=True)
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relaciones
    producto = relationship("Producto", back_populates="ventas")

    def __repr__(self):
        return f"<Venta {self.cantidad}x ${self.precio_unitario}>"
