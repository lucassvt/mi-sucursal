import os
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


SSO_SECRET = os.getenv("SSO_SECRET", "DEV_ONLY_SET_REAL_SECRET_IN_ENV")
SSO_SECRET_OLD = os.getenv("SSO_SECRET_OLD", "")  # C.1 window 24h; remover tras T0+24h


def decode_token(token: str) -> dict:
    """Intenta decodificar el token con el SECRET local y, si falla, con el SECRET de SSO (NEW+OLD window)."""
    # Intento 1: secret local
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        pass
    # Intento 2: secret SSO NEW
    try:
        return jwt.decode(token, SSO_SECRET, algorithms=["HS256"])
    except JWTError:
        pass
    # Intento 3: secret SSO OLD (window 24h)
    if SSO_SECRET_OLD:
        try:
            return jwt.decode(token, SSO_SECRET_OLD, algorithms=["HS256"])
        except JWTError:
            pass
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    from ..models.employee import Employee

    payload = decode_token(token)
    # Los tokens locales usan 'sub', los SSO pueden usar 'employee_id' o 'sub'
    sub = payload.get("sub") or payload.get("employee_id")
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
ROLES_ENCARGADO = ["admin", "gerente", "gerencia", "supervisor", "jefe", "encargado superior"]


def es_encargado(employee) -> bool:
    """Verifica si el empleado tiene rol de admin/gerente/supervisor/jefe/encargado superior"""
    rol = (employee.rol or "").lower()
    nivel = (employee.nivel or "").lower()
    puesto = (employee.puesto or "").lower()

    # Excluir encargados de sucursal/local/ventas (roles sin permisos globales)
    exclusiones_encargado = ["encargado de local", "encargado de ventas", "encargado de sucursal"]
    for excl in exclusiones_encargado:
        if excl in rol or excl in nivel or excl in puesto:
            return False

    # Verificar en rol, nivel y puesto
    for r in ROLES_ENCARGADO:
        if r in rol or r in nivel or r in puesto:
            return True
    return False


# Roles que tienen permisos de administración global (ver todas las sucursales, etc.)
ROLES_ADMIN_SUPERIOR = ["admin", "gerente", "gerencia", "supervisor", "jefe", "auditor", "encargado superior"]


def es_admin_o_superior(employee) -> bool:
    """Verifica si el empleado es admin, gerencia, supervisor, jefe o encargado superior"""
    rol = (employee.rol or "").lower()
    nivel = (employee.nivel or "").lower()
    puesto = (employee.puesto or "").lower()

    # Excluir encargados de sucursal/local/ventas (roles sin permisos globales)
    exclusiones = ["encargado de local", "encargado de ventas", "encargado de sucursal"]
    for excl in exclusiones:
        if excl in rol or excl in nivel or excl in puesto:
            return False

    # Roles admin/gerencia
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


# QA-0150 / QA-0151 2026-04-19: bloquear auxiliares en cierre-cajas y auditoria
def require_no_auxiliar(current_user: "Employee" = Depends(get_current_user)):
    """Rechaza 403 si el rol/puesto contiene 'auxiliar'. Usar como dependency del router."""
    tokens = [(current_user.rol or ""), (current_user.puesto or "")]
    if any("auxiliar" in t.lower() for t in tokens):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sin permiso: rol Auxiliar no puede acceder a este modulo."
        )
    return current_user


def es_gerencia_from_token(token_data: dict) -> bool:
    """Check if token has es_gerencia flag"""
    return token_data.get("es_gerencia", False)

def get_sucursales_permitidas(token_data: dict):
    """Get allowed sucursales from token (None = all)"""
    return token_data.get("sucursales_permitidas", None)
