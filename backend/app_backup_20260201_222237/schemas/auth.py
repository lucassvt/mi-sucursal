from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class LoginRequest(BaseModel):
    usuario: str
    password: str


class EmployeeResponse(BaseModel):
    id: int
    usuario: Optional[str] = None
    nombre: str
    apellido: Optional[str] = None
    email: Optional[str] = None
    sucursal_id: Optional[int] = None
    sucursal_nombre: Optional[str] = None
    rol: Optional[str] = None
    puesto: Optional[str] = None
    foto_perfil_url: Optional[str] = None
    tiene_veterinaria: Optional[bool] = None
    tiene_peluqueria: Optional[bool] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: EmployeeResponse
