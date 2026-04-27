"""
Exportacion de facturas de proveedores a Google Drive.

Estructura en Drive (carpeta raiz compartida con el service account):
  {ROOT}/{SUCURSAL_NOMBRE}/{YYYY-MM}/
    {numero_factura}_{proveedor_slug}.{ext}    -> imagen
    {numero_factura}_{proveedor_slug}.json     -> metadata

Se dispara desde routes/facturas.py (POST /api/facturas/) como tarea async
fire-and-forget. Si falla, la factura queda en DB igual y el cron nocturno
reintenta.
"""

import base64
import io
import json as json_module
import logging
import re
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from sqlalchemy import text as sa_text

from ..core.config import settings

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/drive"]

# Caches module-scoped para evitar llamadas repetidas a Drive:
_drive_client = None
_folder_cache: dict = {}  # {(parent_id, nombre): folder_id}


def _get_drive_client():
    """Construye y cachea el cliente de Drive con el service account."""
    global _drive_client
    if _drive_client is not None:
        return _drive_client
    creds_path = settings.GDRIVE_SERVICE_ACCOUNT_FILE
    if not creds_path or not Path(creds_path).exists():
        raise RuntimeError(
            f"GDRIVE_SERVICE_ACCOUNT_FILE no configurado o archivo inexistente: {creds_path}"
        )
    if not settings.GDRIVE_ROOT_FOLDER_ID:
        raise RuntimeError("GDRIVE_ROOT_FOLDER_ID no configurado")
    creds = service_account.Credentials.from_service_account_file(
        creds_path, scopes=SCOPES
    )
    _drive_client = build("drive", "v3", credentials=creds, cache_discovery=False)
    return _drive_client


def _slugify(text: Optional[str], max_len: int = 40) -> str:
    if not text:
        return "SIN-DATO"
    # Normalizar unicode (NFKD) + quitar acentos
    t = unicodedata.normalize("NFKD", str(text))
    t = "".join(c for c in t if not unicodedata.combining(c))
    # Lower, reemplazar no-alfanum por -
    t = re.sub(r"[^A-Za-z0-9\-]+", "-", t)
    t = re.sub(r"-+", "-", t).strip("-").upper()
    return (t or "SIN-DATO")[:max_len]


def _get_or_create_folder(parent_id: str, name: str) -> str:
    """Busca una subcarpeta por nombre en parent_id. Si no existe, la crea. Cachea."""
    key = (parent_id, name)
    if key in _folder_cache:
        return _folder_cache[key]
    svc = _get_drive_client()
    # Escapar comillas en el nombre para la query
    safe_name = name.replace("'", "\\'")
    query = (
        f"'{parent_id}' in parents and "
        f"mimeType='application/vnd.google-apps.folder' and "
        f"name='{safe_name}' and trashed=false"
    )
    r = svc.files().list(
        q=query,
        fields="files(id, name)",
        supportsAllDrives=True,
        includeItemsFromAllDrives=True,
        pageSize=10,
    ).execute()
    files = r.get("files", [])
    if files:
        folder_id = files[0]["id"]
    else:
        meta = {
            "name": name,
            "mimeType": "application/vnd.google-apps.folder",
            "parents": [parent_id],
        }
        created = svc.files().create(
            body=meta, fields="id", supportsAllDrives=True
        ).execute()
        folder_id = created["id"]
    _folder_cache[key] = folder_id
    return folder_id


def _decode_base64_image(imagen_base64: str) -> Tuple[bytes, str, str]:
    """
    Decodifica un string tipo 'data:image/jpeg;base64,XXXX' o solo base64 raw.
    Retorna (bytes, mime_type, extension).
    """
    if not imagen_base64:
        raise ValueError("imagen_base64 vacia")
    mime = "image/jpeg"
    ext = "jpg"
    if imagen_base64.startswith("data:"):
        # data:image/png;base64,ABCDE...
        header, _, b64 = imagen_base64.partition(",")
        if "image/png" in header:
            mime, ext = "image/png", "png"
        elif "image/jpeg" in header or "image/jpg" in header:
            mime, ext = "image/jpeg", "jpg"
        elif "application/pdf" in header:
            mime, ext = "application/pdf", "pdf"
        elif "image/webp" in header:
            mime, ext = "image/webp", "webp"
    else:
        b64 = imagen_base64
    # Padding defensivo
    b64 += "=" * (-len(b64) % 4)
    data = base64.b64decode(b64)
    return data, mime, ext


def _upload_file(
    parent_id: str, filename: str, data: bytes, mime_type: str
) -> Tuple[str, str]:
    svc = _get_drive_client()
    media = MediaIoBaseUpload(io.BytesIO(data), mimetype=mime_type, resumable=False)
    meta = {"name": filename, "parents": [parent_id]}
    f = svc.files().create(
        body=meta,
        media_body=media,
        fields="id, webViewLink",
        supportsAllDrives=True,
    ).execute()
    return f["id"], f.get("webViewLink", "")


def _upload_existing_file_update(
    file_id: str, data: bytes, mime_type: str
) -> None:
    svc = _get_drive_client()
    media = MediaIoBaseUpload(io.BytesIO(data), mimetype=mime_type, resumable=False)
    svc.files().update(fileId=file_id, media_body=media, supportsAllDrives=True).execute()


def _build_metadata_dict(factura_row, sucursal_nombre: str, employee_row, imagen_url: str) -> dict:
    """Construye el dict que se serializa como .json hermano."""
    return {
        "factura_id": factura_row["id"],
        "sucursal": sucursal_nombre,
        "sucursal_id": factura_row["sucursal_id"],
        "proveedor": factura_row["proveedor_nombre"],
        "proveedor_id": factura_row["proveedor_id"],
        "proveedor_custom_id": factura_row["proveedor_custom_id"],
        "proveedor_origen": "dux" if factura_row["proveedor_id"] else ("custom" if factura_row["proveedor_custom_id"] else "manual"),
        "numero_factura": factura_row["numero_factura"],
        "fecha_factura": factura_row["fecha_factura"].isoformat() if factura_row.get("fecha_factura") else None,
        "fecha_registro": factura_row["fecha_registro"].isoformat() if factura_row.get("fecha_registro") else None,
        "registrado_por": {
            "employee_id": factura_row["employee_id"],
            "nombre": f"{employee_row.get('nombre') or ''} {employee_row.get('apellido') or ''}".strip() if employee_row else None,
            "usuario": employee_row.get("usuario") if employee_row else None,
        },
        "tiene_inconsistencia": bool(factura_row.get("tiene_inconsistencia")),
        "detalle_inconsistencia": factura_row.get("detalle_inconsistencia"),
        "observaciones": factura_row.get("observaciones"),
        "imagen_url_drive": imagen_url,
    }


def export_factura(db_anexa, db_dux, factura_id: int) -> dict:
    """
    Export sincronico de una factura a Drive.
    Lee la factura, la sucursal (de dux_integrada), el employee (de dux_integrada),
    sube imagen + json, devuelve dict con ids.
    Raises si algo falla.
    """
    # 1. Leer factura
    f = db_anexa.execute(sa_text("""
        SELECT id, sucursal_id, employee_id, proveedor_id, proveedor_custom_id,
               proveedor_nombre, numero_factura, imagen_base64,
               tiene_inconsistencia, detalle_inconsistencia, observaciones,
               fecha_factura, fecha_registro
        FROM facturas_proveedores WHERE id = :id
    """), {"id": factura_id}).mappings().first()
    if not f:
        raise RuntimeError(f"Factura {factura_id} no encontrada")
    if not f["imagen_base64"]:
        raise RuntimeError(f"Factura {factura_id} sin imagen_base64")

    # 2. Leer sucursal (de dux_integrada)
    suc = db_dux.execute(sa_text("""
        SELECT id, nombre, codigo FROM sucursales WHERE id = :id
    """), {"id": f["sucursal_id"]}).mappings().first()
    sucursal_nombre = suc["nombre"] if suc else f"SUCURSAL_{f['sucursal_id']}"

    # 3. Leer employee (de dux_integrada)
    emp = db_dux.execute(sa_text("""
        SELECT id, usuario, nombre, apellido FROM employees WHERE id = :id
    """), {"id": f["employee_id"]}).mappings().first()

    # 4. Resolver carpetas
    root = settings.GDRIVE_ROOT_FOLDER_ID
    suc_folder = _get_or_create_folder(root, _slugify(sucursal_nombre))
    fecha_ref = f.get("fecha_factura") or (f.get("fecha_registro") and f["fecha_registro"].date()) or datetime.utcnow().date()
    mes_folder_name = fecha_ref.strftime("%Y-%m")
    mes_folder = _get_or_create_folder(suc_folder, mes_folder_name)

    # 5. Decodificar imagen
    img_bytes, mime, ext = _decode_base64_image(f["imagen_base64"])

    # 6. Generar nombres de archivo
    numero = _slugify(f["numero_factura"] or f"SIN-NRO-{f['id']}", max_len=30)
    prov_slug = _slugify(f["proveedor_nombre"], max_len=35)
    base_name = f"{numero}_{prov_slug}"
    img_name = f"{base_name}.{ext}"
    json_name = f"{base_name}.json"

    # 7. Subir imagen
    img_id, img_url = _upload_file(mes_folder, img_name, img_bytes, mime)

    # 8. Armar y subir JSON
    meta = _build_metadata_dict(dict(f), sucursal_nombre, dict(emp) if emp else None, img_url)
    meta_bytes = json_module.dumps(meta, ensure_ascii=False, indent=2, default=str).encode("utf-8")
    json_id, _ = _upload_file(mes_folder, json_name, meta_bytes, "application/json")

    logger.info(f"Drive export OK factura {factura_id}: img={img_id} json={json_id}")
    return {
        "drive_file_id": img_id,
        "drive_json_file_id": json_id,
        "imagen_url": img_url,
    }


def export_factura_safe(db_anexa_factory, db_dux_factory, factura_id: int) -> bool:
    """
    Wrapper con try/except: nunca tira excepcion. Actualiza drive_* columns segun resultado.
    db_anexa_factory / db_dux_factory: callables que retornan nuevas sessions (para task async).
    """
    anexa = db_anexa_factory()
    dux = db_dux_factory()
    try:
        result = export_factura(anexa, dux, factura_id)
        anexa.execute(sa_text("""
            UPDATE facturas_proveedores
            SET drive_file_id = :fid,
                drive_json_file_id = :jid,
                drive_synced_at = NOW(),
                drive_sync_error = NULL
            WHERE id = :id
        """), {
            "fid": result["drive_file_id"],
            "jid": result["drive_json_file_id"],
            "id": factura_id,
        })
        anexa.commit()
        return True
    except Exception as e:
        err = str(e)[:500]
        logger.warning(f"Drive export FALLO factura {factura_id}: {err}")
        try:
            anexa.execute(sa_text("""
                UPDATE facturas_proveedores
                SET drive_synced_at = NULL,
                    drive_sync_error = :err
                WHERE id = :id
            """), {"err": err, "id": factura_id})
            anexa.commit()
        except Exception as e2:
            logger.error(f"No se pudo actualizar drive_sync_error para factura {factura_id}: {e2}")
        return False
    finally:
        anexa.close()
        dux.close()
