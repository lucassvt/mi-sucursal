"""
Rutas: Sugerencias de Conteo de Stock
Base de datos: mi_sucursal (anexa)

Endpoints:
- GET /api/control-stock/sugerencias - Listar sugerencias
- POST /api/control-stock/sugerencias - Crear sugerencia (vendedor)
- PUT /api/control-stock/sugerencias/{id}/resolver - Aprobar/Rechazar (supervisor)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from ..core.database import get_db, get_db_anexa
from ..core.security import get_current_user, require_supervisor, es_supervisor
from ..models.employee import Employee
from ..models.sugerencias import SugerenciaConteo
from ..models.tareas import TareaSucursal

router = APIRouter(prefix="/api/control-stock", tags=["control-stock"])


# === Schemas ===

class ProductoSugerencia(BaseModel):
    cod_item: str
    nombre: str
    precio: float
    stock_sistema: int


class SugerenciaCreate(BaseModel):
    productos: List[ProductoSugerencia]
    motivo: str


class SugerenciaResolver(BaseModel):
    accion: str  # "aprobar" o "rechazar"
    fecha_programada: Optional[str] = None  # YYYY-MM-DD (requerido si aprueba)
    comentario: Optional[str] = None


class SugerenciaResponse(BaseModel):
    id: int
    sucursal_id: int
    productos: list
    motivo: str
    estado: str
    fecha_sugerencia: datetime
    sugerido_por_id: int
    sugerido_por_nombre: Optional[str] = None
    resuelto_por_id: Optional[int] = None
    resuelto_por_nombre: Optional[str] = None
    fecha_resolucion: Optional[datetime] = None
    fecha_programada: Optional[str] = None
    comentario_supervisor: Optional[str] = None
    tarea_id: Optional[int] = None

    class Config:
        from_attributes = True


def get_employee_nombre(db: Session, employee_id: int) -> str:
    """Obtiene el nombre del empleado desde la BD DUX"""
    query = text("SELECT nombre, apellido FROM employees WHERE id = :id")
    result = db.execute(query, {"id": employee_id}).fetchone()
    if result:
        return f"{result.nombre or ''} {result.apellido or ''}".strip() or "Usuario"
    return "Usuario"


# === Endpoints ===

@router.get("/sugerencias", response_model=List[SugerenciaResponse])
async def list_sugerencias(
    estado: Optional[str] = None,
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """
    Listar sugerencias de conteo de la sucursal.
    Todos pueden ver las sugerencias.
    """
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    query = db_anexa.query(SugerenciaConteo).filter(
        SugerenciaConteo.sucursal_id == current_user.sucursal_id
    )

    if estado:
        query = query.filter(SugerenciaConteo.estado == estado)

    sugerencias = query.order_by(SugerenciaConteo.fecha_sugerencia.desc()).limit(50).all()

    # Enriquecer con nombres de empleados
    result = []
    for s in sugerencias:
        response = SugerenciaResponse.model_validate(s)
        response.sugerido_por_nombre = get_employee_nombre(db_dux, s.sugerido_por_id)
        if s.resuelto_por_id:
            response.resuelto_por_nombre = get_employee_nombre(db_dux, s.resuelto_por_id)
        result.append(response)

    return result


@router.post("/sugerencias", response_model=SugerenciaResponse)
async def create_sugerencia(
    data: SugerenciaCreate,
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """
    Crear una nueva sugerencia de conteo.
    Cualquier empleado puede sugerir productos para contar.
    """
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    if not data.productos:
        raise HTTPException(status_code=400, detail="Debe incluir al menos un producto")

    if not data.motivo.strip():
        raise HTTPException(status_code=400, detail="El motivo es requerido")

    sugerencia = SugerenciaConteo(
        sucursal_id=current_user.sucursal_id,
        sugerido_por_id=current_user.id,
        productos=[p.model_dump() for p in data.productos],
        motivo=data.motivo.strip(),
        estado="pendiente"
    )

    db_anexa.add(sugerencia)
    db_anexa.commit()
    db_anexa.refresh(sugerencia)

    response = SugerenciaResponse.model_validate(sugerencia)
    response.sugerido_por_nombre = get_employee_nombre(db_dux, current_user.id)

    return response


@router.put("/sugerencias/{sugerencia_id}/resolver", response_model=SugerenciaResponse)
async def resolver_sugerencia(
    sugerencia_id: int,
    data: SugerenciaResolver,
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """
    Resolver una sugerencia de conteo (aprobar o rechazar).
    Solo supervisores/encargados pueden resolver.
    Si se aprueba, se crea una tarea de control de stock.
    """
    require_supervisor(current_user)

    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    sugerencia = db_anexa.query(SugerenciaConteo).filter(
        SugerenciaConteo.id == sugerencia_id,
        SugerenciaConteo.sucursal_id == current_user.sucursal_id
    ).first()

    if not sugerencia:
        raise HTTPException(status_code=404, detail="Sugerencia no encontrada")

    if sugerencia.estado != "pendiente":
        raise HTTPException(status_code=400, detail="La sugerencia ya fue resuelta")

    if data.accion not in ["aprobar", "rechazar"]:
        raise HTTPException(status_code=400, detail="Acción debe ser 'aprobar' o 'rechazar'")

    if data.accion == "aprobar" and not data.fecha_programada:
        raise HTTPException(status_code=400, detail="La fecha programada es requerida para aprobar")

    # Actualizar sugerencia
    sugerencia.estado = "aprobada" if data.accion == "aprobar" else "rechazada"
    sugerencia.resuelto_por_id = current_user.id
    sugerencia.fecha_resolucion = datetime.now()
    sugerencia.comentario_supervisor = data.comentario

    if data.accion == "aprobar":
        sugerencia.fecha_programada = data.fecha_programada

        # Crear tarea de control de stock en BD DUX (tareas_sucursal)
        productos_nombres = [p.get("nombre", "") for p in sugerencia.productos]
        titulo = f"Conteo sugerido: {', '.join(productos_nombres)}"
        if len(titulo) > 250:
            titulo = titulo[:247] + "..."

        from datetime import date as date_type
        tarea = TareaSucursal(
            sucursal_id=current_user.sucursal_id,
            categoria="CONTROL Y GESTION DE STOCK",
            titulo=titulo,
            descripcion=f"Conteo de stock sugerido por empleado.\nMotivo: {sugerencia.motivo}",
            asignado_por=current_user.id,
            fecha_asignacion=date_type.today(),
            fecha_vencimiento=date_type.fromisoformat(data.fecha_programada),
            estado="pendiente"
        )

        db_dux.add(tarea)
        db_dux.commit()
        db_dux.refresh(tarea)

        sugerencia.tarea_id = tarea.id

    db_anexa.commit()
    db_anexa.refresh(sugerencia)

    response = SugerenciaResponse.model_validate(sugerencia)
    response.sugerido_por_nombre = get_employee_nombre(db_dux, sugerencia.sugerido_por_id)
    response.resuelto_por_nombre = get_employee_nombre(db_dux, current_user.id)

    return response


@router.get("/sugerencias/pendientes/count")
async def count_sugerencias_pendientes(
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """
    Contar sugerencias pendientes de la sucursal.
    Útil para mostrar badge en el frontend.
    """
    if not current_user.sucursal_id:
        return {"count": 0}

    count = db_anexa.query(SugerenciaConteo).filter(
        SugerenciaConteo.sucursal_id == current_user.sucursal_id,
        SugerenciaConteo.estado == "pendiente"
    ).count()

    return {"count": count}
