from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional

from ..core.database import get_db, get_db_anexa
from ..core.security import get_current_user, es_encargado, es_admin_o_superior
from ..models.employee import Employee, SucursalInfo
from ..models.encargos import Encargo
from ..schemas.encargos import EncargoCreate, EncargoUpdate, EncargoResponse

router = APIRouter(prefix="/api/encargos", tags=["encargos"])


@router.post("/", response_model=EncargoResponse)
async def crear_encargo(
    data: EncargoCreate,
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db: Session = Depends(get_db_anexa),
):
    """Crear un encargo de producto"""
    es_admin = es_admin_o_superior(current_user)

    # Admins pueden especificar sucursal, vendedores usan la propia
    if data.sucursal_id and es_admin:
        sucursal = data.sucursal_id
    else:
        sucursal = current_user.sucursal_id or 0

    encargo = Encargo(
        sucursal_id=sucursal,
        employee_id=current_user.id,
        producto_nombre=data.producto_nombre,
        cliente_nombre=data.cliente_nombre,
        cantidad=data.cantidad,
        fecha_necesaria=data.fecha_necesaria,
        observaciones=data.observaciones,
    )

    db.add(encargo)
    db.commit()
    db.refresh(encargo)

    # Nombre sucursal
    suc = db_dux.query(SucursalInfo).filter(SucursalInfo.id == encargo.sucursal_id).first()

    return EncargoResponse(
        id=encargo.id,
        sucursal_id=encargo.sucursal_id,
        employee_id=encargo.employee_id,
        producto_nombre=encargo.producto_nombre,
        cliente_nombre=encargo.cliente_nombre,
        cantidad=encargo.cantidad,
        fecha_encargo=encargo.fecha_encargo,
        fecha_necesaria=encargo.fecha_necesaria,
        estado=encargo.estado,
        observaciones=encargo.observaciones,
        employee_nombre=f"{current_user.nombre} {current_user.apellido or ''}".strip(),
        sucursal_nombre=suc.nombre if suc else None,
        created_at=encargo.created_at,
    )


@router.get("/", response_model=List[EncargoResponse])
async def listar_encargos(
    estado: Optional[str] = None,
    sucursal_id: Optional[int] = None,
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db: Session = Depends(get_db_anexa),
):
    """Listar encargos. Admins pueden filtrar por sucursal, vendedores ven su sucursal."""
    es_admin = es_admin_o_superior(current_user)

    query = db.query(Encargo)

    if es_admin:
        # Admin puede filtrar por sucursal
        if sucursal_id:
            query = query.filter(Encargo.sucursal_id == sucursal_id)
    else:
        # Vendedores solo ven su sucursal
        if current_user.sucursal_id:
            query = query.filter(Encargo.sucursal_id == current_user.sucursal_id)

    if estado:
        query = query.filter(Encargo.estado == estado)

    encargos = query.order_by(Encargo.created_at.desc()).all()

    # Obtener nombres de empleados desde BD DUX
    employee_ids = list(set(e.employee_id for e in encargos))
    nombres = {}
    if employee_ids:
        employees = db_dux.query(Employee).filter(Employee.id.in_(employee_ids)).all()
        nombres = {
            emp.id: f"{emp.nombre} {emp.apellido or ''}".strip()
            for emp in employees
        }

    # Obtener nombres de sucursales
    sucursal_ids = list(set(e.sucursal_id for e in encargos))
    suc_nombres = {}
    if sucursal_ids:
        sucursales = db_dux.query(SucursalInfo).filter(SucursalInfo.id.in_(sucursal_ids)).all()
        suc_nombres = {s.id: s.nombre for s in sucursales}

    return [
        EncargoResponse(
            id=e.id,
            sucursal_id=e.sucursal_id,
            employee_id=e.employee_id,
            producto_nombre=e.producto_nombre,
            cliente_nombre=e.cliente_nombre,
            cantidad=e.cantidad,
            fecha_encargo=e.fecha_encargo,
            fecha_necesaria=e.fecha_necesaria,
            estado=e.estado,
            observaciones=e.observaciones,
            employee_nombre=nombres.get(e.employee_id),
            sucursal_nombre=suc_nombres.get(e.sucursal_id),
            created_at=e.created_at,
        )
        for e in encargos
    ]


@router.put("/{encargo_id}", response_model=EncargoResponse)
async def actualizar_encargo(
    encargo_id: int,
    data: EncargoUpdate,
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db: Session = Depends(get_db_anexa),
):
    """Actualizar estado de un encargo"""
    encargo = db.query(Encargo).filter(Encargo.id == encargo_id).first()
    if not encargo:
        raise HTTPException(status_code=404, detail="Encargo no encontrado")

    # Solo el creador o encargado+ pueden actualizar
    es_enc = es_encargado(current_user)
    if encargo.employee_id != current_user.id and not es_enc:
        raise HTTPException(status_code=403, detail="No tiene permisos para modificar este encargo")

    estados_validos = ["pendiente", "pedido_proveedor", "vendido", "cancelado"]
    if data.estado not in estados_validos:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Opciones: {', '.join(estados_validos)}")

    encargo.estado = data.estado
    if data.observaciones is not None:
        encargo.observaciones = data.observaciones

    db.commit()
    db.refresh(encargo)

    emp = db_dux.query(Employee).filter(Employee.id == encargo.employee_id).first()
    emp_nombre = f"{emp.nombre} {emp.apellido or ''}".strip() if emp else None
    suc = db_dux.query(SucursalInfo).filter(SucursalInfo.id == encargo.sucursal_id).first()

    return EncargoResponse(
        id=encargo.id,
        sucursal_id=encargo.sucursal_id,
        employee_id=encargo.employee_id,
        producto_nombre=encargo.producto_nombre,
        cliente_nombre=encargo.cliente_nombre,
        cantidad=encargo.cantidad,
        fecha_encargo=encargo.fecha_encargo,
        fecha_necesaria=encargo.fecha_necesaria,
        estado=encargo.estado,
        observaciones=encargo.observaciones,
        employee_nombre=emp_nombre,
        sucursal_nombre=suc.nombre if suc else None,
        created_at=encargo.created_at,
    )


@router.delete("/{encargo_id}")
async def eliminar_encargo(
    encargo_id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db_anexa),
):
    """Eliminar un encargo (solo admin)"""
    if not es_admin_o_superior(current_user):
        raise HTTPException(status_code=403, detail="Solo administradores pueden eliminar encargos")

    encargo = db.query(Encargo).filter(Encargo.id == encargo_id).first()
    if not encargo:
        raise HTTPException(status_code=404, detail="Encargo no encontrado")

    db.delete(encargo)
    db.commit()

    return {"success": True, "message": "Encargo eliminado"}
