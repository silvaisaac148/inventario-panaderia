"""Rutas API: Excel — importar y exportar."""

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import excel_service as service
import io

router = APIRouter(prefix="/excel", tags=["Excel"])


# ============ IMPORTACIÓN ============

@router.post("/importar/ingredientes")
async def importar_ingredientes(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Importa ingredientes desde un archivo Excel (.xlsx)."""
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(400, "El archivo debe ser .xlsx o .xls")

    content = await file.read()
    try:
        result = await service.importar_ingredientes_excel(db, content)
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Error procesando archivo: {str(e)}")


@router.post("/importar/recetas")
async def importar_recetas(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Importa recetas desde un archivo Excel (.xlsx)."""
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(400, "El archivo debe ser .xlsx o .xls")

    content = await file.read()
    try:
        result = await service.importar_recetas_excel(db, content)
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Error procesando archivo: {str(e)}")


# ============ EXPORTACIÓN ============
# Acepta token como query param para descarga directa desde el navegador

@router.get("/exportar/stock.xlsx")
async def exportar_stock(
    token: str = Query(None, description="JWT token para descarga directa"),
    db: AsyncSession = Depends(get_db),
):
    """Exporta el stock actual de ingredientes a Excel."""
    content = await service.exportar_stock_excel(db)
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="stock_ingredientes.xlsx"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.get("/exportar/movimientos.xlsx")
async def exportar_movimientos(
    token: str = Query(None, description="JWT token para descarga directa"),
    db: AsyncSession = Depends(get_db),
):
    """Exporta el historial de movimientos de stock a Excel."""
    content = await service.exportar_movimientos_excel(db)
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="movimientos_stock.xlsx"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )
