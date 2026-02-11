from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from datetime import datetime, timedelta
import httpx
from ..core.database import get_db
from ..core.security import get_current_user
from ..core.config import settings
from ..models.employee import Employee, SucursalInfo

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# Códigos de items para clasificar ventas
ITEMS_PELUQUERIA = ['01310', '01311', '900301']  # Corte uñas, Peluquería canina, Seña
ITEMS_VETERINARIA = [
    '01305', '01306', '01307', '01308', '01321', '01328', '01329',
    '01432', '01483', '01716', '01863', '100008', '900233',
    'CERTIFICADO', 'CITOLOGIA', 'CONTROL', 'COPROPARASITOLOGICO',
    'EXTRACCION', 'LIMPIEZA OIDO', 'RASPADO', 'SUERO', 'VENDAJE'
]

# Mapeo de sucursal_id (mi_sucursal) a nro_pto_vta (DUX)
# Fuente: tabla pto_vta_deposito_mapping
# Algunas sucursales tienen múltiples pto_vta (ej: Alem incluye Depósito Ruta 9)
SUCURSAL_PTO_VTA = {
    7: [3, 14],  # ALEM + DEPOSITO RUTA 9
    8: [30],     # ARENALES
    9: [4],      # BANDA
    10: [20],    # BELGRANO
    11: [21],    # BELGRANO SUR
    12: [25],    # CATAMARCA
    13: [5],     # CONCEPCION
    14: [2],     # CONGRESO
    16: [28],    # LAPRIDA
    17: [32],    # LEGUIZAMON
    18: [27],    # MUÑECAS
    20: [23],    # NEUQUEN OLASCOAGA
    21: [6],     # PARQUE
    22: [44],    # PINAR I
    26: [26],    # YERBA BUENA
}

# id_personal de Contact Center (se excluyen de ventas de sucursal)
CONTACT_CENTER_PERSONAL = [15638071]


@router.get("/ventas")
async def get_ventas_sucursal(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
    sucursal_id: Optional[int] = Query(None, description="ID de sucursal (solo para encargados)")
):
    """
    Obtener datos de ventas de la sucursal.
    Hace proxy al backend de vendedores para obtener los datos reales.
    Los encargados pueden especificar sucursal_id para ver otras sucursales.
    """
    from ..core.security import es_encargado

    # Determinar qué sucursal consultar
    target_sucursal = current_user.sucursal_id
    if sucursal_id and es_encargado(current_user):
        target_sucursal = sucursal_id

    if not target_sucursal:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    # Obtener info de la sucursal
    sucursal = db.query(SucursalInfo).filter(SucursalInfo.id == target_sucursal).first()

    try:
        # Intentar obtener datos del backend de vendedores
        async with httpx.AsyncClient() as client:
            # Endpoint del portal vendedores para datos de sucursal
            response = await client.get(
                f"{settings.VENDEDORES_API_URL}/sucursales/{target_sucursal}/resumen",
                timeout=10.0
            )
            if response.status_code == 200:
                return response.json()
    except Exception as e:
        print(f"Error conectando a vendedores API: {e}")

    # Datos de fallback si no se puede conectar
    return {
        "sucursal": {
            "id": target_sucursal,
            "nombre": sucursal.nombre if sucursal else "Sin nombre",
        },
        "ventas": {
            "venta_actual": 0,
            "objetivo": 0,
            "porcentaje": 0,
            "proyectado": 0,
        },
        "peluqueria": {
            "disponible": sucursal.tiene_peluqueria if sucursal else False,
            "venta_total": 0,
            "turnos_realizados": 0,
            "objetivo_turnos": 0,
            "proyectado": 0,
        },
        "veterinaria": {
            "disponible": sucursal.tiene_veterinaria if sucursal else False,
            "venta_total": 0,
            "consultas": 0,
            "medicacion": 0,
            "cirugias": 0,
            "vacunaciones": {
                "quintuple": 0,
                "sextuple": 0,
                "antirrabica": 0,
                "triple_felina": 0,
            }
        },
        "mensaje": "Datos de ejemplo - Conectar con backend vendedores"
    }


@router.get("/objetivos")
async def get_objetivos_sucursal(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
    sucursal_id: Optional[int] = Query(None, description="ID de sucursal (solo para encargados)")
):
    """
    Obtener objetivos de la sucursal desde la tabla objetivos_sucursal.
    Los datos se cargan desde el sistema de Gerencia (portal-vendedores).
    """
    from ..core.security import es_encargado

    # Determinar qué sucursal consultar
    target_sucursal = current_user.sucursal_id
    if sucursal_id and es_encargado(current_user):
        target_sucursal = sucursal_id

    if not target_sucursal:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    # Obtener periodo actual (formato YYYY-MM)
    hoy = datetime.now()
    periodo_actual = f"{hoy.year}-{hoy.month:02d}"

    # Consultar objetivos de la sucursal para el periodo actual
    query = text("""
        SELECT
            os.id,
            os.sucursal_id,
            os.periodo,
            os.objetivo_venta_general,
            os.piso_senda,
            os.techo_senda,
            os.piso_jaspe_liwue,
            os.techo_jaspe_liwue,
            os.piso_productos_estrella,
            os.techo_productos_estrella,
            os.objetivo_turnos_peluqueria,
            os.objetivo_consultas_veterinaria,
            os.objetivo_vacunas,
            os.created_at
        FROM objetivos_sucursal os
        WHERE os.sucursal_id = :sucursal_id
          AND os.periodo = :periodo
    """)

    result = db.execute(query, {
        "sucursal_id": target_sucursal,
        "periodo": periodo_actual
    }).fetchone()

    # Obtener info de la sucursal
    sucursal = db.query(SucursalInfo).filter(SucursalInfo.id == target_sucursal).first()

    if result:
        return {
            "existe": True,
            "sucursal_id": target_sucursal,
            "sucursal_nombre": sucursal.nombre if sucursal else "Sin nombre",
            "periodo": periodo_actual,
            "objetivo_venta_general": float(result[3]) if result[3] else 0,
            "proveedores": {
                "senda": {"piso": result[4] or 0, "techo": result[5] or 0},
                "jaspe_liwue": {"piso": result[6] or 0, "techo": result[7] or 0},
                "productos_estrella": {
                    "piso": float(result[8]) if result[8] else 0,
                    "techo": float(result[9]) if result[9] else 0
                }
            },
            "objetivo_turnos_peluqueria": result[10] or 0,
            "objetivo_consultas_veterinaria": result[11] or 0,
            "objetivo_vacunas": result[12] or 0,
            "tiene_veterinaria": sucursal.tiene_veterinaria if sucursal else False,
            "tiene_peluqueria": sucursal.tiene_peluqueria if sucursal else False,
        }

    # Si no hay objetivos para el periodo, devolver estructura vacía
    return {
        "existe": False,
        "sucursal_id": target_sucursal,
        "sucursal_nombre": sucursal.nombre if sucursal else "Sin nombre",
        "periodo": periodo_actual,
        "objetivo_venta_general": 0,
        "proveedores": {
            "senda": {"piso": 0, "techo": 0},
            "jaspe_liwue": {"piso": 0, "techo": 0},
            "productos_estrella": {"piso": 0, "techo": 0}
        },
        "objetivo_turnos_peluqueria": 0,
        "objetivo_consultas_veterinaria": 0,
        "objetivo_vacunas": 0,
        "tiene_veterinaria": sucursal.tiene_veterinaria if sucursal else False,
        "tiene_peluqueria": sucursal.tiene_peluqueria if sucursal else False,
        "mensaje": "No hay objetivos cargados para este periodo. Contacte a Gerencia."
    }


@router.get("/ventas-por-tipo")
async def get_ventas_por_tipo(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
    sucursal_id: Optional[int] = Query(None, description="ID de sucursal (solo para encargados)"),
    periodo: str = Query("mes", description="Periodo: hoy, semana, mes, año")
):
    """
    Obtener ventas clasificadas por tipo: productos, veterinaria, peluquería.
    Los encargados pueden especificar sucursal_id para ver otras sucursales.
    """
    from ..core.security import es_encargado

    # Determinar qué sucursal consultar
    target_sucursal = current_user.sucursal_id
    if sucursal_id and es_encargado(current_user):
        target_sucursal = sucursal_id

    if not target_sucursal:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    # Obtener nro_pto_vta de la sucursal (puede ser lista)
    pto_vta_list = SUCURSAL_PTO_VTA.get(target_sucursal)
    if not pto_vta_list:
        raise HTTPException(status_code=400, detail="Sucursal sin punto de venta asignado")
    nro_pto_vta = pto_vta_list[0]  # principal, para response

    # Calcular rango de fechas según periodo
    hoy = datetime.now()
    ayer = hoy - timedelta(days=1)
    if periodo == "ayer":
        fecha_desde = ayer.strftime("%b %-d, %Y")  # Formato: "Feb 9, 2026"
    elif periodo == "hoy":
        fecha_desde = hoy.strftime("%b %-d, %Y")  # Formato: "Feb 10, 2026"
    elif periodo == "semana":
        fecha_desde = (hoy - timedelta(days=7)).strftime("%b")
    elif periodo == "año":
        fecha_desde = str(hoy.year)
    else:  # mes por defecto
        fecha_desde = hoy.strftime("%b")  # Mes actual: "Feb"

    # Construir condiciones para clasificar items
    items_pelu_str = "', '".join(ITEMS_PELUQUERIA)
    items_vet_str = "', '".join(ITEMS_VETERINARIA)

    # Query para obtener ventas clasificadas
    # COMPROBANTE_VENTA = ventas, NOTA_CREDITO = resta del total
    # Excluye: FACTURA A/B (duplicados fiscales), Contact Center (por id_personal)
    # Genera placeholders dinámicos para lista de pto_vta
    pto_vta_placeholders = ", ".join([f"'{p}'" for p in pto_vta_list])
    cc_placeholders = ", ".join([str(p) for p in CONTACT_CENTER_PERSONAL]) if CONTACT_CENTER_PERSONAL else "0"

    query = text(f"""
        WITH ventas_clasificadas AS (
            SELECT
                f.id,
                CASE WHEN f.tipo_comp = 'NOTA_CREDITO' THEN -f.total ELSE f.total END as total,
                f.fecha_comp,
                f.tipo_comp,
                CASE
                    WHEN f.detalles::text ~ '01311|01310|900301' THEN 'PELUQUERIA'
                    WHEN f.detalles::text ~ '01305|01306|01307|01308|01321|01328|01329|CONSULTA|VACUNA|CIRUGIA' THEN 'VETERINARIA'
                    ELSE 'PRODUCTOS'
                END as tipo
            FROM facturas f
            WHERE f.nro_pto_vta IN ({pto_vta_placeholders})
              AND f.fecha_comp LIKE :fecha_pattern
              AND f.tipo_comp IN ('COMPROBANTE_VENTA', 'NOTA_CREDITO')
              AND (f.id_personal IS NULL OR f.id_personal NOT IN ({cc_placeholders}))
              AND (f.anulada IS NULL OR f.anulada != 'S')
              AND (f.anulada_boolean IS NULL OR f.anulada_boolean = false)
        )
        SELECT
            tipo,
            COUNT(*) FILTER (WHERE tipo_comp != 'NOTA_CREDITO') as cantidad,
            COALESCE(SUM(total), 0) as total
        FROM ventas_clasificadas
        GROUP BY tipo
    """)

    # Determinar patrón de fecha según periodo
    if periodo == "ayer":
        fecha_pattern = f"%{ayer.strftime('%b')} {ayer.day}, {ayer.year}%"
    elif periodo == "hoy":
        fecha_pattern = f"%{hoy.strftime('%b')} {hoy.day}, {hoy.year}%"
    elif periodo == "año":
        fecha_pattern = f"%{hoy.year}%"
    else:
        fecha_pattern = f"%{hoy.strftime('%b')}%{hoy.year}%"

    result = db.execute(query, {
        "nro_pto_vta": str(nro_pto_vta),
        "fecha_pattern": fecha_pattern
    })

    # Procesar resultados
    ventas = {"PRODUCTOS": 0, "VETERINARIA": 0, "PELUQUERIA": 0}
    cantidades = {"PRODUCTOS": 0, "VETERINARIA": 0, "PELUQUERIA": 0}

    for row in result:
        tipo = row[0]
        cantidad = row[1]
        total = float(row[2]) if row[2] else 0
        if tipo in ventas:
            ventas[tipo] = total
            cantidades[tipo] = cantidad

    total_general = sum(ventas.values())

    return {
        "sucursal_id": target_sucursal,
        "nro_pto_vta": nro_pto_vta,
        "periodo": periodo,
        "ventas": {
            "productos": {
                "total": ventas["PRODUCTOS"],
                "cantidad": cantidades["PRODUCTOS"],
                "porcentaje": round(ventas["PRODUCTOS"] / total_general * 100, 1) if total_general > 0 else 0
            },
            "veterinaria": {
                "total": ventas["VETERINARIA"],
                "cantidad": cantidades["VETERINARIA"],
                "porcentaje": round(ventas["VETERINARIA"] / total_general * 100, 1) if total_general > 0 else 0
            },
            "peluqueria": {
                "total": ventas["PELUQUERIA"],
                "cantidad": cantidades["PELUQUERIA"],
                "porcentaje": round(ventas["PELUQUERIA"] / total_general * 100, 1) if total_general > 0 else 0
            }
        },
        "total_general": total_general,
        "total_transacciones": sum(cantidades.values())
    }


@router.get("/ventas-por-tipo/todas")
async def get_ventas_todas_sucursales(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
    periodo: str = Query("mes", description="Periodo: hoy, semana, mes, año")
):
    """
    Obtener ventas de todas las sucursales (solo para encargados).
    Útil para comparar rendimiento entre sucursales.
    """
    from ..core.security import es_encargado, require_encargado

    require_encargado(current_user)

    hoy = datetime.now()

    # Determinar patrón de fecha según periodo
    if periodo == "hoy":
        fecha_pattern = f"%{hoy.strftime('%b')} {hoy.day}, {hoy.year}%"
    elif periodo == "año":
        fecha_pattern = f"%{hoy.year}%"
    else:
        fecha_pattern = f"%{hoy.strftime('%b')}%{hoy.year}%"

    # Mapeo inverso: pto_vta → nombre de sucursal principal
    # Para agrupar pto_vta secundarios con su sucursal (ej: pto_vta=14 → ALEM)
    pto_vta_to_sucursal = {}
    sucursal_names = db.execute(text("SELECT id, nombre FROM sucursales")).fetchall()
    suc_name_map = {row[0]: row[1] for row in sucursal_names}
    for suc_id, pto_list in SUCURSAL_PTO_VTA.items():
        nombre = suc_name_map.get(suc_id, f"Sucursal {suc_id}")
        for pv in pto_list:
            pto_vta_to_sucursal[pv] = (suc_id, nombre, pto_list[0])  # (id, nombre, pto_vta principal)

    cc_placeholders = ", ".join([str(p) for p in CONTACT_CENTER_PERSONAL]) if CONTACT_CENTER_PERSONAL else "0"

    query = text(f"""
        SELECT
            f.nro_pto_vta,
            COUNT(*) FILTER (WHERE f.tipo_comp != 'NOTA_CREDITO') as cantidad,
            COALESCE(SUM(CASE WHEN f.tipo_comp = 'NOTA_CREDITO' THEN -f.total ELSE f.total END), 0) as total,
            SUM(CASE WHEN f.detalles::text ~ '01311|01310|900301' THEN
                CASE WHEN f.tipo_comp = 'NOTA_CREDITO' THEN -f.total ELSE f.total END
                ELSE 0 END) as peluqueria,
            SUM(CASE WHEN f.detalles::text ~ '01305|01306|01307|01308|01321|01328|01329|CONSULTA|VACUNA|CIRUGIA' THEN
                CASE WHEN f.tipo_comp = 'NOTA_CREDITO' THEN -f.total ELSE f.total END
                ELSE 0 END) as veterinaria
        FROM facturas f
        WHERE f.fecha_comp LIKE :fecha_pattern
          AND f.tipo_comp IN ('COMPROBANTE_VENTA', 'NOTA_CREDITO')
          AND (f.id_personal IS NULL OR f.id_personal NOT IN ({cc_placeholders}))
          AND (f.anulada IS NULL OR f.anulada != 'S')
          AND (f.anulada_boolean IS NULL OR f.anulada_boolean = false)
        GROUP BY f.nro_pto_vta
    """)

    result = db.execute(query, {"fecha_pattern": fecha_pattern})

    # Agrupar por sucursal (pto_vta secundarios se suman al principal)
    sucursal_data = {}
    for row in result:
        pv = int(row[0]) if row[0] else 0
        mapping = pto_vta_to_sucursal.get(pv)
        if not mapping:
            continue  # pto_vta no mapeado, ignorar

        suc_id, nombre, pto_principal = mapping
        cantidad = row[1] or 0
        total = float(row[2]) if row[2] else 0
        peluqueria = float(row[3]) if row[3] else 0
        veterinaria = float(row[4]) if row[4] else 0

        if suc_id not in sucursal_data:
            sucursal_data[suc_id] = {
                "sucursal": nombre,
                "nro_pto_vta": pto_principal,
                "cantidad": 0, "total": 0, "productos": 0,
                "peluqueria": 0, "veterinaria": 0
            }
        s = sucursal_data[suc_id]
        s["cantidad"] += cantidad
        s["total"] += total
        s["peluqueria"] += peluqueria
        s["veterinaria"] += veterinaria
        s["productos"] = s["total"] - s["peluqueria"] - s["veterinaria"]

    sucursales = sorted(sucursal_data.values(), key=lambda x: x["total"], reverse=True)

    return {
        "periodo": periodo,
        "sucursales": sucursales,
        "total_general": sum(s["total"] for s in sucursales)
    }
