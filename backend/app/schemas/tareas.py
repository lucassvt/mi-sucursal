from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class TareaCreate(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    fecha_vencimiento: date


class TareaResponse(BaseModel):
    id: int
    sucursal_id: int
    titulo: str
    descripcion: Optional[str] = None
    asignado_por: Optional[int] = None
    fecha_asignacion: date
    fecha_vencimiento: date
    estado: str
    completado_por: Optional[int] = None
    fecha_completado: Optional[datetime] = None

    class Config:
        from_attributes = True
