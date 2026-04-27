"""
Endpoints v2 para la UI rediseñada de Recontacto-Clientes.

Lecturas enriquecidas (lista del día con motivo + urgencia + service-mix),
templates WhatsApp interpolados, autocompletes de marca/SKU desde transacciones
DUX (vía FDW del CRM Cerebro), acciones comerciales aplicables, registrar
contacto con outcomes estructurados y captura de acciones ofrecidas.

Auth: usa el JWT estándar del usuario (mismo que el resto de Mi Sucursal).
"""
from __future__ import annotations

import os
import re
from datetime import date, datetime, timezone
from typing import Any, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..core.database import get_db, get_db_anexa
from ..core.security import get_current_user
from ..models.employee import Employee

router = APIRouter(prefix="/api/recontactos/v2", tags=["recontactos-v2"])

# CRM Cerebro: FDW expuesto en mi_sucursal? No. Usamos llamada HTTP al CRM.
CRM_API_URL = os.environ.get("CRM_API_URL", "http://127.0.0.1:8030")

# ============================================================================
# Schemas
# ============================================================================

class ServiceMix(BaseModel):
    uses_food: Optional[bool] = None
    uses_accessory: Optional[bool] = None
    uses_vet: Optional[bool] = None
    uses_grooming: Optional[bool] = None
    service_count: Optional[int] = None


class ClienteV2(BaseModel):
    id: int
    sucursal_id: int
    canonical_id: Optional[str] = None
    dni: Optional[str] = None
    cliente_nombre: str
    cliente_telefono: Optional[str] = None
    cliente_email: Optional[str] = None
    mascota: Optional[str] = None
    especie: Optional[str] = None
    tamano: Optional[str] = None
    marca_habitual: Optional[str] = None
    ultima_marca_alimento: Optional[str] = None
    ultimo_producto: Optional[str] = None
    ultima_compra: Optional[date] = None
    dias_sin_comprar: Optional[int] = None
    monto_ultima_compra: Optional[str] = None
    motivo_contacto: Optional[str] = None
    urgencia: Optional[int] = None
    crm_segment_slugs: List[str] = Field(default_factory=list)
    expected_food_repurchase_date: Optional[date] = None
    estado: str
    tipo_servicio: str
    fuente_lista: Optional[str] = None
    intentos_contacto: Optional[int] = 0
    # Service mix (se mapea a chips coloreados)
    uses_food: Optional[bool] = None
    uses_accessory: Optional[bool] = None
    uses_vet: Optional[bool] = None
    uses_grooming: Optional[bool] = None
    service_count: Optional[int] = None
    # Histórico
    cantidad_contactos: int = 0
    ultimo_contacto_at: Optional[datetime] = None


class CommercialAction(BaseModel):
    id: int
    slug: str
    name: str
    description: Optional[str] = None
    starts_at: date
    ends_at: date
    discount_pct: Optional[float] = None
    free_gift: Optional[str] = None
    whatsapp_template_slug: Optional[str] = None


class WhatsAppTemplate(BaseModel):
    slug: str
    name: str
    body: str
    applies_to_motivos: List[str] = Field(default_factory=list)


class RenderTemplateResponse(BaseModel):
    slug: str
    body: str
    phone_e164: Optional[str] = None
    wa_link: Optional[str] = None


class RegistrarContactoV2(BaseModel):
    cliente_recontacto_id: int
    medio: str                                              # telefono|whatsapp|email|presencial
    outcome: str                                            # compro_agendo|interesado|cambio_marca|pidio_llamar_luego|no_contesta|numero_erroneo|no_interesa|deceso_mascota
    notas: Optional[str] = None
    nueva_marca_alimento: Optional[str] = None              # si outcome='cambio_marca'
    motivo_no_interesado: Optional[str] = None              # si outcome='no_interesa'
    deceso_pet_id_club: Optional[str] = None                # si outcome='deceso_mascota'
    whatsapp_template_used: Optional[str] = None
    actions_offered_ids: List[int] = Field(default_factory=list)
    recordatorio_dias: Optional[int] = None                 # si outcome='pidio_llamar_luego'
    recordatorio_motivo: Optional[str] = None


# ============================================================================
# GET lista-del-dia (priorizada por urgencia × días sin contactar)
# ============================================================================

@router.get("/lista-del-dia", response_model=List[ClienteV2])
def lista_del_dia(
    branch_id: Optional[int] = Query(None),
    strategy: str = Query("lista_dia"),                     # lista_dia|recompra_alimento|promo|cohort
    servicio: Optional[str] = Query(None),                  # general|veterinaria|peluqueria
    marca: Optional[str] = Query(None),
    sku: Optional[str] = Query(None),
    segmento: Optional[str] = Query(None),
    estado: str = Query("pendiente"),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    db: Session = Depends(get_db_anexa),
    user=Depends(get_current_user),
):
    sucursal_id = branch_id or user.id_sucursal_dux
    if not sucursal_id:
        raise HTTPException(400, "branch_id requerido")

    # Filtros base
    where = ["cr.sucursal_id = :sid", "cr.estado = :estado"]
    params: dict[str, Any] = {"sid": sucursal_id, "estado": estado, "limit": limit, "offset": offset}

    if servicio and servicio != "todos":
        where.append("cr.tipo_servicio = :servicio")
        params["servicio"] = servicio
    if marca:
        where.append("(cr.marca_habitual ILIKE :marca OR cr.ultima_marca_alimento ILIKE :marca)")
        params["marca"] = f"%{marca}%"
    if segmento:
        where.append(":seg = ANY(cr.crm_segment_slugs)")
        params["seg"] = segmento

    # Strategy → orden distinto
    if strategy == "recompra_alimento":
        where.append("cr.expected_food_repurchase_date IS NOT NULL")
        order = "cr.expected_food_repurchase_date ASC NULLS LAST, cr.urgencia DESC NULLS LAST"
    elif strategy == "promo":
        where.append("cr.promo_sku IS NOT NULL")
        order = "cr.urgencia DESC NULLS LAST"
    elif strategy == "cohort":
        order = "cr.dias_sin_comprar DESC NULLS LAST"
    else:  # lista_dia
        order = "cr.urgencia DESC NULLS LAST, cr.dias_sin_comprar DESC NULLS LAST"

    sql = text(f"""
        SELECT
          cr.id, cr.sucursal_id,
          cr.canonical_id::text AS canonical_id,
          cr.dni,
          cr.cliente_nombre, cr.cliente_telefono, cr.cliente_email,
          cr.mascota, cr.especie, cr.tamano,
          cr.marca_habitual, cr.ultima_marca_alimento, cr.ultimo_producto,
          cr.ultima_compra, cr.dias_sin_comprar, cr.monto_ultima_compra,
          cr.motivo_contacto, cr.urgencia, cr.crm_segment_slugs,
          cr.expected_food_repurchase_date,
          cr.estado, cr.tipo_servicio, cr.fuente_lista, cr.intentos_contacto,
          cr.uses_food, cr.uses_accessory, cr.uses_vet, cr.uses_grooming, cr.service_count,
          (SELECT count(*) FROM registros_contacto rc WHERE rc.cliente_recontacto_id = cr.id) AS cantidad_contactos,
          (SELECT max(rc.fecha_contacto) FROM registros_contacto rc WHERE rc.cliente_recontacto_id = cr.id) AS ultimo_contacto_at
        FROM clientes_recontacto cr
        WHERE {" AND ".join(where)}
        ORDER BY {order}
        LIMIT :limit OFFSET :offset
    """)

    rows = db.execute(sql, params).mappings().all()
    return [ClienteV2(**dict(r)) for r in rows]


# ============================================================================
# GET autocomplete marcas / skus (vía CRM API)
# ============================================================================

@router.get("/marcas")
def marcas_autocomplete(
    q: str = Query("", min_length=0),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db_anexa),
    user=Depends(get_current_user),
):
    """Marcas desde clientes_recontacto.marca_habitual existentes (rápido,
    sin ir al CRM). Mejor a esperar que cargue todo desde DUX."""
    sql = text("""
        SELECT marca_habitual AS marca, count(*)::int AS clientes
          FROM clientes_recontacto
         WHERE marca_habitual IS NOT NULL
           AND marca_habitual != ''
           AND (:q = '' OR marca_habitual ILIKE :q_like)
         GROUP BY marca_habitual
         ORDER BY clientes DESC
         LIMIT :limit
    """)
    rows = db.execute(sql, {"q": q, "q_like": f"%{q}%", "limit": limit}).mappings().all()
    return list(rows)


@router.get("/skus")
def skus_autocomplete(
    q: str = Query("", min_length=2),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db_anexa),
    user=Depends(get_current_user),
):
    """SKUs desde DUX (vía CRM API que tiene FDW)."""
    if not q or len(q) < 2:
        return []
    try:
        with httpx.Client(timeout=10) as c:
            r = c.get(f"{CRM_API_URL}/api/v1/recontacto/skus", params={"q": q, "limit": limit})
            if r.status_code == 200:
                return r.json()
    except Exception:
        pass
    return []


# ============================================================================
# GET acciones-activas (vía CRM API)
# ============================================================================

@router.get("/acciones-activas", response_model=List[CommercialAction])
def acciones_activas(
    branch_id: Optional[int] = None,
    user=Depends(get_current_user),
):
    sucursal_id = branch_id or user.id_sucursal_dux
    try:
        with httpx.Client(timeout=10) as c:
            r = c.get(f"{CRM_API_URL}/api/v1/recontacto/acciones-activas",
                      params={"branch_dux_id": sucursal_id})
            if r.status_code == 200:
                return r.json()
    except Exception:
        pass
    return []


@router.get("/{cliente_id}/acciones-aplicables", response_model=List[CommercialAction])
def acciones_aplicables_cliente(
    cliente_id: int,
    db: Session = Depends(get_db_anexa),
    user=Depends(get_current_user),
):
    """Acciones del mes que matchean los segmentos de ESTE cliente."""
    cli = db.execute(text("""
        SELECT crm_segment_slugs, sucursal_id
          FROM clientes_recontacto WHERE id = :id
    """), {"id": cliente_id}).first()
    if not cli:
        raise HTTPException(404, "Cliente no encontrado")

    segments = list(cli.crm_segment_slugs or [])
    if not segments:
        return []

    try:
        with httpx.Client(timeout=10) as c:
            r = c.get(f"{CRM_API_URL}/api/v1/recontacto/acciones-aplicables",
                      params={"branch_dux_id": cli.sucursal_id, "segments": ",".join(segments)})
            if r.status_code == 200:
                return r.json()
    except Exception:
        pass
    return []


# ============================================================================
# GET WhatsApp templates + render
# ============================================================================

@router.get("/whatsapp-templates", response_model=List[WhatsAppTemplate])
def listar_templates(
    db: Session = Depends(get_db_anexa),
    user=Depends(get_current_user),
):
    rows = db.execute(text("""
        SELECT slug, name, body, applies_to_motivos
          FROM whatsapp_templates WHERE is_active = true
         ORDER BY name
    """)).mappings().all()
    return [WhatsAppTemplate(**dict(r)) for r in rows]


def _render_jinja_lite(body: str, ctx: dict) -> str:
    """Render simple {{var}} sin invocar Jinja completo."""
    def replace(m):
        key = m.group(1).strip()
        val = ctx.get(key)
        return str(val) if val not in (None, "") else f"[{key}]"
    return re.sub(r"\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}", replace, body)


@router.post("/whatsapp-templates/{slug}/render", response_model=RenderTemplateResponse)
def render_template(
    slug: str,
    cliente_id: int = Query(...),
    action_id: Optional[int] = None,
    db: Session = Depends(get_db_anexa),
    user=Depends(get_current_user),
):
    tpl = db.execute(text("SELECT body FROM whatsapp_templates WHERE slug = :s AND is_active = true"),
                     {"s": slug}).first()
    if not tpl:
        raise HTTPException(404, f"Template '{slug}' no encontrado")

    cli = db.execute(text("""
        SELECT cliente_nombre, cliente_telefono, mascota, marca_habitual,
               ultima_marca_alimento, expected_food_repurchase_date, sucursal_id
          FROM clientes_recontacto WHERE id = :id
    """), {"id": cliente_id}).first()
    if not cli:
        raise HTTPException(404, "Cliente no encontrado")

    nombre = cli.cliente_nombre or "vecino"
    first_name = nombre.split()[0] if nombre else "vecino"

    # Branch name
    branch_name = "tu sucursal habitual"
    sucursal = db.execute(text("""
        SELECT codigo, nombre FROM dux_integrada.sucursales WHERE id = :id
    """), {"id": cli.sucursal_id}).first() if cli.sucursal_id else None
    if sucursal:
        branch_name = sucursal.nombre

    ctx = {
        "first_name": first_name,
        "pet_name": cli.mascota or "tu mascota",
        "marca_habitual": cli.marca_habitual or cli.ultima_marca_alimento or "tu marca habitual",
        "branch_name": branch_name,
        "last_grooming_date": "",
        "vaccine_name": "",
        "promo_marca": "",
        "promo_descuento": "",
        "promo_expires_at": "",
    }

    # Si vino una acción, sumar contexto de la acción
    if action_id:
        try:
            with httpx.Client(timeout=10) as c:
                r = c.get(f"{CRM_API_URL}/api/v1/commercial-actions/{action_id}")
                if r.status_code == 200:
                    a = r.json()
                    ctx["promo_marca"] = ", ".join(a.get("applicable_brands") or []) or a.get("name", "")
                    ctx["promo_descuento"] = str(a.get("discount_pct") or "")
                    ctx["promo_expires_at"] = a.get("ends_at", "")
        except Exception:
            pass

    body = _render_jinja_lite(tpl.body, ctx)
    phone = cli.cliente_telefono
    wa_link = None
    if phone:
        digits = re.sub(r"\D", "", phone)
        if digits and len(digits) >= 10:
            from urllib.parse import quote
            wa_link = f"https://wa.me/{digits}?text={quote(body)}"

    return RenderTemplateResponse(slug=slug, body=body, phone_e164=phone, wa_link=wa_link)


# ============================================================================
# POST registrar-contacto v2 (con outcomes nuevos + acciones)
# ============================================================================

@router.post("/registrar-contacto")
def registrar_contacto_v2(
    payload: RegistrarContactoV2,
    db: Session = Depends(get_db_anexa),
    user=Depends(get_current_user),
):
    cli = db.execute(text("""
        SELECT id, sucursal_id, canonical_id, intentos_contacto
          FROM clientes_recontacto WHERE id = :id
    """), {"id": payload.cliente_recontacto_id}).first()
    if not cli:
        raise HTTPException(404, "Cliente no encontrado")

    # Mapear outcome → resultado legacy + estado nuevo
    outcome = payload.outcome
    OUTCOME_TO_RESULTADO = {
        "compro_agendo":     "interesado",
        "interesado":        "interesado",
        "cambio_marca":      "interesado",
        "pidio_llamar_luego":"contactado",
        "no_contesta":       "no_contesta",
        "numero_erroneo":    "numero_erroneo",
        "no_interesa":       "no_interesado",
        "deceso_mascota":    "no_interesado",
    }
    OUTCOME_TO_ESTADO = {
        "compro_agendo":     "recuperado",
        "interesado":        "contactado",
        "cambio_marca":      "contactado",
        "pidio_llamar_luego":"recordatorio",
        "no_contesta":       None,                          # sigue 'pendiente' o 'descartado' tras 3 intentos
        "numero_erroneo":    "no_interesado",
        "no_interesa":       "no_interesado",
        "deceso_mascota":    "no_interesado",
    }

    resultado = OUTCOME_TO_RESULTADO[outcome]
    nuevo_estado = OUTCOME_TO_ESTADO[outcome]

    # 1) INSERT registro
    insert_res = db.execute(text("""
        INSERT INTO registros_contacto (
            cliente_recontacto_id, employee_id, sucursal_id,
            medio, resultado, notas,
            outcome, nueva_marca_alimento, motivo_no_interesado,
            deceso_pet_id_club, whatsapp_template_used, actions_offered_ids
        ) VALUES (
            :cli, :emp, :suc, :medio, :resultado, :notas,
            :outcome, :nueva_marca, :motivo_no, :deceso_pet,
            :tpl, :actions
        ) RETURNING id, fecha_contacto
    """), {
        "cli": payload.cliente_recontacto_id,
        "emp": user.id,
        "suc": cli.sucursal_id,
        "medio": payload.medio,
        "resultado": resultado,
        "notas": payload.notas,
        "outcome": outcome,
        "nueva_marca": payload.nueva_marca_alimento,
        "motivo_no": payload.motivo_no_interesado,
        "deceso_pet": payload.deceso_pet_id_club,
        "tpl": payload.whatsapp_template_used,
        "actions": payload.actions_offered_ids or None,
    }).first()

    registro_id = insert_res.id

    # 2) Update cliente
    new_intentos = (cli.intentos_contacto or 0) + 1
    if outcome == "no_contesta" and new_intentos >= 3:
        nuevo_estado = "no_interesado"

    if outcome == "pidio_llamar_luego" and payload.recordatorio_dias:
        db.execute(text("""
            UPDATE clientes_recontacto SET
                estado = 'recordatorio',
                recordatorio_motivo = :motivo,
                recordatorio_dias = :dias,
                recordatorio_fecha_proximo = (CURRENT_DATE + (:dias || ' days')::interval)::date,
                recordatorio_activo = true,
                intentos_contacto = :intentos,
                updated_at = now()
              WHERE id = :id
        """), {
            "motivo": payload.recordatorio_motivo or "Pidió que lo llamen luego",
            "dias": payload.recordatorio_dias,
            "intentos": new_intentos,
            "id": payload.cliente_recontacto_id,
        })
    elif nuevo_estado:
        db.execute(text("""
            UPDATE clientes_recontacto SET
                estado = :estado,
                intentos_contacto = :intentos,
                updated_at = now()
              WHERE id = :id
        """), {
            "estado": nuevo_estado,
            "intentos": new_intentos,
            "id": payload.cliente_recontacto_id,
        })
    else:
        db.execute(text("""
            UPDATE clientes_recontacto SET
                intentos_contacto = :intentos,
                updated_at = now()
              WHERE id = :id
        """), {"intentos": new_intentos, "id": payload.cliente_recontacto_id})

    db.commit()

    # 3) Si hubo deceso, marcar pet en Club (best-effort, lazy import)
    if outcome == "deceso_mascota" and payload.deceso_pet_id_club:
        try:
            import psycopg2
            club_conn = psycopg2.connect(
                host="host.docker.internal",
                dbname="club_mascotera",
                user="postgres",
                password=os.environ.get("CLUB_DB_PASSWORD", "Lamascotera2026"),
            )
            with club_conn.cursor() as cur:
                cur.execute(
                    "UPDATE pets SET is_deceased = true, updated_at = now() WHERE id = %s",
                    (payload.deceso_pet_id_club,),
                )
            club_conn.commit()
            club_conn.close()
        except Exception as e:
            print(f"[registrar-contacto-v2] club writeback failed: {e}")

    # 4) Atribuir acciones comerciales (best-effort, vía CRM API)
    if payload.actions_offered_ids and cli.canonical_id:
        try:
            with httpx.Client(timeout=10) as c:
                c.post(f"{CRM_API_URL}/api/v1/recontacto/track-offers", json={
                    "registro_contacto_id": registro_id,
                    "cliente_recontacto_id": payload.cliente_recontacto_id,
                    "canonical_id": str(cli.canonical_id),
                    "branch_id": cli.sucursal_id,
                    "action_ids": payload.actions_offered_ids,
                })
        except Exception as e:
            print(f"[registrar-contacto-v2] action tracking failed: {e}")

    return {
        "registro_id": registro_id,
        "fecha_contacto": insert_res.fecha_contacto,
        "outcome": outcome,
        "estado_actual": nuevo_estado or "pendiente",
        "intentos": new_intentos,
    }


# ============================================================================
# GET resumen v2 (KPIs del header)
# ============================================================================

@router.get("/resumen")
def resumen_v2(
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db_anexa),
    user=Depends(get_current_user),
):
    sucursal_id = branch_id or user.id_sucursal_dux
    if not sucursal_id:
        raise HTTPException(400, "branch_id requerido")

    sql = text("""
        SELECT
            count(*) FILTER (WHERE estado = 'pendiente') AS pendientes,
            count(*) FILTER (WHERE estado = 'contactado') AS contactados_total,
            count(*) FILTER (WHERE estado = 'recuperado') AS recuperados_total,
            count(*) FILTER (WHERE estado = 'no_interesado') AS no_interesados_total,
            (SELECT count(DISTINCT cliente_recontacto_id) FROM registros_contacto
              WHERE sucursal_id = :sid AND fecha_contacto::date = CURRENT_DATE) AS contactados_hoy,
            (SELECT count(DISTINCT cliente_recontacto_id) FROM registros_contacto
              WHERE sucursal_id = :sid AND fecha_contacto >= now() - interval '7 days') AS contactados_semana,
            (SELECT count(*) FROM registros_contacto
              WHERE sucursal_id = :sid AND outcome = 'compro_agendo'
                AND fecha_contacto >= now() - interval '7 days') AS recuperados_semana,
            (SELECT count(*) FROM registros_contacto
              WHERE sucursal_id = :sid AND outcome = 'deceso_mascota'
                AND fecha_contacto::date >= date_trunc('month', CURRENT_DATE)) AS decesos_mes
          FROM clientes_recontacto WHERE sucursal_id = :sid
    """)
    r = db.execute(sql, {"sid": sucursal_id}).mappings().first()
    return dict(r) if r else {}
