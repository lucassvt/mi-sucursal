"""
Endpoints para gestion de recontacto de clientes

Los clientes se pueden importar desde un sistema externo o registrar manualmente.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import text, func as sql_func
from typing import List, Optional
from datetime import datetime, date, timedelta
import csv
import io

from ..core.database import get_db, get_db_anexa
from ..core.security import get_current_user, es_encargado
from ..models.employee import Employee, SucursalInfo
from ..models.recontactos import ClienteRecontacto, RegistroContacto
from ..schemas.recontactos import (
    ClienteRecontactoCreate,
    ClienteRecontactoResponse,
    RegistroContactoCreate,
    RegistroContactoResponse,
    RecontactosResumen,
    ImportRecontactosResult
)

router = APIRouter(prefix="/api/recontactos", tags=["recontactos"])


# ===== Helper functions =====

def parse_date(date_str: str) -> Optional[date]:
    """Convierte fecha en varios formatos a date"""
    if not date_str:
        return None
    formats = ["%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"]
    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt).date()
        except:
            continue
    return None


def get_sucursal_dux_id(db_dux: Session, sucursal_id: int) -> int:
    """Obtiene el dux_id de una sucursal desde la BD DUX"""
    result = db_dux.execute(
        text("SELECT dux_id FROM sucursales WHERE id = :id"),
        {"id": sucursal_id}
    ).fetchone()
    return result[0] if result else sucursal_id


# ===== Endpoints =====

@router.get("/", response_model=List[ClienteRecontactoResponse])
async def listar_clientes(
    estado: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Lista clientes a recontactar de la sucursal"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    sucursal_dux_id = get_sucursal_dux_id(db_dux, current_user.sucursal_id)

    query = db_anexa.query(ClienteRecontacto).filter(
        ClienteRecontacto.sucursal_id == sucursal_dux_id
    )

    if estado:
        query = query.filter(ClienteRecontacto.estado == estado)

    query = query.order_by(ClienteRecontacto.dias_sin_comprar.desc().nullslast())
    clientes = query.offset(offset).limit(limit).all()

    # Agregar info de contactos
    result = []
    for c in clientes:
        response = ClienteRecontactoResponse.model_validate(c)

        # Contar contactos
        contactos_count = db_anexa.query(RegistroContacto).filter(
            RegistroContacto.cliente_recontacto_id == c.id
        ).count()
        response.cantidad_contactos = contactos_count

        # Ultimo contacto
        ultimo = db_anexa.query(RegistroContacto).filter(
            RegistroContacto.cliente_recontacto_id == c.id
        ).order_by(RegistroContacto.fecha_contacto.desc()).first()
        if ultimo:
            response.ultimo_contacto = ultimo.fecha_contacto

        result.append(response)

    return result


@router.post("/", response_model=ClienteRecontactoResponse)
async def crear_cliente(
    data: ClienteRecontactoCreate,
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Registra un nuevo cliente a recontactar"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    sucursal_dux_id = get_sucursal_dux_id(db_dux, current_user.sucursal_id)

    cliente = ClienteRecontacto(
        sucursal_id=sucursal_dux_id,
        cliente_codigo=data.cliente_codigo,
        cliente_nombre=data.cliente_nombre,
        cliente_telefono=data.cliente_telefono,
        cliente_email=data.cliente_email,
        mascota=data.mascota,
        especie=data.especie,
        tamano=data.tamano,
        marca_habitual=data.marca_habitual,
        ultimo_producto=data.ultimo_producto,
        ultima_compra=data.ultima_compra,
        dias_sin_comprar=data.dias_sin_comprar,
        monto_ultima_compra=data.monto_ultima_compra,
        estado="pendiente",
        importado=False
    )

    db_anexa.add(cliente)
    db_anexa.commit()
    db_anexa.refresh(cliente)

    return ClienteRecontactoResponse.model_validate(cliente)


@router.post("/registrar-contacto", response_model=RegistroContactoResponse)
async def registrar_contacto(
    data: RegistroContactoCreate,
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Registra un contacto realizado a un cliente"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    sucursal_dux_id = get_sucursal_dux_id(db_dux, current_user.sucursal_id)

    # Verificar que el cliente existe y pertenece a la sucursal
    cliente = db_anexa.query(ClienteRecontacto).filter(
        ClienteRecontacto.id == data.cliente_recontacto_id,
        ClienteRecontacto.sucursal_id == sucursal_dux_id
    ).first()

    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # Crear registro de contacto
    contacto = RegistroContacto(
        cliente_recontacto_id=data.cliente_recontacto_id,
        employee_id=current_user.id,
        sucursal_id=sucursal_dux_id,
        medio=data.medio,
        resultado=data.resultado,
        notas=data.notas
    )

    db_anexa.add(contacto)

    # Actualizar estado del cliente segun resultado
    if data.resultado == "interesado" or data.resultado == "recuperado":
        cliente.estado = "recuperado"
    elif data.resultado == "no_interesado":
        cliente.estado = "no_interesado"
    elif data.resultado == "deceso":
        cliente.estado = "deceso"
    elif data.resultado in ["contactado", "no_contesta", "numero_erroneo"]:
        cliente.estado = "contactado"

    db_anexa.commit()
    db_anexa.refresh(contacto)

    response = RegistroContactoResponse.model_validate(contacto)
    response.employee_nombre = f"{current_user.nombre} {current_user.apellido or ''}".strip()
    return response


@router.get("/{cliente_id}/contactos", response_model=List[RegistroContactoResponse])
async def listar_contactos_cliente(
    cliente_id: int,
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Lista el historial de contactos de un cliente"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    sucursal_dux_id = get_sucursal_dux_id(db_dux, current_user.sucursal_id)

    # Verificar que el cliente pertenece a la sucursal
    cliente = db_anexa.query(ClienteRecontacto).filter(
        ClienteRecontacto.id == cliente_id,
        ClienteRecontacto.sucursal_id == sucursal_dux_id
    ).first()

    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    contactos = db_anexa.query(RegistroContacto).filter(
        RegistroContacto.cliente_recontacto_id == cliente_id
    ).order_by(RegistroContacto.fecha_contacto.desc()).all()

    return [RegistroContactoResponse.model_validate(c) for c in contactos]


@router.get("/resumen", response_model=RecontactosResumen)
async def resumen_recontactos(
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Obtiene resumen de clientes a recontactar"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    sucursal_dux_id = get_sucursal_dux_id(db_dux, current_user.sucursal_id)

    hoy = date.today()
    inicio_semana = hoy - timedelta(days=hoy.weekday())

    # Conteos
    result = db_anexa.execute(text("""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
            SUM(CASE WHEN estado = 'recuperado' THEN 1 ELSE 0 END) as recuperados,
            SUM(CASE WHEN estado = 'no_interesado' THEN 1 ELSE 0 END) as no_interesados
        FROM clientes_recontacto
        WHERE sucursal_id = :sucursal_id
    """), {"sucursal_id": sucursal_dux_id}).fetchone()

    # Contactados hoy
    contactados_hoy = db_anexa.execute(text("""
        SELECT COUNT(DISTINCT cliente_recontacto_id)
        FROM registros_contacto
        WHERE sucursal_id = :sucursal_id
        AND DATE(fecha_contacto) = :hoy
    """), {"sucursal_id": sucursal_dux_id, "hoy": hoy}).fetchone()[0] or 0

    # Contactados esta semana
    contactados_semana = db_anexa.execute(text("""
        SELECT COUNT(DISTINCT cliente_recontacto_id)
        FROM registros_contacto
        WHERE sucursal_id = :sucursal_id
        AND fecha_contacto >= :inicio_semana
    """), {"sucursal_id": sucursal_dux_id, "inicio_semana": inicio_semana}).fetchone()[0] or 0

    # Por estado
    estados_result = db_anexa.execute(text("""
        SELECT estado, COUNT(*) as cantidad
        FROM clientes_recontacto
        WHERE sucursal_id = :sucursal_id
        GROUP BY estado
    """), {"sucursal_id": sucursal_dux_id}).fetchall()

    por_estado = {r[0]: r[1] for r in estados_result}

    return RecontactosResumen(
        total_clientes=result[0] or 0,
        pendientes=result[1] or 0,
        contactados_hoy=contactados_hoy,
        contactados_semana=contactados_semana,
        recuperados=result[2] or 0,
        no_interesados=result[3] or 0,
        por_estado=por_estado
    )


@router.get("/resumen-todas")
async def resumen_recontactos_todas(
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Resumen de recontactos de TODAS las sucursales (solo encargados)"""
    if not es_encargado(current_user):
        raise HTTPException(status_code=403, detail="Solo encargados pueden ver todas las sucursales")

    hoy = date.today()
    inicio_semana = hoy - timedelta(days=hoy.weekday())

    # Resumen por sucursal
    rows = db_anexa.execute(text("""
        SELECT
            cr.sucursal_id,
            COUNT(*) as total_clientes,
            SUM(CASE WHEN cr.estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
            SUM(CASE WHEN cr.estado = 'contactado' THEN 1 ELSE 0 END) as contactados,
            SUM(CASE WHEN cr.estado = 'recuperado' THEN 1 ELSE 0 END) as recuperados,
            SUM(CASE WHEN cr.estado = 'no_interesado' THEN 1 ELSE 0 END) as no_interesados,
            SUM(CASE WHEN cr.estado = 'deceso' THEN 1 ELSE 0 END) as decesos
        FROM clientes_recontacto cr
        GROUP BY cr.sucursal_id
        ORDER BY total_clientes DESC
    """)).fetchall()

    # Contactados esta semana por sucursal
    contactos_semana = db_anexa.execute(text("""
        SELECT sucursal_id, COUNT(DISTINCT cliente_recontacto_id) as contactados_semana
        FROM registros_contacto
        WHERE fecha_contacto >= :inicio_semana
        GROUP BY sucursal_id
    """), {"inicio_semana": inicio_semana}).fetchall()

    contactos_semana_map = {r[0]: r[1] for r in contactos_semana}

    # Contactados hoy por sucursal
    contactos_hoy = db_anexa.execute(text("""
        SELECT sucursal_id, COUNT(DISTINCT cliente_recontacto_id) as contactados_hoy
        FROM registros_contacto
        WHERE DATE(fecha_contacto) = :hoy
        GROUP BY sucursal_id
    """), {"hoy": hoy}).fetchall()

    contactos_hoy_map = {r[0]: r[1] for r in contactos_hoy}

    # Obtener nombres de sucursales desde BD DUX
    sucursal_ids = [row[0] for row in rows]
    sucursal_map = {}
    if sucursal_ids:
        sucursales = db_dux.query(SucursalInfo).filter(SucursalInfo.dux_id.in_(sucursal_ids)).all()
        sucursal_map = {s.dux_id: s.nombre for s in sucursales}

    return [
        {
            "sucursal_id": row[0],
            "sucursal_nombre": sucursal_map.get(row[0], f"Sucursal {row[0]}"),
            "total_clientes": row[1] or 0,
            "pendientes": row[2] or 0,
            "contactados": row[3] or 0,
            "recuperados": row[4] or 0,
            "no_interesados": row[5] or 0,
            "decesos": row[6] or 0,
            "contactados_semana": contactos_semana_map.get(row[0], 0),
            "contactados_hoy": contactos_hoy_map.get(row[0], 0),
        }
        for row in rows
    ]


@router.post("/importar", response_model=ImportRecontactosResult)
async def importar_clientes(
    file: UploadFile = File(...),
    mes: Optional[str] = None,
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """
    Importa clientes a recontactar desde un CSV.

    Columnas esperadas:
    - Codigo: codigo del cliente (opcional)
    - Nombre: nombre del cliente
    - Telefono: telefono (opcional)
    - Email: email (opcional)
    - Mascota: nombre de la mascota (opcional)
    - Especie: perro, gato, etc. (opcional)
    - Tamaño/Tamano: chico, mediano, grande (opcional)
    - Marca Habitual/Marca: marca que suele comprar (opcional)
    - Ultimo Producto/Producto: ultimo producto comprado (opcional)
    - Ultima Compra: fecha de ultima compra (opcional)
    - Dias Sin Comprar: dias desde ultima compra (opcional)
    - Monto: monto de ultima compra (opcional)
    """
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un CSV")

    sucursal_dux_id = get_sucursal_dux_id(db_dux, current_user.sucursal_id)

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

        delimiter = ';' if ';' in text_content[:500] else ','
        csv_reader = csv.DictReader(io.StringIO(text_content), delimiter=delimiter)

        row_num = 0
        for row in csv_reader:
            row_num += 1

            try:
                cliente_codigo = row.get('Codigo', row.get('codigo', row.get('Código', ''))).strip()
                cliente_nombre = row.get('Nombre', row.get('nombre', row.get('Cliente', ''))).strip()
                telefono = row.get('Telefono', row.get('telefono', row.get('Teléfono', row.get('Numero', row.get('numero', ''))))).strip()
                email = row.get('Email', row.get('email', row.get('Correo', ''))).strip()

                # Datos de mascota
                mascota = row.get('Mascota', row.get('mascota', row.get('Nombre Mascota', ''))).strip()
                especie = row.get('Especie', row.get('especie', row.get('Tipo', row.get('tipo', '')))).strip()
                tamano = row.get('Tamaño', row.get('Tamano', row.get('tamano', row.get('tamaño', row.get('Talla', ''))))).strip()
                marca_habitual = row.get('Marca Habitual', row.get('Marca', row.get('marca', row.get('marca_habitual', '')))).strip()
                ultimo_producto = row.get('Ultimo Producto', row.get('Producto', row.get('producto', row.get('ultimo_producto', '')))).strip()

                # Datos de compra
                fecha_str = row.get('Ultima Compra', row.get('ultima_compra', row.get('Fecha', ''))).strip()
                dias_str = row.get('Dias Sin Comprar', row.get('dias_sin_comprar', row.get('Dias', ''))).strip()
                monto = row.get('Monto', row.get('monto', '')).strip()

                if not cliente_nombre:
                    errors.append(f"Fila {row_num}: Nombre vacio")
                    continue

                ultima_compra = parse_date(fecha_str)

                try:
                    dias_sin_comprar = int(dias_str) if dias_str else None
                except:
                    dias_sin_comprar = None

                # Verificar si ya existe
                existente = db_anexa.query(ClienteRecontacto).filter(
                    ClienteRecontacto.sucursal_id == sucursal_dux_id,
                    ClienteRecontacto.cliente_nombre == cliente_nombre
                ).first()

                if existente:
                    # Actualizar campos existentes
                    if telefono:
                        existente.cliente_telefono = telefono
                    if email:
                        existente.cliente_email = email
                    if mascota:
                        existente.mascota = mascota
                    if especie:
                        existente.especie = especie
                    if tamano:
                        existente.tamano = tamano
                    if marca_habitual:
                        existente.marca_habitual = marca_habitual
                    if ultimo_producto:
                        existente.ultimo_producto = ultimo_producto
                    if ultima_compra:
                        existente.ultima_compra = ultima_compra
                    if dias_sin_comprar:
                        existente.dias_sin_comprar = dias_sin_comprar
                    if monto:
                        existente.monto_ultima_compra = monto
                    actualizados += 1
                else:
                    # Crear nuevo
                    cliente = ClienteRecontacto(
                        sucursal_id=sucursal_dux_id,
                        cliente_codigo=cliente_codigo or None,
                        cliente_nombre=cliente_nombre,
                        cliente_telefono=telefono or None,
                        cliente_email=email or None,
                        mascota=mascota or None,
                        especie=especie or None,
                        tamano=tamano or None,
                        marca_habitual=marca_habitual or None,
                        ultimo_producto=ultimo_producto or None,
                        ultima_compra=ultima_compra,
                        dias_sin_comprar=dias_sin_comprar,
                        monto_ultima_compra=monto or None,
                        estado="pendiente",
                        importado=True,
                        mes_importacion=mes or datetime.now().strftime("%Y-%m")
                    )
                    db_anexa.add(cliente)
                    importados += 1

            except Exception as e:
                errors.append(f"Fila {row_num}: Error - {str(e)}")

        db_anexa.commit()

    except HTTPException:
        raise
    except Exception as e:
        db_anexa.rollback()
        raise HTTPException(status_code=500, detail=f"Error procesando CSV: {str(e)}")

    return ImportRecontactosResult(
        success=importados > 0 or actualizados > 0,
        registros_importados=importados,
        registros_actualizados=actualizados,
        errores=errors[:20]
    )


@router.put("/{cliente_id}/estado")
async def actualizar_estado_cliente(
    cliente_id: int,
    estado: str,
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Actualiza el estado de un cliente"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    sucursal_dux_id = get_sucursal_dux_id(db_dux, current_user.sucursal_id)

    cliente = db_anexa.query(ClienteRecontacto).filter(
        ClienteRecontacto.id == cliente_id,
        ClienteRecontacto.sucursal_id == sucursal_dux_id
    ).first()

    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    cliente.estado = estado
    db_anexa.commit()

    return {"success": True, "message": "Estado actualizado"}


@router.delete("/{cliente_id}")
async def eliminar_cliente(
    cliente_id: int,
    current_user: Employee = Depends(get_current_user),
    db_dux: Session = Depends(get_db),
    db_anexa: Session = Depends(get_db_anexa)
):
    """Elimina un cliente de la lista de recontacto"""
    if not current_user.sucursal_id:
        raise HTTPException(status_code=400, detail="Usuario sin sucursal asignada")

    sucursal_dux_id = get_sucursal_dux_id(db_dux, current_user.sucursal_id)

    cliente = db_anexa.query(ClienteRecontacto).filter(
        ClienteRecontacto.id == cliente_id,
        ClienteRecontacto.sucursal_id == sucursal_dux_id
    ).first()

    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # Eliminar registros de contacto asociados
    db_anexa.query(RegistroContacto).filter(
        RegistroContacto.cliente_recontacto_id == cliente_id
    ).delete()

    db_anexa.delete(cliente)
    db_anexa.commit()

    return {"success": True, "message": "Cliente eliminado"}
