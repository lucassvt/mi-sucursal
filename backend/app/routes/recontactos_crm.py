"""
Endpoints internos para recibir listas auto-generadas desde CRM Cerebro.

Auth: shared-secret en header `X-CRM-Push-Token` (env CRM_PUSH_TOKEN).
NO usa JWT de usuario — esto es server-to-server.
"""
from __future__ import annotations

import os
from datetime import date, datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..core.database import get_db_anexa

router = APIRouter(prefix="/api/recontactos/crm", tags=["recontactos-crm"])

CRM_PUSH_TOKEN = os.environ.get("CRM_PUSH_TOKEN", "")


def require_crm_token(x_crm_push_token: str = Header(default="")) -> None:
    if not CRM_PUSH_TOKEN:
        raise HTTPException(status_code=500, detail="CRM_PUSH_TOKEN not configured on server")
    if x_crm_push_token != CRM_PUSH_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid CRM push token")


# ============================================================================
# Schemas
# ============================================================================

class ClienteFromCRM(BaseModel):
    canonical_id: str                                          # UUID del CRM
    dni: Optional[str] = None
    cliente_codigo: Optional[str] = None
    cliente_nombre: str
    cliente_telefono: Optional[str] = None
    cliente_email: Optional[str] = None

    # Mascota principal (si tiene)
    mascota: Optional[str] = None
    pet_id_club: Optional[str] = None
    pet_birthdate: Optional[date] = None
    pet_species: Optional[str] = None
    especie: Optional[str] = None
    tamano: Optional[str] = None

    # Comercial
    marca_habitual: Optional[str] = None
    ultima_marca_alimento: Optional[str] = None
    ultimo_consumo_kg: Optional[float] = None
    ultimo_producto: Optional[str] = None
    ultima_compra: Optional[date] = None
    dias_sin_comprar: Optional[int] = None
    monto_ultima_compra: Optional[str] = None
    expected_food_repurchase_date: Optional[date] = None

    # Service mix (4 flags)
    uses_food: Optional[bool] = None
    uses_accessory: Optional[bool] = None
    uses_vet: Optional[bool] = None
    uses_grooming: Optional[bool] = None
    service_count: Optional[int] = None

    # Segmentos + motivo
    crm_segment_slugs: List[str] = Field(default_factory=list)
    motivo_contacto: str
    urgencia: int = 3                                          # 1..5
    tipo_servicio: str = "general"                             # general|veterinaria|peluqueria

    # Promo (si aplica)
    promo_sku: Optional[str] = None

    # Refs
    club_user_id: Optional[str] = None
    dux_id_personal: Optional[int] = None


class PushFromCRMRequest(BaseModel):
    period: date                                               # primer día del mes
    source: str = "crm_cerebro"                                # 'crm_cerebro' | 'promo'
    branch_id: int
    segment_slug: Optional[str] = None
    commercial_action_id: Optional[int] = None                 # si source='promo'
    fuente_lista: str                                          # 'crm_cerebro_2026_05', etc.
    clientes: List[ClienteFromCRM]
    notes: Optional[str] = None


class PushFromCRMResult(BaseModel):
    list_id: int
    inserted: int
    updated: int
    skipped: int
    total: int


# ============================================================================
# Endpoint principal
# ============================================================================

@router.post("/push", response_model=PushFromCRMResult, dependencies=[Depends(require_crm_token)])
def push_from_crm(
    payload: PushFromCRMRequest,
    db: Session = Depends(get_db_anexa),
) -> PushFromCRMResult:
    """Recibe una tanda de clientes generada por CRM Cerebro y los inserta/upserta
    en `clientes_recontacto` ligados a una `recontact_lists` nueva."""

    # 1) Crear (o reutilizar) la lista
    existing_list = db.execute(
        text("""
            SELECT id FROM recontact_lists
             WHERE period = :period
               AND branch_id = :branch_id
               AND COALESCE(segment_slug, '') = COALESCE(:segment_slug, '')
               AND closed_at IS NULL
               AND source = :source
             ORDER BY id DESC LIMIT 1
        """),
        {
            "period": payload.period,
            "branch_id": payload.branch_id,
            "segment_slug": payload.segment_slug,
            "source": payload.source,
        },
    ).first()

    if existing_list:
        list_id = existing_list[0]
    else:
        result = db.execute(
            text("""
                INSERT INTO recontact_lists
                  (period, source, branch_id, segment_slug, commercial_action_id,
                   expected_size, generated_by, notes)
                VALUES (:period, :source, :branch_id, :segment_slug, :action_id,
                        :expected, 'crm_cerebro', :notes)
                RETURNING id
            """),
            {
                "period": payload.period,
                "source": payload.source,
                "branch_id": payload.branch_id,
                "segment_slug": payload.segment_slug,
                "action_id": payload.commercial_action_id,
                "expected": len(payload.clientes),
                "notes": payload.notes,
            },
        )
        list_id = result.scalar()

    counts = {"inserted": 0, "updated": 0, "skipped": 0}

    # 2) Por cada cliente, upsert idempotente
    for c in payload.clientes:
        try:
            res = db.execute(
                text("""
                    INSERT INTO clientes_recontacto (
                        list_id, sucursal_id, canonical_id, dni,
                        cliente_codigo, cliente_nombre, cliente_telefono, cliente_email,
                        mascota, especie, tamano,
                        marca_habitual, ultimo_producto, ultima_compra,
                        dias_sin_comprar, monto_ultima_compra,
                        tipo_servicio, estado,
                        importado, mes_importacion,
                        crm_segment_slugs, motivo_contacto, urgencia,
                        promo_sku, fuente_lista,
                        ultima_marca_alimento, ultimo_consumo_kg, expected_food_repurchase_date,
                        club_user_id, dux_id_personal, pet_id_club, pet_birthdate, pet_species,
                        uses_food, uses_accessory, uses_vet, uses_grooming, service_count,
                        intentos_contacto
                    ) VALUES (
                        :list_id, :sucursal_id, CAST(:canonical_id AS uuid), :dni,
                        :codigo, :nombre, :telefono, :email,
                        :mascota, :especie, :tamano,
                        :marca, :producto, :ultima_compra,
                        :dias, :monto,
                        :tipo_servicio, 'pendiente',
                        true, :mes_importacion,
                        :segments, :motivo, :urgencia,
                        :promo_sku, :fuente_lista,
                        :ult_marca, :ult_consumo, :expected_repurchase,
                        :club_user, :dux_personal, :pet_club, :pet_birth, :pet_sp,
                        :u_food, :u_acc, :u_vet, :u_groom, :svc_count,
                        0
                    )
                    ON CONFLICT (list_id, canonical_id)
                      WHERE list_id IS NOT NULL AND canonical_id IS NOT NULL
                      DO UPDATE SET
                        cliente_telefono   = COALESCE(clientes_recontacto.cliente_telefono, EXCLUDED.cliente_telefono),
                        cliente_email      = COALESCE(clientes_recontacto.cliente_email, EXCLUDED.cliente_email),
                        marca_habitual     = COALESCE(clientes_recontacto.marca_habitual, EXCLUDED.marca_habitual),
                        ultimo_producto    = COALESCE(clientes_recontacto.ultimo_producto, EXCLUDED.ultimo_producto),
                        ultima_compra      = COALESCE(clientes_recontacto.ultima_compra, EXCLUDED.ultima_compra),
                        dias_sin_comprar   = EXCLUDED.dias_sin_comprar,
                        urgencia           = EXCLUDED.urgencia,
                        motivo_contacto    = EXCLUDED.motivo_contacto,
                        crm_segment_slugs  = EXCLUDED.crm_segment_slugs,
                        ultima_marca_alimento = EXCLUDED.ultima_marca_alimento,
                        ultimo_consumo_kg     = EXCLUDED.ultimo_consumo_kg,
                        expected_food_repurchase_date = EXCLUDED.expected_food_repurchase_date,
                        uses_food          = EXCLUDED.uses_food,
                        uses_accessory     = EXCLUDED.uses_accessory,
                        uses_vet           = EXCLUDED.uses_vet,
                        uses_grooming      = EXCLUDED.uses_grooming,
                        service_count      = EXCLUDED.service_count,
                        updated_at         = now()
                    RETURNING (xmax = 0) AS inserted
                """),
                {
                    "list_id": list_id,
                    "sucursal_id": payload.branch_id,
                    "canonical_id": c.canonical_id,
                    "dni": c.dni,
                    "codigo": c.cliente_codigo,
                    "nombre": c.cliente_nombre,
                    "telefono": c.cliente_telefono,
                    "email": c.cliente_email,
                    "mascota": c.mascota,
                    "especie": c.especie or c.pet_species,
                    "tamano": c.tamano,
                    "marca": c.marca_habitual,
                    "producto": c.ultimo_producto,
                    "ultima_compra": c.ultima_compra,
                    "dias": c.dias_sin_comprar,
                    "monto": c.monto_ultima_compra,
                    "tipo_servicio": c.tipo_servicio,
                    "mes_importacion": payload.period.strftime("%Y-%m"),
                    "segments": c.crm_segment_slugs or [],
                    "motivo": c.motivo_contacto,
                    "urgencia": max(1, min(5, c.urgencia)),
                    "promo_sku": c.promo_sku,
                    "fuente_lista": payload.fuente_lista,
                    "ult_marca": c.ultima_marca_alimento,
                    "ult_consumo": c.ultimo_consumo_kg,
                    "expected_repurchase": c.expected_food_repurchase_date,
                    "club_user": c.club_user_id,
                    "dux_personal": c.dux_id_personal,
                    "pet_club": c.pet_id_club,
                    "pet_birth": c.pet_birthdate,
                    "pet_sp": c.pet_species,
                    "u_food": c.uses_food,
                    "u_acc": c.uses_accessory,
                    "u_vet": c.uses_vet,
                    "u_groom": c.uses_grooming,
                    "svc_count": c.service_count,
                },
            ).first()

            if res and res[0]:
                counts["inserted"] += 1
            else:
                counts["updated"] += 1

        except Exception as e:
            counts["skipped"] += 1
            db.rollback()
            # log; en producción a Sentry
            print(f"[push-from-crm] skipped {c.canonical_id}: {e}")
            continue

    # 3) Update list size + commit
    db.execute(
        text("UPDATE recontact_lists SET actual_size = :n WHERE id = :id"),
        {"n": counts["inserted"] + counts["updated"], "id": list_id},
    )
    db.commit()

    return PushFromCRMResult(
        list_id=list_id,
        inserted=counts["inserted"],
        updated=counts["updated"],
        skipped=counts["skipped"],
        total=len(payload.clientes),
    )


# ============================================================================
# Endpoint health (sanity)
# ============================================================================

@router.get("/health", dependencies=[Depends(require_crm_token)])
def health():
    return {"status": "ok", "ts": datetime.now(timezone.utc).isoformat()}
