from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List


# Opciones de acción comercial
ACCIONES_COMERCIALES = [
    "descuento",      # Venta con descuento
    "promocion",      # 2x1, combo, etc.
    "devolucion",     # Devolver a proveedor
    "destruccion",    # Destruir/tirar
    "donacion",       # Donar
    "consumo_interno" # Uso interno/muestras
]


class VencimientoCreate(BaseModel):
    cod_item: Optional[str] = None
    producto: str
    cantidad: int = 1
    fecha_vencimiento: date
    estado: str = "proximo"
    notas: Optional[str] = None
    # Valorización
    precio_unitario: Optional[float] = None
    # Acción comercial
    tiene_accion_comercial: bool = False
    accion_comercial: Optional[str] = None
    porcentaje_descuento: Optional[int] = None
    # Rotación
    sucursal_destino_id: Optional[int] = None
    sucursal_destino_nombre: Optional[str] = None
    fecha_movimiento: Optional[date] = None


class VencimientoUpdate(BaseModel):
    estado: Optional[str] = None
    notas: Optional[str] = None
    # Acción comercial
    tiene_accion_comercial: Optional[bool] = None
    accion_comercial: Optional[str] = None
    porcentaje_descuento: Optional[int] = None
    # Rotación
    sucursal_destino_id: Optional[int] = None
    sucursal_destino_nombre: Optional[str] = None
    fecha_movimiento: Optional[date] = None


class VencimientoResponse(BaseModel):
    id: int
    sucursal_id: int
    employee_id: Optional[int]
    cod_item: Optional[str]
    producto: str
    cantidad: int
    fecha_vencimiento: date
    fecha_registro: datetime
    estado: str
    fecha_retiro: Optional[datetime]
    notas: Optional[str]
    importado: bool
    dias_para_vencer: Optional[int] = None
    # Valorización
    precio_unitario: Optional[float] = None
    valor_total: Optional[float] = None
    # Acción comercial
    tiene_accion_comercial: bool = False
    accion_comercial: Optional[str] = None
    porcentaje_descuento: Optional[int] = None
    # Rotación
    sucursal_destino_id: Optional[int] = None
    sucursal_destino_nombre: Optional[str] = None
    fecha_movimiento: Optional[date] = None
    # Origen (cuando fue recibido de otra sucursal)
    sucursal_origen_id: Optional[int] = None
    sucursal_origen_nombre: Optional[str] = None

    class Config:
        from_attributes = True


class VencimientoResumen(BaseModel):
    total_registros: int
    por_vencer_semana: int
    por_vencer_mes: int
    vencidos: int
    retirados: int
    archivados: int = 0
    por_estado: dict
    # Valorización
    valor_total_vencidos: Optional[float] = None
    valor_total_proximos: Optional[float] = None


class ImportVencimientosResult(BaseModel):
    success: bool
    registros_importados: int
    registros_actualizados: int
    errores: List[str]
