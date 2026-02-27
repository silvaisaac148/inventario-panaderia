"""Modelo: Usuario (autenticación y roles)."""

import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(200), nullable=False)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    rol: Mapped[str] = mapped_column(
        String(20), nullable=False, default="operador"
    )  # admin, operador
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self):
        return f"<Usuario {self.email} ({self.rol})>"
