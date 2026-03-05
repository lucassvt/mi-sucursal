from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ClienteCreate(BaseModel):
    nombre: str
    telefono: str
    email: Optional[str] = None


class ClienteResponse(BaseModel):
    id: int
    nombre: str
    telefono: str
    email: Optional[str] = None
    sucursal_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True
