"""
Cron nocturno: reintenta export a Drive de facturas donde drive_synced_at IS NULL
(incluye las que fallaron el hook on-write por red, Drive caido, etc).
Limita a ultimos 30 dias para evitar loops infinitos con facturas imposibles.

Uso (crontab):
  0 3 * * * docker exec mi-sucursal-backend python /app/app/cron/retry_drive_export.py \\
    >> /var/log/mi-sucursal-drive-retry.log 2>&1
"""

import logging
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from sqlalchemy import text as sa_text

from app.core.database import SessionAnexa, SessionDux
from app.services.drive_export import export_factura_safe

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

MAX_POR_CORRIDA = 100
SLEEP = 0.3  # seg entre facturas


def main():
    session = SessionAnexa()
    try:
        rows = session.execute(sa_text("""
            SELECT id FROM facturas_proveedores
            WHERE drive_synced_at IS NULL
              AND imagen_base64 IS NOT NULL
              AND fecha_registro > NOW() - INTERVAL '30 days'
            ORDER BY fecha_registro ASC
            LIMIT :n
        """), {"n": MAX_POR_CORRIDA}).all()
        ids = [r[0] for r in rows]
    finally:
        session.close()

    if not ids:
        logger.info("Retry: sin pendientes")
        return

    logger.info(f"Retry: {len(ids)} pendientes")
    ok = 0
    for fid in ids:
        if export_factura_safe(SessionAnexa, SessionDux, fid):
            ok += 1
        time.sleep(SLEEP)
    logger.info(f"Retry terminado. OK={ok}/{len(ids)}")


if __name__ == "__main__":
    main()
