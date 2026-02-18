from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from ..core.database import get_db, get_db_anexa
from ..core.security import get_current_user, es_encargado
from ..models.employee import Employee, SucursalInfo
from ..models.facturas import FacturaProveedor, ProveedorCustom, SolicitudNotaCredito
from ..models.descargos import DescargoAuditoria
from ..schemas.facturas import (
    ProveedorSearchResult, ProveedorCreate,
    FacturaCreate, FacturaResponse,
    NotaCreditoCreate, NotaCreditoResponse
)

router = APIRouter(prefix="/api/facturas", tags=["facturas"])


@router.get("/proveedores/buscar", response_model=List[ProveedorSearchResult])
async def buscar_proveedores(
    q: str = "",
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Buscar proveedores en DUX (compras) + proveedores custom"""
    if len(q) < 2:
        return []

    resultados = []

    # 1. Buscar en tabla compras de DUX (proveedores existentes)
    query_dux = text("""
        SELECT DISTINCT id_proveedor, proveedor
        FROM compras
        WHERE proveedor IS NOT NULL
        AND proveedor ILIKE :busqueda
        ORDER BY proveedor
        LIMIT 20
    """)
    rows = db_dux.execute(query_dux, {"busqueda": f"%{q}%"}).fetchall()
    for row in rows:
        if row[0] and row[1]:
            resultados.append(ProveedorSearchResult(
                id=int(row[0]),
                nombre=row[1].strip(),
                origen="dux"
            ))

    # 2. Buscar en proveedores_custom (BD Anexa)
    customs = db_anexa.query(ProveedorCustom).filter(
        ProveedorCustom.nombre.ilike(f"%{q}%")
    ).limit(10).all()
    for c in customs:
        resultados.append(ProveedorSearchResult(
            id=c.id,
            nombre=c.nombre,
            origen="custom"
        ))

    return resultados


@router.post("/proveedores", response_model=ProveedorSearchResult)
async def crear_proveedor(
    data: ProveedorCreate,
    current_user: Employee = Depends(get_current_user),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Crear un nuevo proveedor (custom)"""
    if not data.nombre.strip():
        raise HTTPException(status_code=400, detail="El nombre del proveedor es requerido")

    proveedor = ProveedorCustom(
        nombre=data.nombre.strip().upper(),
        cuit=data.cuit,
        created_by_id=current_user.id,
        sucursal_id=current_user.sucursal_id or 0,
    )
    db_anexa.add(proveedor)
    db_anexa.commit()
    db_anexa.refresh(proveedor)

    return ProveedorSearchResult(
        id=proveedor.id,
        nombre=proveedor.nombre,
        origen="custom"
    )


@router.post("/")
async def crear_factura(
    data: FacturaCreate,
    current_user: Employee = Depends(get_current_user),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Registrar una factura de proveedor"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    factura = FacturaProveedor(
        sucursal_id=current_user.sucursal_id,
        employee_id=current_user.id,
        proveedor_id=data.proveedor_id,
        proveedor_custom_id=data.proveedor_custom_id,
        proveedor_nombre=data.proveedor_nombre,
        numero_factura=data.numero_factura,
        imagen_base64=data.imagen_base64,
        tiene_inconsistencia=data.tiene_inconsistencia,
        detalle_inconsistencia=data.detalle_inconsistencia,
        observaciones=data.observaciones,
        fecha_factura=data.fecha_factura,
    )

    db_anexa.add(factura)
    db_anexa.commit()
    db_anexa.refresh(factura)

    # Si tiene inconsistencia, crear descargo automatico en auditoria
    if data.tiene_inconsistencia and data.detalle_inconsistencia:
        descargo = DescargoAuditoria(
            sucursal_id=current_user.sucursal_id,
            creado_por_id=current_user.id,
            categoria="gestion_administrativa",
            titulo=f"Inconsistencia factura - {data.proveedor_nombre}",
            descripcion=data.detalle_inconsistencia,
            estado="pendiente",
            referencia_tipo="factura",
            referencia_id=factura.id,
        )
        db_anexa.add(descargo)
        db_anexa.commit()

    employee_nombre = f"{current_user.nombre} {current_user.apellido or ''}".strip()

    return {
        "id": factura.id,
        "sucursal_id": factura.sucursal_id,
        "employee_id": factura.employee_id,
        "proveedor_nombre": factura.proveedor_nombre,
        "numero_factura": factura.numero_factura,
        "tiene_inconsistencia": factura.tiene_inconsistencia,
        "fecha_factura": str(factura.fecha_factura) if factura.fecha_factura else None,
        "fecha_registro": str(factura.fecha_registro),
        "employee_nombre": employee_nombre,
    }


@router.get("/")
async def listar_facturas(
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa),
    sucursal_id: Optional[int] = Query(None, description="ID de sucursal (solo para encargados)")
):
    """Listar facturas. Encargados pueden filtrar por sucursal o ver todas."""
    target_sucursal = current_user.sucursal_id
    if es_encargado(current_user):
        if sucursal_id:
            target_sucursal = sucursal_id
        else:
            target_sucursal = None  # Ver todas

    if not target_sucursal and not es_encargado(current_user):
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    query = db_anexa.query(FacturaProveedor)
    if target_sucursal:
        query = query.filter(FacturaProveedor.sucursal_id == target_sucursal)
    facturas = query.order_by(FacturaProveedor.fecha_registro.desc()).limit(100).all()

    # Obtener nombres de empleados
    employee_ids = list(set(f.employee_id for f in facturas))
    employee_map = {}
    if employee_ids:
        employees = db_dux.query(Employee).filter(Employee.id.in_(employee_ids)).all()
        employee_map = {e.id: f"{e.nombre} {e.apellido or ''}".strip() for e in employees}

    # Obtener nombres de sucursales
    sucursal_ids = list(set(f.sucursal_id for f in facturas))
    sucursal_map = {}
    if sucursal_ids:
        sucursales = db_dux.query(SucursalInfo).filter(SucursalInfo.id.in_(sucursal_ids)).all()
        sucursal_map = {s.id: s.nombre for s in sucursales}

    return [
        {
            "id": f.id,
            "sucursal_id": f.sucursal_id,
            "sucursal_nombre": sucursal_map.get(f.sucursal_id, f"Sucursal {f.sucursal_id}"),
            "employee_id": f.employee_id,
            "proveedor_id": f.proveedor_id,
            "proveedor_custom_id": f.proveedor_custom_id,
            "proveedor_nombre": f.proveedor_nombre,
            "numero_factura": f.numero_factura,
            "tiene_inconsistencia": f.tiene_inconsistencia,
            "detalle_inconsistencia": f.detalle_inconsistencia,
            "observaciones": f.observaciones,
            "fecha_factura": str(f.fecha_factura) if f.fecha_factura else None,
            "fecha_registro": str(f.fecha_registro),
            "employee_nombre": employee_map.get(f.employee_id, ""),
        }
        for f in facturas
    ]


@router.post("/notas-credito")
async def crear_nota_credito(
    data: NotaCreditoCreate,
    current_user: Employee = Depends(get_current_user),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Crear solicitud de Nota de Crédito"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    if not data.proveedor_nombre.strip():
        raise HTTPException(status_code=400, detail="El proveedor es requerido")
    if not data.motivo.strip():
        raise HTTPException(status_code=400, detail="El motivo es requerido")

    solicitud = SolicitudNotaCredito(
        sucursal_id=current_user.sucursal_id,
        employee_id=current_user.id,
        proveedor_nombre=data.proveedor_nombre.strip(),
        motivo=data.motivo.strip(),
        productos_detalle=data.productos_detalle,
        monto_estimado=data.monto_estimado,
        observaciones=data.observaciones,
        estado="pendiente",
    )

    db_anexa.add(solicitud)
    db_anexa.commit()
    db_anexa.refresh(solicitud)

    employee_nombre = f"{current_user.nombre} {current_user.apellido or ''}".strip()

    return {
        "id": solicitud.id,
        "sucursal_id": solicitud.sucursal_id,
        "employee_id": solicitud.employee_id,
        "proveedor_nombre": solicitud.proveedor_nombre,
        "motivo": solicitud.motivo,
        "productos_detalle": solicitud.productos_detalle,
        "monto_estimado": float(solicitud.monto_estimado) if solicitud.monto_estimado else None,
        "estado": solicitud.estado,
        "observaciones": solicitud.observaciones,
        "fecha_solicitud": str(solicitud.fecha_solicitud),
        "employee_nombre": employee_nombre,
    }


@router.get("/notas-credito")
async def listar_notas_credito(
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa),
    sucursal_id: Optional[int] = Query(None, description="ID de sucursal (solo para encargados)")
):
    """Listar solicitudes de Nota de Crédito. Encargados pueden filtrar por sucursal o ver todas."""
    target_sucursal = current_user.sucursal_id
    if es_encargado(current_user):
        if sucursal_id:
            target_sucursal = sucursal_id
        else:
            target_sucursal = None

    if not target_sucursal and not es_encargado(current_user):
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    query = db_anexa.query(SolicitudNotaCredito)
    if target_sucursal:
        query = query.filter(SolicitudNotaCredito.sucursal_id == target_sucursal)
    solicitudes = query.order_by(SolicitudNotaCredito.fecha_solicitud.desc()).limit(100).all()

    employee_ids = list(set(s.employee_id for s in solicitudes))
    employee_map = {}
    if employee_ids:
        employees = db_dux.query(Employee).filter(Employee.id.in_(employee_ids)).all()
        employee_map = {e.id: f"{e.nombre} {e.apellido or ''}".strip() for e in employees}

    # Obtener nombres de sucursales
    sucursal_ids = list(set(s.sucursal_id for s in solicitudes))
    sucursal_map_nc = {}
    if sucursal_ids:
        sucursales = db_dux.query(SucursalInfo).filter(SucursalInfo.id.in_(sucursal_ids)).all()
        sucursal_map_nc = {s.id: s.nombre for s in sucursales}

    return [
        {
            "id": s.id,
            "sucursal_id": s.sucursal_id,
            "sucursal_nombre": sucursal_map_nc.get(s.sucursal_id, f"Sucursal {s.sucursal_id}"),
            "employee_id": s.employee_id,
            "proveedor_nombre": s.proveedor_nombre,
            "motivo": s.motivo,
            "productos_detalle": s.productos_detalle,
            "monto_estimado": float(s.monto_estimado) if s.monto_estimado else None,
            "estado": s.estado,
            "observaciones": s.observaciones,
            "fecha_solicitud": str(s.fecha_solicitud),
            "employee_nombre": employee_map.get(s.employee_id, ""),
        }
        for s in solicitudes
    ]
