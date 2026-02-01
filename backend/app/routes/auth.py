from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.security import verify_password, create_access_token, get_current_user
from ..models.employee import Employee, SucursalInfo
from ..schemas.auth import Token, LoginRequest, EmployeeResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Login con usuario y password"""
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

    access_token = create_access_token(
        data={"sub": employee.id, "sucursal_id": employee.sucursal_id}
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
        )
    )


@router.get("/me", response_model=EmployeeResponse)
async def get_me(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener datos del usuario actual"""
    sucursal = db.query(SucursalInfo).filter(SucursalInfo.id == current_user.sucursal_id).first()

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
    )
