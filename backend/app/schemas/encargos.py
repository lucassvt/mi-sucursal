from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class EncargoCreate(BaseModel):
    producto_nombre: str
    cantidad: int = 1
    fecha_necesaria: Optional[datetime] = None
    observaciones: Optional[str] = None
    cliente_id: Optional[int] = None  # ID de cliente existente
    cliente_nombre: Optional[str] = None  # Nombre para mostrar / crear nuevo
    cliente_telefono: Optional[str] = None  # Para crear cliente nuevo
    cliente_email: Optional[str] = None  # Para crear cliente nuevo
    sucursal_id: Optional[int] = None  # Solo admins pueden especificar


class EncargoUpdate(BaseModel):
    estado: str  # pendiente, pedido_proveedor, vendido, cancelado
    observaciones: Optional[str] = None


class EncargoResponse(BaseModel):
    id: int
    sucursal_id: int
    employee_id: int
    producto_nombre: str
    cantidad: int
    fecha_encargo: datetime
    fecha_necesaria: Optional[datetime] = None
    estado: str
    observaciones: Optional[str] = None
    cliente_id: Optional[int] = None
    cliente_nombre: Optional[str] = None
    cliente_telefono: Optional[str] = None
    employee_nombre: Optional[str] = None
    sucursal_nombre: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
