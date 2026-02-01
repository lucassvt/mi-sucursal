from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


class EvaluacionResponse(BaseModel):
    id: int
    sucursal_id: int
    periodo: str
    pilar: str
    puntaje: Optional[Decimal] = None
    aprobado: Optional[bool] = None
    observaciones: Optional[str] = None
    fecha_evaluacion: Optional[datetime] = None

    class Config:
        from_attributes = True


class StockNegativoItem(BaseModel):
    cod_item: str
    item_nombre: str
    marca: Optional[str] = None
    stock_actual: int
