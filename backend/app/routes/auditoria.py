from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from ..core.database import get_db
from ..core.security import get_current_user
from ..models.employee import Employee
from ..models.auditoria import EvaluacionAuditoria
from ..schemas.auditoria import EvaluacionResponse, StockNegativoItem

router = APIRouter(prefix="/api/auditoria", tags=["auditoria"])


@router.get("/stock-negativo", response_model=List[StockNegativoItem])
async def get_stock_negativo(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener productos con stock negativo de la sucursal.
    TODO: Conectar con sistema de compras cuando esté disponible.
    """
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    # Por ahora retorna datos de ejemplo
    # Cuando esté el sistema de compras, se conectará a esa BD
    return []


@router.get("/pilares", response_model=List[EvaluacionResponse])
async def get_pilares_auditoria(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener últimas evaluaciones de pilares de auditoría"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    # Obtener el dux_id de la sucursal
    sucursal_query = text("SELECT dux_id FROM sucursales WHERE id = :id")
    sucursal_result = db.execute(sucursal_query, {"id": current_user.sucursal_id}).fetchone()
    sucursal_dux_id = sucursal_result.dux_id if sucursal_result else current_user.sucursal_id

    evaluaciones = db.query(EvaluacionAuditoria).filter(
        EvaluacionAuditoria.sucursal_id == sucursal_dux_id
    ).order_by(
        EvaluacionAuditoria.periodo.desc(),
        EvaluacionAuditoria.pilar
    ).limit(12).all()

    return [EvaluacionResponse.model_validate(e) for e in evaluaciones]


@router.get("/pilares/{periodo}", response_model=List[EvaluacionResponse])
async def get_pilares_por_periodo(
    periodo: str,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener evaluaciones de un período específico"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    # Obtener el dux_id de la sucursal
    sucursal_query = text("SELECT dux_id FROM sucursales WHERE id = :id")
    sucursal_result = db.execute(sucursal_query, {"id": current_user.sucursal_id}).fetchone()
    sucursal_dux_id = sucursal_result.dux_id if sucursal_result else current_user.sucursal_id

    evaluaciones = db.query(EvaluacionAuditoria).filter(
        EvaluacionAuditoria.sucursal_id == sucursal_dux_id,
        EvaluacionAuditoria.periodo == periodo
    ).order_by(EvaluacionAuditoria.pilar).all()

    return [EvaluacionResponse.model_validate(e) for e in evaluaciones]


@router.get("/resumen")
async def get_resumen_auditoria(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resumen del estado de auditoría de la sucursal"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    # Obtener el dux_id de la sucursal
    sucursal_query = text("SELECT dux_id FROM sucursales WHERE id = :id")
    sucursal_result = db.execute(sucursal_query, {"id": current_user.sucursal_id}).fetchone()
    sucursal_dux_id = sucursal_result.dux_id if sucursal_result else current_user.sucursal_id

    # Obtener última evaluación por pilar
    query = text("""
        SELECT DISTINCT ON (pilar)
            pilar,
            periodo,
            puntaje,
            aprobado
        FROM evaluaciones_auditoria
        WHERE sucursal_id = :sucursal_id
        ORDER BY pilar, periodo DESC
    """)

    try:
        results = db.execute(query, {"sucursal_id": sucursal_dux_id}).fetchall()
    except:
        results = []

    pilares = {
        "orden_limpieza": {"puntaje": None, "aprobado": None, "periodo": None},
        "cumplimiento_admin": {"puntaje": None, "aprobado": None, "periodo": None},
        "gestion_clientes": {"puntaje": None, "aprobado": None, "periodo": None},
    }

    for row in results:
        if row.pilar in pilares:
            pilares[row.pilar] = {
                "puntaje": float(row.puntaje) if row.puntaje else None,
                "aprobado": row.aprobado,
                "periodo": row.periodo,
            }

    return {
        "pilares": pilares,
        "stock_negativo_count": 0,  # TODO: Conectar con compras
    }
