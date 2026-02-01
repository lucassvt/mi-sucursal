from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ItemSearch(BaseModel):
    cod_item: str
    item: str
    marca_nombre: Optional[str] = None
    stock: Optional[dict] = None  # Stock por sucursal


class VentaPerdidaCreate(BaseModel):
    cod_item: Optional[str] = None
    item_nombre: str
    marca: Optional[str] = None
    cantidad: int
    es_producto_nuevo: bool = False
    observaciones: Optional[str] = None


class VentaPerdidaResponse(BaseModel):
    id: int
    sucursal_id: int
    employee_id: int
    cod_item: Optional[str] = None
    item_nombre: str
    marca: Optional[str] = None
    cantidad: int
    es_producto_nuevo: bool
    observaciones: Optional[str] = None
    fecha_registro: datetime
    employee_nombre: Optional[str] = None

    class Config:
        from_attributes = True
