#!/usr/bin/env python3
"""
Crear tablas normalizadas en schema compras (igual que servidor viejo)
y ejecutar sync inicial desde dux_integrada.
"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('vps-5611909-x.dattaweb.com', port=5695, username='root', password='lucas171115' + chr(33) + 'Lamascotera')

sftp = ssh.open_sftp()

# ============================================================
# PASO 1: SQL para crear tablas
# ============================================================
create_sql = """
-- Tabla deposits (mapeo depositos DUX -> IDs internos)
CREATE TABLE IF NOT EXISTS compras.deposits (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR NOT NULL,
    dux_id INTEGER,
    es_central BOOLEAN DEFAULT false,
    participa_redistribucion BOOLEAN DEFAULT true,
    provincia VARCHAR,
    m2 NUMERIC,
    frecuencia_reposicion_dias INTEGER DEFAULT 7,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_compras_deposits_nombre ON compras.deposits(nombre);
CREATE INDEX IF NOT EXISTS ix_compras_deposits_dux_id ON compras.deposits(dux_id);

-- Tabla products (catalogo normalizado)
CREATE TABLE IF NOT EXISTS compras.products (
    id SERIAL PRIMARY KEY,
    cod_item VARCHAR NOT NULL,
    nombre VARCHAR NOT NULL,
    unidad_medida VARCHAR,
    rubro_id INTEGER,
    rubro_nombre VARCHAR,
    sub_rubro_id INTEGER,
    sub_rubro_nombre VARCHAR,
    marca_codigo VARCHAR,
    marca_nombre VARCHAR,
    proveedor_id INTEGER,
    proveedor_nombre VARCHAR,
    costo NUMERIC,
    porc_iva NUMERIC,
    is_fraccionado BOOLEAN DEFAULT false,
    es_por_encargo BOOLEAN DEFAULT false,
    tipo_producto VARCHAR,
    rotacion_categoria VARCHAR,
    lead_time_proveedor_dias INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ,
    package_size INTEGER DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_compras_products_cod_item ON compras.products(cod_item);
CREATE INDEX IF NOT EXISTS ix_compras_products_marca ON compras.products(marca_nombre);
CREATE INDEX IF NOT EXISTS ix_compras_products_rubro ON compras.products(rubro_nombre);

-- Tabla stock normalizada (product_id + deposit_id)
CREATE TABLE IF NOT EXISTS compras.stock_normalized (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    deposit_id INTEGER NOT NULL,
    stock_real NUMERIC DEFAULT 0,
    stock_reservado NUMERIC DEFAULT 0,
    stock_disponible NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_compras_stock_norm_prod_dep ON compras.stock_normalized(product_id, deposit_id);
CREATE INDEX IF NOT EXISTS ix_compras_stock_norm_deposit ON compras.stock_normalized(deposit_id);
CREATE INDEX IF NOT EXISTS ix_compras_stock_norm_product ON compras.stock_normalized(product_id);

-- Tabla sales_history (ventas normalizadas)
CREATE TABLE IF NOT EXISTS compras.sales_history_norm (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    deposit_id INTEGER NOT NULL,
    fecha TIMESTAMP NOT NULL,
    cantidad NUMERIC NOT NULL,
    monto NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_compras_sales_norm_prod_dep ON compras.sales_history_norm(product_id, deposit_id);
CREATE INDEX IF NOT EXISTS ix_compras_sales_norm_fecha ON compras.sales_history_norm(fecha);
CREATE INDEX IF NOT EXISTS ix_compras_sales_norm_prod_fecha ON compras.sales_history_norm(product_id, fecha);

-- Tabla sync_log
CREATE TABLE IF NOT EXISTS compras.sync_log (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR DEFAULT 'local_sync',
    fecha_sincronizacion TIMESTAMP DEFAULT now(),
    productos_sincronizados INTEGER DEFAULT 0,
    stock_sincronizados INTEGER DEFAULT 0,
    ventas_sincronizadas INTEGER DEFAULT 0,
    origen VARCHAR,
    estado VARCHAR DEFAULT 'ok'
);

-- Permisos
GRANT ALL ON ALL TABLES IN SCHEMA compras TO dux_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA compras TO dux_user;
"""

with sftp.open('/tmp/create_compras_tables.sql', 'w') as f:
    f.write(create_sql)

print("Creando tablas...")
stdin, stdout, stderr = ssh.exec_command("PGPASSWORD='DuxMascotera2026!' psql -U dux_user -d dux_integrada -h localhost -f /tmp/create_compras_tables.sql")
out = stdout.read().decode()
err = stderr.read().decode()
print(out)
if 'ERROR' in err:
    print("ERRORS:", err)

# ============================================================
# PASO 2: Script de sync local
# ============================================================
sync_script = r'''#!/usr/bin/env python3
"""
Sync local: dux_integrada (public.*) -> dux_integrada (compras.*)
Normaliza datos de items_central, stock y sales_records
en el mismo formato que usa el servidor viejo.
"""
import logging
from datetime import datetime
import psycopg2
from psycopg2.extras import execute_values

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/compras/sync_local.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

DB_URL = "dbname=dux_integrada user=dux_user password=DuxMascotera2026! host=localhost"

# Mapeo depositos: nombre DUX -> (id_interno, dux_id, es_central, provincia)
DEPOSIT_MAP = {
    "DEPOSITO RUTA 9":                      (16, 18670, True,  "Mendoza"),
    "DEPOSITO ALEM":                        (17, 18486, False, "Salta"),
    "DEPOSITO BELGRANO":                    (18, 18488, False, "Salta"),
    "DEPOSITO CONGRESO":                    (19, 18490, False, "Salta"),
    "DEPOSITO MUÑECAS":                     (20, 18491, False, "Salta"),
    "DEPOSITO PERON":                       (21, 18492, False, "Salta"),
    "DEPOSITO BELGRANO SUR":                (22, 18499, False, "Salta"),
    "DEPOSITO ARENALES":                    (23, 18497, False, "Salta"),
    "DEPOSITO CATAMARCA":                   (24, 18495, False, "Catamarca"),
    "DEPOSITO CONCEPCION":                  (25, 18494, False, "Tucuman"),
    "DEPOSITO BANDA":                       (26, 18493, False, "Santiago del Estero"),
    "DEPOSITO LAPRIDA":                     (27, 18487, False, "Salta"),
    "DEPOSITO PARQUE":                      (28, 18489, False, "Salta"),
    "DEPOSITO REYES CATOLICOS":             (29, 18496, False, "Salta"),
    "DEPOSITO PETS PLUS MIGUEL LILLO":      (30, 18799, False, "Tucuman"),
    "DEPOSITO PINAR I":                     (31, 21184, False, "Salta"),
    "DEPOSITO LEGUIZAMON":                  (32, 18498, False, "Salta"),
    "DEPOSITO ADMINISTRACION / MARKETING":  (33, 20720, False, "Salta"),
    "DEPOSITO OLASCOAGA":                   (34, 18501, False, "Neuquen"),
}

# Mapeo inverso: dux_id -> deposit_id interno
DUX_TO_DEPOSIT = {v[1]: v[0] for v in DEPOSIT_MAP.values()}

# Mapeo sucursal_id (punto de venta) -> deposit_id (para ventas)
SUCURSAL_TO_DEPOSIT = {
    1: 17,   # ALEM
    2: 27,   # LAPRIDA
    3: 18,   # BELGRANO
    4: 28,   # PARQUE
    5: 19,   # CONGRESO
    6: 20,   # MUÑECAS
    8: 23,   # ARENALES
    9: 26,   # BANDA
    10: 22,  # BELGRANO SUR
    11: 24,  # CATAMARCA
    12: 25,  # CONCEPCION
    14: 21,  # PERON
    15: 32,  # LEGUIZAMON
    17: 16,  # RUTA 9
    18: 31,  # PINAR
    25: 29,  # REYES CATOLICOS
    32: 31,  # PINAR I
}


def sync():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    start = datetime.now()
    logger.info("Iniciando sync local...")

    # ---- 1. DEPOSITS ----
    logger.info("Sincronizando deposits...")
    for nombre, (dep_id, dux_id, es_central, provincia) in DEPOSIT_MAP.items():
        cur.execute("""
            INSERT INTO compras.deposits (id, nombre, dux_id, es_central, provincia, activo, created_at)
            VALUES (%s, %s, %s, %s, %s, true, now())
            ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre, dux_id=EXCLUDED.dux_id
        """, (dep_id, nombre, dux_id, es_central, provincia))
    # Reset sequence
    cur.execute("SELECT setval('compras.deposits_id_seq', (SELECT MAX(id) FROM compras.deposits))")
    conn.commit()
    logger.info(f"  {len(DEPOSIT_MAP)} deposits sincronizados")

    # ---- 2. PRODUCTS ----
    logger.info("Sincronizando products desde items_central...")
    cur.execute("""
        SELECT cod_item, item, unidad_medida, rubro_id, rubro_nombre,
               sub_rubro_id, sub_rubro_nombre, marca_codigo, marca_nombre,
               proveedor_id, proveedor_nombre, costo, porc_iva
        FROM items_central
        WHERE habilitado = 'S'
    """)
    items = cur.fetchall()

    # Clear and re-insert
    cur.execute("TRUNCATE compras.products RESTART IDENTITY CASCADE")

    product_map = {}  # cod_item -> product_id
    for i, row in enumerate(items, 1):
        cod_item = row[0]
        costo = None
        try:
            costo = float(row[11]) if row[11] else None
        except (ValueError, TypeError):
            pass
        porc_iva = None
        try:
            porc_iva = float(row[12]) if row[12] else None
        except (ValueError, TypeError):
            pass

        cur.execute("""
            INSERT INTO compras.products (id, cod_item, nombre, unidad_medida, rubro_id, rubro_nombre,
                sub_rubro_id, sub_rubro_nombre, marca_codigo, marca_nombre,
                proveedor_id, proveedor_nombre, costo, porc_iva, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now())
        """, (i, cod_item, row[1], row[2], row[3], row[4], row[5], row[6],
              row[7], row[8], row[9], row[10], costo, porc_iva))
        product_map[cod_item] = i

    cur.execute("SELECT setval('compras.products_id_seq', (SELECT MAX(id) FROM compras.products))")
    conn.commit()
    products_count = len(product_map)
    logger.info(f"  {products_count} products sincronizados")

    # ---- 3. STOCK ----
    logger.info("Sincronizando stock...")
    cur.execute("""
        SELECT s.cod_item, s.id_deposito, s.stock_real, s.stock_reservado, s.stock_disponible
        FROM compras.stock s
    """)
    stock_rows = cur.fetchall()

    cur.execute("TRUNCATE compras.stock_normalized RESTART IDENTITY")

    stock_data = []
    for row in stock_rows:
        cod_item, dux_dep_id, stock_real, stock_reservado, stock_disponible = row
        product_id = product_map.get(cod_item)
        deposit_id = DUX_TO_DEPOSIT.get(dux_dep_id)
        if product_id and deposit_id:
            stock_data.append((product_id, deposit_id,
                             float(stock_real or 0), float(stock_reservado or 0), float(stock_disponible or 0)))

    if stock_data:
        execute_values(cur, """
            INSERT INTO compras.stock_normalized (product_id, deposit_id, stock_real, stock_reservado, stock_disponible, updated_at)
            VALUES %s
        """, stock_data, template="(%s, %s, %s, %s, %s, now())")

    conn.commit()
    stock_count = len(stock_data)
    logger.info(f"  {stock_count} stock rows sincronizados")

    # ---- 4. SALES HISTORY ----
    logger.info("Sincronizando sales_history desde sales_records...")
    cur.execute("""
        SELECT producto_codigo, sucursal_id, fecha, cantidad, importe_con_iva
        FROM sales_records
        WHERE cantidad > 0
    """)
    sales = cur.fetchall()

    cur.execute("TRUNCATE compras.sales_history_norm RESTART IDENTITY")

    sales_data = []
    for row in sales:
        cod_item, suc_id, fecha, cantidad, monto = row
        product_id = product_map.get(cod_item)
        deposit_id = SUCURSAL_TO_DEPOSIT.get(suc_id)
        if product_id and deposit_id:
            sales_data.append((product_id, deposit_id, fecha, float(cantidad), float(monto or 0)))

    # Insert in batches
    batch_size = 10000
    for i in range(0, len(sales_data), batch_size):
        batch = sales_data[i:i+batch_size]
        execute_values(cur, """
            INSERT INTO compras.sales_history_norm (product_id, deposit_id, fecha, cantidad, monto)
            VALUES %s
        """, batch, template="(%s, %s, %s, %s, %s)")
        conn.commit()

    sales_count = len(sales_data)
    logger.info(f"  {sales_count} sales rows sincronizados")

    # ---- 5. LOG ----
    cur.execute("""
        INSERT INTO compras.sync_log (tipo, productos_sincronizados, stock_sincronizados, ventas_sincronizadas, origen, estado)
        VALUES ('local_sync', %s, %s, %s, 'Sync local dux_integrada -> compras.*', 'ok')
    """, (products_count, stock_count, sales_count))
    conn.commit()

    elapsed = (datetime.now() - start).total_seconds()
    logger.info(f"Sync completado en {elapsed:.1f}s - Products: {products_count}, Stock: {stock_count}, Sales: {sales_count}")

    cur.close()
    conn.close()


if __name__ == '__main__':
    sync()
'''

with sftp.open('/opt/sistema_compras/sync_local.py', 'w') as f:
    f.write(sync_script)

sftp.close()

# Make executable
stdin, stdout, stderr = ssh.exec_command('chmod +x /opt/sistema_compras/sync_local.py')
stderr.read()

print("\nTablas creadas y script de sync subido.")
ssh.close()
