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


@router.get("/club-mascotera")
async def get_club_mascotera_metrics(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Métricas de Servicios Club La Mascotera:
    - Porcentaje de facturas a consumidor final
    - Total de facturas del período
    """
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    # Obtener el dux_id de la sucursal (usado como nro_pto_vta en facturas)
    sucursal_query = text("SELECT dux_id, nombre FROM sucursales WHERE id = :id")
    sucursal_result = db.execute(sucursal_query, {"id": current_user.sucursal_id}).fetchone()

    if not sucursal_result:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")

    sucursal_dux_id = sucursal_result.dux_id
    sucursal_nombre = sucursal_result.nombre

    # Primero obtener el último mes con datos disponibles
    ultimo_mes_query = text("""
        SELECT DATE_TRUNC('month', fecha_comp::date) as ultimo_mes
        FROM facturas
        WHERE nro_pto_vta = :pto_vta::text
          AND anulada_boolean = false
        ORDER BY fecha_comp::date DESC
        LIMIT 1
    """)

    # Calcular porcentaje de facturas a consumidor final del último mes con datos
    # NOTA: fecha_comp es VARCHAR, hay que convertirlo a date
    query = text("""
        WITH ultimo_mes AS (
            SELECT DATE_TRUNC('month', MAX(fecha_comp::date)) as mes_inicio,
                   DATE_TRUNC('month', MAX(fecha_comp::date)) + INTERVAL '1 month' as mes_fin
            FROM facturas
            WHERE nro_pto_vta = :pto_vta::text
              AND anulada_boolean = false
        )
        SELECT
            COUNT(*) as total_facturas,
            COUNT(*) FILTER (
                WHERE apellido_razon_soc ILIKE '%CONSUMIDOR%FINAL%'
                   OR apellido_razon_soc = 'CONSUMIDOR'
            ) as facturas_consumidor_final,
            ROUND(
                COALESCE(
                    COUNT(*) FILTER (
                        WHERE apellido_razon_soc ILIKE '%CONSUMIDOR%FINAL%'
                           OR apellido_razon_soc = 'CONSUMIDOR'
                    )::numeric / NULLIF(COUNT(*), 0) * 100,
                    0
                ), 2
            ) as porcentaje_consumidor_final,
            (SELECT TO_CHAR(mes_inicio, 'YYYY-MM') FROM ultimo_mes) as periodo
        FROM facturas, ultimo_mes
        WHERE nro_pto_vta = :pto_vta::text
          AND anulada_boolean = false
          AND fecha_comp::date >= ultimo_mes.mes_inicio
          AND fecha_comp::date < ultimo_mes.mes_fin
    """)

    try:
        result = db.execute(query, {"pto_vta": sucursal_dux_id}).fetchone()

        periodo = result.periodo if result and result.periodo else "sin_datos"

        return {
            "sucursal": sucursal_nombre,
            "sucursal_dux_id": sucursal_dux_id,
            "periodo": periodo,
            "total_facturas": result.total_facturas or 0 if result else 0,
            "facturas_consumidor_final": result.facturas_consumidor_final or 0 if result else 0,
            "porcentaje_consumidor_final": float(result.porcentaje_consumidor_final or 0) if result else 0.0,
            "meta_porcentaje": 30.0,  # Meta: máximo 30% a consumidor final
            "cumple_meta": float(result.porcentaje_consumidor_final or 0) <= 30.0 if result else True
        }
    except Exception as e:
        # Si hay error, retornar valores por defecto
        return {
            "sucursal": sucursal_nombre,
            "sucursal_dux_id": sucursal_dux_id,
            "periodo": "error",
            "total_facturas": 0,
            "facturas_consumidor_final": 0,
            "porcentaje_consumidor_final": 0.0,
            "meta_porcentaje": 30.0,
            "cumple_meta": True,
            "error": str(e)
        }
