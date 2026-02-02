from pydantic import BaseModel
from typing import Optional, Literal
from datetime import date, datetime


CATEGORIAS = Literal[
    "ORDEN Y LIMPIEZA",
    "MANTENIMIENTO SUCURSAL",
    "CONTROL Y GESTION DE STOCK",
    "GESTION ADMINISTRATIVA EN SISTEMA"
]

ESTADOS = Literal["pendiente", "en_progreso", "completada"]


class TareaCreate(BaseModel):
    categoria: CATEGORIAS
    titulo: str
    descripcion: Optional[str] = None
    fecha_vencimiento: date


class TareaUpdateEstado(BaseModel):
    estado: ESTADOS


class TareaResponse(BaseModel):
    id: int
    sucursal_id: int
    categoria: str
    titulo: str
    descripcion: Optional[str] = None
    asignado_por: Optional[int] = None
    asignado_por_nombre: Optional[str] = None
    fecha_asignacion: date
    fecha_vencimiento: date
    estado: str
    completado_por: Optional[int] = None
    fecha_completado: Optional[datetime] = None

    class Config:
        from_attributes = True
