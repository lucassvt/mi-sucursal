from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
import json
import logging
from ..core.database import get_db, get_db_anexa
from ..core.security import get_current_user, require_encargado
from ..core.scope import get_scope_gerencia, require_acceso_sucursal
from ..models.employee import Employee

router = APIRouter(prefix="/api/costos-envio", tags=["costos-envio"])
logger = logging.getLogger(__name__)


def _resolver_sucursal(
    sucursal_id_param: Optional[int],
    current_user: Employee,
    db_dux: Session,
) -> int:
    if sucursal_id_param is None or sucursal_id_param == current_user.sucursal_id:
        return current_user.sucursal_id
    scope = get_scope_gerencia(current_user, db_dux)
    require_acceso_sucursal(scope, sucursal_id_param)
    return sucursal_id_param


@router.get("/")
async def get_costos(
    sucursal_id: Optional[int] = Query(None),
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db_anexa),
    db_dux: Session = Depends(get_db),
):
    sid = _resolver_sucursal(sucursal_id, current_user, db_dux)
    row = db.execute(text(
        "SELECT express_gratis_desde, programado_gratis_desde, costos_zonas, zonas_reparto FROM config_costos_envio WHERE sucursal_id = :sid"
    ), {"sid": sid}).fetchone()
    if row:
        return {
            "sucursal_id": sid,
            "express_gratis_desde": float(row[0]),
            "programado_gratis_desde": float(row[1]),
            "costos_zonas": row[2],
            "zonas_reparto": row[3] if len(row) > 3 else None,
        }
    return {
        "sucursal_id": sid,
        "express_gratis_desde": 60000,
        "programado_gratis_desde": 30000,
        "costos_zonas": [
            {"zona": "Zonas cercanas", "precio": 2000},
            {"zona": "Zonas intermedias", "precio": 4000},
            {"zona": "Zonas alejadas", "precio": 7000},
        ],
    }


@router.put("/")
async def update_costos(
    data: dict,
    sucursal_id: Optional[int] = Query(None),
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db_anexa),
    db_dux: Session = Depends(get_db),
):
    require_encargado(current_user)
    sid = _resolver_sucursal(sucursal_id, current_user, db_dux)
    db.execute(text("""
        INSERT INTO config_costos_envio (sucursal_id, express_gratis_desde, programado_gratis_desde, costos_zonas, zonas_reparto, updated_at)
        VALUES (:sid, :express, :programado, CAST(:zonas AS jsonb), CAST(:zonas_rep AS jsonb), NOW())
        ON CONFLICT (sucursal_id) DO UPDATE SET
            express_gratis_desde = EXCLUDED.express_gratis_desde,
            programado_gratis_desde = EXCLUDED.programado_gratis_desde,
            costos_zonas = EXCLUDED.costos_zonas,
            zonas_reparto = EXCLUDED.zonas_reparto,
            updated_at = NOW()
    """), {
        "sid": sid,
        "express": data.get("express_gratis_desde", 60000),
        "programado": data.get("programado_gratis_desde", 30000),
        "zonas": json.dumps(data.get("costos_zonas", [])),
        "zonas_rep": json.dumps(data.get("zonas_reparto")) if data.get("zonas_reparto") else None,
    })
    db.commit()
    logger.info(f"[costos_envio] Updated by user_id={current_user.id} ({current_user.usuario}) sucursal={sid}")
    return {"message": "Costos actualizados", "sucursal_id": sid}
