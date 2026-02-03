"""
Endpoints para gestión de ajustes de stock

Los ajustes de stock se importan mensualmente desde un CSV que viene de Google Sheets.
El CSV contiene los movimientos de ajuste de stock realizados manualmente.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import csv
import io
import re

from ..core.database import get_db
from ..core.security import get_current_user
from ..models.employee import Employee
from ..models.deposito import AjusteStock

router = APIRouter(prefix="/ajustes-stock", tags=["ajustes-stock"])


# ===== Schemas =====

class AjusteStockResponse(BaseModel):
    id: int
    deposito_id: Optional[int]
    deposito_nombre: Optional[str]
    fecha: datetime
    cod_item: str
    producto: str
    cantidad: int
    tipo_movimiento: str
    personal: Optional[str]
    costo: Optional[str]
    mes_importacion: Optional[str]

    class Config:
        from_attributes = True


class ImportResult(BaseModel):
    success: bool
    total_rows: int
    imported_rows: int
    errors: List[str]
    deposito_mapping: dict  # Mapeo de nombres de depósito a IDs encontrados


class ResumenAjustesResponse(BaseModel):
    total_ajustes: int
    total_ingresos: int
    total_egresos: int
    cantidad_neta: int
    meses_disponibles: List[str]
    por_deposito: List[dict]


# ===== Helper functions =====

def parse_spanish_date(date_str: str) -> Optional[datetime]:
    """Convierte fecha en formato DD/MM/YYYY a datetime"""
    try:
        return datetime.strptime(date_str.strip(), "%d/%m/%Y")
    except:
        return None


def parse_spanish_number(num_str: str) -> int:
    """Convierte número en formato español (1.234,56) a int"""
    try:
        # Remover puntos de miles y reemplazar coma decimal
        cleaned = num_str.replace(".", "").replace(",", ".").strip()
        return int(float(cleaned))
    except:
        return 0


def normalize_deposito_name(name: str) -> str:
    """Normaliza nombre de depósito removiendo prefijo 'DEPOSITO '"""
    name = name.strip().upper()
    if name.startswith("DEPOSITO "):
        name = name[9:]  # Remover "DEPOSITO "
    return name


def simplify_tipo_movimiento(tipo: str) -> str:
    """Simplifica el tipo de movimiento"""
    tipo = tipo.strip().upper()
    if "INGRESO" in tipo:
        return "INGRESO"
    elif "EGRESO" in tipo:
        return "EGRESO"
    elif "AJUSTE" in tipo:
        return "AJUSTE"
    return tipo


# ===== Endpoints =====

@router.get("/depositos")
async def get_depositos(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    """
    Obtiene la lista de depósitos disponibles.
    Útil para mapear nombres del CSV a IDs.
    """
    try:
        result = db.execute(text("SELECT id, deposito, codigo FROM depositos ORDER BY deposito"))
        depositos = [{"id": row[0], "nombre": row[1], "codigo": row[2]} for row in result]
        return {"depositos": depositos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener depósitos: {str(e)}")


@router.post("/importar-csv", response_model=ImportResult)
async def importar_csv(
    file: UploadFile = File(...),
    mes: str = None,  # Formato YYYY-MM
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    """
    Importa ajustes de stock desde un archivo CSV.

    El CSV debe tener las columnas:
    - Depósito: nombre del depósito (ej: "DEPOSITO ALEM")
    - Fecha Comp: fecha en formato DD/MM/YYYY
    - Código Producto: código del producto
    - Producto: nombre del producto
    - Cantidad: cantidad del movimiento
    - Tipo Movimiento: INGRESO STOCK, EGRESO STOCK, AJUSTE STOCK POR IMPORTACIÓN PRODUCTO
    - Personal: quien realizó el ajuste
    - Costo: costo del ajuste

    El parámetro 'mes' es opcional y se usa para identificar el mes de importación.
    Si no se proporciona, se detecta automáticamente de las fechas del CSV.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un CSV")

    errors = []
    imported_rows = 0
    total_rows = 0
    deposito_mapping = {}

    # Cargar mapeo de depósitos
    try:
        result = db.execute(text("SELECT id, deposito FROM depositos"))
        for row in result:
            # Crear mapeo con nombre normalizado
            nombre_normalizado = normalize_deposito_name(row[1])
            deposito_mapping[nombre_normalizado] = row[0]
    except Exception as e:
        errors.append(f"Error cargando depósitos: {str(e)}")

    try:
        # Leer archivo CSV
        content = await file.read()
        # Intentar decodificar con diferentes encodings
        for encoding in ['utf-8', 'latin-1', 'cp1252']:
            try:
                text_content = content.decode(encoding)
                break
            except:
                continue
        else:
            raise HTTPException(status_code=400, detail="No se pudo decodificar el archivo CSV")

        # Parsear CSV
        csv_reader = csv.DictReader(io.StringIO(text_content), delimiter=';')

        # Detectar mes si no se proporcionó
        detected_mes = mes

        for row in csv_reader:
            total_rows += 1

            try:
                # Parsear campos
                deposito_raw = row.get('Depósito', row.get('Deposito', '')).strip()
                fecha_str = row.get('Fecha Comp', row.get('Fecha', '')).strip()
                cod_item = row.get('Código Producto', row.get('Codigo Producto', '')).strip()
                producto = row.get('Producto', '').strip()
                cantidad_str = row.get('Cantidad', '0').strip()
                tipo_mov = row.get('Tipo Movimiento', '').strip()
                personal = row.get('Personal', '').strip()
                costo = row.get('Costo', '').strip()

                # Convertir valores
                fecha = parse_spanish_date(fecha_str)
                if not fecha:
                    errors.append(f"Fila {total_rows}: Fecha inválida '{fecha_str}'")
                    continue

                cantidad = parse_spanish_number(cantidad_str)
                deposito_nombre = normalize_deposito_name(deposito_raw)
                deposito_id = deposito_mapping.get(deposito_nombre)

                if not deposito_id:
                    errors.append(f"Fila {total_rows}: Depósito no encontrado '{deposito_nombre}'")
                    # Continuar sin deposito_id

                # Detectar mes de la primera fecha válida
                if not detected_mes:
                    detected_mes = fecha.strftime("%Y-%m")

                # Crear registro
                ajuste = AjusteStock(
                    deposito_id=deposito_id,
                    deposito_nombre=deposito_nombre,
                    fecha=fecha,
                    cod_item=cod_item,
                    producto=producto,
                    cantidad=cantidad,
                    tipo_movimiento=simplify_tipo_movimiento(tipo_mov),
                    personal=personal,
                    costo=costo,
                    mes_importacion=detected_mes
                )
                db.add(ajuste)
                imported_rows += 1

            except Exception as e:
                errors.append(f"Fila {total_rows}: Error procesando - {str(e)}")

        db.commit()

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error procesando CSV: {str(e)}")

    return ImportResult(
        success=imported_rows > 0,
        total_rows=total_rows,
        imported_rows=imported_rows,
        errors=errors[:20],  # Limitar errores mostrados
        deposito_mapping=deposito_mapping
    )


@router.get("/", response_model=List[AjusteStockResponse])
async def listar_ajustes(
    deposito_id: Optional[int] = None,
    mes: Optional[str] = None,  # Formato YYYY-MM
    tipo: Optional[str] = None,  # INGRESO, EGRESO, AJUSTE
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    """
    Lista los ajustes de stock con filtros opcionales.
    """
    query = db.query(AjusteStock)

    if deposito_id:
        query = query.filter(AjusteStock.deposito_id == deposito_id)

    if mes:
        query = query.filter(AjusteStock.mes_importacion == mes)

    if tipo:
        query = query.filter(AjusteStock.tipo_movimiento == tipo.upper())

    query = query.order_by(AjusteStock.fecha.desc())
    ajustes = query.offset(offset).limit(limit).all()

    return ajustes


@router.get("/resumen", response_model=ResumenAjustesResponse)
async def resumen_ajustes(
    deposito_id: Optional[int] = None,
    mes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    """
    Obtiene un resumen de los ajustes de stock.
    """
    # Base query
    filters = []
    params = {}

    if deposito_id:
        filters.append("deposito_id = :deposito_id")
        params["deposito_id"] = deposito_id

    if mes:
        filters.append("mes_importacion = :mes")
        params["mes"] = mes

    where_clause = " AND ".join(filters) if filters else "1=1"

    # Totales generales
    result = db.execute(text(f"""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN tipo_movimiento = 'INGRESO' THEN 1 ELSE 0 END) as ingresos,
            SUM(CASE WHEN tipo_movimiento = 'EGRESO' THEN 1 ELSE 0 END) as egresos,
            SUM(CASE WHEN tipo_movimiento = 'INGRESO' THEN cantidad ELSE -cantidad END) as cantidad_neta
        FROM ajustes_stock
        WHERE {where_clause}
    """), params).fetchone()

    total_ajustes = result[0] or 0
    total_ingresos = result[1] or 0
    total_egresos = result[2] or 0
    cantidad_neta = result[3] or 0

    # Meses disponibles
    meses_result = db.execute(text("""
        SELECT DISTINCT mes_importacion
        FROM ajustes_stock
        WHERE mes_importacion IS NOT NULL
        ORDER BY mes_importacion DESC
    """)).fetchall()
    meses_disponibles = [r[0] for r in meses_result]

    # Por depósito
    deposito_result = db.execute(text(f"""
        SELECT
            deposito_nombre,
            COUNT(*) as total,
            SUM(CASE WHEN tipo_movimiento = 'INGRESO' THEN cantidad ELSE 0 END) as ingresos,
            SUM(CASE WHEN tipo_movimiento = 'EGRESO' THEN cantidad ELSE 0 END) as egresos
        FROM ajustes_stock
        WHERE {where_clause}
        GROUP BY deposito_nombre
        ORDER BY total DESC
    """), params).fetchall()

    por_deposito = [
        {
            "deposito": r[0],
            "total_ajustes": r[1],
            "cantidad_ingresos": r[2] or 0,
            "cantidad_egresos": r[3] or 0
        }
        for r in deposito_result
    ]

    return ResumenAjustesResponse(
        total_ajustes=total_ajustes,
        total_ingresos=total_ingresos,
        total_egresos=total_egresos,
        cantidad_neta=cantidad_neta,
        meses_disponibles=meses_disponibles,
        por_deposito=por_deposito
    )


@router.delete("/limpiar")
async def limpiar_ajustes(
    mes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    """
    Elimina ajustes de stock. Si se proporciona mes, solo elimina ese mes.
    Si no, elimina todos los ajustes.
    """
    if mes:
        deleted = db.query(AjusteStock).filter(AjusteStock.mes_importacion == mes).delete()
    else:
        deleted = db.query(AjusteStock).delete()

    db.commit()

    return {"success": True, "deleted_rows": deleted}
