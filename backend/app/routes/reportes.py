"""Rutas API: Dashboard y Reportes."""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.ingrediente import Ingrediente
from app.models.producto import Producto
from app.models.produccion import Produccion
from app.models.venta import Venta
from app.models.movimiento import MovimientoStock
from app.models.usuario import Usuario
from app.services import movimiento_service
from app.utils.auth import require_admin

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


@router.get("/ganancias")
async def ganancias(
    fecha_desde: datetime | None = Query(None, description="Fecha inicio (ISO)"),
    fecha_hasta: datetime | None = Query(None, description="Fecha fin (ISO)"),
    db: AsyncSession = Depends(get_db),
):
    """Reporte de ganancias por producto en el período."""

    # Consultar ventas con producto en el rango de fechas
    query = select(Venta).options(selectinload(Venta.producto))

    if fecha_desde:
        query = query.where(Venta.fecha >= fecha_desde)
    if fecha_hasta:
        query = query.where(Venta.fecha <= fecha_hasta)

    result = await db.execute(query.order_by(Venta.fecha.desc()))
    ventas = result.scalars().all()

    # Agrupar por producto
    por_producto = {}
    total_ingresos = 0
    total_costos = 0

    for v in ventas:
        pid = str(v.producto_id)
        nombre = v.producto.nombre if v.producto else "Desconocido"
        costo_unit = float(v.costo_unitario) if v.costo_unitario else (float(v.producto.costo_unitario) if v.producto else 0)
        ingreso = float(v.total)
        costo = costo_unit * v.cantidad
        ganancia = ingreso - costo

        total_ingresos += ingreso
        total_costos += costo

        if pid not in por_producto:
            por_producto[pid] = {
                "producto": nombre,
                "cantidad_vendida": 0,
                "ingresos": 0,
                "costos": 0,
                "ganancia": 0,
            }
        por_producto[pid]["cantidad_vendida"] += v.cantidad
        por_producto[pid]["ingresos"] += ingreso
        por_producto[pid]["costos"] += costo
        por_producto[pid]["ganancia"] += ganancia

    # Calcular márgenes y redondear
    desglose = []
    for item in por_producto.values():
        margen = (item["ganancia"] / item["ingresos"] * 100) if item["ingresos"] > 0 else 0
        desglose.append({
            **item,
            "ingresos": round(item["ingresos"], 2),
            "costos": round(item["costos"], 2),
            "ganancia": round(item["ganancia"], 2),
            "margen": round(margen, 1),
        })

    # Ordenar por ganancia de mayor a menor
    desglose.sort(key=lambda x: x["ganancia"], reverse=True)

    ganancia_total = total_ingresos - total_costos
    margen_promedio = (ganancia_total / total_ingresos * 100) if total_ingresos > 0 else 0

    return {
        "total_ingresos": round(total_ingresos, 2),
        "total_costos": round(total_costos, 2),
        "ganancia_total": round(ganancia_total, 2),
        "margen_promedio": round(margen_promedio, 1),
        "total_ventas": len(ventas),
        "desglose_productos": desglose,
    }


@router.get("/movimientos")
async def movimientos_global(
    fecha_desde: datetime | None = Query(None, description="Fecha inicio (ISO)"),
    fecha_hasta: datetime | None = Query(None, description="Fecha fin (ISO)"),
    tipo: str | None = Query(None, description="COMPRA, PRODUCCION, AJUSTE, MERMA"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Historial global de movimientos de stock."""
    movimientos = await movimiento_service.historial_global(
        db, fecha_desde, fecha_hasta, tipo, limit
    )
    return [
        movimiento_service.serializar_movimiento(m, incluir_ingrediente=True)
        for m in movimientos
    ]


@router.get("/actividad-reciente")
async def actividad_reciente(
    limit: int = Query(10, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
):
    """Últimos movimientos para el dashboard."""
    return await movimiento_service.actividad_reciente(db, limit)


@router.get("/tendencias")
async def tendencias_ventas(
    dias: int = Query(30, ge=7, le=90),
    db: AsyncSession = Depends(get_db),
):
    """Ventas agrupadas por día para gráfico de tendencias."""
    fecha_inicio = datetime.utcnow() - timedelta(days=dias)

    # Ventas por día
    query = (
        select(
            func.date(Venta.fecha).label("dia"),
            func.sum(Venta.total).label("total"),
            func.count(Venta.id).label("num_ventas"),
        )
        .where(Venta.fecha >= fecha_inicio)
        .group_by(func.date(Venta.fecha))
        .order_by(func.date(Venta.fecha))
    )
    result = await db.execute(query)
    rows = result.all()

    # Top 5 productos más vendidos en el período
    top_query = (
        select(
            Producto.nombre,
            func.sum(Venta.cantidad).label("total_vendido"),
            func.sum(Venta.total).label("total_ingresos"),
        )
        .join(Producto, Venta.producto_id == Producto.id)
        .where(Venta.fecha >= fecha_inicio)
        .group_by(Producto.nombre)
        .order_by(func.sum(Venta.total).desc())
        .limit(5)
    )
    top_result = await db.execute(top_query)
    top_rows = top_result.all()

    return {
        "ventas_por_dia": [
            {
                "dia": str(r.dia),
                "total": round(float(r.total), 2),
                "num_ventas": r.num_ventas,
            }
            for r in rows
        ],
        "top_productos": [
            {
                "producto": r.nombre,
                "cantidad_vendida": int(r.total_vendido),
                "ingresos": round(float(r.total_ingresos), 2),
            }
            for r in top_rows
        ],
    }


@router.delete("/reset-db", dependencies=[Depends(require_admin)])
async def reset_database(
    db: AsyncSession = Depends(get_db),
):
    """
    ⚠️ ALERTA: Borra todos los datos del inventario, ventas y producción.
    Solo accesible por administradores autenticados.
    """
    from sqlalchemy import text
    try:
        # Borrar en orden para respetar las Constraints de llaves foráneas
        await db.execute(text("DELETE FROM notificaciones"))
        await db.execute(text("DELETE FROM movimientos_stock"))
        await db.execute(text("DELETE FROM ventas"))
        await db.execute(text("DELETE FROM producciones"))
        await db.execute(text("DELETE FROM receta_detalle"))
        await db.execute(text("DELETE FROM recetas"))
        await db.execute(text("DELETE FROM productos"))
        await db.execute(text("DELETE FROM ingredientes"))

        await db.commit()
        return {"mensaje": "Base de datos restaurada de fábrica exitosamente.", "status": "ok"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
