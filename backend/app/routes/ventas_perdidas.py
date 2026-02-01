from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from datetime import datetime, date
from ..core.database import get_db
from ..core.security import get_current_user
from ..models.employee import Employee
from ..models.ventas_perdidas import VentaPerdida
from ..schemas.ventas_perdidas import VentaPerdidaCreate, VentaPerdidaResponse

router = APIRouter(prefix="/api/ventas-perdidas", tags=["ventas-perdidas"])


@router.post("/", response_model=VentaPerdidaResponse)
async def create_venta_perdida(
    data: VentaPerdidaCreate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Registrar una venta perdida"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    # Obtener el dux_id de la sucursal del usuario
    sucursal_query = text("SELECT dux_id FROM sucursales WHERE id = :id")
    sucursal_result = db.execute(sucursal_query, {"id": current_user.sucursal_id}).fetchone()
    sucursal_dux_id = sucursal_result.dux_id if sucursal_result else current_user.sucursal_id

    venta_perdida = VentaPerdida(
        sucursal_id=sucursal_dux_id,
        employee_id=current_user.id,
        cod_item=data.cod_item,
        item_nombre=data.item_nombre,
        marca=data.marca,
        cantidad=data.cantidad,
        es_producto_nuevo=data.es_producto_nuevo,
        observaciones=data.observaciones,
    )

    db.add(venta_perdida)
    db.commit()
    db.refresh(venta_perdida)

    return VentaPerdidaResponse(
        id=venta_perdida.id,
        sucursal_id=venta_perdida.sucursal_id,
        employee_id=venta_perdida.employee_id,
        cod_item=venta_perdida.cod_item,
        item_nombre=venta_perdida.item_nombre,
        marca=venta_perdida.marca,
        cantidad=venta_perdida.cantidad,
        es_producto_nuevo=venta_perdida.es_producto_nuevo,
        observaciones=venta_perdida.observaciones,
        fecha_registro=venta_perdida.fecha_registro,
        employee_nombre=f"{current_user.nombre} {current_user.apellido or ''}".strip()
    )


@router.get("/", response_model=List[VentaPerdidaResponse])
async def list_ventas_perdidas(
    fecha_desde: date = None,
    fecha_hasta: date = None,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar ventas perdidas de la sucursal"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    # Obtener el dux_id de la sucursal
    sucursal_query = text("SELECT dux_id FROM sucursales WHERE id = :id")
    sucursal_result = db.execute(sucursal_query, {"id": current_user.sucursal_id}).fetchone()
    sucursal_dux_id = sucursal_result.dux_id if sucursal_result else current_user.sucursal_id

    query = db.query(VentaPerdida).filter(VentaPerdida.sucursal_id == sucursal_dux_id)

    if fecha_desde:
        query = query.filter(VentaPerdida.fecha_registro >= fecha_desde)
    if fecha_hasta:
        query = query.filter(VentaPerdida.fecha_registro <= fecha_hasta)

    query = query.order_by(VentaPerdida.fecha_registro.desc())
    ventas = query.limit(100).all()

    # Obtener nombres de empleados
    employee_ids = list(set(v.employee_id for v in ventas))
    employees = db.query(Employee).filter(Employee.id.in_(employee_ids)).all()
    employee_map = {e.id: f"{e.nombre} {e.apellido or ''}".strip() for e in employees}

    return [
        VentaPerdidaResponse(
            id=v.id,
            sucursal_id=v.sucursal_id,
            employee_id=v.employee_id,
            cod_item=v.cod_item,
            item_nombre=v.item_nombre,
            marca=v.marca,
            cantidad=v.cantidad,
            es_producto_nuevo=v.es_producto_nuevo,
            observaciones=v.observaciones,
            fecha_registro=v.fecha_registro,
            employee_nombre=employee_map.get(v.employee_id, "")
        )
        for v in ventas
    ]


@router.get("/resumen")
async def get_resumen_ventas_perdidas(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resumen de ventas perdidas del mes actual"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    # Obtener el dux_id de la sucursal
    sucursal_query = text("SELECT dux_id FROM sucursales WHERE id = :id")
    sucursal_result = db.execute(sucursal_query, {"id": current_user.sucursal_id}).fetchone()
    sucursal_dux_id = sucursal_result.dux_id if sucursal_result else current_user.sucursal_id

    # Resumen del mes actual
    query = text("""
        SELECT
            COUNT(*) as total_registros,
            SUM(cantidad) as total_unidades,
            SUM(CASE WHEN es_producto_nuevo THEN 1 ELSE 0 END) as productos_nuevos,
            SUM(CASE WHEN NOT es_producto_nuevo THEN 1 ELSE 0 END) as falta_stock
        FROM ventas_perdidas
        WHERE sucursal_id = :sucursal_id
        AND DATE_TRUNC('month', fecha_registro) = DATE_TRUNC('month', CURRENT_DATE)
    """)

    result = db.execute(query, {"sucursal_id": sucursal_dux_id}).fetchone()

    return {
        "total_registros": result.total_registros or 0,
        "total_unidades": result.total_unidades or 0,
        "productos_nuevos": result.productos_nuevos or 0,
        "falta_stock": result.falta_stock or 0,
    }
