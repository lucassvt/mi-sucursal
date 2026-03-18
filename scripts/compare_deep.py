#!/usr/bin/env python3
"""Deep comparison between old and new server data"""
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

EXCLUDED_BRANDS = "('7 VIDAS','ALTA GAMA','BALANCED','BELCAN','BELCAT','BONELLO','BONE XPRESS','CANON FRANQUICIA','CAT CHOW','CAUDILLO','CIRUGIA AL 50%','COMPLETE','COSMETICA ANIMAL','DAPPER DOG','DOG CHOW','DOGUI','ENVIOS Y OTROS SERVICIOS','FATRO VON FRANKEN','GATI','GOOSTER','HUDI','LOGAN','MAXXIUM','ORIGEN','PUFI & CO','QUINTA PATA','SABROSITOS','STUDIO KAI','SUELTOS','VITAL FUN','VONNE')"

EXCLUDED_DEPOSITS = "('DEPOSITO ADMINISTRACION / MARKETING','DEPOSITO OLASCOAGA','DEPOSITO PETS PLUS MIGUEL LILLO','DEPOSITO REYES CATOLICOS','DEPOSITO PERON')"

BASE_FILTER = f"""
    p.cod_item NOT LIKE '%%X%%'
    AND UPPER(COALESCE(p.rubro_nombre, '')) NOT LIKE '%%SERVICIO%%'
    AND UPPER(COALESCE(p.sub_rubro_nombre, '')) NOT LIKE '%%SERVICIO%%'
    AND COALESCE(p.marca_nombre,'') NOT IN {EXCLUDED_BRANDS}
    AND p.cod_item NOT IN ('1845')
"""

ssh_old = paramiko.SSHClient()
ssh_old.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh_old.connect('vps-5548201-x.dattaweb.com', port=5641, username='root', password='lucas171115' + chr(33) + 'Lamascotera')

ssh_new = paramiko.SSHClient()
ssh_new.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh_new.connect('vps-5611909-x.dattaweb.com', port=5695, username='root', password='lucas171115' + chr(33) + 'Lamascotera')

def q_old(sql):
    stdin, stdout, stderr = ssh_old.exec_command(f'sudo -u postgres psql -d mascotera_compras -t -A -c "{sql}"')
    return stdout.read().decode().strip()

def q_new(sql):
    stdin, stdout, stderr = ssh_new.exec_command(f"PGPASSWORD='DuxMascotera2026!' psql -U dux_user -d dux_integrada -h localhost -t -A -c \"{sql}\"")
    return stdout.read().decode().strip()

# 1. Products que pasan filtros
old_count = q_old(f"SELECT count(*) FROM products p WHERE {BASE_FILTER}")
new_count = q_new(f"SELECT count(*) FROM compras.products p WHERE {BASE_FILTER}")
print(f"=== PRODUCTOS QUE PASAN FILTROS ===")
print(f"  Viejo: {old_count} (× 14 deps = {int(old_count)*14})")
print(f"  Nuevo: {new_count} (× 14 deps = {int(new_count)*14})")
print(f"  Diff: {int(new_count)-int(old_count)} productos")

# 2. Check excluded_categories rubros
print(f"\n=== RUBROS DE EXCLUDED_CATEGORIES EN NUEVO (no filtrados por SQL) ===")
cats = q_new(f"""SELECT p.rubro_nombre, count(*) FROM compras.products p WHERE {BASE_FILTER} AND p.rubro_nombre IN ('ARTICULOS NO CATALOGADOS Y OTROS INGRESOS','INSUMOS PELUQUERIA','ACCESORIOS PELUQUERIA CANINA') GROUP BY p.rubro_nombre""")
print(f"  {cats}")
cats_old = q_old(f"""SELECT p.rubro_nombre, count(*) FROM products p WHERE {BASE_FILTER} AND p.rubro_nombre IN ('ARTICULOS NO CATALOGADOS Y OTROS INGRESOS','INSUMOS PELUQUERIA','ACCESORIOS PELUQUERIA CANINA') GROUP BY p.rubro_nombre""")
print(f"  Viejo: {cats_old}")

# 3. Valor stock comparison
print(f"\n=== VALOR DE STOCK ===")
old_val = q_old("SELECT round(sum(s.stock_disponible * p.costo), 2) FROM stock s JOIN products p ON p.id = s.product_id WHERE s.stock_disponible > 0")
print(f"  Viejo: ${float(old_val):,.0f}")

new_val = q_new("SELECT round(sum(s.stock_disponible * p.costo), 2) FROM compras.stock_normalized s JOIN compras.products p ON p.id = s.product_id WHERE s.stock_disponible > 0")
print(f"  Nuevo: ${float(new_val):,.0f}")

# 4. Costos difference - sample top products
print(f"\n=== DIFERENCIAS DE COSTO (top 10 por impacto) ===")
# Get common products with different costs
old_costs = q_old("SELECT cod_item, nombre, costo FROM products WHERE costo > 0 ORDER BY cod_item")
new_costs = q_new("SELECT cod_item, nombre, costo FROM compras.products WHERE costo > 0 ORDER BY cod_item")

old_map = {}
for line in old_costs.split('\n'):
    parts = line.split('|')
    if len(parts) == 3:
        old_map[parts[0]] = (parts[1], float(parts[2]) if parts[2] else 0)

new_map = {}
for line in new_costs.split('\n'):
    parts = line.split('|')
    if len(parts) == 3:
        new_map[parts[0]] = (parts[1], float(parts[2]) if parts[2] else 0)

diffs = []
for cod in old_map:
    if cod in new_map:
        old_c = old_map[cod][1]
        new_c = new_map[cod][1]
        if old_c > 0 and abs(new_c - old_c) / old_c > 0.01:
            diffs.append((cod, old_map[cod][0], old_c, new_c, new_c - old_c))

diffs.sort(key=lambda x: abs(x[4]), reverse=True)
print(f"  Total productos con costo diferente (>1%%): {len(diffs)}")
print(f"  {'Código':<10} {'Producto':<40} {'Viejo':>10} {'Nuevo':>10} {'Diff':>10}")
for cod, nombre, old_c, new_c, diff in diffs[:10]:
    print(f"  {cod:<10} {nombre[:40]:<40} {old_c:>10,.2f} {new_c:>10,.2f} {diff:>+10,.2f}")

# 5. Sales comparison in same period
print(f"\n=== VENTAS (últimos 180 días) ===")
old_sales = q_old("SELECT count(*), round(sum(cantidad),0), round(sum(monto),0) FROM sales_history WHERE fecha >= CURRENT_DATE - INTERVAL '180 days'")
new_sales = q_new("SELECT count(*), round(sum(cantidad),0), round(sum(monto),0) FROM compras.sales_history_norm WHERE fecha >= CURRENT_DATE - INTERVAL '180 days'")
print(f"  Viejo: {old_sales}")
print(f"  Nuevo: {new_sales}")

# 6. Sales by deposit
print(f"\n=== VENTAS POR DEPOSITO (últimos 180 días) ===")
old_dep_sales = q_old("SELECT deposit_id, count(*) FROM sales_history WHERE fecha >= CURRENT_DATE - INTERVAL '180 days' GROUP BY deposit_id ORDER BY deposit_id")
new_dep_sales = q_new("SELECT deposit_id, count(*) FROM compras.sales_history_norm WHERE fecha >= CURRENT_DATE - INTERVAL '180 days' GROUP BY deposit_id ORDER BY deposit_id")

old_dep = {}
for line in old_dep_sales.split('\n'):
    parts = line.split('|')
    if len(parts) == 2:
        old_dep[parts[0]] = parts[1]

new_dep = {}
for line in new_dep_sales.split('\n'):
    parts = line.split('|')
    if len(parts) == 2:
        new_dep[parts[0]] = parts[1]

print(f"  {'Dep':>5} {'Viejo':>10} {'Nuevo':>10} {'Diff':>10}")
for dep_id in sorted(set(list(old_dep.keys()) + list(new_dep.keys()))):
    o = old_dep.get(dep_id, '0')
    n = new_dep.get(dep_id, '0')
    diff = int(n) - int(o)
    marker = " <--" if abs(diff) > 100 else ""
    print(f"  {dep_id:>5} {o:>10} {n:>10} {diff:>+10}{marker}")

ssh_old.close()
ssh_new.close()
