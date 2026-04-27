"""
Endpoints de Mi Sucursal (Gerencia).

Todos requieren sistema_id=17 activo en permisos_usuario_sistema.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..core.database import get_db
from ..core.security import get_current_user
from ..core.scope import get_scope_gerencia, EXCLUIDAS_GERENCIA
from ..models.employee import Employee

router = APIRouter(prefix="/api/gerencia", tags=["gerencia"])


@router.get("/mi-scope")
async def mi_scope(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Devuelve el scope de gerencia del usuario autenticado.

    Response:
      {
        "es_gerencia": bool,
        "sucursales": [
          {"id": int, "codigo": str, "nombre": str, "tipo": "central"|"franquicia", "tipo_acceso": str}
        ]
      }
    """
    scope = get_scope_gerencia(current_user, db)
    if not scope.es_gerencia:
        return {"es_gerencia": False, "sucursales": []}

    if not scope.sucursales_ids:
        return {"es_gerencia": True, "sucursales": []}

    # Enriquecer con datos de sucursales
    placeholders = ", ".join([f":s{i}" for i in range(len(scope.sucursales_ids))])
    params = {f"s{i}": sid for i, sid in enumerate(scope.sucursales_ids)}
    rows = db.execute(text(f"""
        SELECT id, codigo, nombre
        FROM v_sucursal_canonica
        WHERE id IN ({placeholders}) AND activo = true AND fecha_baja IS NULL
        ORDER BY codigo
    """), params).fetchall()

    sucursales = []
    for r in rows:
        codigo = r[1] or ''
        tipo = 'franquicia' if codigo.startswith('FRQ') else 'central'
        sucursales.append({
            "id": r[0],
            "codigo": codigo,
            "nombre": r[2],
            "tipo": tipo,
            "tipo_acceso": scope.tipo_acceso_por_suc.get(r[0], 'explicito'),
        })

    return {"es_gerencia": True, "sucursales": sucursales}


@router.get("/sucursales")
async def listar_sucursales_gerencia(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Alias más corto de mi-scope solo con las sucursales (para selectors)."""
    data = await mi_scope(current_user, db)
    return data.get("sucursales", [])
