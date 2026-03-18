#!/usr/bin/env python3
"""
Sincroniza facturas faltantes desde la API de DUX.
Recorre todas las sucursales activas para cada dia del mes y sincroniza
las facturas que faltan en la BD.
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

# Mapeo: dux_id -> nombre sucursal
SUCURSALES = {
    1: "ALEM",
    2: "LAPRIDA",
    3: "BELGRANO",
    4: "PARQUE",
    5: "CONGRESO",
    6: "MUÑECAS",
    7: "YERBA BUENA",
    8: "BANDA",
    9: "CATAMARCA",
    10: "REYES CATOLICOS",
    11: "ARENALES",
    12: "LEGUIZAMON",
    13: "SOLIS",
    14: "BELGRANO SUR",
    15: "NEUQUEN OLASCOAGA",
    16: "NEUQUEN ALCORTA",
    17: "CONCEPCION",
    18: "DEPOSITO RUTA 9",
    19: "TESORERIA CENTRAL",
    25: "MIGUEL LILLO",
    26: "PETS PLUS CONCEPCION",
    27: "PETS PLUS AGUAS BLANCAS",
    28: "NEUQUEN",
    29: "STUDIO KAI",
    31: "CONTACT CENTER",
    32: "PINAR I",
}


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
            print("  [Rate limit, esperando 30s...]", flush=True)
            time.sleep(30)
            return dux_get(endpoint, params, retry + 1)
        r.raise_for_status()
        time.sleep(RATE_LIMIT)
        return r.json()
    except Exception as e:
        if retry < 3:
            print(f"  [Error: {e}, reintentando...]", flush=True)
            time.sleep(10)
            return dux_get(endpoint, params, retry + 1)
        print(f"  [ERROR FATAL: {e}]")
        return None


def sync_facturas_dia(dux_sucursal_id, fecha):
    """Sincroniza todas las facturas de una sucursal para un dia."""
    offset = 0
    limit = 50
    total_sync = 0

    while True:
        data = dux_get("facturas", {
            "idSucursal": dux_sucursal_id,
            "fechaDesde": fecha,
            "fechaHasta": fecha,
            "limit": limit,
            "offset": offset
        })
        if not data:
            break

        results = data.get("results", [])
        total_api = data.get("paging", {}).get("total", 0) or 0
        if not results:
            break

        conn = get_db()
        cur = conn.cursor()
        for f in results:
            fid = f.get("id")
            detalles = json.dumps(f.get("detalles")) if f.get("detalles") else None
            detalles_json = f.get("detalles_json")
            detalles_factura_json = f.get("detalles_factura_json")
            detalles_cobro_json = f.get("detalles_cobro_json")
            detalles_factura = json.dumps(f.get("detalles_factura")) if f.get("detalles_factura") else None
            detalles_cobro = json.dumps(f.get("detalles_cobro")) if f.get("detalles_cobro") else None
            presupuesto = json.dumps(f.get("presupuesto")) if f.get("presupuesto") else None

            cur.execute("""
                INSERT INTO facturas (
                    id, id_cliente, id_empresa, nro_pto_vta, id_personal, id_vendedor,
                    nro_doc, tipo_comp, letra_comp, nro_comp, fecha_comp,
                    nro_pedido, referencia_pedido,
                    monto_exento, monto_gravado, monto_iva, monto_desc,
                    monto_percepcion_impuesto, total,
                    apellido_razon_soc, nombre, cuit,
                    nro_cae_cai, fecha_vencimiento_cae_cai,
                    detalles_json, detalles_factura_json, detalles_cobro_json,
                    anulada, anulada_boolean, fecha_registro,
                    detalles, detalles_factura, detalles_cobro, presupuesto,
                    url_factura, synced_at
                ) VALUES (
                    %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                    %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                    %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                    %s,%s,%s,%s,%s, NOW()
                )
                ON CONFLICT (id) DO UPDATE SET
                    total = EXCLUDED.total,
                    anulada = EXCLUDED.anulada,
                    anulada_boolean = EXCLUDED.anulada_boolean,
                    detalles = EXCLUDED.detalles,
                    detalles_json = EXCLUDED.detalles_json,
                    synced_at = NOW()
            """, (
                fid, f.get("id_cliente"), DUX_EMPRESA_ID,
                str(f.get("nro_pto_vta")), f.get("id_personal"), f.get("id_vendedor"),
                str(f.get("nro_doc")) if f.get("nro_doc") else None,
                f.get("tipo_comp"), f.get("letra_comp"), f.get("nro_comp"),
                f.get("fecha_comp"), f.get("nro_pedido"), f.get("referencia_pedido"),
                f.get("monto_exento"), f.get("monto_gravado"), f.get("monto_iva"),
                f.get("monto_desc"), f.get("monto_percepcion_impuesto"), f.get("total"),
                f.get("apellido_razon_soc"), f.get("nombre"), f.get("cuit"),
                f.get("nro_cae_cai"), f.get("fecha_vencimiento_cae_cai"),
                detalles_json, detalles_factura_json, detalles_cobro_json,
                f.get("anulada"), f.get("anulada_boolean"), f.get("fecha_registro"),
                detalles, detalles_factura, detalles_cobro, presupuesto,
                f.get("url_factura")
            ))
            total_sync += 1
        conn.commit()
        cur.close()
        conn.close()

        offset += limit
        if offset >= total_api:
            break

    return total_sync


def main():
    # Sincronizar dias faltantes marzo 2026
    fecha_inicio = datetime(2026, 3, 13)
    fecha_fin = datetime(2026, 3, 17)  # hasta hoy

    print("=" * 60)
    print("SYNC FACTURAS - MARZO 2026")
    print(f"Rango: {fecha_inicio.strftime('%Y-%m-%d')} a {fecha_fin.strftime('%Y-%m-%d')}")
    print(f"Sucursales: {len(SUCURSALES)}")
    print("=" * 60)

    total_general = 0
    dia = fecha_inicio
    while dia <= fecha_fin:
        fecha_str = dia.strftime("%Y-%m-%d")
        # Skip domingos (dia 1 fue domingo, 8 fue domingo, 15 domingo)
        if dia.weekday() == 6:  # domingo
            print(f"\n{fecha_str} (domingo) - saltando")
            dia += timedelta(days=1)
            continue

        print(f"\n--- {fecha_str} ---")
        total_dia = 0
        for dux_id, nombre in sorted(SUCURSALES.items()):
            n = sync_facturas_dia(dux_id, fecha_str)
            if n > 0:
                print(f"  {nombre} (dux={dux_id}): {n} facturas", flush=True)
                total_dia += n
        total_general += total_dia
        print(f"  Total dia: {total_dia}")
        dia += timedelta(days=1)

    print(f"\n{'=' * 60}")
    print(f"COMPLETADO - Total: {total_general} facturas sincronizadas")


if __name__ == "__main__":
    main()
