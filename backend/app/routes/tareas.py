from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from datetime import date
from ..core.database import get_db, get_db_anexa
from ..core.security import get_current_user, require_supervisor, es_supervisor, es_encargado
from ..models.employee import Employee, SucursalInfo
from ..models.tareas import TareaSucursal
from ..models.tarea_foto import TareaFoto
from ..schemas.tareas import TareaCreate, TareaUpdate, TareaResponse, TareaUpdateEstado

router = APIRouter(prefix="/api/tareas", tags=["tareas"])


def get_sucursal_nombre(db: Session, sucursal_id: int) -> str:
    suc = db.query(SucursalInfo).filter(SucursalInfo.id == sucursal_id).first()
    return suc.nombre if suc else f"Sucursal {sucursal_id}"


@router.get("/", response_model=List[TareaResponse])
async def list_tareas(
    estado: str = None,
    sucursal_id: Optional[int] = None,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar tareas de la sucursal (encargados pueden ver otras sucursales)"""
    target_sucursal = current_user.sucursal_id
    if sucursal_id and es_encargado(current_user):
        target_sucursal = sucursal_id
    if not target_sucursal:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    query = db.query(TareaSucursal).filter(TareaSucursal.sucursal_id == target_sucursal)

    if estado:
        query = query.filter(TareaSucursal.estado == estado)

    query = query.order_by(TareaSucursal.fecha_vencimiento.asc())
    tareas = query.limit(50).all()

    result = []
    for t in tareas:
        resp = TareaResponse.model_validate(t)
        resp.sucursal_nombre = get_sucursal_nombre(db, t.sucursal_id)
        result.append(resp)
    return result


@router.get("/puede-crear")
async def puede_crear_tareas(
    current_user: Employee = Depends(get_current_user)
):
    """Verifica si el usuario actual puede crear tareas"""
    return {"puede_crear": es_supervisor(current_user)}


@router.get("/sucursales")
async def get_sucursales(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar sucursales disponibles (para selector de encargados)"""
    sucursales = db.query(SucursalInfo).filter(SucursalInfo.activo == True).order_by(SucursalInfo.nombre).all()
    return [{"id": s.id, "nombre": s.nombre, "tiene_veterinaria": s.tiene_veterinaria or False, "tiene_peluqueria": s.tiene_peluqueria or False} for s in sucursales]


@router.post("/", response_model=TareaResponse)
async def create_tarea(
    data: TareaCreate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear una nueva tarea (solo para roles supervisor/encargado/admin)"""
    # Verificar que el usuario tiene permisos de supervisor
    require_supervisor(current_user)

    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    if data.fecha_vencimiento < date.today():
        raise HTTPException(status_code=400, detail="La fecha de vencimiento no puede ser anterior a hoy")

    # Encargados pueden asignar a otra sucursal
    target_sucursal_id = current_user.sucursal_id
    if data.sucursal_id and es_encargado(current_user):
        target_sucursal_id = data.sucursal_id

    tarea = TareaSucursal(
        sucursal_id=target_sucursal_id,
        categoria=data.categoria,
        titulo=data.titulo,
        descripcion=data.descripcion,
        asignado_por=current_user.id,
        fecha_asignacion=date.today(),
        fecha_vencimiento=data.fecha_vencimiento,
        estado="pendiente"
    )

    db.add(tarea)
    db.commit()
    db.refresh(tarea)

    resp = TareaResponse.model_validate(tarea)
    resp.sucursal_nombre = get_sucursal_nombre(db, tarea.sucursal_id)
    return resp


@router.put("/{tarea_id}", response_model=TareaResponse)
async def editar_tarea(
    tarea_id: int,
    data: TareaUpdate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Editar una tarea (solo el creador con rol encargado)"""
    require_supervisor(current_user)

    tarea = db.query(TareaSucursal).filter(TareaSucursal.id == tarea_id).first()
    if not tarea:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    if tarea.asignado_por != current_user.id:
        raise HTTPException(status_code=403, detail="Solo el creador de la tarea puede editarla")

    if tarea.estado == "completada":
        raise HTTPException(status_code=400, detail="No se puede editar una tarea completada")

    if data.titulo is not None:
        tarea.titulo = data.titulo
    if data.descripcion is not None:
        tarea.descripcion = data.descripcion
    if data.categoria is not None:
        tarea.categoria = data.categoria
    if data.fecha_vencimiento is not None:
        if data.fecha_vencimiento < date.today():
            raise HTTPException(status_code=400, detail="La fecha de vencimiento no puede ser anterior a hoy")
        tarea.fecha_vencimiento = data.fecha_vencimiento
    if data.sucursal_id is not None and es_encargado(current_user):
        tarea.sucursal_id = data.sucursal_id

    db.commit()
    db.refresh(tarea)

    resp = TareaResponse.model_validate(tarea)
    resp.sucursal_nombre = get_sucursal_nombre(db, tarea.sucursal_id)
    return resp


@router.put("/{tarea_id}/completar", response_model=TareaResponse)
async def completar_tarea(
    tarea_id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Marcar una tarea como completada"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    tarea = db.query(TareaSucursal).filter(
        TareaSucursal.id == tarea_id,
        TareaSucursal.sucursal_id == current_user.sucursal_id
    ).first()

    if not tarea:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    from datetime import datetime
    tarea.estado = "completada"
    tarea.completado_por = current_user.id
    tarea.fecha_completado = datetime.now()

    db.commit()
    db.refresh(tarea)

    return TareaResponse.model_validate(tarea)


@router.put("/{tarea_id}/estado", response_model=TareaResponse)
async def actualizar_estado_tarea(
    tarea_id: int,
    data: TareaUpdateEstado,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar el estado de una tarea (pendiente, en_progreso, completada)"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    tarea = db.query(TareaSucursal).filter(
        TareaSucursal.id == tarea_id,
        TareaSucursal.sucursal_id == current_user.sucursal_id
    ).first()

    if not tarea:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    from datetime import datetime
    tarea.estado = data.estado

    if data.estado == "completada":
        tarea.completado_por = current_user.id
        tarea.fecha_completado = datetime.now()
    else:
        tarea.completado_por = None
        tarea.fecha_completado = None

    db.commit()
    db.refresh(tarea)

    return TareaResponse.model_validate(tarea)


@router.get("/vencidas", response_model=List[TareaResponse])
async def list_tareas_vencidas(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar tareas vencidas de la sucursal"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    tareas = db.query(TareaSucursal).filter(
        TareaSucursal.sucursal_id == current_user.sucursal_id,
        TareaSucursal.estado != "completada",
        TareaSucursal.fecha_vencimiento < date.today()
    ).order_by(TareaSucursal.fecha_vencimiento.asc()).all()

    return [TareaResponse.model_validate(t) for t in tareas]


@router.get("/resumen")
async def get_resumen_tareas(
    sucursal_id: Optional[int] = None,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resumen del estado de tareas de la sucursal"""
    target_sucursal = current_user.sucursal_id
    if sucursal_id and es_encargado(current_user):
        target_sucursal = sucursal_id
    if not target_sucursal:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    query = text("""
        SELECT
            COUNT(*) FILTER (WHERE estado = 'pendiente') as pendientes,
            COUNT(*) FILTER (WHERE estado = 'en_progreso') as en_progreso,
            COUNT(*) FILTER (WHERE estado = 'completada') as completadas,
            COUNT(*) FILTER (WHERE estado != 'completada' AND fecha_vencimiento < CURRENT_DATE) as vencidas
        FROM tareas_sucursal
        WHERE sucursal_id = :sucursal_id
    """)

    try:
        result = db.execute(query, {"sucursal_id": target_sucursal}).fetchone()
        return {
            "pendientes": result.pendientes or 0,
            "en_progreso": result.en_progreso or 0,
            "completadas": result.completadas or 0,
            "vencidas": result.vencidas or 0,
        }
    except:
        return {
            "pendientes": 0,
            "en_progreso": 0,
            "completadas": 0,
            "vencidas": 0,
        }


@router.post("/{tarea_id}/foto")
async def subir_foto_tarea(
    tarea_id: int,
    foto: UploadFile = File(...),
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Subir foto al completar una tarea (opcional)"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    # Verificar que la tarea existe y pertenece a la sucursal
    tarea = db.query(TareaSucursal).filter(
        TareaSucursal.id == tarea_id,
        TareaSucursal.sucursal_id == current_user.sucursal_id
    ).first()
    if not tarea:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    # Validar tipo de archivo
    if foto.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Solo se permiten imagenes JPG, PNG o WebP")

    # Leer contenido (max 5MB)
    contenido = await foto.read()
    if len(contenido) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="La imagen no puede superar 5MB")

    # Guardar o reemplazar foto existente
    foto_existente = db_anexa.query(TareaFoto).filter(TareaFoto.tarea_id == tarea_id).first()
    if foto_existente:
        foto_existente.foto_data = contenido
        foto_existente.filename = foto.filename or "foto.jpg"
        foto_existente.content_type = foto.content_type
        foto_existente.subido_por = current_user.id
    else:
        nueva_foto = TareaFoto(
            tarea_id=tarea_id,
            filename=foto.filename or "foto.jpg",
            content_type=foto.content_type,
            foto_data=contenido,
            subido_por=current_user.id,
        )
        db_anexa.add(nueva_foto)

    db_anexa.commit()
    return {"ok": True, "tarea_id": tarea_id}


@router.get("/{tarea_id}/foto")
async def get_foto_tarea(
    tarea_id: int,
    current_user: Employee = Depends(get_current_user),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Obtener foto de una tarea completada"""
    foto = db_anexa.query(TareaFoto).filter(TareaFoto.tarea_id == tarea_id).first()
    if not foto:
        raise HTTPException(status_code=404, detail="No hay foto para esta tarea")

    return Response(
        content=foto.foto_data,
        media_type=foto.content_type,
        headers={"Content-Disposition": f"inline; filename={foto.filename}"}
    )


@router.get("/{tarea_id}/tiene-foto")
async def tiene_foto_tarea(
    tarea_id: int,
    current_user: Employee = Depends(get_current_user),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Verificar si una tarea tiene foto"""
    foto = db_anexa.query(TareaFoto).filter(TareaFoto.tarea_id == tarea_id).first()
    return {"tiene_foto": foto is not None}
