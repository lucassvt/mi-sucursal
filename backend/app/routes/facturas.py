from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from ..core.database import get_db, get_db_anexa
from ..core.security import get_current_user
from ..models.employee import Employee
from ..models.facturas import FacturaProveedor, ProveedorCustom
from ..models.descargos import DescargoAuditoria
from ..schemas.facturas import (
    ProveedorSearchResult, ProveedorCreate,
    FacturaCreate, FacturaResponse
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
    db_anexa: Session = Depends(get_db_anexa)
):
    """Listar facturas de la sucursal del usuario"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    facturas = db_anexa.query(FacturaProveedor).filter(
        FacturaProveedor.sucursal_id == current_user.sucursal_id
    ).order_by(FacturaProveedor.fecha_registro.desc()).limit(50).all()

    # Obtener nombres de empleados
    employee_ids = list(set(f.employee_id for f in facturas))
    employee_map = {}
    if employee_ids:
        employees = db_dux.query(Employee).filter(Employee.id.in_(employee_ids)).all()
        employee_map = {e.id: f"{e.nombre} {e.apellido or ''}".strip() for e in employees}

    return [
        {
            "id": f.id,
            "sucursal_id": f.sucursal_id,
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
