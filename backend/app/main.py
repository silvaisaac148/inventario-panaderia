"""
🏭 Sistema de Inventario para Panadería — Entry Point

FastAPI application with:
- CRUD for ingredientes, productos, recetas
- Producción automática (descuenta stock)
- Ventas
- Import/Export Excel
- Dashboard y reportes
- Auth JWT
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import init_db
from app.routes import ingredientes, productos, recetas, produccion, ventas, excel, auth, reportes

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Crear tablas al iniciar si no existen."""
    await init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="Sistema de inventario y producción para panadería",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — permitir frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:3000",
        "https://inventario-panaderia-blush.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar rutas
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(ingredientes.router, prefix=settings.API_PREFIX)
app.include_router(productos.router, prefix=settings.API_PREFIX)
app.include_router(recetas.router, prefix=settings.API_PREFIX)
app.include_router(produccion.router, prefix=settings.API_PREFIX)
app.include_router(ventas.router, prefix=settings.API_PREFIX)
app.include_router(excel.router, prefix=settings.API_PREFIX)
app.include_router(reportes.router, prefix=settings.API_PREFIX)


@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "status": "🟢 Activo",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
