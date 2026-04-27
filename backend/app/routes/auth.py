import os
from collections import deque
from time import time
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.security import verify_password, create_access_token, get_current_user
from ..models.employee import Employee, SucursalInfo
from ..schemas.auth import Token, LoginRequest, EmployeeResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])

# QA-0144 2026-04-19: rate limiting in-memory por IP (10 intentos / 60s)
_login_attempts: dict = {}
_RL_MAX = 10
_RL_WINDOW = 60


def _check_login_rate_limit(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    now = time()
    q = _login_attempts.setdefault(ip, deque())
    while q and now - q[0] > _RL_WINDOW:
        q.popleft()
    if len(q) >= _RL_MAX:
        raise HTTPException(status_code=429, detail="Demasiados intentos. Esperá 1 minuto.")
    q.append(now)


@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Login con usuario y password"""
    _check_login_rate_limit(request)
    employee = db.query(Employee).filter(Employee.usuario == login_data.usuario).first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
        )

    if not employee.password_hash or not verify_password(login_data.password, employee.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
        )

    if not employee.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario inactivo",
        )

    # Obtener info de sucursal
    sucursal = db.query(SucursalInfo).filter(SucursalInfo.id == employee.sucursal_id).first()

    # QA-0141 + F.4 2026-04-19: usar fn_puede (mi-sucursal vendedor OR mi-sucursal-gerencia)
    from sqlalchemy import text as sa_text
    puede_row = db.execute(sa_text(
        "SELECT fn_puede(:eid, 'mi-sucursal', 'read') AS vend, fn_puede(:eid, 'mi-sucursal-gerencia', 'read') AS ger"
    ), {"eid": employee.id}).fetchone()
    if not (puede_row and (puede_row[0] or puede_row[1])):
        raise HTTPException(status_code=403, detail="Sin permiso para Mi Sucursal")
    es_gerencia = bool(puede_row[1])

    # Get allowed sucursales for franquicia managers
    sucursales_permitidas = None
    if es_gerencia and employee.sucursal_id:
        franq_sucs = db.execute(sa_text(
            "SELECT f.id_sucursal_dux FROM franquicias f WHERE f.activa = true AND f.id_sucursal_dux = :sid"
        ), {"sid": employee.sucursal_id}).first()
        if franq_sucs:
            # Franquicia manager - only their sucursales
            sucursales_permitidas = [employee.sucursal_id]

    # 2026-04-25: Sucursales asignadas desde fuente canonica (empleado_sucursales).
    # Fix bug: la query anterior usaba employee.id contra schedules.personal_id que es
    # FK a personales.id (no a employees.id), por eso devolvia vacio para empleados
    # multi-sede como Alanis (employee.id=2421 != personales.id=83).
    from ..core.scope import get_sucursales_empleado
    sucursales_asignadas = [
        {"id": s["id"], "nombre": s["nombre"]}
        for s in get_sucursales_empleado(employee, db)
    ]

    access_token = create_access_token(
        data={"sub": str(employee.id), "sucursal_id": employee.sucursal_id,
              "es_gerencia": es_gerencia,
              "sucursales_permitidas": sucursales_permitidas}
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=EmployeeResponse(
            id=employee.id,
            usuario=employee.usuario,
            nombre=employee.nombre,
            apellido=employee.apellido,
            email=employee.email,
            sucursal_id=employee.sucursal_id,
            sucursal_nombre=sucursal.nombre if sucursal else None,
            rol=employee.rol,
            puesto=employee.puesto,
            foto_perfil_url=employee.foto_perfil_url,
            tiene_veterinaria=sucursal.tiene_veterinaria if sucursal else False,
            tiene_peluqueria=sucursal.tiene_peluqueria if sucursal else False,
            esGerencia=es_gerencia,
            sucursalesPermitidas=sucursales_permitidas,
            sucursalesAsignadas=sucursales_asignadas,
        )
    )




@router.post("/sso")
async def sso_login(request: dict, db: Session = Depends(get_db)):
    """SSO login - validate token from landing-general and generate local token"""
    from jose import jwt as jose_jwt, JWTError as JoseJWTError

    token = request.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Token requerido")

    # C.1 2026-04-19: dual-decode window 24h (NEW primero, fallback OLD)
    SSO_SECRET = os.getenv("SSO_SECRET", "DEV_ONLY_SET_REAL_SECRET_IN_ENV")
    SSO_SECRET_OLD = os.getenv("SSO_SECRET_OLD", "")
    decoded = None
    try:
        decoded = jose_jwt.decode(token, SSO_SECRET, algorithms=["HS256"])
    except JoseJWTError:
        if SSO_SECRET_OLD:
            try:
                decoded = jose_jwt.decode(token, SSO_SECRET_OLD, algorithms=["HS256"])
            except JoseJWTError:
                raise HTTPException(status_code=401, detail="Token SSO invalido o expirado")
        else:
            raise HTTPException(status_code=401, detail="Token SSO invalido o expirado")

    employee_id = decoded.get("employee_id") or decoded.get("sub")
    if employee_id:
        employee_id = int(employee_id)

    employee = db.query(Employee).filter(Employee.id == employee_id, Employee.activo == True).first()
    if not employee:
        raise HTTPException(status_code=401, detail="Empleado no encontrado")

    sucursal = db.query(SucursalInfo).filter(SucursalInfo.id == employee.sucursal_id).first()

    from ..core.security import create_access_token
    from sqlalchemy import text as sa_text
    # QA-0141 + F.4 2026-04-19: usar fn_puede (mi-sucursal vendedor OR mi-sucursal-gerencia)
    puede_row = db.execute(sa_text(
        "SELECT fn_puede(:eid, 'mi-sucursal', 'read') AS vend, fn_puede(:eid, 'mi-sucursal-gerencia', 'read') AS ger"
    ), {"eid": employee.id}).fetchone()
    if not (puede_row and (puede_row[0] or puede_row[1])):
        raise HTTPException(status_code=403, detail="Sin permiso para Mi Sucursal")
    es_gerencia = bool(puede_row[1])

    # Get allowed sucursales for franquicia managers
    sucursales_permitidas = None
    if es_gerencia and employee.sucursal_id:
        franq_sucs = db.execute(sa_text(
            "SELECT f.id_sucursal_dux FROM franquicias f WHERE f.activa = true AND f.id_sucursal_dux = :sid"
        ), {"sid": employee.sucursal_id}).first()
        if franq_sucs:
            # Franquicia manager - only their sucursales
            sucursales_permitidas = [employee.sucursal_id]

    access_token = create_access_token(
        data={"sub": str(employee.id), "sucursal_id": employee.sucursal_id,
              "es_gerencia": es_gerencia,
              "sucursales_permitidas": sucursales_permitidas}
    )

    # 2026-04-25: idem login, fuente canonica empleado_sucursales.
    from ..core.scope import get_sucursales_empleado
    sucursales_asignadas = [
        {"id": s["id"], "nombre": s["nombre"]}
        for s in get_sucursales_empleado(employee, db)
    ]

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=EmployeeResponse(
            id=employee.id,
            usuario=employee.usuario,
            nombre=employee.nombre,
            apellido=employee.apellido,
            email=employee.email,
            sucursal_id=employee.sucursal_id,
            sucursal_nombre=sucursal.nombre if sucursal else None,
            rol=employee.rol,
            puesto=employee.puesto,
            foto_perfil_url=employee.foto_perfil_url,
            tiene_veterinaria=sucursal.tiene_veterinaria if sucursal else False,
            tiene_peluqueria=sucursal.tiene_peluqueria if sucursal else False,
            esGerencia=es_gerencia,
            sucursalesPermitidas=sucursales_permitidas,
            sucursalesAsignadas=sucursales_asignadas,
        )
    )

@router.get("/me", response_model=EmployeeResponse)
async def get_me(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener datos del usuario actual"""
    sucursal = db.query(SucursalInfo).filter(SucursalInfo.id == current_user.sucursal_id).first()

    from sqlalchemy import text as sa_text
    perm_check = db.execute(sa_text(
        "SELECT 1 FROM permisos_usuario_sistema WHERE employee_id = :eid AND sistema_id = 17 AND activo = true"
    ), {"eid": current_user.id}).first()
    es_gerencia = perm_check is not None

    return EmployeeResponse(
        id=current_user.id,
        usuario=current_user.usuario,
        nombre=current_user.nombre,
        apellido=current_user.apellido,
        email=current_user.email,
        sucursal_id=current_user.sucursal_id,
        sucursal_nombre=sucursal.nombre if sucursal else None,
        rol=current_user.rol,
        puesto=current_user.puesto,
        foto_perfil_url=current_user.foto_perfil_url,
        tiene_veterinaria=sucursal.tiene_veterinaria if sucursal else False,
        tiene_peluqueria=sucursal.tiene_peluqueria if sucursal else False,
        esGerencia=es_gerencia,
    )


@router.get("/sucursales-disponibles")
async def sucursales_disponibles(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Devuelve la lista de sucursales asignadas al empleado autenticado.

    El frontend la usa post-login para decidir si muestra la pantalla
    "¿En qué sucursal estás trabajando hoy?" (cuando hay >1) o entra directo
    (cuando hay 1 o ninguna).

    Fuente: tabla empleado_sucursales (MDM Mi Legajo). Fallback a employees.sucursal_id.
    """
    from ..core.scope import get_sucursales_empleado
    sucursales = get_sucursales_empleado(current_user, db)
    principal = next((s for s in sucursales if s.get("es_principal")), None)
    return {
        "sucursales": sucursales,
        "principal_id": principal["id"] if principal else (sucursales[0]["id"] if sucursales else None),
        "count": len(sucursales),
    }
