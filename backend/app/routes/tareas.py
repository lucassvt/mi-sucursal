from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from datetime import date
from ..core.database import get_db
from ..core.security import get_current_user, require_supervisor, es_supervisor
from ..models.employee import Employee
from ..models.tareas import TareaSucursal
from ..schemas.tareas import TareaCreate, TareaResponse, TareaUpdateEstado

router = APIRouter(prefix="/api/tareas", tags=["tareas"])


@router.get("/", response_model=List[TareaResponse])
async def list_tareas(
    estado: str = None,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar tareas de la sucursal"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    query = db.query(TareaSucursal).filter(TareaSucursal.sucursal_id == current_user.sucursal_id)

    if estado:
        query = query.filter(TareaSucursal.estado == estado)

    query = query.order_by(TareaSucursal.fecha_vencimiento.asc())
    tareas = query.limit(50).all()

    return [TareaResponse.model_validate(t) for t in tareas]


@router.get("/puede-crear")
async def puede_crear_tareas(
    current_user: Employee = Depends(get_current_user)
):
    """Verifica si el usuario actual puede crear tareas"""
    return {"puede_crear": es_supervisor(current_user)}


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

    tarea = TareaSucursal(
        sucursal_id=current_user.sucursal_id,
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

    return TareaResponse.model_validate(tarea)


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
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resumen del estado de tareas de la sucursal"""
    if not current_user.sucursal_id:
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
        result = db.execute(query, {"sucursal_id": current_user.sucursal_id}).fetchone()
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
