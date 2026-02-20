from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .config import settings
from .database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    from ..models.employee import Employee

    payload = decode_token(token)
    sub = payload.get("sub")
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )
    try:
        employee_id = int(sub)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )

    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
        )

    return employee


# Roles/puestos que tienen permisos de encargado (gestión de tareas, aprobaciones, etc.)
# "Encargado Superior" de DUX = Encargado en Mi Sucursal
ROLES_ENCARGADO = ["encargado", "admin", "gerente", "gerencia", "supervisor", "jefe"]


def es_encargado(employee) -> bool:
    """Verifica si el empleado tiene rol de encargado o superior"""
    rol = (employee.rol or "").lower()
    nivel = (employee.nivel or "").lower()
    puesto = (employee.puesto or "").lower()

    # Verificar en rol, nivel y puesto
    for r in ROLES_ENCARGADO:
        if r in rol or r in nivel or r in puesto:
            return True
    return False


# Roles que tienen permisos de administración global (ver todas las sucursales, etc.)
# NO incluye "Encargado de sucursal" ni "Encargado de ventas" - solo superiores
ROLES_ADMIN_SUPERIOR = ["admin", "gerente", "gerencia", "supervisor", "jefe", "auditor"]


def es_admin_o_superior(employee) -> bool:
    """Verifica si el empleado es admin, gerencia o encargado superior (NO encargado de sucursal)"""
    rol = (employee.rol or "").lower()
    nivel = (employee.nivel or "").lower()
    puesto = (employee.puesto or "").lower()

    # "Encargado Superior" tiene acceso global
    if "encargado superior" in rol or "encargado superior" in nivel or "encargado superior" in puesto:
        return True

    # Otros roles admin/gerencia
    for r in ROLES_ADMIN_SUPERIOR:
        if r in rol or r in nivel or r in puesto:
            return True
    return False


# Alias para compatibilidad
es_supervisor = es_encargado


def require_encargado(current_user):
    """Lanza excepción si el usuario no es encargado"""
    if not es_encargado(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para realizar esta acción. Se requiere rol de Encargado o superior."
        )


# Alias para compatibilidad
def require_supervisor(current_user):
    """Alias de require_encargado para compatibilidad"""
    require_encargado(current_user)
