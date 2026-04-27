"""
Migracion one-shot: sube a Google Drive todas las facturas que tengan
drive_synced_at IS NULL. Se corre una vez despues de agregar las columnas.

Uso (desde el container):
  docker exec mi-sucursal-backend python -m scripts.migrate_facturas_to_drive

O desde el host:
  docker exec mi-sucursal-backend python /app/scripts/migrate_facturas_to_drive.py
"""

import logging
import sys
import time
from pathlib import Path

# Permitir imports relativos si se ejecuta como script suelto
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text as sa_text

from app.core.database import SessionAnexa, SessionDux
from app.services.drive_export import export_factura_safe

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def main(batch_size: int = 500, sleep_between: float = 0.2):
    session = SessionAnexa()
    try:
        rows = session.execute(sa_text("""
            SELECT id FROM facturas_proveedores
            WHERE drive_synced_at IS NULL
              AND imagen_base64 IS NOT NULL
            ORDER BY fecha_registro ASC
            LIMIT :n
        """), {"n": batch_size}).all()
        ids = [r[0] for r in rows]
    finally:
        session.close()

    total = len(ids)
    if not total:
        logger.info("No hay facturas pendientes de export a Drive.")
        return

    logger.info(f"Procesando {total} facturas pendientes...")
    ok = 0
    fail = 0
    for i, fid in enumerate(ids, 1):
        result = export_factura_safe(SessionAnexa, SessionDux, fid)
        if result:
            ok += 1
            logger.info(f"[{i}/{total}] factura {fid} OK")
        else:
            fail += 1
            logger.warning(f"[{i}/{total}] factura {fid} FAIL (ver drive_sync_error)")
        time.sleep(sleep_between)  # rate-limit defensivo

    logger.info(f"Migracion terminada. OK={ok} FAIL={fail} TOTAL={total}")


if __name__ == "__main__":
    main()
