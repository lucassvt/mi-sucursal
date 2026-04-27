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

router = APIRouter(prefix="/api/peluqueria", tags=["peluqueria"])
logger = logging.getLogger(__name__)


def _resolver_sucursal(
    sucursal_id_param: Optional[int],
    current_user: Employee,
    db_dux: Session,
) -> int:
    """Resuelve qué sucursal usar.
    - Sin param: la del usuario.
    - Con param != propia: requiere scope de gerencia sobre esa sucursal.
    """
    if sucursal_id_param is None or sucursal_id_param == current_user.sucursal_id:
        return current_user.sucursal_id
    scope = get_scope_gerencia(current_user, db_dux)
    require_acceso_sucursal(scope, sucursal_id_param)
    return sucursal_id_param


@router.get("/config")
async def get_config(
    sucursal_id: Optional[int] = Query(None, description="ID de sucursal (gerencia)"),
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db_anexa),
    db_dux: Session = Depends(get_db),
):
    sid = _resolver_sucursal(sucursal_id, current_user, db_dux)
    row = db.execute(text(
        "SELECT servicios, agregados FROM config_peluqueria WHERE sucursal_id = :sid"
    ), {"sid": sid}).fetchone()
    if row and row[0]:
        return {"servicios": row[0], "agregados": row[1], "custom": True, "sucursal_id": sid}
    return {"servicios": None, "agregados": None, "custom": False, "sucursal_id": sid}


@router.put("/config")
async def update_config(
    data: dict,
    sucursal_id: Optional[int] = Query(None, description="ID de sucursal (gerencia)"),
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db_anexa),
    db_dux: Session = Depends(get_db),
):
    require_encargado(current_user)
    sid = _resolver_sucursal(sucursal_id, current_user, db_dux)
    db.execute(text("""
        INSERT INTO config_peluqueria (sucursal_id, servicios, agregados, updated_at)
        VALUES (:sid, :servicios::jsonb, :agregados::jsonb, NOW())
        ON CONFLICT (sucursal_id) DO UPDATE SET
            servicios = EXCLUDED.servicios,
            agregados = EXCLUDED.agregados,
            updated_at = NOW()
    """), {
        "sid": sid,
        "servicios": json.dumps(data.get("servicios", [])),
        "agregados": json.dumps(data.get("agregados", [])),
    })
    db.commit()
    logger.info(f"[peluqueria/config] Updated by user_id={current_user.id} ({current_user.usuario}) sucursal={sid}")
    return {"message": "Configuracion guardada", "sucursal_id": sid}
