"""
Rutas: Descargos de Auditoría
Base de datos: mi_sucursal (anexa)

Endpoints:
- GET /api/auditoria/descargos - Listar descargos
- POST /api/auditoria/descargos - Crear descargo (empleado)
- PUT /api/auditoria/descargos/{id}/resolver - Aprobar/Rechazar (auditor/supervisor)
- GET /api/auditoria/descargos/resumen - Resumen de pendientes
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import List, Optional, Dict
from datetime import datetime
from pydantic import BaseModel

from ..core.database import get_db, get_db_anexa
from ..core.security import get_current_user, require_supervisor, es_supervisor
from ..models.employee import Employee
from ..models.descargos import DescargoAuditoria, CATEGORIAS_DESCARGO

router = APIRouter(prefix="/api/auditoria", tags=["auditoria"])


# === Schemas ===

class DescargoCreate(BaseModel):
    categoria: str
    titulo: str
    descripcion: str
    referencia_id: Optional[int] = None
    referencia_tipo: Optional[str] = None


class DescargoResolver(BaseModel):
    accion: str  # "aprobar" o "rechazar"
    comentario: Optional[str] = None


class DescargoResponse(BaseModel):
    id: int
    sucursal_id: int
    categoria: str
    titulo: str
    descripcion: str
    estado: str
    fecha_descargo: datetime
    creado_por_id: int
    creado_por_nombre: Optional[str] = None
    resuelto_por_id: Optional[int] = None
    resuelto_por_nombre: Optional[str] = None
    fecha_resolucion: Optional[datetime] = None
    comentario_auditor: Optional[str] = None
    referencia_id: Optional[int] = None
    referencia_tipo: Optional[str] = None

    class Config:
        from_attributes = True


# === Helper para obtener dux_id de sucursal ===

def get_sucursal_dux_id(db: Session, sucursal_id: int) -> int:
    """Obtiene el dux_id de la sucursal desde la BD DUX"""
    query = text("SELECT dux_id FROM sucursales WHERE id = :id")
    result = db.execute(query, {"id": sucursal_id}).fetchone()
    return result.dux_id if result else sucursal_id


def get_employee_nombre(db: Session, employee_id: int) -> str:
    """Obtiene el nombre del empleado desde la BD DUX"""
    query = text("SELECT nombre, apellido FROM employees WHERE id = :id")
    result = db.execute(query, {"id": employee_id}).fetchone()
    if result:
        return f"{result.nombre or ''} {result.apellido or ''}".strip() or "Usuario"
    return "Usuario"


# === Endpoints ===

@router.get("/descargos", response_model=List[DescargoResponse])
async def list_descargos(
    categoria: Optional[str] = None,
    estado: Optional[str] = None,
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """
    Listar descargos de auditoría de la sucursal.
    Filtrable por categoría y estado.
    """
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    sucursal_dux_id = get_sucursal_dux_id(db_dux, current_user.sucursal_id)

    query = db_anexa.query(DescargoAuditoria).filter(
        DescargoAuditoria.sucursal_id == sucursal_dux_id
    )

    if categoria:
        query = query.filter(DescargoAuditoria.categoria == categoria)

    if estado:
        query = query.filter(DescargoAuditoria.estado == estado)

    descargos = query.order_by(DescargoAuditoria.fecha_descargo.desc()).limit(100).all()

    # Enriquecer con nombres de empleados
    result = []
    for d in descargos:
        response = DescargoResponse.model_validate(d)
        response.creado_por_nombre = get_employee_nombre(db_dux, d.creado_por_id)
        if d.resuelto_por_id:
            response.resuelto_por_nombre = get_employee_nombre(db_dux, d.resuelto_por_id)
        result.append(response)

    return result


@router.post("/descargos", response_model=DescargoResponse)
async def create_descargo(
    data: DescargoCreate,
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """
    Crear un nuevo descargo de auditoría.
    Cualquier empleado puede crear un descargo para justificar observaciones.
    """
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    if data.categoria not in CATEGORIAS_DESCARGO:
        raise HTTPException(
            status_code=400,
            detail=f"Categoría inválida. Valores permitidos: {', '.join(CATEGORIAS_DESCARGO)}"
        )

    if not data.titulo.strip():
        raise HTTPException(status_code=400, detail="El título es requerido")

    if not data.descripcion.strip():
        raise HTTPException(status_code=400, detail="La descripción es requerida")

    sucursal_dux_id = get_sucursal_dux_id(db_dux, current_user.sucursal_id)

    descargo = DescargoAuditoria(
        sucursal_id=sucursal_dux_id,
        creado_por_id=current_user.id,
        categoria=data.categoria,
        titulo=data.titulo.strip(),
        descripcion=data.descripcion.strip(),
        estado="pendiente",
        referencia_id=data.referencia_id,
        referencia_tipo=data.referencia_tipo
    )

    db_anexa.add(descargo)
    db_anexa.commit()
    db_anexa.refresh(descargo)

    response = DescargoResponse.model_validate(descargo)
    response.creado_por_nombre = get_employee_nombre(db_dux, current_user.id)

    return response


@router.put("/descargos/{descargo_id}/resolver", response_model=DescargoResponse)
async def resolver_descargo(
    descargo_id: int,
    data: DescargoResolver,
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """
    Resolver un descargo de auditoría (aprobar o rechazar).
    Solo supervisores/auditores pueden resolver.
    """
    require_supervisor(current_user)

    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    sucursal_dux_id = get_sucursal_dux_id(db_dux, current_user.sucursal_id)

    descargo = db_anexa.query(DescargoAuditoria).filter(
        DescargoAuditoria.id == descargo_id,
        DescargoAuditoria.sucursal_id == sucursal_dux_id
    ).first()

    if not descargo:
        raise HTTPException(status_code=404, detail="Descargo no encontrado")

    if descargo.estado != "pendiente":
        raise HTTPException(status_code=400, detail="El descargo ya fue resuelto")

    if data.accion not in ["aprobar", "rechazar"]:
        raise HTTPException(status_code=400, detail="Acción debe ser 'aprobar' o 'rechazar'")

    # Actualizar descargo
    descargo.estado = "aprobado" if data.accion == "aprobar" else "rechazado"
    descargo.resuelto_por_id = current_user.id
    descargo.fecha_resolucion = datetime.now()
    descargo.comentario_auditor = data.comentario

    db_anexa.commit()
    db_anexa.refresh(descargo)

    response = DescargoResponse.model_validate(descargo)
    response.creado_por_nombre = get_employee_nombre(db_dux, descargo.creado_por_id)
    response.resuelto_por_nombre = get_employee_nombre(db_dux, current_user.id)

    return response


@router.get("/descargos/resumen")
async def get_resumen_descargos(
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """
    Resumen de descargos pendientes por categoría.
    Útil para mostrar badges en el frontend.
    """
    if not current_user.sucursal_id:
        return {"total_pendientes": 0, "por_categoria": {}}

    sucursal_dux_id = get_sucursal_dux_id(db_dux, current_user.sucursal_id)

    # Contar pendientes por categoría
    results = db_anexa.query(
        DescargoAuditoria.categoria,
        func.count(DescargoAuditoria.id).label("count")
    ).filter(
        DescargoAuditoria.sucursal_id == sucursal_dux_id,
        DescargoAuditoria.estado == "pendiente"
    ).group_by(DescargoAuditoria.categoria).all()

    por_categoria = {r.categoria: r.count for r in results}
    total = sum(por_categoria.values())

    return {
        "total_pendientes": total,
        "por_categoria": por_categoria
    }


@router.get("/descargos/pendientes/count")
async def count_descargos_pendientes(
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """
    Contar descargos pendientes de la sucursal.
    """
    if not current_user.sucursal_id:
        return {"count": 0}

    sucursal_dux_id = get_sucursal_dux_id(db_dux, current_user.sucursal_id)

    count = db_anexa.query(DescargoAuditoria).filter(
        DescargoAuditoria.sucursal_id == sucursal_dux_id,
        DescargoAuditoria.estado == "pendiente"
    ).count()

    return {"count": count}
