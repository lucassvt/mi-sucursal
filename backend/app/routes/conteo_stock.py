"""
Rutas: Conteos de Stock
Base de datos: mi_sucursal (anexa) + dux_integrada (DUX)

Endpoints:
- POST /api/control-stock/tareas - Crear tarea de conteo con productos
- GET  /api/control-stock/conteo/{tareaId} - Obtener conteo por tarea
- PUT  /api/control-stock/conteo/{conteoId}/producto/{productoId} - Actualizar un producto
- PUT  /api/control-stock/conteo/{conteoId}/guardar - Guardar borrador (batch)
- POST /api/control-stock/conteo/{conteoId}/enviar - Enviar para revision
- PUT  /api/control-stock/conteo/{conteoId}/revisar - Aprobar/rechazar
- PUT  /api/control-stock/conteo/{conteoId}/cerrar - Cerrar desde auditoria (completa tarea)
- GET  /api/control-stock/auditoria/resumen - Resumen para auditoria
- GET  /api/control-stock/auditoria/conteos - Listar conteos
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel

from ..core.database import get_db, get_db_anexa
from ..core.security import get_current_user, require_supervisor
from ..models.employee import Employee
from ..models.tareas import TareaSucursal
from ..models.conteo_stock import ConteoStock, ProductoConteo

router = APIRouter(prefix="/api/control-stock", tags=["control-stock-conteo"])


# === Schemas ===

class ProductoTareaCreate(BaseModel):
    cod_item: str
    nombre: str
    precio: float
    stock_sistema: float


class TareaConteoCreate(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    fecha_vencimiento: str  # YYYY-MM-DD
    productos: List[ProductoTareaCreate]


class ProductoUpdate(BaseModel):
    id: int
    stock_real: Optional[int] = None
    observaciones: Optional[str] = None


class GuardarBorradorRequest(BaseModel):
    productos: List[ProductoUpdate]


class RevisarConteoRequest(BaseModel):
    estado: str  # "aprobado" | "rechazado"
    comentarios: Optional[str] = None


# === Helpers ===

def get_employee_nombre(db: Session, employee_id: int) -> str:
    query = text("SELECT nombre, apellido FROM employees WHERE id = :id")
    result = db.execute(query, {"id": employee_id}).fetchone()
    if result:
        return f"{result.nombre or ''} {result.apellido or ''}".strip() or "Usuario"
    return "Usuario"


def recalculate_conteo(db_anexa: Session, conteo: ConteoStock):
    """Recalcula los agregados del conteo basandose en los productos"""
    productos = db_anexa.query(ProductoConteo).filter(
        ProductoConteo.conteo_id == conteo.id
    ).all()

    conteo.total_productos = len(productos)
    conteo.productos_contados = sum(1 for p in productos if p.stock_real is not None)
    conteo.productos_con_diferencia = sum(
        1 for p in productos if p.diferencia is not None and p.diferencia != 0
    )
    conteo.valorizacion_diferencia = sum(
        float(p.diferencia * p.precio) for p in productos
        if p.diferencia is not None
    )


def build_conteo_response(conteo: ConteoStock, productos: list, db_dux: Session) -> dict:
    """Construye la respuesta JSON del conteo con nombres de empleados"""
    return {
        "id": conteo.id,
        "tarea_id": conteo.tarea_id,
        "sucursal_id": conteo.sucursal_id,
        "fecha_conteo": conteo.fecha_conteo.isoformat() if conteo.fecha_conteo else None,
        "estado": conteo.estado,
        "empleado_id": conteo.empleado_id,
        "empleado_nombre": get_employee_nombre(db_dux, conteo.empleado_id),
        "revisado_por": conteo.revisado_por,
        "revisado_por_nombre": get_employee_nombre(db_dux, conteo.revisado_por) if conteo.revisado_por else None,
        "fecha_revision": conteo.fecha_revision.isoformat() if conteo.fecha_revision else None,
        "comentarios_auditor": conteo.comentarios_auditor,
        "valorizacion_diferencia": float(conteo.valorizacion_diferencia or 0),
        "productos": [
            {
                "id": p.id,
                "cod_item": p.cod_item,
                "nombre": p.nombre,
                "precio": float(p.precio),
                "stock_sistema": p.stock_sistema,
                "stock_real": p.stock_real,
                "diferencia": p.diferencia,
                "observaciones": p.observaciones,
            }
            for p in productos
        ],
        "total_productos": conteo.total_productos,
        "productos_contados": conteo.productos_contados,
        "productos_con_diferencia": conteo.productos_con_diferencia,
        "created_at": conteo.created_at.isoformat() if conteo.created_at else None,
    }


# === Endpoints ===


# 1. Crear tarea de conteo con productos
@router.post("/tareas")
async def crear_tarea_conteo(
    data: TareaConteoCreate,
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Crear tarea de control de stock con productos (solo encargados)"""
    require_supervisor(current_user)

    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    if not data.productos:
        raise HTTPException(status_code=400, detail="Debe incluir al menos un producto")

    # Crear TareaSucursal en BD DUX
    try:
        fecha_venc = date.fromisoformat(data.fecha_vencimiento)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha invalido. Use YYYY-MM-DD")

    tarea = TareaSucursal(
        sucursal_id=current_user.sucursal_id,
        categoria="CONTROL Y GESTION DE STOCK",
        titulo=data.titulo,
        descripcion=data.descripcion,
        asignado_por=current_user.id,
        fecha_asignacion=date.today(),
        fecha_vencimiento=fecha_venc,
        estado="pendiente"
    )
    db_dux.add(tarea)
    db_dux.commit()
    db_dux.refresh(tarea)

    # Crear ConteoStock en BD Anexa
    try:
        conteo = ConteoStock(
            tarea_id=tarea.id,
            sucursal_id=current_user.sucursal_id,
            empleado_id=current_user.id,
            estado="borrador",
            total_productos=len(data.productos),
        )
        db_anexa.add(conteo)
        db_anexa.commit()
        db_anexa.refresh(conteo)

        # Crear ProductoConteo por cada producto
        productos_db = []
        for p in data.productos:
            producto = ProductoConteo(
                conteo_id=conteo.id,
                cod_item=p.cod_item,
                nombre=p.nombre,
                precio=p.precio,
                stock_sistema=p.stock_sistema,
            )
            db_anexa.add(producto)
            productos_db.append(producto)

        db_anexa.commit()
        for p in productos_db:
            db_anexa.refresh(p)

    except Exception as e:
        # Si falla Anexa, eliminar la tarea de DUX
        db_dux.delete(tarea)
        db_dux.commit()
        raise HTTPException(status_code=500, detail=f"Error al crear conteo: {str(e)}")

    return build_conteo_response(conteo, productos_db, db_dux)


# 2. Obtener conteo por tarea
@router.get("/conteo/{tarea_id}")
async def get_conteo(
    tarea_id: int,
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Obtener el conteo asociado a una tarea"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    conteo = db_anexa.query(ConteoStock).filter(
        ConteoStock.tarea_id == tarea_id,
        ConteoStock.sucursal_id == current_user.sucursal_id
    ).first()

    if not conteo:
        raise HTTPException(status_code=404, detail="Conteo no encontrado para esta tarea")

    productos = db_anexa.query(ProductoConteo).filter(
        ProductoConteo.conteo_id == conteo.id
    ).all()

    return build_conteo_response(conteo, productos, db_dux)


# 3. Actualizar un producto individual
@router.put("/conteo/{conteo_id}/producto/{producto_id}")
async def actualizar_producto(
    conteo_id: int,
    producto_id: int,
    data: dict,
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Actualizar stock real y observaciones de un producto"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    conteo = db_anexa.query(ConteoStock).filter(
        ConteoStock.id == conteo_id,
        ConteoStock.sucursal_id == current_user.sucursal_id
    ).first()

    if not conteo:
        raise HTTPException(status_code=404, detail="Conteo no encontrado")

    if conteo.estado != "borrador":
        raise HTTPException(status_code=400, detail="Solo se puede editar en estado borrador")

    producto = db_anexa.query(ProductoConteo).filter(
        ProductoConteo.id == producto_id,
        ProductoConteo.conteo_id == conteo_id
    ).first()

    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado en este conteo")

    # Actualizar campos
    if "stock_real" in data:
        stock_real = data["stock_real"]
        producto.stock_real = stock_real
        if stock_real is not None:
            producto.diferencia = stock_real - producto.stock_sistema
        else:
            producto.diferencia = None

    if "observaciones" in data:
        producto.observaciones = data["observaciones"]

    # Recalcular agregados y setear fecha_conteo
    recalculate_conteo(db_anexa, conteo)
    conteo.fecha_conteo = datetime.now()

    db_anexa.commit()
    db_anexa.refresh(producto)

    return {
        "id": producto.id,
        "stock_real": producto.stock_real,
        "diferencia": producto.diferencia,
        "observaciones": producto.observaciones,
        "fecha_conteo": conteo.fecha_conteo.isoformat(),
    }


# 4. Guardar borrador (batch)
@router.put("/conteo/{conteo_id}/guardar")
async def guardar_borrador(
    conteo_id: int,
    data: GuardarBorradorRequest,
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Guardar borrador del conteo. Setea fecha_conteo al momento actual."""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    conteo = db_anexa.query(ConteoStock).filter(
        ConteoStock.id == conteo_id,
        ConteoStock.sucursal_id == current_user.sucursal_id
    ).first()

    if not conteo:
        raise HTTPException(status_code=404, detail="Conteo no encontrado")

    if conteo.estado != "borrador":
        raise HTTPException(status_code=400, detail="Solo se puede guardar en estado borrador")

    # Actualizar cada producto
    for prod_update in data.productos:
        producto = db_anexa.query(ProductoConteo).filter(
            ProductoConteo.id == prod_update.id,
            ProductoConteo.conteo_id == conteo_id
        ).first()

        if producto:
            producto.stock_real = prod_update.stock_real
            producto.observaciones = prod_update.observaciones
            if prod_update.stock_real is not None:
                producto.diferencia = prod_update.stock_real - producto.stock_sistema
            else:
                producto.diferencia = None

    # Recalcular agregados
    recalculate_conteo(db_anexa, conteo)

    # CAMPO CLAVE: registrar fecha/hora del conteo
    conteo.fecha_conteo = datetime.now()

    db_anexa.commit()
    db_anexa.refresh(conteo)

    # Retornar conteo completo
    productos = db_anexa.query(ProductoConteo).filter(
        ProductoConteo.conteo_id == conteo.id
    ).all()

    return build_conteo_response(conteo, productos, db_dux)


# 5. Enviar conteo para revision
@router.post("/conteo/{conteo_id}/enviar")
async def enviar_conteo(
    conteo_id: int,
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Enviar conteo para revision. Requiere todos los productos contados."""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    conteo = db_anexa.query(ConteoStock).filter(
        ConteoStock.id == conteo_id,
        ConteoStock.sucursal_id == current_user.sucursal_id
    ).first()

    if not conteo:
        raise HTTPException(status_code=404, detail="Conteo no encontrado")

    if conteo.estado != "borrador":
        raise HTTPException(status_code=400, detail="Solo se puede enviar desde estado borrador")

    # Validar que todos los productos esten contados
    productos = db_anexa.query(ProductoConteo).filter(
        ProductoConteo.conteo_id == conteo.id
    ).all()

    sin_contar = [p for p in productos if p.stock_real is None]
    if sin_contar:
        raise HTTPException(
            status_code=400,
            detail=f"Faltan {len(sin_contar)} productos por contar"
        )

    # Recalcular por si acaso
    recalculate_conteo(db_anexa, conteo)

    # Cambiar estado y registrar fecha/hora
    conteo.estado = "enviado"
    conteo.fecha_conteo = datetime.now()

    db_anexa.commit()
    db_anexa.refresh(conteo)

    return build_conteo_response(conteo, productos, db_dux)


# 6. Revisar conteo (aprobar/rechazar)
@router.put("/conteo/{conteo_id}/revisar")
async def revisar_conteo(
    conteo_id: int,
    data: RevisarConteoRequest,
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Revisar un conteo enviado (solo encargados)"""
    require_supervisor(current_user)

    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    conteo = db_anexa.query(ConteoStock).filter(
        ConteoStock.id == conteo_id,
        ConteoStock.sucursal_id == current_user.sucursal_id
    ).first()

    if not conteo:
        raise HTTPException(status_code=404, detail="Conteo no encontrado")

    if conteo.estado != "enviado":
        raise HTTPException(status_code=400, detail="Solo se puede revisar un conteo enviado")

    if data.estado not in ("aprobado", "rechazado"):
        raise HTTPException(status_code=400, detail="Estado debe ser 'aprobado' o 'rechazado'")

    # Actualizar conteo
    conteo.estado = data.estado
    conteo.revisado_por = current_user.id
    conteo.fecha_revision = datetime.now()
    conteo.comentarios_auditor = data.comentarios

    # La tarea NO se completa al aprobar. Se completa al cerrar desde auditoria.

    db_anexa.commit()
    db_anexa.refresh(conteo)

    productos = db_anexa.query(ProductoConteo).filter(
        ProductoConteo.conteo_id == conteo.id
    ).all()

    return build_conteo_response(conteo, productos, db_dux)


# 7. Cerrar conteo desde auditoria (marca tarea como completada)
@router.put("/conteo/{conteo_id}/cerrar")
async def cerrar_conteo(
    conteo_id: int,
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Cerrar un conteo aprobado desde auditoria. Recien aqui se completa la tarea."""
    require_supervisor(current_user)

    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    conteo = db_anexa.query(ConteoStock).filter(
        ConteoStock.id == conteo_id,
        ConteoStock.sucursal_id == current_user.sucursal_id
    ).first()

    if not conteo:
        raise HTTPException(status_code=404, detail="Conteo no encontrado")

    if conteo.estado != "aprobado":
        raise HTTPException(status_code=400, detail="Solo se puede cerrar un conteo aprobado")

    # Cerrar conteo
    conteo.estado = "cerrado"

    # Marcar la tarea como completada en BD DUX
    tarea = db_dux.query(TareaSucursal).filter(
        TareaSucursal.id == conteo.tarea_id
    ).first()
    if tarea:
        tarea.estado = "completada"
        tarea.completado_por = current_user.id
        tarea.fecha_completado = datetime.now()
        db_dux.commit()

    db_anexa.commit()
    db_anexa.refresh(conteo)

    productos = db_anexa.query(ProductoConteo).filter(
        ProductoConteo.conteo_id == conteo.id
    ).all()

    return build_conteo_response(conteo, productos, db_dux)


# 8. Resumen para auditoria
@router.get("/auditoria/resumen")
async def resumen_auditoria(
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Resumen de conteos para auditoria"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    result = db_anexa.execute(text("""
        SELECT
            SUM(CASE WHEN estado = 'enviado' THEN 1 ELSE 0 END) as pendientes,
            SUM(CASE WHEN estado IN ('aprobado', 'rechazado', 'cerrado')
                AND EXTRACT(MONTH FROM fecha_revision) = EXTRACT(MONTH FROM CURRENT_DATE)
                AND EXTRACT(YEAR FROM fecha_revision) = EXTRACT(YEAR FROM CURRENT_DATE)
                THEN 1 ELSE 0 END) as revisados_mes,
            SUM(CASE WHEN estado IN ('aprobado', 'rechazado', 'cerrado')
                AND EXTRACT(MONTH FROM fecha_revision) = EXTRACT(MONTH FROM CURRENT_DATE)
                AND EXTRACT(YEAR FROM fecha_revision) = EXTRACT(YEAR FROM CURRENT_DATE)
                THEN productos_con_diferencia ELSE 0 END) as diferencia_total_mes,
            SUM(CASE WHEN estado IN ('aprobado', 'rechazado', 'cerrado')
                AND EXTRACT(MONTH FROM fecha_revision) = EXTRACT(MONTH FROM CURRENT_DATE)
                AND EXTRACT(YEAR FROM fecha_revision) = EXTRACT(YEAR FROM CURRENT_DATE)
                THEN valorizacion_diferencia ELSE 0 END) as valorizacion_mes,
            SUM(CASE WHEN estado = 'aprobado' THEN 1 ELSE 0 END) as por_cerrar
        FROM conteos_stock
        WHERE sucursal_id = :sucursal_id
    """), {"sucursal_id": current_user.sucursal_id}).fetchone()

    return {
        "conteos_pendientes": int(result[0] or 0),
        "conteos_revisados_mes": int(result[1] or 0),
        "diferencia_total_mes": int(result[2] or 0),
        "valorizacion_diferencia_mes": float(result[3] or 0),
        "conteos_por_cerrar": int(result[4] or 0),
    }


# 8. Listar conteos para auditoria
@router.get("/auditoria/conteos")
async def listar_conteos_auditoria(
    estado: Optional[str] = None,
    mes: Optional[str] = None,  # YYYY-MM
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Listar conteos con filtros para auditoria"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    query = db_anexa.query(ConteoStock).filter(
        ConteoStock.sucursal_id == current_user.sucursal_id
    )

    if estado:
        query = query.filter(ConteoStock.estado == estado)

    if mes:
        try:
            year, month = mes.split("-")
            query = query.filter(
                text("EXTRACT(YEAR FROM fecha_conteo) = :year AND EXTRACT(MONTH FROM fecha_conteo) = :month")
            ).params(year=int(year), month=int(month))
        except ValueError:
            pass

    conteos = query.order_by(ConteoStock.fecha_conteo.desc().nullslast()).limit(50).all()

    result = []
    for conteo in conteos:
        productos = db_anexa.query(ProductoConteo).filter(
            ProductoConteo.conteo_id == conteo.id
        ).all()
        result.append(build_conteo_response(conteo, productos, db_dux))

    return result
