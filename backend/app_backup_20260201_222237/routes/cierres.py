from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from datetime import date
from ..core.database import get_db
from ..core.security import get_current_user
from ..models.employee import Employee
from ..schemas.cierres import CierreCreate, CierreResponse, RetiroResponse

router = APIRouter(prefix="/api/cierres-caja", tags=["cierres-caja"])


@router.get("/", response_model=List[CierreResponse])
async def list_cierres(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar cierres de caja de la sucursal"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    # Obtener el dux_id de la sucursal
    sucursal_query = text("SELECT dux_id FROM sucursales WHERE id = :id")
    sucursal_result = db.execute(sucursal_query, {"id": current_user.sucursal_id}).fetchone()
    sucursal_dux_id = sucursal_result.dux_id if sucursal_result else current_user.sucursal_id

    query = text("""
        SELECT
            c.id,
            c.caja_id,
            ca.nombre as caja_nombre,
            c.fecha_caja,
            c.monto_declarado,
            c.monto_dux,
            c.diferencia,
            c.estado,
            c.fecha_declaracion
        FROM cierres_caja c
        JOIN cajas ca ON c.caja_id = ca.id
        WHERE ca.id_sucursal_dux = :sucursal_dux_id
        ORDER BY c.fecha_caja DESC
        LIMIT 30
    """)

    results = db.execute(query, {"sucursal_dux_id": sucursal_dux_id}).fetchall()

    return [
        CierreResponse(
            id=row.id,
            caja_id=row.caja_id,
            caja_nombre=row.caja_nombre,
            fecha_caja=row.fecha_caja,
            monto_declarado=row.monto_declarado,
            monto_dux=row.monto_dux,
            diferencia=row.diferencia,
            estado=row.estado,
            fecha_declaracion=row.fecha_declaracion
        )
        for row in results
    ]


@router.post("/", response_model=CierreResponse)
async def create_cierre(
    data: CierreCreate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear un nuevo cierre de caja"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    # Obtener el dux_id de la sucursal
    sucursal_query = text("SELECT dux_id FROM sucursales WHERE id = :id")
    sucursal_result = db.execute(sucursal_query, {"id": current_user.sucursal_id}).fetchone()
    sucursal_dux_id = sucursal_result.dux_id if sucursal_result else current_user.sucursal_id

    # Verificar que la caja pertenece a la sucursal
    caja_query = text("""
        SELECT id, nombre FROM cajas
        WHERE id = :caja_id AND id_sucursal_dux = :sucursal_dux_id
    """)
    caja = db.execute(caja_query, {"caja_id": data.caja_id, "sucursal_dux_id": sucursal_dux_id}).fetchone()

    if not caja:
        raise HTTPException(status_code=400, detail="Caja no encontrada o no pertenece a esta sucursal")

    # Verificar si ya existe cierre para esa fecha
    existe_query = text("""
        SELECT id FROM cierres_caja
        WHERE caja_id = :caja_id AND fecha_caja = :fecha_caja
    """)
    existe = db.execute(existe_query, {"caja_id": data.caja_id, "fecha_caja": data.fecha_caja}).fetchone()

    if existe:
        raise HTTPException(status_code=400, detail="Ya existe un cierre para esta fecha")

    # Crear el cierre
    insert_query = text("""
        INSERT INTO cierres_caja (caja_id, fecha_caja, monto_declarado, tipo_monto, id_personal, observaciones)
        VALUES (:caja_id, :fecha_caja, :monto_declarado, 'recuento_fisico', :id_personal, :observaciones)
        RETURNING id, caja_id, fecha_caja, monto_declarado, monto_dux, diferencia, estado, fecha_declaracion
    """)

    result = db.execute(insert_query, {
        "caja_id": data.caja_id,
        "fecha_caja": data.fecha_caja,
        "monto_declarado": data.monto_efectivo,
        "id_personal": current_user.id,
        "observaciones": data.observaciones
    }).fetchone()
    db.commit()

    return CierreResponse(
        id=result.id,
        caja_id=result.caja_id,
        caja_nombre=caja.nombre,
        fecha_caja=result.fecha_caja,
        monto_declarado=result.monto_declarado,
        monto_dux=result.monto_dux,
        diferencia=result.diferencia,
        estado=result.estado,
        fecha_declaracion=result.fecha_declaracion
    )


@router.get("/pendientes")
async def get_cierres_pendientes(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener días sin cierre declarado (últimos 7 días)"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    # Obtener el dux_id de la sucursal
    sucursal_query = text("SELECT dux_id FROM sucursales WHERE id = :id")
    sucursal_result = db.execute(sucursal_query, {"id": current_user.sucursal_id}).fetchone()
    sucursal_dux_id = sucursal_result.dux_id if sucursal_result else current_user.sucursal_id

    query = text("""
        WITH ultimos_dias AS (
            SELECT generate_series(
                CURRENT_DATE - INTERVAL '7 days',
                CURRENT_DATE - INTERVAL '1 day',
                INTERVAL '1 day'
            )::date as fecha
        )
        SELECT ud.fecha
        FROM ultimos_dias ud
        LEFT JOIN cierres_caja c ON c.fecha_caja = ud.fecha
        LEFT JOIN cajas ca ON c.caja_id = ca.id AND ca.id_sucursal_dux = :sucursal_dux_id
        WHERE c.id IS NULL
        ORDER BY ud.fecha DESC
    """)

    results = db.execute(query, {"sucursal_dux_id": sucursal_dux_id}).fetchall()

    return {
        "dias_pendientes": [row.fecha.isoformat() for row in results],
        "total": len(results)
    }


@router.get("/cajas")
async def get_cajas_sucursal(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener las cajas de la sucursal del usuario"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    # Obtener info de la sucursal del empleado
    sucursal_query = text("SELECT id, dux_id, nombre FROM sucursales WHERE id = :id")
    sucursal_result = db.execute(sucursal_query, {"id": current_user.sucursal_id}).fetchone()

    if not sucursal_result:
        raise HTTPException(status_code=400, detail=f"Sucursal {current_user.sucursal_id} no encontrada")

    # Usar dux_id si existe, sino usar el id directamente
    sucursal_dux_id = sucursal_result[1] if sucursal_result[1] else sucursal_result[0]
    sucursal_nombre = sucursal_result[2]

    print(f"[DEBUG] Buscando cajas - sucursal_id: {current_user.sucursal_id}, dux_id: {sucursal_dux_id}, nombre: {sucursal_nombre}")

    # Primero intentar por id_sucursal_dux
    query = text("""
        SELECT id, nombre
        FROM cajas
        WHERE id_sucursal_dux = :sucursal_dux_id AND activa = true
        ORDER BY nombre
    """)
    results = db.execute(query, {"sucursal_dux_id": sucursal_dux_id}).fetchall()

    # Si no encuentra, buscar por nombre de sucursal en el nombre de la caja
    if not results and sucursal_nombre:
        print(f"[DEBUG] No se encontraron cajas por dux_id, buscando por nombre: {sucursal_nombre}")
        query_by_name = text("""
            SELECT id, nombre
            FROM cajas
            WHERE LOWER(nombre) LIKE LOWER(:pattern) AND activa = true
            ORDER BY nombre
        """)
        results = db.execute(query_by_name, {"pattern": f"%{sucursal_nombre}%"}).fetchall()

    print(f"[DEBUG] Cajas encontradas: {len(results)}")
    return [{"id": row[0], "nombre": row[1]} for row in results]


@router.get("/retiros", response_model=List[RetiroResponse])
async def list_retiros(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar retiros de caja relacionados a la sucursal"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    # Obtener el dux_id de la sucursal
    sucursal_query = text("SELECT dux_id FROM sucursales WHERE id = :id")
    sucursal_result = db.execute(sucursal_query, {"id": current_user.sucursal_id}).fetchone()
    sucursal_dux_id = sucursal_result.dux_id if sucursal_result else current_user.sucursal_id

    query = text("""
        SELECT DISTINCT
            r.id,
            r.fecha_retiro,
            r.estado,
            r.monto_total_recibido,
            r.diferencia_total
        FROM retiros_caja r
        JOIN cierres_caja c ON c.retiro_id = r.id
        JOIN cajas ca ON c.caja_id = ca.id
        WHERE ca.id_sucursal_dux = :sucursal_dux_id
        ORDER BY r.fecha_retiro DESC
        LIMIT 20
    """)

    results = db.execute(query, {"sucursal_dux_id": sucursal_dux_id}).fetchall()

    return [
        RetiroResponse(
            id=row.id,
            fecha_retiro=row.fecha_retiro,
            estado=row.estado,
            monto_total_recibido=row.monto_total_recibido,
            diferencia_total=row.diferencia_total
        )
        for row in results
    ]
