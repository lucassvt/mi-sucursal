from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..core.database import get_db_anexa
from ..core.security import get_current_user
from ..models.employee import Employee
from ..models.clientes import Cliente
from ..schemas.clientes import ClienteCreate, ClienteResponse

router = APIRouter(prefix="/api/clientes", tags=["clientes"])


@router.post("/", response_model=ClienteResponse)
async def crear_cliente(
    data: ClienteCreate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db_anexa),
):
    """Crear un nuevo cliente"""
    cliente = Cliente(
        nombre=data.nombre,
        telefono=data.telefono,
        email=data.email,
        sucursal_id=current_user.sucursal_id,
    )
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente


@router.get("/", response_model=List[ClienteResponse])
async def listar_clientes(
    q: Optional[str] = None,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db_anexa),
):
    """Buscar clientes por nombre o teléfono"""
    query = db.query(Cliente)
    if q and len(q) >= 2:
        query = query.filter(
            (Cliente.nombre.ilike(f"%{q}%")) | (Cliente.telefono.ilike(f"%{q}%"))
        )
    return query.order_by(Cliente.nombre).limit(20).all()
