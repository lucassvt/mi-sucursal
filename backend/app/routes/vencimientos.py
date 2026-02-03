"""
Endpoints para gestion de vencimientos de productos

Los datos se pueden importar desde Google Sheets (CSV) o registrar manualmente.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from datetime import datetime, date, timedelta
import csv
import io

from ..core.database import get_db
from ..core.security import get_current_user
from ..models.employee import Employee
from ..models.vencimientos import ProductoVencimiento
from ..schemas.vencimientos import (
    VencimientoCreate,
    VencimientoUpdate,
    VencimientoResponse,
    VencimientoResumen,
    ImportVencimientosResult
)

router = APIRouter(prefix="/api/vencimientos", tags=["vencimientos"])


# ===== Helper functions =====

def parse_date(date_str: str) -> Optional[date]:
    """Convierte fecha en varios formatos a date"""
    formats = ["%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"]
    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt).date()
        except:
            continue
    return None


def get_sucursal_dux_id(db: Session, sucursal_id: int) -> int:
    """Obtiene el dux_id de una sucursal"""
    result = db.execute(
        text("SELECT dux_id FROM sucursales WHERE id = :id"),
        {"id": sucursal_id}
    ).fetchone()
    return result[0] if result else sucursal_id


def calculate_dias_para_vencer(fecha_vencimiento: date) -> int:
    """Calcula los dias que faltan para el vencimiento"""
    today = date.today()
    delta = fecha_vencimiento - today
    return delta.days


# ===== Endpoints =====

@router.get("/", response_model=List[VencimientoResponse])
async def listar_vencimientos(
    estado: Optional[str] = None,  # proximo, vencido, retirado
    dias_limite: Optional[int] = None,  # Solo proximos a vencer en X dias
    limit: int = 100,
    offset: int = 0,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista productos por vencer o vencidos de la sucursal"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    sucursal_dux_id = get_sucursal_dux_id(db, current_user.sucursal_id)

    query = db.query(ProductoVencimiento).filter(
        ProductoVencimiento.sucursal_id == sucursal_dux_id
    )

    if estado:
        query = query.filter(ProductoVencimiento.estado == estado)

    if dias_limite:
        fecha_limite = date.today() + timedelta(days=dias_limite)
        query = query.filter(ProductoVencimiento.fecha_vencimiento <= fecha_limite)
        query = query.filter(ProductoVencimiento.estado == "proximo")

    query = query.order_by(ProductoVencimiento.fecha_vencimiento.asc())
    vencimientos = query.offset(offset).limit(limit).all()

    # Agregar dias para vencer a cada registro
    result = []
    for v in vencimientos:
        response = VencimientoResponse.model_validate(v)
        response.dias_para_vencer = calculate_dias_para_vencer(v.fecha_vencimiento)
        result.append(response)

    return result


@router.post("/", response_model=VencimientoResponse)
async def crear_vencimiento(
    data: VencimientoCreate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Registra un nuevo producto proximo a vencer o vencido"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    sucursal_dux_id = get_sucursal_dux_id(db, current_user.sucursal_id)

    # Determinar estado basado en fecha
    estado = data.estado
    if data.fecha_vencimiento < date.today():
        estado = "vencido"

    vencimiento = ProductoVencimiento(
        sucursal_id=sucursal_dux_id,
        employee_id=current_user.id,
        cod_item=data.cod_item,
        producto=data.producto,
        cantidad=data.cantidad,
        lote=data.lote,
        fecha_vencimiento=data.fecha_vencimiento,
        estado=estado,
        notas=data.notas,
        importado=False
    )

    db.add(vencimiento)
    db.commit()
    db.refresh(vencimiento)

    response = VencimientoResponse.model_validate(vencimiento)
    response.dias_para_vencer = calculate_dias_para_vencer(vencimiento.fecha_vencimiento)
    return response


@router.put("/{vencimiento_id}", response_model=VencimientoResponse)
async def actualizar_vencimiento(
    vencimiento_id: int,
    data: VencimientoUpdate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualiza el estado de un producto (ej: marcar como retirado)"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    sucursal_dux_id = get_sucursal_dux_id(db, current_user.sucursal_id)

    vencimiento = db.query(ProductoVencimiento).filter(
        ProductoVencimiento.id == vencimiento_id,
        ProductoVencimiento.sucursal_id == sucursal_dux_id
    ).first()

    if not vencimiento:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    vencimiento.estado = data.estado
    if data.notas:
        vencimiento.notas = data.notas
    if data.estado == "retirado":
        vencimiento.fecha_retiro = datetime.now()

    db.commit()
    db.refresh(vencimiento)

    response = VencimientoResponse.model_validate(vencimiento)
    response.dias_para_vencer = calculate_dias_para_vencer(vencimiento.fecha_vencimiento)
    return response


@router.get("/resumen", response_model=VencimientoResumen)
async def resumen_vencimientos(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene resumen de productos por vencer"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    sucursal_dux_id = get_sucursal_dux_id(db, current_user.sucursal_id)

    hoy = date.today()
    en_7_dias = hoy + timedelta(days=7)
    en_30_dias = hoy + timedelta(days=30)

    # Conteo por estados
    result = db.execute(text("""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN estado = 'proximo' AND fecha_vencimiento <= :en_7_dias AND fecha_vencimiento >= :hoy THEN 1 ELSE 0 END) as por_vencer_semana,
            SUM(CASE WHEN estado = 'proximo' AND fecha_vencimiento <= :en_30_dias AND fecha_vencimiento >= :hoy THEN 1 ELSE 0 END) as por_vencer_mes,
            SUM(CASE WHEN estado = 'vencido' OR (estado = 'proximo' AND fecha_vencimiento < :hoy) THEN 1 ELSE 0 END) as vencidos,
            SUM(CASE WHEN estado = 'retirado' THEN 1 ELSE 0 END) as retirados
        FROM productos_vencimientos
        WHERE sucursal_id = :sucursal_id
    """), {
        "sucursal_id": sucursal_dux_id,
        "hoy": hoy,
        "en_7_dias": en_7_dias,
        "en_30_dias": en_30_dias
    }).fetchone()

    # Conteo por estado
    estados_result = db.execute(text("""
        SELECT estado, COUNT(*) as cantidad
        FROM productos_vencimientos
        WHERE sucursal_id = :sucursal_id
        GROUP BY estado
    """), {"sucursal_id": sucursal_dux_id}).fetchall()

    por_estado = {r[0]: r[1] for r in estados_result}

    return VencimientoResumen(
        total_registros=result[0] or 0,
        por_vencer_semana=result[1] or 0,
        por_vencer_mes=result[2] or 0,
        vencidos=result[3] or 0,
        retirados=result[4] or 0,
        por_estado=por_estado
    )


@router.post("/importar-csv", response_model=ImportVencimientosResult)
async def importar_csv(
    file: UploadFile = File(...),
    mes: Optional[str] = None,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Importa productos por vencer desde un CSV de Google Sheets.

    Columnas esperadas:
    - Codigo: codigo del producto (opcional)
    - Producto: nombre del producto
    - Cantidad: cantidad de unidades
    - Lote: numero de lote (opcional)
    - Fecha Vencimiento: fecha en formato DD/MM/YYYY
    """
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un CSV")

    sucursal_dux_id = get_sucursal_dux_id(db, current_user.sucursal_id)

    errors = []
    importados = 0
    actualizados = 0

    try:
        content = await file.read()
        for encoding in ['utf-8', 'latin-1', 'cp1252']:
            try:
                text_content = content.decode(encoding)
                break
            except:
                continue
        else:
            raise HTTPException(status_code=400, detail="No se pudo decodificar el archivo CSV")

        # Detectar delimitador
        delimiter = ';' if ';' in text_content[:500] else ','
        csv_reader = csv.DictReader(io.StringIO(text_content), delimiter=delimiter)

        row_num = 0
        for row in csv_reader:
            row_num += 1

            try:
                # Buscar columnas con diferentes nombres posibles
                cod_item = row.get('Codigo', row.get('Código', row.get('codigo', ''))).strip()
                producto = row.get('Producto', row.get('producto', row.get('Descripcion', ''))).strip()
                cantidad_str = row.get('Cantidad', row.get('cantidad', '1')).strip()
                lote = row.get('Lote', row.get('lote', '')).strip()
                fecha_str = row.get('Fecha Vencimiento', row.get('Vencimiento', row.get('fecha_vencimiento', ''))).strip()

                if not producto:
                    errors.append(f"Fila {row_num}: Producto vacio")
                    continue

                fecha_vencimiento = parse_date(fecha_str)
                if not fecha_vencimiento:
                    errors.append(f"Fila {row_num}: Fecha invalida '{fecha_str}'")
                    continue

                try:
                    cantidad = int(cantidad_str.replace(',', '.').split('.')[0])
                except:
                    cantidad = 1

                # Determinar estado
                estado = "vencido" if fecha_vencimiento < date.today() else "proximo"

                # Crear registro
                vencimiento = ProductoVencimiento(
                    sucursal_id=sucursal_dux_id,
                    employee_id=current_user.id,
                    cod_item=cod_item or None,
                    producto=producto,
                    cantidad=cantidad,
                    lote=lote or None,
                    fecha_vencimiento=fecha_vencimiento,
                    estado=estado,
                    importado=True,
                    mes_importacion=mes or datetime.now().strftime("%Y-%m")
                )
                db.add(vencimiento)
                importados += 1

            except Exception as e:
                errors.append(f"Fila {row_num}: Error - {str(e)}")

        db.commit()

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error procesando CSV: {str(e)}")

    return ImportVencimientosResult(
        success=importados > 0,
        registros_importados=importados,
        registros_actualizados=actualizados,
        errores=errors[:20]
    )


@router.delete("/{vencimiento_id}")
async def eliminar_vencimiento(
    vencimiento_id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Elimina un registro de vencimiento"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    sucursal_dux_id = get_sucursal_dux_id(db, current_user.sucursal_id)

    vencimiento = db.query(ProductoVencimiento).filter(
        ProductoVencimiento.id == vencimiento_id,
        ProductoVencimiento.sucursal_id == sucursal_dux_id
    ).first()

    if not vencimiento:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    db.delete(vencimiento)
    db.commit()

    return {"success": True, "message": "Registro eliminado"}


@router.delete("/limpiar")
async def limpiar_vencimientos(
    mes: Optional[str] = None,
    solo_retirados: bool = False,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Elimina registros de vencimientos"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    sucursal_dux_id = get_sucursal_dux_id(db, current_user.sucursal_id)

    query = db.query(ProductoVencimiento).filter(
        ProductoVencimiento.sucursal_id == sucursal_dux_id
    )

    if mes:
        query = query.filter(ProductoVencimiento.mes_importacion == mes)

    if solo_retirados:
        query = query.filter(ProductoVencimiento.estado == "retirado")

    deleted = query.delete()
    db.commit()

    return {"success": True, "deleted_rows": deleted}
