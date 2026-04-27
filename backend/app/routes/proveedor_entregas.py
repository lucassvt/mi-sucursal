"""
Proveedor Entregas — configuración por sucursal.
Usado por la tab "Proveedores y Entregas" en /misucursal/encargos.

- GET  /api/proveedor-entregas?sucursal_id=X  -> lista filas
- PUT  /api/proveedor-entregas?sucursal_id=X  -> reemplaza todas las filas de esa sucursal (atómico).
  Solo usuarios con es_gerencia pueden editar.
"""
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
from pydantic import BaseModel
from ..core.database import get_db, get_db_anexa
from ..core.security import get_current_user
from ..core.scope import get_scope_gerencia, require_acceso_sucursal
from ..models.employee import Employee

router = APIRouter(prefix="/api/proveedor-entregas", tags=["proveedor-entregas"])


class EntregaItem(BaseModel):
    proveedor_nombre: str
    destino: str = ""
    dia_pedido: str = ""
    dia_entrega: str = ""
    nota: Optional[str] = None
    orden: int = 0


class EntregasPayload(BaseModel):
    items: List[EntregaItem]


def _resolver_sucursal(
    sucursal_id_param: Optional[int],
    current_user: Employee,
    db_dux: Session,
) -> int:
    """Devuelve la sucursal a consultar, validando scope si se pide una distinta a la propia."""
    if sucursal_id_param is None or sucursal_id_param == current_user.sucursal_id:
        return current_user.sucursal_id
    scope = get_scope_gerencia(current_user, db_dux)
    require_acceso_sucursal(scope, sucursal_id_param)
    return sucursal_id_param


@router.get("/")
async def list_entregas(
    sucursal_id: Optional[int] = Query(None),
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db_anexa),
    db_dux: Session = Depends(get_db),
):
    sid = _resolver_sucursal(sucursal_id, current_user, db_dux)
    rows = db.execute(text("""
        SELECT id, proveedor_nombre, destino, dia_pedido, dia_entrega, nota, orden
        FROM config_proveedor_entregas_sucursal
        WHERE sucursal_id = :sid
        ORDER BY proveedor_nombre, orden, id
    """), {"sid": sid}).fetchall()
    return {
        "sucursal_id": sid,
        "items": [
            {
                "id": r[0],
                "proveedor_nombre": r[1],
                "destino": r[2] or "",
                "dia_pedido": r[3] or "",
                "dia_entrega": r[4] or "",
                "nota": r[5],
                "orden": r[6] or 0,
            }
            for r in rows
        ],
    }


@router.put("/")
async def replace_entregas(
    payload: EntregasPayload,
    sucursal_id: Optional[int] = Query(None),
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db_anexa),
    db_dux: Session = Depends(get_db),
):
    # Edición restringida a gerencia (sistema_id=17 activo).
    scope = get_scope_gerencia(current_user, db_dux)
    if not scope.es_gerencia:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo Gerencia puede editar las entregas de proveedores.",
        )
    # Resolver + check de scope para la sucursal solicitada.
    if sucursal_id is None:
        sucursal_id = current_user.sucursal_id
    require_acceso_sucursal(scope, sucursal_id)

    # Replace atómico: borra filas de ESA sucursal y re-inserta.
    # El WHERE sucursal_id = :sid garantiza que nunca se pisen otras sucursales.
    db.execute(text(
        "DELETE FROM config_proveedor_entregas_sucursal WHERE sucursal_id = :sid"
    ), {"sid": sucursal_id})

    for i, item in enumerate(payload.items):
        db.execute(text("""
            INSERT INTO config_proveedor_entregas_sucursal
                (sucursal_id, proveedor_nombre, destino, dia_pedido, dia_entrega, nota, orden, updated_at)
            VALUES (:sid, :prov, :dest, :dp, :de, :nota, :orden, NOW())
        """), {
            "sid": sucursal_id,
            "prov": item.proveedor_nombre.strip()[:100],
            "dest": (item.destino or "").strip()[:200],
            "dp": (item.dia_pedido or "").strip()[:200],
            "de": (item.dia_entrega or "").strip()[:200],
            "nota": (item.nota or None),
            "orden": item.orden if item.orden is not None else i,
        })
    db.commit()

    return {"sucursal_id": sucursal_id, "saved": len(payload.items)}