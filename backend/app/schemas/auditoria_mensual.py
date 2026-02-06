from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class AuditoriaMensualCreate(BaseModel):
    sucursal_id: int
    periodo: str  # "2026-01"
    orden_limpieza: Optional[float] = None
    pedidos: Optional[float] = None
    gestion_administrativa: Optional[float] = None
    club_mascotera: Optional[float] = None
    control_stock_caja: Optional[float] = None
    puntaje_total: Optional[float] = None
    observaciones: Optional[str] = None


class AuditoriaMensualResponse(BaseModel):
    id: int
    sucursal_id: int
    periodo: str
    orden_limpieza: Optional[float] = None
    pedidos: Optional[float] = None
    gestion_administrativa: Optional[float] = None
    club_mascotera: Optional[float] = None
    control_stock_caja: Optional[float] = None
    puntaje_total: Optional[float] = None
    observaciones: Optional[str] = None

    class Config:
        from_attributes = True


class AuditoriaMensualBulkCreate(BaseModel):
    registros: List[AuditoriaMensualCreate]
