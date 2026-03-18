#!/usr/bin/env python3
"""
Sincronizacion diaria incremental de PEDIDOS CENTRAL (empresa 9425)
Sincroniza el mes actual + actualiza estados del mes anterior.
"""
import time
import json
import requests
import psycopg2
from datetime import datetime, timedelta

# Configuracion
DUX_BASE_URL = "https://erp.duxsoftware.com.ar/WSERP/rest/services"
DUX_TOKEN = "iXbTBdThZvKDh9MRBfAaEqlIecUX461LBazbWRcOaL15KS1RR2I4wEGu20wkAnDy"
DUX_EMPRESA_ID = 9425
DB_URL = "postgresql://dux_user:DuxMascotera2026!@localhost:5432/dux_integrada"
RATE_LIMIT = 6
SUCURSALES_ACTIVAS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,25,26,28,31,32]


def get_db():
    return psycopg2.connect(DB_URL)


def dux_get(endpoint, params=None, retry=0):
    url = f"{DUX_BASE_URL}/{endpoint}"
    headers = {"Authorization": DUX_TOKEN}
    params = params or {}
    params["idEmpresa"] = DUX_EMPRESA_ID
    try:
        r = requests.get(url, headers=headers, params=params, timeout=60)
        if r.status_code == 429 or "limite" in r.text.lower():
            print(" [Rate limit, esperando 30s...]", flush=True)
            time.sleep(30)
            return dux_get(endpoint, params, retry + 1)
        r.raise_for_status()
        time.sleep(RATE_LIMIT)
        return r.json()
    except Exception as e:
        if retry < 3:
            print(f" [Error: {e}, reintentando...]", flush=True)
            time.sleep(10)
            return dux_get(endpoint, params, retry + 1)
        print(f" [ERROR FATAL: {e}]")
        return None


def sync_pedidos(sucursal_id, fecha_desde, fecha_hasta):
    offset = 0
    limit = 50
    total_sync = 0

    while True:
        data = dux_get("pedidos", {
            "idSucursal": sucursal_id,
            "fechaDesde": fecha_desde,
            "fechaHasta": fecha_hasta,
            "limit": limit,
            "offset": offset
        })
        if not data:
            break

        results = data.get("results", [])
        total = data.get("paging", {}).get("total", 0) or 0
        if not results:
            break

        conn = get_db()
        cur = conn.cursor()
        for p in results:
            detalles = json.dumps(p.get("detalles")) if p.get("detalles") else None
            cur.execute("""
                INSERT INTO pedidos (
                    id, id_cliente, cliente, id_personal, personal,
                    id_empresa, id_sucursal, fecha, fecha_entrega, lugar_entrega,
                    observaciones, monto_exento, monto_gravado, monto_iva,
                    monto_descuento, total, monto_percepcion_impuesto,
                    estado_facturacion, estado_remito, anulado, anulado_boolean,
                    id_moneda, moneda, cotizacion_moneda, cotizacion_dolar,
                    nro_pedido, ctd_facturada, ctd_con_remito, ctd_facturada_con_remito,
                    id_presupuesto, nro_presupuesto, id_forma_pago, forma_pago,
                    detalles, synced_at
                ) VALUES (
                    %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                    %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                    %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                    %s,%s,%s,%s, NOW()
                )
                ON CONFLICT (id) DO UPDATE SET
                    total = EXCLUDED.total,
                    estado_facturacion = EXCLUDED.estado_facturacion,
                    estado_remito = EXCLUDED.estado_remito,
                    anulado_boolean = EXCLUDED.anulado_boolean,
                    ctd_facturada = EXCLUDED.ctd_facturada,
                    ctd_con_remito = EXCLUDED.ctd_con_remito,
                    ctd_facturada_con_remito = EXCLUDED.ctd_facturada_con_remito,
                    synced_at = NOW()
            """, (
                p.get("id"), p.get("id_cliente"), p.get("cliente"),
                p.get("id_personal"), p.get("personal"),
                DUX_EMPRESA_ID, p.get("id_sucursal"), p.get("fecha"),
                p.get("fecha_entrega"), p.get("lugar_entrega"),
                p.get("observaciones"), p.get("monto_exento"), p.get("monto_gravado"),
                p.get("monto_iva"), p.get("monto_descuento"), p.get("total"),
                p.get("monto_percepcion_impuesto"), p.get("estado_facturacion"),
                p.get("estado_remito"), p.get("anulado"), p.get("anulado_boolean"),
                p.get("id_moneda"), p.get("moneda"), p.get("cotizacion_moneda"),
                p.get("cotizacion_dolar"), p.get("nro_pedido"), p.get("ctd_facturada"),
                p.get("ctd_con_remito"), p.get("ctd_facturada_con_remito"),
                p.get("id_presupuesto"), p.get("nro_presupuesto"),
                p.get("id_forma_pago"), p.get("forma_pago"), detalles
            ))
            total_sync += 1
        conn.commit()
        cur.close()
        conn.close()

        offset += limit
        if offset >= total:
            break

    return total_sync


def main():
    hoy = datetime.now()

    # Mes actual completo
    fecha_desde_actual = hoy.strftime("%Y-%m-01")
    fecha_hasta_actual = hoy.strftime("%Y-%m-%d")

    # Mes anterior completo (para actualizar estados)
    primer_dia_mes = hoy.replace(day=1)
    ultimo_dia_anterior = primer_dia_mes - timedelta(days=1)
    fecha_desde_anterior = ultimo_dia_anterior.strftime("%Y-%m-01")
    fecha_hasta_anterior = ultimo_dia_anterior.strftime("%Y-%m-%d")

    print("=" * 60)
    print("SYNC PEDIDOS DIARIO - EMPRESA 9425")
    print(f"Fecha: {hoy.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Mes anterior: {fecha_desde_anterior} a {fecha_hasta_anterior}")
    print(f"Mes actual:   {fecha_desde_actual} a {fecha_hasta_actual}")
    print(f"Sucursales: {len(SUCURSALES_ACTIVAS)}")
    print("=" * 60)

    total = 0

    print("\n--- MES ANTERIOR (actualizar estados) ---")
    for suc_id in SUCURSALES_ACTIVAS:
        print(f"  Suc {suc_id}:", end="", flush=True)
        n = sync_pedidos(suc_id, fecha_desde_anterior, fecha_hasta_anterior)
        total += n
        print(f" {n}" if n else " -", flush=True)

    print("\n--- MES ACTUAL ---")
    for suc_id in SUCURSALES_ACTIVAS:
        print(f"  Suc {suc_id}:", end="", flush=True)
        n = sync_pedidos(suc_id, fecha_desde_actual, fecha_hasta_actual)
        total += n
        print(f" {n}" if n else " -", flush=True)

    print(f"\nCOMPLETADO - Total: {total} pedidos sincronizados")


if __name__ == "__main__":
    main()
