"""
Scope de Mi Sucursal (Gerencia).

Calcula, dado un empleado autenticado, qué sucursales puede gestionar.
Fuentes:
  - permisos_usuario_sistema (sistema_id=17) -> habilita acceso a Mi Sucursal (Gerencia).
  - gerencia_sucursales_permitidas             -> lista concreta de sucursales permitidas.

Regla: **El grant en Mi Legajo (sistema_id=17) es autoritativo**.
No se hereda de rol de DUX. Si el empleado no tiene sistema_id=17 activo,
no accede a la vista de gerencia aunque su rol sea "Gerente".
"""
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text


# Sucursales administrativas / no operativas excluidas de la gestion de gerencia.
# 1=Deposito Ruta 9, 3=Pets Plus Concepcion (cerrada), 6=Studio Kai (cerrada),
# 15=Contact Center, 25=Tesoreria Central / Venta Interna (no operativa)
EXCLUIDAS_GERENCIA = {1, 3, 6, 15, 25}


@dataclass
class ScopeGerencia:
    employee_id: int
    es_gerencia: bool                          # True si tiene sistema_id=17 activo
    sucursales_ids: List[int] = field(default_factory=list)
    tipo_acceso_por_suc: Dict[int, str] = field(default_factory=dict)
    # tipo_acceso: 'casa_central_global' | 'franquiciado' | 'explicito'

    def tiene_acceso(self, sucursal_id: int) -> bool:
        return sucursal_id in self.sucursales_ids


def get_scope_gerencia(employee, db: Session) -> ScopeGerencia:
    """Calcula el scope de gerencia del empleado autenticado."""
    # 1. ¿Tiene sistema_id=17 activo?
    row = db.execute(text(
        "SELECT 1 FROM permisos_usuario_sistema WHERE employee_id = :eid AND sistema_id = 17 AND activo = true"
    ), {"eid": employee.id}).first()
    es_gerencia = row is not None

    if not es_gerencia:
        return ScopeGerencia(employee_id=employee.id, es_gerencia=False)

    # 2. Leer sucursales permitidas
    rows = db.execute(text(
        "SELECT sucursal_id, tipo_acceso FROM gerencia_sucursales_permitidas WHERE employee_id = :eid"
    ), {"eid": employee.id}).fetchall()
    sucursales_ids = [r[0] for r in rows]
    tipo_acceso_por_suc = {r[0]: r[1] for r in rows}

    # 3. Excluir administrativas (defensive)
    sucursales_ids = [s for s in sucursales_ids if s not in EXCLUIDAS_GERENCIA]

    return ScopeGerencia(
        employee_id=employee.id,
        es_gerencia=True,
        sucursales_ids=sucursales_ids,
        tipo_acceso_por_suc=tipo_acceso_por_suc,
    )


def require_acceso_sucursal(scope: ScopeGerencia, sucursal_id: int) -> None:
    """Lanza 403 si el scope no incluye la sucursal solicitada."""
    if not scope.es_gerencia:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere acceso a Mi Sucursal (Gerencia)."
        )
    if sucursal_id not in scope.sucursales_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"No tenés permiso de gerencia sobre la sucursal {sucursal_id}."
        )


def get_schema_objetivos(codigo_sucursal: Optional[str]) -> str:
    """Devuelve el schema correcto de objetivos_sucursal segun el codigo de sucursal."""
    if codigo_sucursal and codigo_sucursal.startswith('FRQ'):
        return 'portal_franquicias'
    return 'portal_vendedores'


# ============================================================
# Multi-sucursal para EMPLEADO RASO (no gerencia) — 2026-04-25
# ============================================================
# Fuente canonica: tabla empleado_sucursales (MDM Mi Legajo).
# Mi Legajo expone POST /api/employees/:id/sucursales para mantenerla.
# Mi Sucursal lee directo (mismo DB dux_integrada).

def get_sucursales_empleado(employee, db: Session) -> List[dict]:
    """Devuelve [{id, nombre, codigo, es_principal}] de sucursales asignadas al
    empleado en empleado_sucursales. Joinea por personales via dux_id si esta
    presente, sino por usuario (caso de empleados con dux_id NULL como
    alanis.lucio). Fallback a employees.sucursal_id si no hay registros.

    El orden devuelto es: principal primero, despues por nombre.
    """
    # Resolver personales.id: prefiere dux_id, si no usa usuario.
    personal_id = None
    if getattr(employee, "dux_id", None):
        personal_id = employee.dux_id
    elif getattr(employee, "usuario", None):
        row = db.execute(text(
            "SELECT id FROM personales WHERE usuario = :u AND activo = true LIMIT 1"
        ), {"u": employee.usuario}).first()
        if row:
            personal_id = row[0]

    if personal_id:
        rows = db.execute(text(
            """
            SELECT s.id, s.nombre, s.codigo, es.es_principal
            FROM empleado_sucursales es
            JOIN sucursales s ON s.id = es.sucursal_id
            WHERE es.personal_id = :pid AND es.activo = true
              AND (es.fecha_hasta IS NULL OR es.fecha_hasta >= CURRENT_DATE)
            ORDER BY es.es_principal DESC, s.nombre
            """
        ), {"pid": personal_id}).mappings().all()

        if rows:
            return [{"id": r["id"], "nombre": r["nombre"], "codigo": r["codigo"],
                     "es_principal": r["es_principal"]} for r in rows]

    # Fallback: empleado sin alta en empleado_sucursales (caso borde).
    if employee.sucursal_id:
        row = db.execute(text(
            "SELECT id, nombre, codigo FROM sucursales WHERE id = :sid"
        ), {"sid": employee.sucursal_id}).mappings().first()
        if row:
            return [{"id": row["id"], "nombre": row["nombre"],
                     "codigo": row["codigo"], "es_principal": True}]
    return []


def resolve_sucursal_target(employee, query_sucursal_id: Optional[int], db: Session) -> Optional[int]:
    """Resuelve la sucursal_target de una request HTTP.

    Reglas (en orden):
      1. Admin/super_admin/gerente: si pasa sucursal_id, lo usa sin restricciones.
         Si no pasa, devuelve la del employee.sucursal_id (o None).
      2. Empleado con scope (gerencia o multi-sede en empleado_sucursales):
         - Si pasa sucursal_id y esta en su scope, lo usa.
         - Si pasa sucursal_id y NO esta en su scope, fallback a employees.sucursal_id
           (silencioso, no rompe la UI).
         - Si no pasa, devuelve employees.sucursal_id (default).
      3. Empleado sin scope: devuelve employees.sucursal_id sin importar el query.

    Esta funcion es deliberadamente permisiva (fallback en lugar de 403) para no
    romper paneles cuando el frontend manda un sucursal_id que el empleado
    perdio en un cambio de horarios. Endpoints que necesiten enforcement estricto
    pueden usar validar_sucursal_activa() en su lugar.
    """
    from ..core.security import es_admin_o_superior, es_encargado
    # Solo admin/super_admin tiene paso libre. "Encargado" valida contra scope
    # (gerencia o multi-sede). 2026-04-25: corregido bypass C-1 del code review.
    if es_admin_o_superior(employee):
        return query_sucursal_id if query_sucursal_id else employee.sucursal_id
    if query_sucursal_id:
        # Encargado con scope de gerencia: validar via gerencia_sucursales_permitidas.
        if es_encargado(employee):
            scope = get_scope_gerencia(employee, db)
            if scope.es_gerencia and query_sucursal_id in scope.sucursales_ids:
                return query_sucursal_id
        # Empleado raso multi-sede: validar contra empleado_sucursales.
        scope_ids = {s["id"] for s in get_sucursales_empleado(employee, db)}
        if query_sucursal_id in scope_ids:
            return query_sucursal_id
        # query_sucursal_id no esta en ningun scope: fallback al default sin error
        # (preserva la intencion permisiva del helper para no romper UIs).
    return employee.sucursal_id


def validar_sucursal_activa(employee, sucursal_id: Optional[int], db: Session) -> int:
    """Valida que `sucursal_id` este en el scope del empleado y la devuelve.

    Si `sucursal_id` es None, devuelve la principal (o la unica) del scope.
    Lanza 403 si la sucursal no esta en el scope.
    Lanza 400 si el empleado no tiene ninguna sucursal asignada.
    """
    sucursales = get_sucursales_empleado(employee, db)
    if not sucursales:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El empleado no tiene sucursales asignadas."
        )
    ids_validos = {s["id"] for s in sucursales}

    if sucursal_id is None:
        # Default: la principal, o la unica si hay una sola.
        principal = next((s for s in sucursales if s["es_principal"]), sucursales[0])
        return principal["id"]

    if sucursal_id not in ids_validos:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"No tenés acceso a la sucursal {sucursal_id}."
        )
    return sucursal_id
