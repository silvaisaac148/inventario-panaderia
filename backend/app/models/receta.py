"""Modelo: Receta y RecetaDetalle (fórmulas de producción)."""

import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Numeric, Boolean, DateTime, ForeignKey, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Receta(Base):
    __tablename__ = "recetas"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    producto_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("productos.id"), nullable=False
    )
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    rendimiento: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1
    )  # Cuántas unidades produce esta receta
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)
    activa: Mapped[bool] = mapped_column(Boolean, default=True)
    mano_de_obra: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False, default=0)
    porcentaje_ganancia: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    porcentaje_merma: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relaciones
    producto = relationship("Producto", back_populates="recetas")
    detalles = relationship(
        "RecetaDetalle", back_populates="receta", cascade="all, delete-orphan"
    )
    producciones = relationship("Produccion", back_populates="receta")

    def __repr__(self):
        return f"<Receta {self.nombre} (rinde {self.rendimiento})>"


class RecetaDetalle(Base):
    __tablename__ = "receta_detalle"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    receta_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("recetas.id", ondelete="CASCADE"), nullable=False
    )
    ingrediente_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("ingredientes.id"), nullable=False
    )
    cantidad: Mapped[float] = mapped_column(
        Numeric(12, 4), nullable=False
    )  # En la unidad del ingrediente
    unidad: Mapped[str] = mapped_column(
        String(20), nullable=False, default="g"
    )

    # Relaciones
    receta = relationship("Receta", back_populates="detalles")
    ingrediente = relationship("Ingrediente", back_populates="receta_detalles")

    def __repr__(self):
        return f"<RecetaDetalle {self.cantidad}{self.unidad}>"
