from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, func, distinct
from typing import List, Optional
from ..core.database import get_db, get_db_anexa
from ..core.security import get_current_user, es_encargado
from ..models.employee import Employee, SucursalInfo
from ..models.auditoria_mensual import AuditoriaMensual
from ..schemas.auditoria_mensual import (
    AuditoriaMensualCreate,
    AuditoriaMensualResponse,
    AuditoriaMensualBulkCreate,
)

router = APIRouter(prefix="/api/auditoria-mensual", tags=["auditoria-mensual"])


@router.get("/todas")
async def listar_auditoria_todas(
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Resumen de auditoria mensual de TODAS las sucursales (solo encargados).
    Retorna el ultimo periodo + 3 anteriores para cada sucursal."""
    if not es_encargado(current_user):
        raise HTTPException(status_code=403, detail="Solo encargados pueden ver todas las sucursales")

    # Obtener los ultimos 4 periodos disponibles
    periodos = db_anexa.query(
        distinct(AuditoriaMensual.periodo)
    ).order_by(AuditoriaMensual.periodo.desc()).limit(4).all()
    periodos = [p[0] for p in periodos]

    if not periodos:
        return []

    # Obtener todos los registros de esos periodos
    registros = db_anexa.query(AuditoriaMensual).filter(
        AuditoriaMensual.periodo.in_(periodos)
    ).order_by(AuditoriaMensual.periodo.desc()).all()

    # Mapear nombres de sucursales desde DUX
    sucursal_ids = list(set(r.sucursal_id for r in registros))
    sucursales_dux = db_dux.query(SucursalInfo).filter(
        SucursalInfo.dux_id.in_(sucursal_ids)
    ).all()
    nombres_sucursal = {s.dux_id: s.nombre for s in sucursales_dux}

    # Agrupar por sucursal
    por_sucursal = {}
    for r in registros:
        sid = r.sucursal_id
        if sid not in por_sucursal:
            por_sucursal[sid] = {
                "sucursal_id": sid,
                "sucursal_nombre": nombres_sucursal.get(sid, f"Sucursal {sid}"),
                "periodos": [],
            }
        por_sucursal[sid]["periodos"].append({
            "periodo": r.periodo,
            "orden_limpieza": r.orden_limpieza,
            "pedidos": r.pedidos,
            "gestion_administrativa": r.gestion_administrativa,
            "club_mascotera": r.club_mascotera,
            "control_stock_caja": r.control_stock_caja,
            "puntaje_total": r.puntaje_total,
            "observaciones": r.observaciones,
        })

    # Ordenar por nombre de sucursal
    resultado = sorted(por_sucursal.values(), key=lambda x: x["sucursal_nombre"])
    return resultado


@router.get("/", response_model=List[AuditoriaMensualResponse])
async def listar_auditoria_mensual(
    limite: int = 4,
    current_user: Employee = Depends(get_current_user),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Lista los ultimos N meses de auditoria de la sucursal del usuario"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    registros = db_anexa.query(AuditoriaMensual).filter(
        AuditoriaMensual.sucursal_id == current_user.sucursal_id
    ).order_by(AuditoriaMensual.periodo.desc()).limit(limite).all()

    return [AuditoriaMensualResponse.model_validate(r) for r in registros]


@router.get("/sucursal/{sucursal_id}", response_model=List[AuditoriaMensualResponse])
async def listar_auditoria_sucursal(
    sucursal_id: int,
    limite: int = 4,
    current_user: Employee = Depends(get_current_user),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Lista auditoria de una sucursal especifica (solo encargados)"""
    if not es_encargado(current_user):
        raise HTTPException(status_code=403, detail="Solo encargados pueden ver otras sucursales")

    registros = db_anexa.query(AuditoriaMensual).filter(
        AuditoriaMensual.sucursal_id == sucursal_id
    ).order_by(AuditoriaMensual.periodo.desc()).limit(limite).all()

    return [AuditoriaMensualResponse.model_validate(r) for r in registros]


@router.post("/", response_model=AuditoriaMensualResponse)
async def crear_auditoria_mensual(
    data: AuditoriaMensualCreate,
    current_user: Employee = Depends(get_current_user),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Crea o actualiza un registro de auditoria mensual (solo encargados)"""
    if not es_encargado(current_user):
        raise HTTPException(status_code=403, detail="Solo encargados pueden cargar auditorias")

    # Calcular puntaje total si no se proporciona
    puntaje_total = data.puntaje_total
    if puntaje_total is None:
        puntajes = [p for p in [
            data.orden_limpieza, data.pedidos, data.gestion_administrativa,
            data.club_mascotera, data.control_stock_caja
        ] if p is not None]
        if puntajes:
            puntaje_total = round(sum(puntajes) / len(puntajes), 1)

    # Verificar si ya existe para ese periodo y sucursal
    existente = db_anexa.query(AuditoriaMensual).filter(
        AuditoriaMensual.sucursal_id == data.sucursal_id,
        AuditoriaMensual.periodo == data.periodo
    ).first()

    if existente:
        # Actualizar
        if data.orden_limpieza is not None: existente.orden_limpieza = data.orden_limpieza
        if data.pedidos is not None: existente.pedidos = data.pedidos
        if data.gestion_administrativa is not None: existente.gestion_administrativa = data.gestion_administrativa
        if data.club_mascotera is not None: existente.club_mascotera = data.club_mascotera
        if data.control_stock_caja is not None: existente.control_stock_caja = data.control_stock_caja
        existente.puntaje_total = puntaje_total
        if data.observaciones: existente.observaciones = data.observaciones
        db_anexa.commit()
        db_anexa.refresh(existente)
        return AuditoriaMensualResponse.model_validate(existente)

    # Crear nuevo
    registro = AuditoriaMensual(
        sucursal_id=data.sucursal_id,
        periodo=data.periodo,
        orden_limpieza=data.orden_limpieza,
        pedidos=data.pedidos,
        gestion_administrativa=data.gestion_administrativa,
        club_mascotera=data.club_mascotera,
        control_stock_caja=data.control_stock_caja,
        puntaje_total=puntaje_total,
        observaciones=data.observaciones,
    )
    db_anexa.add(registro)
    db_anexa.commit()
    db_anexa.refresh(registro)
    return AuditoriaMensualResponse.model_validate(registro)


@router.post("/bulk")
async def cargar_auditoria_bulk(
    data: AuditoriaMensualBulkCreate,
    current_user: Employee = Depends(get_current_user),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Carga masiva de auditorias mensuales (para importar desde PDF)"""
    if not es_encargado(current_user):
        raise HTTPException(status_code=403, detail="Solo encargados pueden cargar auditorias")

    creados = 0
    actualizados = 0

    for reg in data.registros:
        puntajes = [p for p in [
            reg.orden_limpieza, reg.pedidos, reg.gestion_administrativa,
            reg.club_mascotera, reg.control_stock_caja
        ] if p is not None]
        puntaje_total = reg.puntaje_total or (round(sum(puntajes) / len(puntajes), 1) if puntajes else None)

        existente = db_anexa.query(AuditoriaMensual).filter(
            AuditoriaMensual.sucursal_id == reg.sucursal_id,
            AuditoriaMensual.periodo == reg.periodo
        ).first()

        if existente:
            if reg.orden_limpieza is not None: existente.orden_limpieza = reg.orden_limpieza
            if reg.pedidos is not None: existente.pedidos = reg.pedidos
            if reg.gestion_administrativa is not None: existente.gestion_administrativa = reg.gestion_administrativa
            if reg.club_mascotera is not None: existente.club_mascotera = reg.club_mascotera
            if reg.control_stock_caja is not None: existente.control_stock_caja = reg.control_stock_caja
            existente.puntaje_total = puntaje_total
            if reg.observaciones: existente.observaciones = reg.observaciones
            actualizados += 1
        else:
            nuevo = AuditoriaMensual(
                sucursal_id=reg.sucursal_id,
                periodo=reg.periodo,
                orden_limpieza=reg.orden_limpieza,
                pedidos=reg.pedidos,
                gestion_administrativa=reg.gestion_administrativa,
                club_mascotera=reg.club_mascotera,
                control_stock_caja=reg.control_stock_caja,
                puntaje_total=puntaje_total,
                observaciones=reg.observaciones,
            )
            db_anexa.add(nuevo)
            creados += 1

    db_anexa.commit()
    return {"success": True, "creados": creados, "actualizados": actualizados}
