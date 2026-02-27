"""Rutas API: Dashboard y Reportes."""

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.ingrediente import Ingrediente
from app.models.producto import Producto
from app.models.produccion import Produccion
from app.models.venta import Venta
from app.models.movimiento import MovimientoStock

router = APIRouter(prefix="/reportes", tags=["Reportes"])


@router.get("/dashboard")
async def dashboard(db: AsyncSession = Depends(get_db)):
    """Datos principales para el dashboard."""

    # Total ingredientes
    result = await db.execute(select(func.count(Ingrediente.id)))
    total_ingredientes = result.scalar() or 0

    # Total productos
    result = await db.execute(select(func.count(Producto.id)))
    total_productos = result.scalar() or 0

    # Ingredientes con alerta de stock bajo
    result = await db.execute(
        select(func.count(Ingrediente.id)).where(
            Ingrediente.stock_actual <= Ingrediente.stock_minimo
        )
    )
    alertas_stock = result.scalar() or 0

    # Total producciones
    result = await db.execute(select(func.count(Produccion.id)))
    total_producciones = result.scalar() or 0

    # Total ventas y valor
    result = await db.execute(select(func.sum(Venta.total)))
    valor_ventas = float(result.scalar() or 0)

    result = await db.execute(select(func.count(Venta.id)))
    total_ventas = result.scalar() or 0

    # Valor del inventario (ingredientes)
    result = await db.execute(
        select(func.sum(Ingrediente.stock_actual * Ingrediente.costo_unitario))
    )
    valor_inventario_ingredientes = float(result.scalar() or 0)

    # Valor del inventario (productos)
    result = await db.execute(
        select(func.sum(Producto.stock_actual * Producto.costo_unitario))
    )
    valor_inventario_productos = float(result.scalar() or 0)

    return {
        "total_ingredientes": total_ingredientes,
        "total_productos": total_productos,
        "alertas_stock": alertas_stock,
        "total_producciones": total_producciones,
        "total_ventas": total_ventas,
        "valor_ventas": round(valor_ventas, 2),
        "valor_inventario_ingredientes": round(valor_inventario_ingredientes, 2),
        "valor_inventario_productos": round(valor_inventario_productos, 2),
        "valor_inventario_total": round(
            valor_inventario_ingredientes + valor_inventario_productos, 2
        ),
    }
