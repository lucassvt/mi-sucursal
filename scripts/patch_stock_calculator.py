#!/usr/bin/env python3
"""Patch stock_calculator.py to use compras.* normalized tables"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('vps-5611909-x.dattaweb.com', port=5695, username='root', password='lucas171115' + chr(33) + 'Lamascotera')

sftp = ssh.open_sftp()
with sftp.open('/opt/sistema_compras/app/services/stock_calculator.py', 'r') as f:
    content = f.read().decode('utf-8')

# ============================================================
# 1. Replace _get_products_with_stock
# ============================================================
old_products_fn = '''    def _get_products_with_stock(
        self,
        excluded_deposits: List[str],
        excluded_brands: List[str],
        excluded_products: List[str] = None
    ) -> List[Dict]:
        """
        Obtiene productos con su stock actual, excluyendo fraccionados, servicios y productos específicos.

        Adaptado para servidor remoto:
        - Usa items_central en lugar de products
        - Usa depositos en lugar de deposits
        - Usa compras.stock con cod_item/id_deposito
        """

        excluded_products = excluded_products or []

        # Construir condiciones de exclusión
        deposit_condition = ""
        if excluded_deposits:
            deposits_str = ", ".join([f"'{d}'" for d in excluded_deposits])
            deposit_condition = f"AND d.deposito NOT IN ({deposits_str})"

        brand_condition = ""
        if excluded_brands:
            brands_str = ", ".join([f"'{b}'" for b in excluded_brands])
            brand_condition = f"AND p.marca_nombre NOT IN ({brands_str})"

        product_condition = ""
        if excluded_products:
            products_str = ", ".join([f"'{c}'" for c in excluded_products])
            product_condition = f"AND p.cod_item NOT IN ({products_str})"

        query = text(f"""
            SELECT
                p.cod_item as product_id,
                p.cod_item,
                p.item as producto_nombre,
                p.marca_nombre as marca,
                p.rubro_nombre as rubro,
                p.sub_rubro_nombre as subrubro,
                d.id_deposito as deposit_id,
                d.deposito as deposito_nombre,
                COALESCE(s.stock_disponible, 0) as stock_disponible,
                COALESCE(s.stock_real, 0) as stock_real,
                COALESCE(s.stock_reservado, 0) as stock_reservado
            FROM items_central p
            CROSS JOIN depositos d
            LEFT JOIN compras.stock s ON s.cod_item = p.cod_item AND s.id_deposito = d.id_deposito
            WHERE p.habilitado = 'S'
                AND p.cod_item NOT LIKE '%X%'
                AND UPPER(COALESCE(p.rubro_nombre, '')) NOT LIKE '%SERVICIO%'
                AND UPPER(COALESCE(p.sub_rubro_nombre, '')) NOT LIKE '%SERVICIO%'
                {deposit_condition}
                {brand_condition}
                {product_condition}
            ORDER BY p.cod_item, d.deposito
        """)

        result = self.db.execute(query)
        return [dict(row._mapping) for row in result]'''

new_products_fn = '''    def _get_products_with_stock(
        self,
        excluded_deposits: List[str],
        excluded_brands: List[str],
        excluded_products: List[str] = None
    ) -> List[Dict]:
        """
        Obtiene productos con su stock actual desde tablas normalizadas compras.*
        Mismo formato que servidor viejo (product_id + deposit_id internos).
        """

        excluded_products = excluded_products or []

        # Construir condiciones de exclusión
        deposit_condition = ""
        if excluded_deposits:
            deposits_str = ", ".join([f"'{d}'" for d in excluded_deposits])
            deposit_condition = f"AND d.nombre NOT IN ({deposits_str})"

        brand_condition = ""
        if excluded_brands:
            brands_str = ", ".join([f"'{b}'" for b in excluded_brands])
            brand_condition = f"AND p.marca_nombre NOT IN ({brands_str})"

        product_condition = ""
        if excluded_products:
            products_str = ", ".join([f"'{c}'" for c in excluded_products])
            product_condition = f"AND p.cod_item NOT IN ({products_str})"

        query = text(f"""
            SELECT
                p.id as product_id,
                p.cod_item,
                p.nombre as producto_nombre,
                p.marca_nombre as marca,
                p.rubro_nombre as rubro,
                p.sub_rubro_nombre as subrubro,
                d.id as deposit_id,
                d.nombre as deposito_nombre,
                COALESCE(s.stock_disponible, 0) as stock_disponible,
                COALESCE(s.stock_real, 0) as stock_real,
                COALESCE(s.stock_reservado, 0) as stock_reservado
            FROM compras.products p
            CROSS JOIN compras.deposits d
            LEFT JOIN compras.stock_normalized s ON s.product_id = p.id AND s.deposit_id = d.id
            WHERE d.activo = true
                AND p.cod_item NOT LIKE '%X%'
                AND UPPER(COALESCE(p.rubro_nombre, '')) NOT LIKE '%SERVICIO%'
                AND UPPER(COALESCE(p.sub_rubro_nombre, '')) NOT LIKE '%SERVICIO%'
                {deposit_condition}
                {brand_condition}
                {product_condition}
            ORDER BY p.cod_item, d.nombre
        """)

        result = self.db.execute(query)
        return [dict(row._mapping) for row in result]'''

content = content.replace(old_products_fn, new_products_fn)

# ============================================================
# 2. Replace _get_sales_history
# ============================================================
old_sales_fn = '''    def _get_sales_history(self) -> Dict[Tuple[str, int], pd.DataFrame]:
        """
        Obtiene el historial de ventas agrupado por producto-depósito.

        Adaptado para servidor remoto:
        - Usa sales_records de public con producto_codigo y sucursal_id
        - Las claves son (cod_item, id_deposito) en lugar de (product_id, deposit_id)
        """

        query = text("""
            SELECT
                sr.producto_codigo as product_id,
                sr.sucursal_id as deposit_id,
                sr.fecha,
                sr.cantidad,
                sr.importe_con_iva as monto
            FROM sales_records sr
            WHERE sr.fecha >= CURRENT_DATE - INTERVAL '365 days'
              AND sr.producto_codigo IS NOT NULL
            ORDER BY sr.producto_codigo, sr.sucursal_id, sr.fecha
        """)'''

new_sales_fn = '''    def _get_sales_history(self) -> Dict[Tuple[str, int], pd.DataFrame]:
        """
        Obtiene el historial de ventas agrupado por producto-depósito.
        Lee de compras.sales_history_norm con IDs internos normalizados.
        """

        query = text("""
            SELECT
                sh.product_id,
                sh.deposit_id,
                sh.fecha,
                sh.cantidad,
                sh.monto
            FROM compras.sales_history_norm sh
            WHERE sh.fecha >= CURRENT_DATE - INTERVAL '365 days'
            ORDER BY sh.product_id, sh.deposit_id, sh.fecha
        """)'''

content = content.replace(old_sales_fn, new_sales_fn)

with sftp.open('/opt/sistema_compras/app/services/stock_calculator.py', 'w') as f:
    f.write(content)
sftp.close()

print("stock_calculator.py actualizado")

# Restart service
stdin, stdout, stderr = ssh.exec_command('systemctl restart compras.service')
stderr.read()
print("Servicio reiniciado")

ssh.close()
