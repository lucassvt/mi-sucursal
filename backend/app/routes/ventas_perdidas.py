from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from datetime import date
from ..core.database import get_db
from ..core.security import get_current_user, es_encargado
from ..models.employee import Employee, SucursalInfo
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

    venta_perdida = VentaPerdida(
        sucursal_id=current_user.sucursal_id,
        employee_id=current_user.id,
        cod_item=data.cod_item,
        item_nombre=data.item_nombre,
        marca=data.marca,
        cantidad=data.cantidad,
        es_producto_nuevo=data.es_producto_nuevo,
        motivo=data.motivo,
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
        motivo=venta_perdida.motivo,
        observaciones=venta_perdida.observaciones,
        fecha_registro=venta_perdida.fecha_registro,
        employee_nombre=f"{current_user.nombre} {current_user.apellido or ''}".strip()
    )


@router.get("/", response_model=List[VentaPerdidaResponse])
async def list_ventas_perdidas(
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar ventas perdidas de la sucursal"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    query = db.query(VentaPerdida).filter(
        VentaPerdida.sucursal_id == current_user.sucursal_id
    )

    if fecha_desde:
        query = query.filter(VentaPerdida.fecha_registro >= fecha_desde)
    if fecha_hasta:
        query = query.filter(VentaPerdida.fecha_registro <= fecha_hasta)

    query = query.order_by(VentaPerdida.fecha_registro.desc())
    ventas = query.limit(100).all()

    # Obtener nombres de empleados
    employee_ids = list(set(v.employee_id for v in ventas))
    employee_map = {}
    if employee_ids:
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
            motivo=v.motivo or 'sin_stock',
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

    query = text("""
        SELECT
            COUNT(*) as total_registros,
            COALESCE(SUM(cantidad), 0) as total_unidades,
            SUM(CASE WHEN motivo = 'sin_stock' OR (motivo IS NULL AND NOT es_producto_nuevo) THEN 1 ELSE 0 END) as sin_stock,
            SUM(CASE WHEN motivo = 'precio' THEN 1 ELSE 0 END) as por_precio,
            SUM(CASE WHEN motivo = 'otro' THEN 1 ELSE 0 END) as otros,
            SUM(CASE WHEN motivo = 'producto_nuevo' OR (motivo IS NULL AND es_producto_nuevo) THEN 1 ELSE 0 END) as productos_nuevos
        FROM ventas_perdidas
        WHERE sucursal_id = :sucursal_id
        AND DATE_TRUNC('month', fecha_registro) = DATE_TRUNC('month', CURRENT_DATE)
    """)

    result = db.execute(query, {"sucursal_id": current_user.sucursal_id}).fetchone()

    return {
        "total_registros": result[0] or 0,
        "total_unidades": result[1] or 0,
        "sin_stock": result[2] or 0,
        "por_precio": result[3] or 0,
        "otros": result[4] or 0,
        "productos_nuevos": result[5] or 0,
    }


@router.get("/resumen-todas")
async def get_resumen_ventas_perdidas_todas(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resumen de ventas perdidas de TODAS las sucursales (solo encargados)"""
    if not es_encargado(current_user):
        raise HTTPException(status_code=403, detail="Solo encargados pueden ver todas las sucursales")

    query = text("""
        SELECT
            sucursal_id,
            COUNT(*) as total_registros,
            COALESCE(SUM(cantidad), 0) as total_unidades,
            SUM(CASE WHEN motivo = 'sin_stock' OR (motivo IS NULL AND NOT es_producto_nuevo) THEN 1 ELSE 0 END) as sin_stock,
            SUM(CASE WHEN motivo = 'precio' THEN 1 ELSE 0 END) as por_precio,
            SUM(CASE WHEN motivo = 'otro' THEN 1 ELSE 0 END) as otros,
            SUM(CASE WHEN motivo = 'producto_nuevo' OR (motivo IS NULL AND es_producto_nuevo) THEN 1 ELSE 0 END) as productos_nuevos
        FROM ventas_perdidas
        WHERE DATE_TRUNC('month', fecha_registro) = DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY sucursal_id
        ORDER BY total_registros DESC
    """)

    rows = db.execute(query).fetchall()

    # Obtener nombres de sucursales
    sucursal_ids = [row[0] for row in rows]
    sucursal_map = {}
    if sucursal_ids:
        sucursales = db.query(SucursalInfo).filter(SucursalInfo.id.in_(sucursal_ids)).all()
        sucursal_map = {s.id: s.nombre for s in sucursales}

    return [
        {
            "sucursal_id": row[0],
            "sucursal_nombre": sucursal_map.get(row[0], f"Sucursal {row[0]}"),
            "total_registros": row[1] or 0,
            "total_unidades": row[2] or 0,
            "sin_stock": row[3] or 0,
            "por_precio": row[4] or 0,
            "otros": row[5] or 0,
            "productos_nuevos": row[6] or 0,
        }
        for row in rows
    ]
