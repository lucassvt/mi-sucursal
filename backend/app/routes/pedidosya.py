from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..core.security import get_current_user
from ..models.employee import Employee

router = APIRouter(prefix="/api/pedidosya", tags=["pedidosya"])


@router.get("/estado")
async def get_estado_conexion(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener estado de conexion con PedidosYa"""
    return {
        "conectado": False,
        "mensaje": "Integracion no configurada",
        "ultima_sincronizacion": None
    }


@router.get("/pedidos")
async def list_pedidos(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar pedidos de PedidosYa (placeholder)"""
    return {
        "pedidos": [],
        "total": 0,
        "mensaje": "Integracion pendiente de configuracion"
    }
