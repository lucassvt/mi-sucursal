#!/usr/bin/env python3
"""
Cierre automático de mes de recontactos.
Se ejecuta el 1ro de cada mes via cron.
Cierra el mes anterior para TODAS las sucursales (propias + franquicias).
"""
import sys
import psycopg2
from datetime import datetime, date
from dateutil.relativedelta import relativedelta

DB_DUX = "postgresql://dux_user:Pm2480856!@localhost:5432/dux_integrada"
DB_ANEXA = "postgresql://dux_user:Pm2480856!@localhost:5432/mi_sucursal"

def main():
    # Calcular mes anterior
    hoy = date.today()
    mes_anterior = (hoy - relativedelta(months=1)).strftime('%Y-%m')

    print(f"[{datetime.now()}] Cierre automático de recontactos - Mes: {mes_anterior}")

    conn_dux = psycopg2.connect(DB_DUX)
    conn_anexa = psycopg2.connect(DB_ANEXA)
    cur_dux = conn_dux.cursor()
    cur_anexa = conn_anexa.cursor()

    # Obtener mapeo sucursales.id -> dux_id
    cur_dux.execute("SELECT id, dux_id, nombre FROM sucursales")
    sucursales = {r[0]: {"dux_id": r[1], "nombre": r[2]} for r in cur_dux.fetchall()}

    # Obtener resumen por sucursal
    cur_anexa.execute("""
        SELECT
            sucursal_id,
            COUNT(*) as total,
            SUM(CASE WHEN estado IN ('contactado', 'recuperado', 'no_interesado', 'deceso') THEN 1 ELSE 0 END) as gestionados
        FROM clientes_recontacto
        WHERE importado = true AND mes_importacion = %s
        GROUP BY sucursal_id
    """, (mes_anterior,))
    rows = cur_anexa.fetchall()

    if not rows:
        print(f"  No hay datos de recontacto para {mes_anterior}")
        cur_dux.close(); cur_anexa.close()
        conn_dux.close(); conn_anexa.close()
        return

    auditorias = 0
    for suc_id, total, gestionados in rows:
        avance = round((gestionados / total) * 100, 1) if total > 0 else 0
        suc_info = sucursales.get(suc_id, {})
        dux_id = suc_info.get("dux_id")
        nombre = suc_info.get("nombre", f"Suc {suc_id}")

        if dux_id:
            # Upsert en auditoria_mensual
            cur_anexa.execute("""
                INSERT INTO auditoria_mensual (sucursal_id, periodo, recontactos, puntaje_total)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (sucursal_id, periodo) DO UPDATE SET
                    recontactos = EXCLUDED.recontactos,
                    puntaje_total = (
                        COALESCE(auditoria_mensual.orden_limpieza, 0) +
                        COALESCE(auditoria_mensual.pedidos, 0) +
                        COALESCE(auditoria_mensual.gestion_administrativa, 0) +
                        COALESCE(auditoria_mensual.club_mascotera, 0) +
                        COALESCE(auditoria_mensual.control_stock_caja, 0) +
                        EXCLUDED.recontactos
                    ) / NULLIF(
                        (CASE WHEN auditoria_mensual.orden_limpieza IS NOT NULL THEN 1 ELSE 0 END) +
                        (CASE WHEN auditoria_mensual.pedidos IS NOT NULL THEN 1 ELSE 0 END) +
                        (CASE WHEN auditoria_mensual.gestion_administrativa IS NOT NULL THEN 1 ELSE 0 END) +
                        (CASE WHEN auditoria_mensual.club_mascotera IS NOT NULL THEN 1 ELSE 0 END) +
                        (CASE WHEN auditoria_mensual.control_stock_caja IS NOT NULL THEN 1 ELSE 0 END) +
                        1
                    , 0)
            """, (dux_id, mes_anterior, avance, avance))
            auditorias += 1

        print(f"  {nombre}: {gestionados}/{total} ({avance}%)")

    conn_anexa.commit()

    # Eliminar clientes importados del mes cerrado
    cur_anexa.execute("""
        DELETE FROM registros_contacto
        WHERE cliente_recontacto_id IN (
            SELECT id FROM clientes_recontacto
            WHERE importado = true AND mes_importacion = %s
        )
    """, (mes_anterior,))
    contactos_del = cur_anexa.rowcount

    cur_anexa.execute("""
        DELETE FROM clientes_recontacto
        WHERE importado = true AND mes_importacion = %s
    """, (mes_anterior,))
    clientes_del = cur_anexa.rowcount

    conn_anexa.commit()

    print(f"\n  Auditorias guardadas: {auditorias}")
    print(f"  Contactos eliminados: {contactos_del}")
    print(f"  Clientes eliminados: {clientes_del}")
    print(f"[{datetime.now()}] Cierre completado")

    cur_dux.close(); cur_anexa.close()
    conn_dux.close(); conn_anexa.close()


if __name__ == "__main__":
    main()
