"""
Script para importar recordatorios de veterinaria al sistema de recontactos.
Agrega registros con tipo_servicio='veterinaria' y subtipo_servicio correspondiente.
"""
import csv
import sys
import os
from datetime import datetime

import psycopg2

# Conexión BD mi_sucursal
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "mi_sucursal",
    "user": "dux_user",
    "password": "M1Sucurs4l2025!"
}

# Mapeo de nombres de sucursal en CSV a sucursal_id en el sistema
SUCURSAL_MAP = {
    "central": 7,         # ALEM
    "laprida y cordoba": 16,  # LAPRIDA
    "barrio norte": 16,   # LAPRIDA
    "yerba buena": 26,    # YERBA BUENA
    "barrio sur": 14,     # CONGRESO
}

def parse_date(date_str):
    if not date_str or not date_str.strip():
        return None
    try:
        return datetime.strptime(date_str.strip(), "%d/%m/%Y").date()
    except:
        return None

def parse_int(val):
    if not val or not val.strip():
        return None
    try:
        return int(val.strip())
    except:
        return None

def import_csv(filepath, conn):
    """Importa un CSV de veterinaria"""
    imported = 0
    skipped = 0
    errors = []

    with open(filepath, 'r', encoding='utf-8-sig') as f:
        content = f.read()

    lines = content.strip().split('\n')
    cur = conn.cursor()

    current_subtipo = None
    header_seen = False

    for line_num, line in enumerate(lines, 1):
        line = line.strip()
        if not line or line.startswith('Recordatorios') or line.startswith('Generado'):
            continue

        # Detect section headers
        if 'VACUNACIÓN' in line or 'VACUNACION' in line:
            current_subtipo = 'vacuna'
            header_seen = False
            continue
        elif 'DESPARASITACIÓN' in line or 'DESPARASITACION' in line:
            current_subtipo = 'desparasitacion'
            header_seen = False
            continue

        # Skip column headers
        if line.startswith('Sucursal;Nombre'):
            header_seen = True
            continue

        # Skip empty separator lines
        parts = line.split(';')
        if all(not p.strip() for p in parts):
            continue

        if not header_seen or not current_subtipo:
            continue

        # Parse data row
        if len(parts) < 8:
            continue

        sucursal_name = parts[0].strip().lower()
        cliente_nombre = parts[1].strip()
        telefono = parts[2].strip()
        mascota = parts[3].strip()
        tipo_recordatorio = parts[4].strip()
        servicio = parts[5].strip()
        fecha_servicio = parse_date(parts[6].strip()) if len(parts) > 6 else None
        dias = parse_int(parts[7].strip()) if len(parts) > 7 else None
        observaciones = parts[8].strip() if len(parts) > 8 else None

        sucursal_id = SUCURSAL_MAP.get(sucursal_name)
        if not sucursal_id:
            errors.append(f"Línea {line_num}: Sucursal no mapeada: '{sucursal_name}'")
            continue

        if not cliente_nombre:
            continue

        # Check if already exists (same client + mascota + sucursal + tipo_servicio)
        cur.execute("""
            SELECT id FROM clientes_recontacto
            WHERE sucursal_id = %s
              AND cliente_nombre = %s
              AND mascota = %s
              AND tipo_servicio = 'veterinaria'
              AND subtipo_servicio = %s
        """, (sucursal_id, cliente_nombre, mascota, current_subtipo))

        if cur.fetchone():
            skipped += 1
            continue

        cur.execute("""
            INSERT INTO clientes_recontacto (
                sucursal_id, cliente_nombre, cliente_telefono, mascota,
                marca_habitual, ultimo_producto, ultima_compra, dias_sin_comprar,
                tipo_servicio, subtipo_servicio, estado, importado, mes_importacion,
                created_at
            ) VALUES (
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                'veterinaria', %s, 'pendiente', true, %s,
                NOW()
            )
        """, (
            sucursal_id, cliente_nombre, telefono or None, mascota or None,
            tipo_recordatorio, servicio,
            fecha_servicio, dias,
            current_subtipo, datetime.now().strftime('%Y-%m'),
        ))
        imported += 1

    conn.commit()
    cur.close()
    return imported, skipped, errors


def main():
    csv_files = [
        r"G:\Mi unidad\IA\gestion de clientes\central 03-2026\Servicios\Veterinaria\recordatorios_Central.csv",
        r"G:\Mi unidad\IA\gestion de clientes\central 03-2026\Servicios\Veterinaria\recordatorios_Laprida_y_Cordoba.csv",
        r"G:\Mi unidad\IA\gestion de clientes\central 03-2026\Servicios\Veterinaria\recordatorios_Yerba_Buena.csv",
        r"G:\Mi unidad\IA\gestion de clientes\central 03-2026\Servicios\Veterinaria\recordatorios_Barrio_Norte.csv",
        r"G:\Mi unidad\IA\gestion de clientes\central 03-2026\Servicios\Veterinaria\recordatorios_Barrio_Sur.csv",
    ]

    print("=== Importación de Recordatorios Veterinaria ===\n")

    # First, add columns if they don't exist
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    cur.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_name='clientes_recontacto' AND column_name='tipo_servicio') THEN
                ALTER TABLE clientes_recontacto ADD COLUMN tipo_servicio VARCHAR(30) DEFAULT 'general';
                CREATE INDEX idx_recontacto_tipo_servicio ON clientes_recontacto(tipo_servicio);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_name='clientes_recontacto' AND column_name='subtipo_servicio') THEN
                ALTER TABLE clientes_recontacto ADD COLUMN subtipo_servicio VARCHAR(50);
            END IF;
        END $$;
    """)
    conn.commit()
    cur.close()

    total_imported = 0
    total_skipped = 0
    all_errors = []

    for filepath in csv_files:
        filename = os.path.basename(filepath)
        print(f"Procesando: {filename}")

        if not os.path.exists(filepath):
            print(f"  ERROR: Archivo no encontrado: {filepath}")
            continue

        imported, skipped, errors = import_csv(filepath, conn)
        total_imported += imported
        total_skipped += skipped
        all_errors.extend(errors)

        print(f"  Importados: {imported}, Duplicados: {skipped}, Errores: {len(errors)}")
        for err in errors:
            print(f"    {err}")

    conn.close()

    print(f"\n=== RESUMEN ===")
    print(f"Total importados: {total_imported}")
    print(f"Total duplicados: {total_skipped}")
    print(f"Total errores: {len(all_errors)}")


if __name__ == "__main__":
    main()
