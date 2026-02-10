#!/usr/bin/env python3
"""
Limpieza semanal de tareas + archivo de resumen para auditoria.
Corre los lunes a las 3:15 AM.

1. Clasifica tareas por sucursal y categoria
2. Marca in-progress vencidas como vencidas
3. Archiva resumen por (sucursal, categoria) a tareas_resumen_semanal
4. Elimina fotos asociadas de tareas_fotos
5. Elimina tareas archivadas de tareas_sucursal
"""
import psycopg2
from datetime import datetime, date, timedelta

DB_DUX = "postgresql://dux_user:DuxMascotera2026!@localhost:5432/dux_integrada"
DB_ANEXA = "postgresql://dux_user:DuxMascotera2026!@localhost:5432/mi_sucursal"

SUCURSALES_ACTIVAS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,25,26,28,31,32]
CATEGORIAS = [
    "ORDEN Y LIMPIEZA",
    "MANTENIMIENTO SUCURSAL",
    "CONTROL Y GESTION DE STOCK",
    "GESTION ADMINISTRATIVA EN SISTEMA",
]


def main():
    hoy = date.today()
    # Semana anterior: lunes pasado a domingo pasado
    lunes_actual = hoy - timedelta(days=hoy.weekday())
    semana_inicio = lunes_actual - timedelta(days=7)
    semana_fin = lunes_actual - timedelta(days=1)
    periodo = semana_inicio.strftime("%Y-%m")

    print("=" * 60)
    print(f"LIMPIEZA SEMANAL DE TAREAS")
    print(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Semana archivada: {semana_inicio} a {semana_fin}")
    print(f"Periodo: {periodo}")
    print(f"Sucursales: {len(SUCURSALES_ACTIVAS)}")
    print("=" * 60)

    conn_dux = psycopg2.connect(DB_DUX)
    conn_anexa = psycopg2.connect(DB_ANEXA)

    try:
        cur_dux = conn_dux.cursor()
        cur_anexa = conn_anexa.cursor()

        # Asegurar que la tabla existe en anexa
        cur_anexa.execute("""
            CREATE TABLE IF NOT EXISTS tareas_resumen_semanal (
                id SERIAL PRIMARY KEY,
                sucursal_id INTEGER NOT NULL,
                categoria VARCHAR(50) NOT NULL,
                semana_inicio DATE NOT NULL,
                semana_fin DATE NOT NULL,
                periodo VARCHAR(7) NOT NULL,
                completadas INTEGER NOT NULL DEFAULT 0,
                vencidas INTEGER NOT NULL DEFAULT 0,
                pendientes_archivadas INTEGER NOT NULL DEFAULT 0,
                total INTEGER NOT NULL DEFAULT 0,
                puntaje INTEGER NOT NULL DEFAULT 0,
                enviado_api BOOLEAN DEFAULT FALSE,
                fecha_envio_api TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(sucursal_id, categoria, semana_inicio)
            )
        """)
        conn_anexa.commit()

        total_archivadas = 0
        total_fotos_eliminadas = 0
        total_resumenes = 0

        for suc_id in SUCURSALES_ACTIVAS:
            suc_archivadas = 0

            for cat in CATEGORIAS:
                # Contar completadas
                cur_dux.execute("""
                    SELECT COUNT(*) FROM tareas_sucursal
                    WHERE sucursal_id = %s AND categoria = %s
                      AND estado = 'completada'
                """, (suc_id, cat))
                completadas = cur_dux.fetchone()[0]

                # Contar en_progreso vencidas (pasaron fecha_vencimiento)
                cur_dux.execute("""
                    SELECT COUNT(*) FROM tareas_sucursal
                    WHERE sucursal_id = %s AND categoria = %s
                      AND estado = 'en_progreso'
                      AND fecha_vencimiento < CURRENT_DATE
                """, (suc_id, cat))
                vencidas_progreso = cur_dux.fetchone()[0]

                # Contar pendientes >7 dias (desde fecha_asignacion)
                cur_dux.execute("""
                    SELECT COUNT(*) FROM tareas_sucursal
                    WHERE sucursal_id = %s AND categoria = %s
                      AND estado = 'pendiente'
                      AND fecha_asignacion < CURRENT_DATE - INTERVAL '7 days'
                """, (suc_id, cat))
                vencidas_pendientes = cur_dux.fetchone()[0]

                vencidas = vencidas_progreso + vencidas_pendientes
                total = completadas + vencidas

                if total == 0:
                    continue

                puntaje = round(completadas / total * 100)

                # Insertar resumen (ON CONFLICT = idempotente si se re-ejecuta)
                cur_anexa.execute("""
                    INSERT INTO tareas_resumen_semanal
                    (sucursal_id, categoria, semana_inicio, semana_fin, periodo,
                     completadas, vencidas, pendientes_archivadas, total, puntaje)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (sucursal_id, categoria, semana_inicio) DO NOTHING
                """, (suc_id, cat, semana_inicio, semana_fin, periodo,
                      completadas, vencidas, 0, total, puntaje))
                total_resumenes += 1

                # Obtener IDs de tareas a eliminar
                cur_dux.execute("""
                    SELECT id FROM tareas_sucursal
                    WHERE sucursal_id = %s AND categoria = %s
                      AND (
                        estado = 'completada'
                        OR (estado = 'en_progreso' AND fecha_vencimiento < CURRENT_DATE)
                        OR (estado = 'pendiente' AND fecha_asignacion < CURRENT_DATE - INTERVAL '7 days')
                      )
                """, (suc_id, cat))
                tarea_ids = [r[0] for r in cur_dux.fetchall()]

                if tarea_ids:
                    # Eliminar fotos asociadas (BD anexa)
                    cur_anexa.execute("""
                        DELETE FROM tareas_fotos
                        WHERE tarea_id = ANY(%s)
                    """, (tarea_ids,))
                    fotos_deleted = cur_anexa.rowcount
                    total_fotos_eliminadas += fotos_deleted

                    # Eliminar tareas (BD DUX)
                    cur_dux.execute("""
                        DELETE FROM tareas_sucursal
                        WHERE id = ANY(%s)
                    """, (tarea_ids,))
                    suc_archivadas += len(tarea_ids)

            total_archivadas += suc_archivadas
            if suc_archivadas > 0:
                print(f"  Suc {suc_id}: {suc_archivadas} tareas archivadas")

        # Commit anexa primero (archivos), luego DUX (eliminaciones)
        conn_anexa.commit()
        conn_dux.commit()

        print()
        print(f"COMPLETADO")
        print(f"  Resumenes creados: {total_resumenes}")
        print(f"  Tareas archivadas/eliminadas: {total_archivadas}")
        print(f"  Fotos eliminadas: {total_fotos_eliminadas}")

    except Exception as e:
        conn_dux.rollback()
        conn_anexa.rollback()
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        conn_dux.close()
        conn_anexa.close()


if __name__ == "__main__":
    main()
