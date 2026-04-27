from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, or_, and_
from typing import List, Optional
from datetime import datetime, timedelta

from ..core.database import get_db, get_db_anexa
from ..core.security import get_current_user, es_encargado, es_admin_o_superior
from ..models.employee import Employee, SucursalInfo
from ..models.encargos import Encargo
from ..models.facturas import ProveedorCustom
from ..models.clientes import Cliente
from ..schemas.encargos import EncargoCreate, EncargoUpdate, EncargoResponse

router = APIRouter(prefix="/api/encargos", tags=["encargos"])


def _build_response(e, emp_nombre=None, suc_nombre=None, cliente=None):
    """Helper para construir EncargoResponse"""
    return EncargoResponse(
        id=e.id,
        sucursal_id=e.sucursal_id,
        employee_id=e.employee_id,
        producto_nombre=e.producto_nombre,
        producto_codigo=e.producto_codigo,
        cliente_id=e.cliente_id,
        cliente_nombre=e.cliente_nombre,
        cliente_telefono=cliente.telefono if cliente else None,
        cantidad=e.cantidad,
        fecha_encargo=e.fecha_encargo,
        fecha_necesaria=e.fecha_necesaria,
        estado=e.estado,
        observaciones=e.observaciones,
        proveedor_nombre=e.proveedor_nombre,
        employee_nombre=emp_nombre,
        sucursal_nombre=suc_nombre,
        created_at=e.created_at,
    )




@router.get("/proveedores")
async def listar_proveedores_encargo(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db_anexa),
):
    """Listar proveedores custom de la sucursal del usuario (para franquicias)"""
    sucursal_id = current_user.sucursal_id or 0
    proveedores = db.query(ProveedorCustom).filter(
        ProveedorCustom.sucursal_id == sucursal_id
    ).order_by(ProveedorCustom.nombre).all()
    return [{"id": p.id, "nombre": p.nombre} for p in proveedores]


@router.post("/", response_model=EncargoResponse)
async def crear_encargo(
    data: EncargoCreate,
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db: Session = Depends(get_db_anexa),
):
    """Crear un encargo de producto"""
    es_admin = es_admin_o_superior(current_user)

    # Sucursal
    if data.sucursal_id and es_admin:
        sucursal = data.sucursal_id
    else:
        sucursal = current_user.sucursal_id or 0

    # Cliente: si viene cliente_id usar ese, sino crear nuevo si hay nombre+telefono
    cliente_id = data.cliente_id
    cliente_nombre = data.cliente_nombre
    cliente = None

    if not cliente_id and data.cliente_nombre and data.cliente_telefono:
        # Buscar si ya existe por teléfono
        existente = db.query(Cliente).filter(Cliente.telefono == data.cliente_telefono).first()
        if existente:
            cliente_id = existente.id
            cliente_nombre = existente.nombre
            cliente = existente
        else:
            # Crear nuevo cliente
            nuevo = Cliente(
                nombre=data.cliente_nombre,
                telefono=data.cliente_telefono,
                email=data.cliente_email,
                sucursal_id=sucursal,
            )
            db.add(nuevo)
            db.flush()
            cliente_id = nuevo.id
            cliente = nuevo
    elif cliente_id:
        cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
        if cliente:
            cliente_nombre = cliente.nombre

    encargo = Encargo(
        sucursal_id=sucursal,
        employee_id=current_user.id,
        producto_nombre=data.producto_nombre,
        producto_codigo=data.producto_codigo,
        cliente_id=cliente_id,
        cliente_nombre=cliente_nombre,
        cantidad=data.cantidad,
        fecha_necesaria=data.fecha_necesaria,
        observaciones=data.observaciones,
        proveedor_nombre=data.proveedor_nombre,
    )

    db.add(encargo)
    db.commit()
    db.refresh(encargo)

    suc = db_dux.query(SucursalInfo).filter(SucursalInfo.id == encargo.sucursal_id).first()
    emp_nombre = f"{current_user.nombre} {current_user.apellido or ''}".strip()

    return _build_response(encargo, emp_nombre, suc.nombre if suc else None, cliente)


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
        if sucursal_id:
            query = query.filter(Encargo.sucursal_id == sucursal_id)
    else:
        if current_user.sucursal_id:
            query = query.filter(Encargo.sucursal_id == current_user.sucursal_id)

    if estado:
        query = query.filter(Encargo.estado == estado)

    # Ocultar vendidos después de 2 días
    limite = datetime.now() - timedelta(days=2)
    query = query.filter(
        or_(
            Encargo.estado != "vendido",
            Encargo.updated_at >= limite
        )
    )

    encargos = query.order_by(Encargo.created_at.desc()).all()

    # Nombres de empleados
    employee_ids = list(set(e.employee_id for e in encargos))
    nombres = {}
    if employee_ids:
        employees = db_dux.query(Employee).filter(Employee.id.in_(employee_ids)).all()
        nombres = {emp.id: f"{emp.nombre} {emp.apellido or ''}".strip() for emp in employees}

    # Nombres de sucursales
    sucursal_ids = list(set(e.sucursal_id for e in encargos))
    suc_nombres = {}
    if sucursal_ids:
        sucursales = db_dux.query(SucursalInfo).filter(SucursalInfo.id.in_(sucursal_ids)).all()
        suc_nombres = {s.id: s.nombre for s in sucursales}

    # Clientes
    cliente_ids = list(set(e.cliente_id for e in encargos if e.cliente_id))
    clientes = {}
    if cliente_ids:
        cls = db.query(Cliente).filter(Cliente.id.in_(cliente_ids)).all()
        clientes = {c.id: c for c in cls}

    return [
        _build_response(
            e,
            nombres.get(e.employee_id),
            suc_nombres.get(e.sucursal_id),
            clientes.get(e.cliente_id) if e.cliente_id else None,
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

    estados_validos = ["pendiente", "pedido_proveedor", "sin_stock", "en_deposito_central", "en_sucursal_destino", "vendido", "cancelado"]
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
    cliente = db.query(Cliente).filter(Cliente.id == encargo.cliente_id).first() if encargo.cliente_id else None

    return _build_response(encargo, emp_nombre, suc.nombre if suc else None, cliente)


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
