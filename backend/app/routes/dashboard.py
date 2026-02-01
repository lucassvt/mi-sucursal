from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx
from ..core.database import get_db
from ..core.security import get_current_user
from ..core.config import settings
from ..models.employee import Employee, SucursalInfo

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/ventas")
async def get_ventas_sucursal(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener datos de ventas de la sucursal.
    Hace proxy al backend de vendedores para obtener los datos reales.
    """
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    # Obtener info de la sucursal
    sucursal = db.query(SucursalInfo).filter(SucursalInfo.id == current_user.sucursal_id).first()

    try:
        # Intentar obtener datos del backend de vendedores
        async with httpx.AsyncClient() as client:
            # Endpoint del portal vendedores para datos de sucursal
            response = await client.get(
                f"{settings.VENDEDORES_API_URL}/sucursales/{current_user.sucursal_id}/resumen",
                timeout=10.0
            )
            if response.status_code == 200:
                return response.json()
    except Exception as e:
        print(f"Error conectando a vendedores API: {e}")

    # Datos de fallback si no se puede conectar
    return {
        "sucursal": {
            "id": current_user.sucursal_id,
            "nombre": sucursal.nombre if sucursal else "Sin nombre",
        },
        "ventas": {
            "venta_actual": 0,
            "objetivo": 0,
            "porcentaje": 0,
            "proyectado": 0,
        },
        "peluqueria": {
            "disponible": sucursal.tiene_peluqueria if sucursal else False,
            "venta_total": 0,
            "turnos_realizados": 0,
            "objetivo_turnos": 0,
            "proyectado": 0,
        },
        "veterinaria": {
            "disponible": sucursal.tiene_veterinaria if sucursal else False,
            "venta_total": 0,
            "consultas": 0,
            "medicacion": 0,
            "cirugias": 0,
            "vacunaciones": {
                "quintuple": 0,
                "sextuple": 0,
                "antirrabica": 0,
                "triple_felina": 0,
            }
        },
        "mensaje": "Datos de ejemplo - Conectar con backend vendedores"
    }


@router.get("/objetivos")
async def get_objetivos_sucursal(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener objetivos y cumplimiento de la sucursal"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.VENDEDORES_API_URL}/sucursales/{current_user.sucursal_id}/objetivos",
                timeout=10.0
            )
            if response.status_code == 200:
                return response.json()
    except Exception as e:
        print(f"Error conectando a vendedores API: {e}")

    return {
        "objetivo_mensual": 0,
        "venta_actual": 0,
        "porcentaje_cumplimiento": 0,
        "dias_restantes": 0,
    }
