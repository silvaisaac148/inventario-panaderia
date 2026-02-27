"""Configuración del proyecto — variables de entorno."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Base de datos
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/panaderia_db"

    # JWT
    SECRET_KEY: str = "tu-clave-secreta-cambiar-en-produccion"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 horas

    # App
    APP_NAME: str = "Inventario Panadería"
    DEBUG: bool = True
    API_PREFIX: str = "/api"

    # CORS
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
