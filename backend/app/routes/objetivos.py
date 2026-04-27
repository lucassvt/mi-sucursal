"""
CRUD de objetivos de sucursal para Mi Sucursal (Gerencia).

Escribe/lee directamente las tablas:
  - portal_vendedores.objetivos_sucursal (casa central, codigo SUC%)
  - portal_franquicias.objetivos_sucursal (franquicias, codigo FRQ%)

El schema se detecta por el codigo de la sucursal.
Portal Vendedores y el dashboard de gerencia leen de las mismas tablas,
por lo que la sincronizacion es automatica.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from datetime import datetime
import re
import logging

from ..core.database import get_db
from ..core.security import get_current_user
from ..core.scope import get_scope_gerencia, require_acceso_sucursal, get_schema_objetivos
from ..models.employee import Employee

router = APIRouter(prefix="/api/gerencia/objetivos", tags=["gerencia-objetivos"])
logger = logging.getLogger(__name__)

PERIODO_REGEX = re.compile(r"^20\d{2}-(0[1-9]|1[0-2])$")

CAMPOS_NUMERICOS = [
    "objetivo_venta_general",
    "piso_senda", "techo_senda",
    "piso_jaspe_liwue", "techo_jaspe_liwue",
    "piso_productos_estrella", "techo_productos_estrella",
    "objetivo_turnos_peluqueria",
    "objetivo_consultas_veterinaria",
    "objetivo_vacunas",
]


def _get_sucursal_info(db: Session, sucursal_id: int):
    row = db.execute(text(
        "SELECT id, codigo, nombre FROM v_sucursal_canonica WHERE id = :sid AND activo = true AND fecha_baja IS NULL"
    ), {"sid": sucursal_id}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Sucursal {sucursal_id} no encontrada")
    return {"id": row[0], "codigo": row[1] or "", "nombre": row[2]}


def _validar_periodo(periodo: str):
    if not PERIODO_REGEX.match(periodo):
        raise HTTPException(status_code=400, detail="Periodo invalido. Formato esperado YYYY-MM")


def _row_to_dict(row):
    """Convierte una row de objetivos_sucursal a dict."""
    if not row:
        return None
    cols = ["id", "sucursal_id", "periodo"] + CAMPOS_NUMERICOS + ["created_at", "updated_at"]
    d = {}
    for i, c in enumerate(cols):
        v = row[i] if i < len(row) else None
        if isinstance(v, (int, float)) or v is None:
            d[c] = v
        else:
            try:
                d[c] = float(v) if c in CAMPOS_NUMERICOS else v
            except Exception:
                d[c] = v
    return d


@router.get("/sucursal/{sucursal_id}")
async def get_objetivo(
    sucursal_id: int,
    periodo: str = Query(..., description="Periodo YYYY-MM"),
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _validar_periodo(periodo)
    scope = get_scope_gerencia(current_user, db)
    require_acceso_sucursal(scope, sucursal_id)

    suc = _get_sucursal_info(db, sucursal_id)
    schema = get_schema_objetivos(suc["codigo"])

    row = db.execute(text(f"""
        SELECT id, sucursal_id, periodo,
               objetivo_venta_general,
               piso_senda, techo_senda,
               piso_jaspe_liwue, techo_jaspe_liwue,
               piso_productos_estrella, techo_productos_estrella,
               objetivo_turnos_peluqueria,
               objetivo_consultas_veterinaria,
               objetivo_vacunas,
               created_at, updated_at
        FROM {schema}.objetivos_sucursal
        WHERE sucursal_id = :sid AND periodo = :p
    """), {"sid": sucursal_id, "p": periodo}).fetchone()

    if row:
        obj = _row_to_dict(row)
        obj["sucursal_nombre"] = suc["nombre"]
        obj["sucursal_codigo"] = suc["codigo"]
        obj["schema"] = schema
        obj["existe"] = True
        return obj

    # No existe aun: devolver estructura vacia
    return {
        "sucursal_id": sucursal_id,
        "sucursal_nombre": suc["nombre"],
        "sucursal_codigo": suc["codigo"],
        "periodo": periodo,
        "schema": schema,
        "existe": False,
        **{c: 0 for c in CAMPOS_NUMERICOS},
    }


@router.get("/sucursal/{sucursal_id}/historial")
async def get_historial(
    sucursal_id: int,
    meses: int = Query(12, ge=1, le=36),
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scope = get_scope_gerencia(current_user, db)
    require_acceso_sucursal(scope, sucursal_id)
    suc = _get_sucursal_info(db, sucursal_id)
    schema = get_schema_objetivos(suc["codigo"])

    rows = db.execute(text(f"""
        SELECT id, sucursal_id, periodo,
               objetivo_venta_general,
               piso_senda, techo_senda,
               piso_jaspe_liwue, techo_jaspe_liwue,
               piso_productos_estrella, techo_productos_estrella,
               objetivo_turnos_peluqueria,
               objetivo_consultas_veterinaria,
               objetivo_vacunas,
               created_at, updated_at
        FROM {schema}.objetivos_sucursal
        WHERE sucursal_id = :sid
        ORDER BY periodo DESC
        LIMIT :lim
    """), {"sid": sucursal_id, "lim": meses}).fetchall()

    return {
        "sucursal_id": sucursal_id,
        "sucursal_nombre": suc["nombre"],
        "schema": schema,
        "items": [_row_to_dict(r) for r in rows],
    }


@router.put("/sucursal/{sucursal_id}/{periodo}")
async def upsert_objetivo(
    sucursal_id: int,
    periodo: str,
    data: dict,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _validar_periodo(periodo)
    scope = get_scope_gerencia(current_user, db)
    require_acceso_sucursal(scope, sucursal_id)

    suc = _get_sucursal_info(db, sucursal_id)
    schema = get_schema_objetivos(suc["codigo"])

    # Normalizar valores
    values = {}
    for c in CAMPOS_NUMERICOS:
        v = data.get(c)
        if v is None:
            values[c] = 0
        else:
            try:
                values[c] = float(v) if "venta" in c or "productos_estrella" in c else int(v)
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail=f"Campo {c} invalido: {v}")
            if values[c] < 0:
                raise HTTPException(status_code=400, detail=f"Campo {c} no puede ser negativo")

    # Validar piso <= techo
    for cat in ["senda", "jaspe_liwue", "productos_estrella"]:
        p = values[f"piso_{cat}"]
        t = values[f"techo_{cat}"]
        if t > 0 and p > t:
            raise HTTPException(status_code=400, detail=f"Piso {cat} mayor que techo")

    params = {"sid": sucursal_id, "p": periodo, **values}
    set_cols = ", ".join([f"{c} = EXCLUDED.{c}" for c in CAMPOS_NUMERICOS])
    ins_cols = ", ".join(CAMPOS_NUMERICOS)
    ins_params = ", ".join([f":{c}" for c in CAMPOS_NUMERICOS])

    db.execute(text(f"""
        INSERT INTO {schema}.objetivos_sucursal
            (sucursal_id, periodo, {ins_cols}, created_at, updated_at)
        VALUES
            (:sid, :p, {ins_params}, NOW(), NOW())
        ON CONFLICT (sucursal_id, periodo) DO UPDATE SET
            {set_cols},
            updated_at = NOW()
    """), params)
    db.commit()
    logger.info(f"[objetivos] Updated by user_id={current_user.id} schema={schema} sucursal={sucursal_id} periodo={periodo}")
    return {"message": "Objetivo guardado", "schema": schema, "sucursal_id": sucursal_id, "periodo": periodo}


@router.post("/sucursal/{sucursal_id}/copiar-mes-anterior")
async def copiar_mes_anterior(
    sucursal_id: int,
    periodo: str = Query(..., description="Periodo destino YYYY-MM"),
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Copia los valores del mes anterior al `periodo` especificado. Solo crea si no existe."""
    _validar_periodo(periodo)
    scope = get_scope_gerencia(current_user, db)
    require_acceso_sucursal(scope, sucursal_id)
    suc = _get_sucursal_info(db, sucursal_id)
    schema = get_schema_objetivos(suc["codigo"])

    # Calcular periodo anterior
    year, month = map(int, periodo.split("-"))
    prev_month = month - 1 or 12
    prev_year = year if month > 1 else year - 1
    periodo_prev = f"{prev_year}-{prev_month:02d}"

    # Buscar anterior
    prev_row = db.execute(text(f"""
        SELECT {", ".join(CAMPOS_NUMERICOS)}
        FROM {schema}.objetivos_sucursal
        WHERE sucursal_id = :sid AND periodo = :p
    """), {"sid": sucursal_id, "p": periodo_prev}).fetchone()

    if not prev_row:
        raise HTTPException(status_code=404, detail=f"No hay objetivos para {periodo_prev}")

    vals = {c: prev_row[i] for i, c in enumerate(CAMPOS_NUMERICOS)}
    params = {"sid": sucursal_id, "p": periodo, **vals}
    ins_cols = ", ".join(CAMPOS_NUMERICOS)
    ins_params = ", ".join([f":{c}" for c in CAMPOS_NUMERICOS])

    db.execute(text(f"""
        INSERT INTO {schema}.objetivos_sucursal
            (sucursal_id, periodo, {ins_cols}, created_at, updated_at)
        VALUES
            (:sid, :p, {ins_params}, NOW(), NOW())
        ON CONFLICT (sucursal_id, periodo) DO NOTHING
    """), params)
    db.commit()
    return {"message": f"Copiado desde {periodo_prev}", "periodo": periodo, "valores": vals}


@router.get("/resumen")
async def resumen_scope(
    periodo: str = Query(..., description="Periodo YYYY-MM"),
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Devuelve los objetivos del periodo para TODAS las sucursales del scope del usuario."""
    _validar_periodo(periodo)
    scope = get_scope_gerencia(current_user, db)
    if not scope.es_gerencia:
        raise HTTPException(status_code=403, detail="Sin acceso a gerencia")
    if not scope.sucursales_ids:
        return {"periodo": periodo, "items": []}

    # Traer sucursales del scope con codigos
    placeholders = ", ".join([f":s{i}" for i in range(len(scope.sucursales_ids))])
    params = {f"s{i}": sid for i, sid in enumerate(scope.sucursales_ids)}
    sucs = db.execute(text(f"""
        SELECT id, codigo, nombre FROM v_sucursal_canonica WHERE id IN ({placeholders}) AND activo = true AND fecha_baja IS NULL
    """), params).fetchall()

    # Separar por schema
    suc_vendedores = [s for s in sucs if not (s[1] or '').startswith('FRQ')]
    suc_franq = [s for s in sucs if (s[1] or '').startswith('FRQ')]

    items = []

    def fetch_schema(schema_name, sucs_list):
        if not sucs_list:
            return
        ids = [s[0] for s in sucs_list]
        ph = ", ".join([f":s{i}" for i in range(len(ids))])
        prm = {f"s{i}": sid for i, sid in enumerate(ids)}
        prm["p"] = periodo
        rows = db.execute(text(f"""
            SELECT sucursal_id, objetivo_venta_general,
                   objetivo_turnos_peluqueria, objetivo_consultas_veterinaria, objetivo_vacunas
            FROM {schema_name}.objetivos_sucursal
            WHERE sucursal_id IN ({ph}) AND periodo = :p
        """), prm).fetchall()
        obj_by_sid = {r[0]: r for r in rows}
        for s in sucs_list:
            r = obj_by_sid.get(s[0])
            items.append({
                "sucursal_id": s[0],
                "codigo": s[1],
                "nombre": s[2],
                "schema": schema_name,
                "tipo": "franquicia" if (s[1] or '').startswith('FRQ') else "central",
                "existe": r is not None,
                "objetivo_venta_general": float(r[1]) if r and r[1] is not None else 0,
                "objetivo_turnos_peluqueria": int(r[2]) if r and r[2] is not None else 0,
                "objetivo_consultas_veterinaria": int(r[3]) if r and r[3] is not None else 0,
                "objetivo_vacunas": int(r[4]) if r and r[4] is not None else 0,
            })

    fetch_schema("portal_vendedores", suc_vendedores)
    fetch_schema("portal_franquicias", suc_franq)
    items.sort(key=lambda x: x["codigo"])

    return {"periodo": periodo, "items": items}
