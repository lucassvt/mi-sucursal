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
        WHERE nro_pto_vta = CAST(:pto_vta AS text)
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
            WHERE nro_pto_vta = CAST(:pto_vta AS text)
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
        WHERE nro_pto_vta = CAST(:pto_vta AS text)
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


@router.get("/gestion-administrativa")
async def get_gestion_administrativa(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Métricas de Gestión Administrativa:
    - Gastos del mes (tabla compras, es_gasto='S')
    - Ventas del mes (tabla facturas)
    - % gastos sobre ventas
    - Pedidos pendientes de facturar (tabla pedidos)
    - Transferencias pendientes (carga manual, retorna 0)
    """
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    # Obtener dux_id y nombre de la sucursal
    sucursal_query = text("SELECT dux_id, nombre FROM sucursales WHERE id = :id")
    sucursal_result = db.execute(sucursal_query, {"id": current_user.sucursal_id}).fetchone()

    if not sucursal_result:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")

    sucursal_dux_id = sucursal_result.dux_id
    sucursal_nombre = sucursal_result.nombre

    # Obtener nro_pto_vta desde pto_vta_deposito_mapping (puede diferir de dux_id)
    nombre_limpio = sucursal_nombre.strip().replace("  ", " ")
    pto_vta_query = text("""
        SELECT nro_pto_vta FROM pto_vta_deposito_mapping
        WHERE UPPER(TRIM(sucursal_nombre)) = UPPER(TRIM(:nombre))
        LIMIT 1
    """)
    pto_vta_result = db.execute(pto_vta_query, {"nombre": nombre_limpio}).fetchone()
    nro_pto_vta = pto_vta_result.nro_pto_vta if pto_vta_result else sucursal_dux_id

    # Periodo actual
    from datetime import datetime
    periodo = datetime.now().strftime("%Y-%m")

    # 1. Gastos del mes (tabla compras, es_gasto='S')
    # compras.total ya es VARCHAR con formato decimal (ej: "67500.0")
    gastos_query = text("""
        SELECT COALESCE(SUM(CAST(total AS numeric)), 0) as gastos_mes
        FROM compras
        WHERE es_gasto = 'S'
          AND id_sucursal_empresa = :dux_id
          AND TO_DATE(fecha_comp, 'DD/MM/YYYY') >= DATE_TRUNC('month', CURRENT_DATE)
          AND TO_DATE(fecha_comp, 'DD/MM/YYYY') < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    """)

    # 2. Ventas del mes (tabla facturas, usa nro_pto_vta de pto_vta_deposito_mapping)
    ventas_query = text("""
        SELECT COALESCE(SUM(total), 0) as ventas_mes
        FROM facturas
        WHERE nro_pto_vta = CAST(:pto_vta AS text)
          AND (anulada_boolean = false OR anulada_boolean IS NULL)
          AND fecha_comp::date >= DATE_TRUNC('month', CURRENT_DATE)
          AND fecha_comp::date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    """)

    # 3. Pedidos pendientes de facturar
    pedidos_query = text("""
        SELECT COUNT(*) as pedidos_pendientes
        FROM pedidos
        WHERE id_sucursal = :dux_id
          AND estado_facturacion IN ('PENDIENTE', 'FACTURADO_PARCIAL')
          AND (anulado_boolean = false OR anulado_boolean IS NULL)
    """)

    try:
        gastos_result = db.execute(gastos_query, {"dux_id": sucursal_dux_id}).fetchone()
        gastos_mes = float(gastos_result.gastos_mes) if gastos_result else 0.0

        ventas_result = db.execute(ventas_query, {"pto_vta": nro_pto_vta}).fetchone()
        ventas_mes = float(ventas_result.ventas_mes) if ventas_result else 0.0

        pedidos_result = db.execute(pedidos_query, {"dux_id": sucursal_dux_id}).fetchone()
        pedidos_pendientes = pedidos_result.pedidos_pendientes if pedidos_result else 0

        # Calcular porcentaje
        porcentaje = round((gastos_mes / ventas_mes * 100), 2) if ventas_mes > 0 else 0.0

        return {
            "sucursal": sucursal_nombre,
            "periodo": periodo,
            "gastos_mes": round(gastos_mes, 2),
            "ventas_mes": round(ventas_mes, 2),
            "porcentaje_gastos_ventas": porcentaje,
            "pedidos_pendientes_facturar": pedidos_pendientes,
            "transferencias_pendientes": 0,
            "transferencias_manual": True,
        }
    except Exception as e:
        return {
            "sucursal": sucursal_nombre,
            "periodo": periodo,
            "gastos_mes": 0.0,
            "ventas_mes": 0.0,
            "porcentaje_gastos_ventas": 0.0,
            "pedidos_pendientes_facturar": 0,
            "transferencias_pendientes": 0,
            "transferencias_manual": True,
            "error": str(e),
        }
