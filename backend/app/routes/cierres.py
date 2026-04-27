

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Tuple
from datetime import date
from ..core.database import get_db
from ..core.security import get_current_user, es_admin_o_superior, require_no_auxiliar
from ..core.scope import get_scope_gerencia, require_acceso_sucursal
from ..models.employee import Employee
from ..schemas.cierres import CierreCreate, CierreResponse, RetiroResponse

# QA-0150 2026-04-19: bloquear rol Auxiliar a nivel router
router = APIRouter(prefix="/api/cierres-caja", tags=["cierres-caja"])


def _get_sucursal_info(db: Session, sucursal_id: int) -> Tuple[Optional[int], Optional[str]]:
    """Devuelve (dux_id, codigo) de una sucursal. dux_id es None para franquicias."""
    row = db.execute(
        text("SELECT dux_id, codigo FROM sucursales WHERE id = :id"),
        {"id": sucursal_id},
    ).fetchone()
    if not row:
        return (None, None)
    return (row[0], row[1])


def _caja_pertenece_a_sucursal(db: Session, caja_id: int, sucursal_id: int) -> bool:
    """
    Valida si una caja pertenece a una sucursal.
    - Franquicias (codigo FRQxx): match por cajas.codigo = 'CAJA-FRQxx'.
    - Casa central: match por cajas.id_sucursal_dux = sucursales.dux_id.
    """
    dux_id, codigo = _get_sucursal_info(db, sucursal_id)
    es_frq = bool(codigo and codigo.startswith("FRQ"))
    if es_frq:
        caja_codigo = f"CAJA-{codigo}"
        row = db.execute(
            text("SELECT 1 FROM cajas WHERE id = :cid AND codigo = :cod AND activa = true"),
            {"cid": caja_id, "cod": caja_codigo},
        ).first()
    else:
        match_dux_id = dux_id if dux_id else sucursal_id
        row = db.execute(
            text("SELECT 1 FROM cajas WHERE id = :cid AND id_sucursal_dux = :sdx AND activa = true"),
            {"cid": caja_id, "sdx": match_dux_id},
        ).first()
    return row is not None


def _caja_pertenece_a_empleado(db: Session, caja_id: int, current_user: Employee) -> bool:
    """
    2026-04-21 MDM: valida que la caja pertenezca a alguna de las sucursales asignadas al empleado
    en empleado_sucursales. Fallback al legacy current_user.sucursal_id si no hay asignaciones.
    """
    sucursales_ids = _get_sucursales_empleado_ids(db, current_user)
    for sid in sucursales_ids:
        if _caja_pertenece_a_sucursal(db, caja_id, sid):
            return True
    return False


def _resolve_personal_id(db: Session, current_user: Employee) -> Optional[int]:
    """Employee.usuario -> personales.id (el MDM usa personal_id)."""
    if not current_user or not current_user.usuario:
        return None
    row = db.execute(
        text("SELECT id FROM personales WHERE usuario = :u AND activo = true LIMIT 1"),
        {"u": current_user.usuario},
    ).fetchone()
    return row[0] if row else None


def _fallback_legacy_sucursal(db: Session, current_user: Employee):
    """Si no hay asignación en empleado_sucursales, usar employees.sucursal_id."""
    if not current_user.sucursal_id:
        return ([], None, "ninguna")
    row = db.execute(text(
        "SELECT id, nombre, codigo, dux_id FROM sucursales WHERE id = :id"
    ), {"id": current_user.sucursal_id}).fetchone()
    if not row:
        return ([], None, "ninguna")
    suc = {"id": row[0], "nombre": row[1], "codigo": row[2], "dux_id": row[3], "es_principal": True}
    return ([suc], suc["id"], "legacy")


def _get_sucursales_empleado_ids(db: Session, current_user: Employee) -> List[int]:
    """
    Devuelve lista de sucursal_id asignadas al empleado via empleado_sucursales (MDM Mi Legajo).
    Fallback al legacy current_user.sucursal_id si no hay asignaciones todavía.
    """
    personal_id = _resolve_personal_id(db, current_user)
    if personal_id:
        rows = db.execute(text("""
            SELECT sucursal_id FROM empleado_sucursales
            WHERE personal_id = :pid AND activo = true
              AND (fecha_hasta IS NULL OR fecha_hasta >= CURRENT_DATE)
            ORDER BY es_principal DESC, sucursal_id
        """), {"pid": personal_id}).fetchall()
        ids = [r[0] for r in rows]
        if ids:
            return ids
    return [current_user.sucursal_id] if current_user.sucursal_id else []


def _get_sucursales_empleado_con_sugerida(db: Session, current_user: Employee):
    """
    Devuelve (lista de {id, nombre, codigo, dux_id, es_principal}, sucursal_sugerida_id, motivo).
    motivo ∈ {'schedule', 'principal', 'ninguna', 'legacy'}.
    """
    personal_id = _resolve_personal_id(db, current_user)
    if not personal_id:
        return _fallback_legacy_sucursal(db, current_user)

    rows = db.execute(text("""
        SELECT s.id, s.nombre, s.codigo, s.dux_id, es.es_principal
        FROM empleado_sucursales es
        JOIN sucursales s ON s.id = es.sucursal_id
        WHERE es.personal_id = :pid AND es.activo = true
          AND (es.fecha_hasta IS NULL OR es.fecha_hasta >= CURRENT_DATE)
        ORDER BY es.es_principal DESC, s.nombre
    """), {"pid": personal_id}).fetchall()

    sucursales = [
        {"id": r[0], "nombre": r[1], "codigo": r[2], "dux_id": r[3], "es_principal": bool(r[4])}
        for r in rows
    ]
    if not sucursales:
        return _fallback_legacy_sucursal(db, current_user)

    # Resolver sugerida por schedule del día/hora actual ARG
    sched = db.execute(text("""
        SELECT sucursal_id FROM hrms_employee_schedules
        WHERE personal_id = :pid AND is_active = true
          AND sucursal_id IS NOT NULL
          AND day_of_week = EXTRACT(ISODOW FROM (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires'))::int
          AND (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::time
              BETWEEN start_time::time AND end_time::time
        LIMIT 1
    """), {"pid": personal_id}).fetchone()

    if sched:
        sid = sched[0]
        if any(s["id"] == sid for s in sucursales):
            return (sucursales, sid, "schedule")

    principal = next((s for s in sucursales if s["es_principal"]), None)
    if principal:
        return (sucursales, principal["id"], "principal")

    return (sucursales, None, "ninguna")


def _resolver_sucursal(
    sucursal_id_param: Optional[int],
    current_user: Employee,
    db: Session,
) -> int:
    """Sucursal efectiva: si se pide otra distinta a la propia, se valida scope de gerencia."""
    if sucursal_id_param is None or sucursal_id_param == current_user.sucursal_id:
        return current_user.sucursal_id
    scope = get_scope_gerencia(current_user, db)
    require_acceso_sucursal(scope, sucursal_id_param)
    return sucursal_id_param


@router.get("/", response_model=List[CierreResponse])
async def list_cierres(
    sucursal_id: Optional[int] = Query(None, description="Gerencia: ver otra sucursal dentro de su scope"),
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar cierres de caja. Gerencia puede pasar ?sucursal_id=X; si no, muestra
    cierres de TODAS las sucursales asignadas al empleado (MDM empleado_sucursales)."""
    # 2026-04-21 MDM: si no viene sucursal_id, listar de todas las sucursales del empleado
    if sucursal_id is not None:
        effective_sid = _resolver_sucursal(sucursal_id, current_user, db)
        sucursales_a_listar = [effective_sid]
    else:
        sucursales_a_listar = _get_sucursales_empleado_ids(db, current_user)
        if not sucursales_a_listar:
            raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    # Construir OR de match por sucursal para la query
    or_clauses = []
    params: dict = {}
    for idx, sid in enumerate(sucursales_a_listar):
        dux_id, codigo = _get_sucursal_info(db, sid)
        es_frq = bool(codigo and codigo.startswith("FRQ"))
        if es_frq:
            or_clauses.append(f"ca.codigo = :frq_{idx}")
            params[f"frq_{idx}"] = f"CAJA-{codigo}"
        else:
            or_clauses.append(f"ca.id_sucursal_dux = :dux_{idx}")
            params[f"dux_{idx}"] = dux_id if dux_id else sid
    caja_where = " OR ".join(or_clauses) if or_clauses else "false"

    query = text(f"""
        SELECT
            c.id,
            c.caja_id,
            ca.nombre as caja_nombre,
            c.fecha_caja,
            c.monto_declarado,
            c.monto_dux,
            c.diferencia,
            c.estado,
            c.fecha_declaracion,
            c.id_personal_entrega,
            (SELECT CONCAT(p.apellido, ', ', p.nombre) FROM personales p WHERE p.id = c.id_personal_entrega) as nombre_entrega
        FROM cierres_caja c
        JOIN cajas ca ON c.caja_id = ca.id
        WHERE {caja_where}
        ORDER BY c.fecha_caja DESC
        LIMIT 30
    """)
    results = db.execute(query, params).fetchall()

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
            fecha_declaracion=row.fecha_declaracion,
            id_personal_entrega=row.id_personal_entrega if hasattr(row, 'id_personal_entrega') else None,
            nombre_entrega=row.nombre_entrega if hasattr(row, 'nombre_entrega') else None
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
    # 2026-04-21 MDM: validar caja contra TODAS las sucursales asignadas (no solo sucursal_id legacy)
    if not _caja_pertenece_a_empleado(db, data.caja_id, current_user):
        raise HTTPException(status_code=400, detail="Caja no encontrada o no pertenece a ninguna de tus sucursales asignadas")

    caja = db.execute(
        text("SELECT id, nombre FROM cajas WHERE id = :cid"),
        {"cid": data.caja_id},
    ).fetchone()

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

    dux_id, codigo = _get_sucursal_info(db, current_user.sucursal_id)
    es_frq = bool(codigo and codigo.startswith("FRQ"))
    if es_frq:
        caja_match = "ca.codigo = :caja_codigo_frq"
        params = {"caja_codigo_frq": f"CAJA-{codigo}"}
    else:
        caja_match = "ca.id_sucursal_dux = :sucursal_dux_id"
        params = {"sucursal_dux_id": dux_id if dux_id else current_user.sucursal_id}

    query = text(f"""
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
        LEFT JOIN cajas ca ON c.caja_id = ca.id AND {caja_match}
        WHERE c.id IS NULL
          AND EXTRACT(DOW FROM ud.fecha) != 0
        ORDER BY ud.fecha DESC
    """)

    results = db.execute(query, params).fetchall()

    return {
        "dias_pendientes": [row.fecha.isoformat() for row in results],
        "total": len(results)
    }


@router.get("/todas")
async def list_cierres_todas(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Listar cierres de caja dentro del scope del usuario.
    - Gerencia (sistema_id=17): cierres de las sucursales en su scope (franquiciada ve solo su franquicia).
    - Admin/superior sin grant gerencia: todas las sucursales (comportamiento legacy).
    """
    scope = get_scope_gerencia(current_user, db)
    es_superior = es_admin_o_superior(current_user)

    if not scope.es_gerencia and not es_superior:
        raise HTTPException(
            status_code=403,
            detail="Solo gerencia o encargados superiores pueden ver cierres de todas las sucursales",
        )

    # Admin/superior: sin filtro (comportamiento legacy).
    # Gerencia (sistema_id=17) no-admin: SIEMPRE filtrar por scope.sucursales_ids + su propia sucursal
    # como fallback (así una encargada sin scope poblado ve solo la suya, no todas).
    if es_superior:
        scope_ids = []
        filter_by_scope = False
    else:
        scope_ids = list(set(scope.sucursales_ids + ([current_user.sucursal_id] if current_user.sucursal_id else [])))
        filter_by_scope = True

    query = text(f"""
        SELECT
            c.id,
            c.caja_id,
            ca.nombre as caja_nombre,
            s.nombre as sucursal_nombre,
            c.fecha_caja,
            c.monto_declarado,
            c.monto_dux,
            c.diferencia,
            c.estado,
            c.fecha_declaracion,
            e.nombre as empleado_nombre
        FROM cierres_caja c
        JOIN cajas ca ON c.caja_id = ca.id
        -- Match casa central por dux_id; franquicias por codigo (CAJA-FRQxx -> sucursales.codigo FRQxx).
        LEFT JOIN sucursales s ON (
            s.dux_id = ca.id_sucursal_dux
            OR s.codigo = REPLACE(ca.codigo, 'CAJA-', '')
        )
        LEFT JOIN employees e ON c.id_personal = e.id
        WHERE c.fecha_caja >= DATE_TRUNC('month', CURRENT_DATE)
          {"AND s.id = ANY(:scope_ids)" if filter_by_scope else ""}
        ORDER BY c.fecha_caja DESC, s.nombre
    """)

    params = {"scope_ids": scope_ids} if filter_by_scope else {}
    results = db.execute(query, params).fetchall()

    return [
        {
            "id": row.id,
            "caja_id": row.caja_id,
            "caja_nombre": row.caja_nombre,
            "sucursal_nombre": row.sucursal_nombre or "Sin sucursal",
            "fecha_caja": row.fecha_caja.isoformat() if row.fecha_caja else None,
            "monto_declarado": float(row.monto_declarado) if row.monto_declarado else 0,
            "monto_dux": float(row.monto_dux) if row.monto_dux else None,
            "diferencia": float(row.diferencia) if row.diferencia else None,
            "estado": row.estado,
            "fecha_declaracion": row.fecha_declaracion.isoformat() if row.fecha_declaracion else None,
            "empleado_nombre": row.empleado_nombre,
        }
        for row in results
    ]


@router.get("/cajas")
async def get_cajas_sucursal(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
    sucursal_id: Optional[int] = Query(None, description="Sucursal activa elegida por el empleado (override de la sugerida por horario)")
):
    """
    Cajas disponibles para el empleado, ordenadas, + sugerida según horario/principal.
    2026-04-21: consume empleado_sucursales (MDM Mi Legajo) en lugar de employees.sucursal_id.
    Multi-sucursal: si el empleado está asignado a N sucursales, devuelve cajas de todas.
    2026-04-25: si el frontend pasa sucursal_id (sucursal activa elegida en el modal),
    la usamos como sugerida prioritaria sobre la del horario.
    """
    sucursales, sugerida_id, motivo = _get_sucursales_empleado_con_sugerida(db, current_user)
    if not sucursales:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada en Mi Legajo")

    # Priorizar la sucursal activa que pasa el frontend (override).
    if sucursal_id and any(s["id"] == sucursal_id for s in sucursales):
        sugerida_id = sucursal_id
        motivo = "activa"

    cajas_all: List[dict] = []
    seen_caja_ids = set()

    for suc in sucursales:
        codigo = suc.get("codigo") or ""
        es_frq = codigo.startswith("FRQ")
        if es_frq:
            caja_codigo = f"CAJA-{codigo}"
            rows = db.execute(text("""
                SELECT id, nombre FROM cajas
                WHERE activa = true AND codigo = :cod
                ORDER BY nombre
            """), {"cod": caja_codigo}).fetchall()
        else:
            dux_id = suc.get("dux_id") or suc["id"]
            rows = db.execute(text("""
                SELECT id, nombre FROM cajas
                WHERE id_sucursal_dux = :dux AND activa = true
                  AND codigo NOT LIKE 'CAJA-FRQ%%'
                ORDER BY nombre
            """), {"dux": dux_id}).fetchall()

        for r in rows:
            if r[0] in seen_caja_ids:
                continue
            seen_caja_ids.add(r[0])
            cajas_all.append({
                "id": r[0],
                "nombre": r[1],
                "sucursalId": suc["id"],
                "sucursalNombre": suc["nombre"],
            })

    # Resolver caja sugerida: primera caja de la sucursal sugerida
    caja_sugerida = None
    if sugerida_id:
        for c in cajas_all:
            if c["sucursalId"] == sugerida_id:
                caja_sugerida = {"id": c["id"], "nombre": c["nombre"]}
                break

    return {
        "cajas": cajas_all,
        "cajaSugerida": caja_sugerida,
        "motivoSugerencia": motivo,
        "sucursales": [
            {"id": s["id"], "nombre": s["nombre"], "esPrincipal": s["es_principal"]}
            for s in sucursales
        ],
    }


@router.get("/retiros", response_model=List[RetiroResponse])
async def list_retiros(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar retiros de caja de todas las sucursales asignadas al empleado (MDM)."""
    # 2026-04-21 MDM: multi-sucursal
    sucursales_a_listar = _get_sucursales_empleado_ids(db, current_user)
    if not sucursales_a_listar:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    or_clauses = []
    params: dict = {}
    for idx, sid in enumerate(sucursales_a_listar):
        dux_id, codigo = _get_sucursal_info(db, sid)
        es_frq = bool(codigo and codigo.startswith("FRQ"))
        if es_frq:
            or_clauses.append(f"ca.codigo = :frq_{idx}")
            params[f"frq_{idx}"] = f"CAJA-{codigo}"
        else:
            or_clauses.append(f"ca.id_sucursal_dux = :dux_{idx}")
            params[f"dux_{idx}"] = dux_id if dux_id else sid
    caja_match = " OR ".join(or_clauses) if or_clauses else "false"

    query = text(f"""
        SELECT DISTINCT
            r.id,
            r.fecha_retiro,
            r.estado,
            r.monto_total_recibido,
            r.diferencia_total
        FROM retiros_caja r
        JOIN cierres_caja c ON c.retiro_id = r.id
        JOIN cajas ca ON c.caja_id = ca.id
        WHERE {caja_match}
        ORDER BY r.fecha_retiro DESC
        LIMIT 20
    """)

    results = db.execute(query, params).fetchall()

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


@router.get("/personal-disponible")
async def get_personal_disponible(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista de personales activos para entregar caja.
    - Franquicia (codigo FRQxx): solo personales de la misma franquicia
      (mismo id_sucursal_dux y preferentemente rol='Encargado'; fallback: todos activos).
    - Casa central (codigo SUC%): solo personales vinculados a employees con
      sistema_id=15 "Traslado de Cajas" activo (no se mezcla con franquicias).
    """
    _, codigo = _get_sucursal_info(db, current_user.sucursal_id or 0)
    es_frq = bool(codigo and codigo.startswith("FRQ"))

    if es_frq:
        q_frq = text("""
            SELECT id, apellido, nombre, sede
            FROM personales
            WHERE estado = 'Activo' AND id_sucursal_dux = :sid AND rol = 'Encargado'
            ORDER BY apellido, nombre
        """)
        results = db.execute(q_frq, {"sid": current_user.sucursal_id}).fetchall()
        if not results:
            q_fb = text("""
                SELECT id, apellido, nombre, sede
                FROM personales
                WHERE estado = 'Activo' AND id_sucursal_dux = :sid
                ORDER BY apellido, nombre
            """)
            results = db.execute(q_fb, {"sid": current_user.sucursal_id}).fetchall()
    else:
        # Casa central: destinatarios validos son los users con sistema_id=15
        # "Traslado de Cajas" activo, resueltos por la vista canonica MDM.
        # Post migracion 2026-04-20: un unico personales.id por persona coincidente
        # con employees.dux_id. Filtramos por password_hash IS NOT NULL para que
        # solo aparezcan personas que ya pueden abrir la PWA /logistica-cajas/.
        # Nota: vec.activo viene de COALESCE(personales.activo, employees.activo),
        # pero el sync DUX deja personales.activo=false casi siempre, por lo que
        # filtramos por employees.activo directamente.
        q_cc = text("""
            SELECT DISTINCT vec.id_personales AS id,
                   vec.apellido, vec.nombre, vec.sede
            FROM permisos_usuario_sistema p
            JOIN employees e ON e.id = p.employee_id
            JOIN v_empleado_canonico vec ON vec.employee_id = p.employee_id
            JOIN personales per ON per.id = vec.id_personales
            LEFT JOIN sucursales s ON s.id = vec.sucursal_id
            WHERE p.sistema_id = 15
              AND p.activo = true
              AND e.activo = true
              AND per.password_hash IS NOT NULL
              AND (s.codigo IS NULL OR s.codigo NOT LIKE 'FRQ%%')
            ORDER BY vec.apellido, vec.nombre
        """)
        results = db.execute(q_cc).fetchall()

    return [
        {
            "id": row[0],
            "nombre": f"{row[1]}, {row[2]}" if row[1] else (row[2] or ""),
            "sede": row[3] or ""
        }
        for row in results
    ]


@router.post("/{cierre_id}/entregar")
async def entregar_caja(
    cierre_id: int,
    data: dict,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Encargado entrega la caja a alguien (paso de custodia)"""
    from datetime import datetime

    id_personal_entrega = data.get("id_personal_entrega")
    if not id_personal_entrega:
        raise HTTPException(status_code=400, detail="Debe seleccionar a quien entrega")

    # Verificar que el cierre existe
    cierre = db.execute(text(
        "SELECT id, estado, caja_id FROM cierres_caja WHERE id = :id"
    ), {"id": cierre_id}).fetchone()

    if not cierre:
        raise HTTPException(status_code=404, detail="Cierre no encontrado")

    if cierre[1] != "declarado":
        raise HTTPException(status_code=400, detail="El cierre no esta en estado declarado")

    # Permisos: cualquier usuario autenticado puede entregar la caja siempre que
    # la caja pertenezca a SU sucursal. Admin/superior global no tiene restriccion.
    if not es_admin_o_superior(current_user):
        # 2026-04-25: usar MDM multi-sucursal (empleado_sucursales) no el legacy sucursal_id
        if not _caja_pertenece_a_empleado(db, cierre[2], current_user):
            raise HTTPException(status_code=403, detail="No podés entregar una caja de otra sucursal")

    # Verificar que el personal destino existe
    # (no validamos personales.estado porque viene desincronizado desde DUX)
    destino = db.execute(text(
        "SELECT id, apellido, nombre, id_sucursal_dux FROM personales WHERE id = :id"
    ), {"id": id_personal_entrega}).fetchone()

    if not destino:
        raise HTTPException(status_code=404, detail="Personal no encontrado")

    # Validar que el destino corresponda al tipo de sucursal del emisor:
    # - Franquicia: destino debe pertenecer a la MISMA franquicia (mismo id_sucursal_dux).
    # - Casa central: destino debe tener sistema_id=15 "Traslado de Cajas" activo y
    #   NO pertenecer a una sucursal FRQ%.
    _, cod_emisor = _get_sucursal_info(db, current_user.sucursal_id or 0)
    emisor_es_frq = bool(cod_emisor and cod_emisor.startswith("FRQ"))
    if not es_admin_o_superior(current_user):
        if emisor_es_frq:
            if destino[3] != current_user.sucursal_id:
                raise HTTPException(
                    status_code=403,
                    detail="En franquicia solo podés entregar a personal de la misma franquicia",
                )
        else:
            valido = db.execute(text("""
                SELECT 1
                FROM permisos_usuario_sistema p
                JOIN employees e ON e.id = p.employee_id
                JOIN v_empleado_canonico vec ON vec.employee_id = p.employee_id
                LEFT JOIN sucursales s ON s.id = vec.sucursal_id
                WHERE p.sistema_id = 15 AND p.activo = true
                  AND e.activo = true
                  AND vec.id_personales = :pid
                  AND (s.codigo IS NULL OR s.codigo NOT LIKE 'FRQ%%')
            """), {"pid": id_personal_entrega}).first()
            if not valido:
                raise HTTPException(
                    status_code=403,
                    detail="El destinatario no tiene acceso a Traslado de Cajas (sistema_id=15)",
                )

    # Actualizar cierre
    db.execute(text("""
        UPDATE cierres_caja
        SET estado = 'entregado',
            id_personal_entrega = :id_entrega,
            id_personal_entregador = :id_entregador,
            fecha_entrega = :fecha,
            updated_at = :fecha
        WHERE id = :cierre_id
    """), {
        "id_entrega": id_personal_entrega,
        "id_entregador": current_user.id,
        "fecha": datetime.now(),
        "cierre_id": cierre_id,
    })
    db.commit()

    nombre_destino = f"{destino[1]}, {destino[2]}" if destino[1] else (destino[2] or "")

    return {
        "ok": True,
        "cierre_id": cierre_id,
        "entregado_a": nombre_destino,
        "estado": "entregado"
    }


