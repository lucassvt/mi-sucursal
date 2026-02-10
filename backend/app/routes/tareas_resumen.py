from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional
from ..core.database import get_db, get_db_anexa
from ..core.security import get_current_user, require_encargado, es_encargado
from ..models.employee import Employee
from ..models.tareas_resumen import TareasResumenSemanal
from ..models.reporte_pdf import ReporteAuditoriaPDF

router = APIRouter(prefix="/api/auditoria", tags=["auditoria-tareas"])


@router.get("/tareas-resumen")
async def get_tareas_resumen(
    periodo: Optional[str] = None,
    limite: int = 12,
    current_user: Employee = Depends(get_current_user),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Historial de rendimiento de tareas por semana"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    query = db_anexa.query(TareasResumenSemanal).filter(
        TareasResumenSemanal.sucursal_id == current_user.sucursal_id
    )
    if periodo:
        query = query.filter(TareasResumenSemanal.periodo == periodo)

    registros = query.order_by(
        TareasResumenSemanal.semana_inicio.desc()
    ).limit(limite * 4).all()  # *4 porque hay 4 categorias por semana

    # Agrupar por semana
    semanas = {}
    for r in registros:
        key = str(r.semana_inicio)
        if key not in semanas:
            semanas[key] = {
                "semana_inicio": str(r.semana_inicio),
                "semana_fin": str(r.semana_fin),
                "periodo": r.periodo,
                "categorias": {},
            }
        semanas[key]["categorias"][r.categoria] = {
            "completadas": r.completadas,
            "vencidas": r.vencidas,
            "total": r.total,
            "puntaje": r.puntaje,
        }

    result = list(semanas.values())
    return result[:limite]


@router.get("/tareas-resumen/todas")
async def get_tareas_resumen_todas(
    periodo: Optional[str] = None,
    current_user: Employee = Depends(get_current_user),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Resumen de tareas de TODAS las sucursales (solo encargados)"""
    if not es_encargado(current_user):
        raise HTTPException(status_code=403, detail="Solo encargados pueden ver todas las sucursales")

    query = db_anexa.query(TareasResumenSemanal)
    if periodo:
        query = query.filter(TareasResumenSemanal.periodo == periodo)

    registros = query.order_by(
        TareasResumenSemanal.semana_inicio.desc()
    ).limit(500).all()

    # Agrupar por sucursal -> semana -> categorias
    resultado = {}
    for r in registros:
        suc_key = r.sucursal_id
        if suc_key not in resultado:
            resultado[suc_key] = {"sucursal_id": suc_key, "semanas": {}}

        sem_key = str(r.semana_inicio)
        if sem_key not in resultado[suc_key]["semanas"]:
            resultado[suc_key]["semanas"][sem_key] = {
                "semana_inicio": str(r.semana_inicio),
                "semana_fin": str(r.semana_fin),
                "periodo": r.periodo,
                "categorias": {},
            }
        resultado[suc_key]["semanas"][sem_key]["categorias"][r.categoria] = {
            "completadas": r.completadas,
            "vencidas": r.vencidas,
            "total": r.total,
            "puntaje": r.puntaje,
        }

    return list(resultado.values())


@router.get("/reportes-pdf")
async def list_reportes_pdf(
    sucursal_id: Optional[int] = None,
    periodo: Optional[str] = None,
    current_user: Employee = Depends(get_current_user),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Listar reportes PDF disponibles (metadata sin blob)"""
    query = db_anexa.query(ReporteAuditoriaPDF)

    if not es_encargado(current_user):
        query = query.filter(
            ReporteAuditoriaPDF.sucursal_id == current_user.sucursal_id
        )
    elif sucursal_id:
        query = query.filter(ReporteAuditoriaPDF.sucursal_id == sucursal_id)

    if periodo:
        query = query.filter(ReporteAuditoriaPDF.periodo == periodo)

    reportes = query.order_by(
        ReporteAuditoriaPDF.periodo.desc(),
        ReporteAuditoriaPDF.created_at.desc()
    ).limit(24).all()

    return [{
        "id": r.id,
        "sucursal_id": r.sucursal_id,
        "periodo": r.periodo,
        "filename": r.filename,
        "tamano_bytes": r.tamano_bytes,
        "origen": r.origen,
        "notas": r.notas,
        "created_at": str(r.created_at) if r.created_at else None,
    } for r in reportes]


@router.post("/reportes-pdf")
async def upload_reporte_pdf(
    sucursal_id: int = Query(...),
    periodo: str = Query(...),
    notas: Optional[str] = Query(None),
    archivo: UploadFile = File(...),
    current_user: Employee = Depends(get_current_user),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Subir reporte PDF de auditoria (solo encargados)"""
    require_encargado(current_user)

    if archivo.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")

    contenido = await archivo.read()
    if len(contenido) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo no puede superar 10MB")

    reporte = ReporteAuditoriaPDF(
        sucursal_id=sucursal_id,
        periodo=periodo,
        filename=archivo.filename or f"auditoria_{sucursal_id}_{periodo}.pdf",
        content_type=archivo.content_type,
        pdf_data=contenido,
        tamano_bytes=len(contenido),
        uploaded_by=current_user.id,
        origen="manual",
        notas=notas,
    )
    db_anexa.add(reporte)
    db_anexa.commit()
    db_anexa.refresh(reporte)

    return {"ok": True, "id": reporte.id, "filename": reporte.filename}


@router.get("/reportes-pdf/{reporte_id}")
async def download_reporte_pdf(
    reporte_id: int,
    current_user: Employee = Depends(get_current_user),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Descargar/ver reporte PDF"""
    reporte = db_anexa.query(ReporteAuditoriaPDF).filter(
        ReporteAuditoriaPDF.id == reporte_id
    ).first()
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    return Response(
        content=reporte.pdf_data,
        media_type=reporte.content_type,
        headers={"Content-Disposition": f"inline; filename={reporte.filename}"}
    )
