
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from datetime import datetime, timedelta
import calendar
import httpx
from ..core.database import get_db
from ..core.security import get_current_user
from ..core.config import settings
from ..models.employee import Employee, SucursalInfo

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# Códigos de items para clasificar ventas
ITEMS_PELUQUERIA = ['01311', '900301']  # Peluquería canina, Seña

# Vacunas (separadas para conteo individual en dashboard)
ITEMS_VACUNA_QUINTUPLE = ['01328']       # VACUNA QUINTUPLE
ITEMS_VACUNA_SEXTUPLE = ['900233']       # VACUNA SEXTUPLE
ITEMS_VACUNA_ANTIRRABICA = ['01307']     # VACUNACION ANTIRRABICA
ITEMS_VACUNA_TRIPLE_FELINA = ['01329']   # VACUNACION TRIPLE FELINA
ITEMS_VACUNAS = ITEMS_VACUNA_QUINTUPLE + ITEMS_VACUNA_SEXTUPLE + ITEMS_VACUNA_ANTIRRABICA + ITEMS_VACUNA_TRIPLE_FELINA

# Consultas veterinarias (solo las que tienen objetivo)
ITEMS_CONSULTA_VET = ['01305']  # CONSULTA VETERINARIA

# Otros servicios veterinarios (no se cuentan como consultas ni vacunas)
ITEMS_OTROS_VET = [
    '01306',   # MEDICACION VETERINARIA
    '01308',   # DESPARACITACION
    '01321',   # CIRUGIA
    '01432',   # INSUMOS VETERINARIA
    '01483',   # ECOGRAFIA AL 50%
    '01716',   # TIRA REACTIVAS
    '01863',   # DOMICILIO
    '100008',  # ANALISIS (LABORATORIO)
    'CERTIFICADO', 'CITOLOGIA', 'CONTROL', 'COPROPARASITOLOGICO',
    'EXTRACCION', 'LIMPIEZA OIDO', 'RASPADO', 'SUERO', 'VENDAJE'
]

# Todos los items veterinarios (consultas + vacunas + otros)
ITEMS_VETERINARIA = ITEMS_CONSULTA_VET + ITEMS_OTROS_VET + ITEMS_VACUNAS

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

# Mapeo de sucursal_id (franquicia) a nro_pto_vta en DUX franquicia
SUCURSAL_PTO_VTA_FRQ = {
    27: [3],     # ZAPALA
    28: [11],    # JUJUY LAMADRID
    29: [13],    # RUMIPET CORDOBA
    30: [9],     # ORAN
    31: [14],    # TAFI VIEJO
    32: [10],    # JULIO MONTI CATAMARCA
    33: [16],    # LAS HERAS MENDOZA
    34: [26],    # ROSARIO
    35: [117],   # GODOY CRUZ MENDOZA
    36: [25],    # CHACO
    38: [23],    # NEUQUEN OLASCOAGA
}


def _get_tabla_y_pto_vta(db, sucursal_id):
    """Retorna (tabla_facturas, pto_vta_list) segun si es franquicia o central"""
    suc = db.execute(text("SELECT codigo FROM sucursales WHERE id = :id"), {"id": sucursal_id}).first()
    if suc and suc[0] and suc[0].startswith("FRQ"):
        pto_vta = SUCURSAL_PTO_VTA_FRQ.get(sucursal_id, [])
        return "facturas_franquicia", pto_vta
    else:
        pto_vta = SUCURSAL_PTO_VTA.get(sucursal_id, [])
        return "facturas", pto_vta


# id_personal excluidos de ventas de sucursal
# 15638071, 15640239 = Contact Center, 15541727 = no pertenece a sucursal, 15640065 = Franquicias
EXCLUDED_PERSONAL = [15638071, 15640239, 15541727, 15640065]

# Contact Center: sus ventas se identifican por id_personal, no por pto_vta
CONTACT_CENTER_SUCURSAL_ID = 15
CONTACT_CENTER_PERSONAL = [15638071, 15640239]


@router.get("/ventas")
async def get_ventas_sucursal(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
    sucursal_id: Optional[int] = Query(None, description="ID de sucursal (solo para encargados)")
):
    """
    Obtener datos de ventas mensuales de la sucursal desde facturas.
    Los encargados pueden especificar sucursal_id para ver otras sucursales.
    """
    # 2026-04-25: scope multi-sede via resolve_sucursal_target (encargado, gerencia,
    # o empleado raso con multiples turnos en empleado_sucursales).
    from ..core.scope import resolve_sucursal_target
    target_sucursal = resolve_sucursal_target(current_user, sucursal_id, db)

    if not target_sucursal:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    # Obtener info de la sucursal
    sucursal = db.query(SucursalInfo).filter(SucursalInfo.id == target_sucursal).first()

    # Contact Center: ventas se buscan por id_personal, no por pto_vta
    if target_sucursal == CONTACT_CENTER_SUCURSAL_ID:
        return _ventas_contact_center(db, sucursal)

    # Obtener tabla y pto_vta segun tipo de sucursal
    tabla_facturas, pto_vta_list = _get_tabla_y_pto_vta(db, target_sucursal)
    if not pto_vta_list:
        return _ventas_fallback(target_sucursal, sucursal)

    hoy = datetime.now()
    fecha_pattern = f"%{hoy.strftime('%b')}%{hoy.year}%"
    pto_vta_placeholders = ", ".join([f"'{p}'" for p in pto_vta_list])
    cc_placeholders = ", ".join([str(p) for p in EXCLUDED_PERSONAL]) if EXCLUDED_PERSONAL else "0"

    # Query 1: Total ventas de la sucursal (excluye personal no perteneciente)
    query_total = text(f"""
        SELECT COALESCE(SUM(
            CASE WHEN f.tipo_comp = 'NOTA_CREDITO' THEN -f.total ELSE f.total END
        ), 0) as total
        FROM {tabla_facturas} f
        WHERE f.nro_pto_vta IN ({pto_vta_placeholders})
          AND f.fecha_comp LIKE :fecha_pattern
          AND f.tipo_comp IN ('COMPROBANTE_VENTA', 'FACTURA', 'NOTA_CREDITO')
          AND (f.id_personal IS NULL OR f.id_personal NOT IN ({cc_placeholders}))
          AND (f.anulada IS NULL OR f.anulada != 'S')
          AND (f.anulada_boolean IS NULL OR f.anulada_boolean = false)
    """)
    venta_total = float(db.execute(query_total, {"fecha_pattern": fecha_pattern}).scalar() or 0)

    # Proyección: (venta hasta ayer / días transcurridos) * días del mes
    dias_del_mes = calendar.monthrange(hoy.year, hoy.month)[1]
    dias_transcurridos = hoy.day - 1  # días completos (hasta ayer)
    if dias_transcurridos > 0:
        # Venta hasta ayer = total del mes excluyendo hoy
        hoy_pattern = f"%{hoy.strftime('%b')} {hoy.day}, {hoy.year}%"
        query_hasta_ayer = text(f"""
            SELECT COALESCE(SUM(
                CASE WHEN f.tipo_comp = 'NOTA_CREDITO' THEN -f.total ELSE f.total END
            ), 0) as total
            FROM {tabla_facturas} f
            WHERE f.nro_pto_vta IN ({pto_vta_placeholders})
              AND f.fecha_comp LIKE :fecha_pattern
              AND f.fecha_comp NOT LIKE :hoy_pattern
              AND f.tipo_comp IN ('COMPROBANTE_VENTA', 'FACTURA', 'NOTA_CREDITO')
              AND (f.id_personal IS NULL OR f.id_personal NOT IN ({cc_placeholders}))
              AND (f.anulada IS NULL OR f.anulada != 'S')
              AND (f.anulada_boolean IS NULL OR f.anulada_boolean = false)
        """)
        venta_hasta_ayer = float(db.execute(query_hasta_ayer, {
            "fecha_pattern": fecha_pattern,
            "hoy_pattern": hoy_pattern
        }).scalar() or 0)
        proyectado = round((venta_hasta_ayer / dias_transcurridos) * dias_del_mes, 2)
    else:
        proyectado = 0

    # Query 2: Peluquería y veterinaria por line items del JSON
    # Parsea detalles JSON para contar y sumar solo los items específicos
    # NO excluye personal porque el servicio se realizó en la sucursal
    # NOTA: en facturas_franquicia los cod_item vienen prefijados con codigo de
    # franquicia (ej: "TAF - 01311"). Normalizamos removiendo el prefijo "XXX - ".
    items_pelu = "', '".join(ITEMS_PELUQUERIA)
    items_vet = "', '".join(ITEMS_VETERINARIA)
    # facturas_franquicia no tiene anulada_boolean
    _cond_anulada_bool = "AND (f.anulada_boolean IS NULL OR f.anulada_boolean = false)" if tabla_facturas == "facturas" else ""
    _cod_normalizado = "regexp_replace(d->>'cod_item', '^[A-Z]{2,4} - ', '')"
    query_servicios = text(f"""
        SELECT
            {_cod_normalizado} as cod_item,
            COUNT(*) as cantidad,
            COALESCE(SUM(
                (d->>'ctd')::numeric * CASE WHEN f.tipo_comp = 'NOTA_CREDITO' THEN -1 ELSE 1 END
            ), 0) as sum_ctd,
            COALESCE(SUM(
                ROUND((d->>'precio_uni')::numeric * (d->>'ctd')::numeric * (1 + (d->>'porc_iva')::numeric/100), 2)
                * CASE WHEN f.tipo_comp = 'NOTA_CREDITO' THEN -1 ELSE 1 END
            ), 0) as total
        FROM {tabla_facturas} f, jsonb_array_elements(f.detalles::jsonb) d
        WHERE f.nro_pto_vta IN ({pto_vta_placeholders})
          AND f.fecha_comp LIKE :fecha_pattern
          AND f.tipo_comp IN ('COMPROBANTE_VENTA', 'FACTURA', 'NOTA_CREDITO')
          AND (f.anulada IS NULL OR f.anulada != 'S')
          {_cond_anulada_bool}
          AND {_cod_normalizado} IN ('{items_pelu}', '{items_vet}')
        GROUP BY {_cod_normalizado}
    """)
    result_servicios = db.execute(query_servicios, {"fecha_pattern": fecha_pattern})

    pelu_turnos = 0
    pelu_total = 0
    vet_consultas = 0
    vet_total = 0
    vac_quintuple = 0
    vac_sextuple = 0
    vac_antirrabica = 0
    vac_triple_felina = 0
    for row in result_servicios:
        cod = row[0]
        cant = row[1] or 0
        sum_ctd = int(row[2]) if row[2] else 0
        total = float(row[3]) if row[3] else 0
        if cod in ITEMS_PELUQUERIA:
            if cod == '01311':  # Turnos reales (no señas ni corte uñas)
                pelu_turnos += sum_ctd
            pelu_total += total
        elif cod in ITEMS_VETERINARIA:
            vet_total += total
            if cod in ITEMS_CONSULTA_VET:
                vet_consultas += sum_ctd
            elif cod in ITEMS_VACUNA_QUINTUPLE:
                vac_quintuple += sum_ctd
            elif cod in ITEMS_VACUNA_SEXTUPLE:
                vac_sextuple += sum_ctd
            elif cod in ITEMS_VACUNA_ANTIRRABICA:
                vac_antirrabica += sum_ctd
            elif cod in ITEMS_VACUNA_TRIPLE_FELINA:
                vac_triple_felina += sum_ctd
            # ITEMS_OTROS_VET: solo suman al vet_total, no a consultas ni vacunas

    # Leer objetivo desde el schema correcto (portal_vendedores | portal_franquicias)
    from ..core.scope import get_schema_objetivos
    _schema = get_schema_objetivos(sucursal.codigo if sucursal else None)
    _periodo = f"{hoy.year}-{hoy.month:02d}"
    _obj = db.execute(text(f"""
        SELECT objetivo_venta_general, objetivo_turnos_peluqueria
        FROM {_schema}.objetivos_sucursal
        WHERE sucursal_id = :sid AND periodo = :p
    """), {"sid": target_sucursal, "p": _periodo}).fetchone()
    objetivo_venta = float(_obj[0]) if _obj and _obj[0] else 0
    objetivo_turnos = int(_obj[1]) if _obj and _obj[1] else 0
    porcentaje_venta = round((venta_total / objetivo_venta) * 100, 1) if objetivo_venta > 0 else 0

    return {
        "sucursal": {
            "id": target_sucursal,
            "nombre": sucursal.nombre if sucursal else "Sin nombre",
        },
        "ventas": {
            "venta_actual": venta_total,
            "objetivo": objetivo_venta,
            "porcentaje": porcentaje_venta,
            "proyectado": proyectado,
        },
        "peluqueria": {
            "disponible": sucursal.tiene_peluqueria if sucursal else False,
            "venta_total": pelu_total,
            "turnos_realizados": pelu_turnos,
            "objetivo_turnos": objetivo_turnos,
            "proyectado": round((pelu_turnos / dias_transcurridos) * dias_del_mes) if dias_transcurridos > 0 else 0,
        },
        "veterinaria": {
            "disponible": sucursal.tiene_veterinaria if sucursal else False,
            "venta_total": vet_total,
            "consultas": vet_consultas,
            "medicacion": 0,
            "cirugias": 0,
            "vacunaciones": {
                "quintuple": vac_quintuple,
                "sextuple": vac_sextuple,
                "antirrabica": vac_antirrabica,
                "triple_felina": vac_triple_felina,
            }
        },
    }


def _ventas_fallback(target_sucursal, sucursal):
    """Datos vacíos cuando no hay pto_vta mapeado"""
    return {
        "sucursal": {
            "id": target_sucursal,
            "nombre": sucursal.nombre if sucursal else "Sin nombre",
        },
        "ventas": {"venta_actual": 0, "objetivo": 0, "porcentaje": 0, "proyectado": 0},
        "peluqueria": {
            "disponible": sucursal.tiene_peluqueria if sucursal else False,
            "venta_total": 0, "turnos_realizados": 0, "objetivo_turnos": 0, "proyectado": 0,
        },
        "veterinaria": {
            "disponible": sucursal.tiene_veterinaria if sucursal else False,
            "venta_total": 0, "consultas": 0, "medicacion": 0, "cirugias": 0,
            "vacunaciones": {"quintuple": 0, "sextuple": 0, "antirrabica": 0, "triple_felina": 0},
        },
    }


def _ventas_contact_center(db: Session, sucursal):
    """Ventas del Contact Center: se buscan por id_personal en vez de pto_vta"""
    hoy = datetime.now()
    fecha_pattern = f"%{hoy.strftime('%b')}%{hoy.year}%"
    cc_ids = ", ".join([str(p) for p in CONTACT_CENTER_PERSONAL])

    # Total ventas del mes
    query_total = text(f"""
        SELECT COALESCE(SUM(
            CASE WHEN f.tipo_comp = 'NOTA_CREDITO' THEN -f.total ELSE f.total END
        ), 0) as total
        FROM facturas f
        WHERE f.id_personal IN ({cc_ids})
          AND f.fecha_comp LIKE :fecha_pattern
          AND f.tipo_comp IN ('COMPROBANTE_VENTA', 'FACTURA', 'NOTA_CREDITO')
          AND (f.anulada IS NULL OR f.anulada != 'S')
          AND (f.anulada_boolean IS NULL OR f.anulada_boolean = false)
    """)
    venta_total = float(db.execute(query_total, {"fecha_pattern": fecha_pattern}).scalar() or 0)

    # Proyección
    dias_del_mes = calendar.monthrange(hoy.year, hoy.month)[1]
    dias_transcurridos = hoy.day - 1
    if dias_transcurridos > 0:
        hoy_pattern = f"%{hoy.strftime('%b')} {hoy.day}, {hoy.year}%"
        query_hasta_ayer = text(f"""
            SELECT COALESCE(SUM(
                CASE WHEN f.tipo_comp = 'NOTA_CREDITO' THEN -f.total ELSE f.total END
            ), 0) as total
            FROM facturas f
            WHERE f.id_personal IN ({cc_ids})
              AND f.fecha_comp LIKE :fecha_pattern
              AND f.fecha_comp NOT LIKE :hoy_pattern
              AND f.tipo_comp IN ('COMPROBANTE_VENTA', 'FACTURA', 'NOTA_CREDITO')
              AND (f.anulada IS NULL OR f.anulada != 'S')
              AND (f.anulada_boolean IS NULL OR f.anulada_boolean = false)
        """)
        venta_hasta_ayer = float(db.execute(query_hasta_ayer, {
            "fecha_pattern": fecha_pattern,
            "hoy_pattern": hoy_pattern
        }).scalar() or 0)
        proyectado = round((venta_hasta_ayer / dias_transcurridos) * dias_del_mes, 2)
    else:
        proyectado = 0

    return {
        "sucursal": {
            "id": CONTACT_CENTER_SUCURSAL_ID,
            "nombre": sucursal.nombre if sucursal else "Contact Center",
        },
        "ventas": {
            "venta_actual": venta_total,
            "objetivo": 0,
            "porcentaje": 0,
            "proyectado": proyectado,
        },
        "peluqueria": {
            "disponible": False,
            "venta_total": 0, "turnos_realizados": 0, "objetivo_turnos": 0, "proyectado": 0,
        },
        "veterinaria": {
            "disponible": False,
            "venta_total": 0, "consultas": 0, "medicacion": 0, "cirugias": 0,
            "vacunaciones": {"quintuple": 0, "sextuple": 0, "antirrabica": 0, "triple_felina": 0},
        },
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
    from ..core.scope import get_schema_objetivos, resolve_sucursal_target

    # 2026-04-25: scope multi-sede unificado.
    target_sucursal = resolve_sucursal_target(current_user, sucursal_id, db)

    if not target_sucursal:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    # Obtener info de la sucursal PRIMERO (necesito el codigo para saber schema)
    sucursal = db.query(SucursalInfo).filter(SucursalInfo.id == target_sucursal).first()
    schema = get_schema_objetivos(sucursal.codigo if sucursal else None)

    # Obtener periodo actual (formato YYYY-MM)
    hoy = datetime.now()
    periodo_actual = f"{hoy.year}-{hoy.month:02d}"

    # Consultar objetivos desde el schema correcto (portal_vendedores o portal_franquicias)
    query = text(f"""
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
        FROM {schema}.objetivos_sucursal os
        WHERE os.sucursal_id = :sucursal_id
          AND os.periodo = :periodo
    """)

    result = db.execute(query, {
        "sucursal_id": target_sucursal,
        "periodo": periodo_actual
    }).fetchone()

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
    # 2026-04-25: scope multi-sede unificado.
    from ..core.scope import resolve_sucursal_target
    target_sucursal = resolve_sucursal_target(current_user, sucursal_id, db)

    if not target_sucursal:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    # Contact Center: ventas por id_personal
    if target_sucursal == CONTACT_CENTER_SUCURSAL_ID:
        return _ventas_por_tipo_contact_center(db, target_sucursal, periodo)

    # Determinar tabla + pto_vta (casa central -> facturas; franquicia -> facturas_franquicia)
    tabla_facturas, pto_vta_list = _get_tabla_y_pto_vta(db, target_sucursal)

    # Si la sucursal (p.ej. franquicia recién cargada) no tiene pto_vta mapeado,
    # devolver estructura vacía en vez de 400 para no romper el dashboard.
    if not pto_vta_list:
        return {
            "sucursal_id": target_sucursal,
            "nro_pto_vta": None,
            "periodo": periodo,
            "ventas": {
                "productos": {"total": 0, "cantidad": 0, "porcentaje": 0},
                "veterinaria": {"total": 0, "cantidad": 0, "porcentaje": 0},
                "peluqueria": {"total": 0, "cantidad": 0, "porcentaje": 0},
            },
            "total_general": 0,
            "total_transacciones": 0,
        }
    nro_pto_vta = pto_vta_list[0]  # principal, para response
    # Campo JSON de detalles según tabla (facturas -> detalles; facturas_franquicia -> detalles_json)
    col_detalles = "detalles" if tabla_facturas == "facturas" else "detalles_json"

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
    # COMPROBANTE_VENTA + FACTURA = ventas, NOTA_CREDITO = resta del total
    # Excluye: Contact Center (por id_personal)
    # Genera placeholders dinámicos para lista de pto_vta
    pto_vta_placeholders = ", ".join([f"'{p}'" for p in pto_vta_list])
    cc_placeholders = ", ".join([str(p) for p in EXCLUDED_PERSONAL]) if EXCLUDED_PERSONAL else "0"

    # Determinar patrón de fecha según periodo
    if periodo == "ayer":
        fecha_pattern = f"%{ayer.strftime('%b')} {ayer.day}, {ayer.year}%"
    elif periodo == "hoy":
        fecha_pattern = f"%{hoy.strftime('%b')} {hoy.day}, {hoy.year}%"
    elif periodo == "año":
        fecha_pattern = f"%{hoy.year}%"
    else:
        fecha_pattern = f"%{hoy.strftime('%b')}%{hoy.year}%"

    # Query por line items: clasifica cada item individual, no la factura completa
    # Así una factura con peluquería + productos se divide correctamente
    items_pelu_str = "', '".join(ITEMS_PELUQUERIA)
    items_vet_str = "', '".join(ITEMS_VETERINARIA)

    # facturas_franquicia no tiene anulada_boolean -> omitir esa condición para esa tabla
    cond_anulada_bool = "AND (f.anulada_boolean IS NULL OR f.anulada_boolean = false)" if tabla_facturas == "facturas" else ""
    # Normaliza cod_item: franquicias vienen prefijados (ej: "TAF - 01311")
    _cod_norm = "regexp_replace(d->>'cod_item', '^[A-Z]{2,4} - ', '')"
    query_items = text(f"""
        SELECT
            CASE
                WHEN {_cod_norm} IN ('{items_pelu_str}') THEN 'PELUQUERIA'
                WHEN {_cod_norm} IN ('{items_vet_str}') THEN 'VETERINARIA'
                ELSE 'PRODUCTOS'
            END as tipo,
            COUNT(DISTINCT f.id) as cantidad,
            COALESCE(SUM(
                ROUND((d->>'precio_uni')::numeric * (d->>'ctd')::numeric * (1 - COALESCE((d->>'porc_desc')::numeric, 0)/100) * (1 + (d->>'porc_iva')::numeric/100), 2)
                * CASE WHEN f.tipo_comp = 'NOTA_CREDITO' THEN -1 ELSE 1 END
            ), 0) as total
        FROM {tabla_facturas} f, jsonb_array_elements(f.{col_detalles}::jsonb) d
        WHERE f.nro_pto_vta IN ({pto_vta_placeholders})
          AND f.fecha_comp LIKE :fecha_pattern
          AND f.tipo_comp IN ('COMPROBANTE_VENTA', 'FACTURA', 'NOTA_CREDITO')
          AND (f.id_personal IS NULL OR f.id_personal NOT IN ({cc_placeholders}))
          AND (f.anulada IS NULL OR f.anulada != 'S')
          {cond_anulada_bool}
        GROUP BY tipo
    """)

    result = db.execute(query_items, {"fecha_pattern": fecha_pattern})

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


def _ventas_por_tipo_contact_center(db: Session, target_sucursal: int, periodo: str):
    """Ventas por tipo para Contact Center, buscando por id_personal"""
    hoy = datetime.now()
    ayer = hoy - timedelta(days=1)
    cc_ids = ", ".join([str(p) for p in CONTACT_CENTER_PERSONAL])

    if periodo == "ayer":
        fecha_pattern = f"%{ayer.strftime('%b')} {ayer.day}, {ayer.year}%"
    elif periodo == "hoy":
        fecha_pattern = f"%{hoy.strftime('%b')} {hoy.day}, {hoy.year}%"
    elif periodo == "año":
        fecha_pattern = f"%{hoy.year}%"
    else:
        fecha_pattern = f"%{hoy.strftime('%b')}%{hoy.year}%"

    items_pelu_str = "', '".join(ITEMS_PELUQUERIA)
    items_vet_str = "', '".join(ITEMS_VETERINARIA)

    query = text(f"""
        SELECT
            CASE
                WHEN d->>'cod_item' IN ('{items_pelu_str}') THEN 'PELUQUERIA'
                WHEN d->>'cod_item' IN ('{items_vet_str}') THEN 'VETERINARIA'
                ELSE 'PRODUCTOS'
            END as tipo,
            COUNT(DISTINCT f.id) as cantidad,
            COALESCE(SUM(
                ROUND((d->>'precio_uni')::numeric * (d->>'ctd')::numeric * (1 - COALESCE((d->>'porc_desc')::numeric, 0)/100) * (1 + (d->>'porc_iva')::numeric/100), 2)
                * CASE WHEN f.tipo_comp = 'NOTA_CREDITO' THEN -1 ELSE 1 END
            ), 0) as total
        FROM facturas f, jsonb_array_elements(f.detalles::jsonb) d
        WHERE f.id_personal IN ({cc_ids})
          AND f.fecha_comp LIKE :fecha_pattern
          AND f.tipo_comp IN ('COMPROBANTE_VENTA', 'FACTURA', 'NOTA_CREDITO')
          AND (f.anulada IS NULL OR f.anulada != 'S')
          AND (f.anulada_boolean IS NULL OR f.anulada_boolean = false)
        GROUP BY tipo
    """)

    result = db.execute(query, {"fecha_pattern": fecha_pattern})
    ventas = {"PRODUCTOS": 0, "VETERINARIA": 0, "PELUQUERIA": 0}
    cantidades = {"PRODUCTOS": 0, "VETERINARIA": 0, "PELUQUERIA": 0}

    for row in result:
        tipo = row[0]
        if tipo in ventas:
            ventas[tipo] = float(row[2]) if row[2] else 0
            cantidades[tipo] = row[1] or 0

    total_general = sum(ventas.values())

    return {
        "sucursal_id": target_sucursal,
        "nro_pto_vta": 0,
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
    sucursal_names = db.execute(text("SELECT id, nombre FROM v_sucursal_canonica WHERE codigo NOT LIKE 'FRQ%' AND activo = true AND fecha_baja IS NULL")).fetchall()
    suc_name_map = {row[0]: row[1] for row in sucursal_names}
    for suc_id, pto_list in SUCURSAL_PTO_VTA.items():
        nombre = suc_name_map.get(suc_id, f"Sucursal {suc_id}")
        for pv in pto_list:
            pto_vta_to_sucursal[pv] = (suc_id, nombre, pto_list[0])  # (id, nombre, pto_vta principal)

    cc_placeholders = ", ".join([str(p) for p in EXCLUDED_PERSONAL]) if EXCLUDED_PERSONAL else "0"

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
          AND f.tipo_comp IN ('COMPROBANTE_VENTA', 'FACTURA', 'NOTA_CREDITO')
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

