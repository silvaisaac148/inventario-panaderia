"""Modelo: MovimientoStock (auditoría de todo cambio de inventario)."""

import uuid
from datetime import datetime
from sqlalchemy import String, Numeric, DateTime, ForeignKey, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class MovimientoStock(Base):
    __tablename__ = "movimientos_stock"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    ingrediente_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("ingredientes.id"), nullable=False
    )
    tipo: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # COMPRA, PRODUCCION, AJUSTE, MERMA
    cantidad: Mapped[float] = mapped_column(
        Numeric(12, 4), nullable=False
    )
    costo_total: Mapped[float] = mapped_column(
        Numeric(12, 4), nullable=True, default=0
    )
    referencia: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )  # Descripción del origen
    referencia_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, nullable=True
    )  # ID de producción/compra que generó este movimiento
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relaciones
    ingrediente = relationship("Ingrediente", back_populates="movimientos")

    def __repr__(self):
        return f"<Movimiento {self.tipo} {self.cantidad} - {self.referencia}>"
