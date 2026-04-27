from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal


class CierreCreate(BaseModel):
    caja_id: int
    fecha_caja: date
    monto_efectivo: Decimal
    observaciones: Optional[str] = None


class CierreResponse(BaseModel):
    id: int
    caja_id: int
    caja_nombre: Optional[str] = None
    fecha_caja: date
    monto_declarado: Decimal
    monto_dux: Optional[Decimal] = None
    diferencia: Optional[Decimal] = None
    estado: str
    fecha_declaracion: datetime

    class Config:
        from_attributes = True


class RetiroResponse(BaseModel):
    id: int
    fecha_retiro: datetime
    estado: str
    monto_total_recibido: Optional[Decimal] = None
    diferencia_total: Optional[Decimal] = None

    class Config:
        from_attributes = True
