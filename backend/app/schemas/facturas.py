from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from decimal import Decimal


class ProveedorSearchResult(BaseModel):
    id: int
    nombre: str
    origen: str  # "dux" | "custom"


class ProveedorCreate(BaseModel):
    nombre: str
    cuit: Optional[str] = None


class FacturaCreate(BaseModel):
    proveedor_id: Optional[int] = None         # id_proveedor de DUX
    proveedor_custom_id: Optional[int] = None  # id de proveedores_custom
    proveedor_nombre: str
    numero_factura: Optional[str] = None
    imagen_base64: Optional[str] = None
    tiene_inconsistencia: bool = False
    detalle_inconsistencia: Optional[str] = None
    observaciones: Optional[str] = None
    fecha_factura: Optional[date] = None


class FacturaResponse(BaseModel):
    id: int
    sucursal_id: int
    employee_id: int
    proveedor_id: Optional[int] = None
    proveedor_custom_id: Optional[int] = None
    proveedor_nombre: str
    numero_factura: Optional[str] = None
    tiene_inconsistencia: bool = False
    detalle_inconsistencia: Optional[str] = None
    observaciones: Optional[str] = None
    fecha_factura: Optional[date] = None
    fecha_registro: datetime
    employee_nombre: Optional[str] = None
    # imagen_base64 se excluye del listado por peso

    class Config:
        from_attributes = True


class NotaCreditoCreate(BaseModel):
    proveedor_nombre: str
    motivo: str
    productos_detalle: Optional[str] = None
    monto_estimado: Optional[Decimal] = None
    observaciones: Optional[str] = None


class NotaCreditoResponse(BaseModel):
    id: int
    sucursal_id: int
    employee_id: int
    proveedor_nombre: str
    motivo: str
    productos_detalle: Optional[str] = None
    monto_estimado: Optional[Decimal] = None
    estado: str
    observaciones: Optional[str] = None
    fecha_solicitud: datetime
    employee_nombre: Optional[str] = None

    class Config:
        from_attributes = True
