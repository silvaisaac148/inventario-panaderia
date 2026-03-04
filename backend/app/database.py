"""Configuración de la base de datos con SQLAlchemy async.

Soporta SQLite (desarrollo local) y PostgreSQL (producción).
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

# SQLite necesita check_same_thread=False
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    connect_args=connect_args,
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    """Dependency que provee una sesión de DB por request."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def _run_migrations():
    """
    Migraciones incrementales seguras e idempotentes.

    Cada sentencia corre en su propia transacción para que un fallo
    (columna ya existe) en PostgreSQL no aborte las migraciones siguientes.
    """
    migraciones = [
        # v1.1 — estado en ventas
        "ALTER TABLE ventas ADD COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVA'",
        # v1.2 — costo_unitario en ventas
        "ALTER TABLE ventas ADD COLUMN costo_unitario NUMERIC(12, 4) NOT NULL DEFAULT 0.0000",
        # v1.3 — campos de costeo en recetas
        "ALTER TABLE recetas ADD COLUMN mano_de_obra NUMERIC(12, 4) NOT NULL DEFAULT 0",
        "ALTER TABLE recetas ADD COLUMN porcentaje_ganancia NUMERIC(5, 2) NOT NULL DEFAULT 0",
        "ALTER TABLE recetas ADD COLUMN porcentaje_merma NUMERIC(5, 2) NOT NULL DEFAULT 0",
    ]
    for sql in migraciones:
        try:
            async with engine.begin() as conn:
                await conn.execute(text(sql))
        except Exception:
            pass  # Columna ya existe — ignorar


async def init_db():
    """Crear todas las tablas y ejecutar migraciones."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _run_migrations()

