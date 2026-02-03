from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List


class VencimientoCreate(BaseModel):
    cod_item: Optional[str] = None
    producto: str
    cantidad: int = 1
    lote: Optional[str] = None
    fecha_vencimiento: date
    estado: str = "proximo"
    notas: Optional[str] = None


class VencimientoUpdate(BaseModel):
    estado: str
    notas: Optional[str] = None


class VencimientoResponse(BaseModel):
    id: int
    sucursal_id: int
    employee_id: Optional[int]
    cod_item: Optional[str]
    producto: str
    cantidad: int
    lote: Optional[str]
    fecha_vencimiento: date
    fecha_registro: datetime
    estado: str
    fecha_retiro: Optional[datetime]
    notas: Optional[str]
    importado: bool
    dias_para_vencer: Optional[int] = None

    class Config:
        from_attributes = True


class VencimientoResumen(BaseModel):
    total_registros: int
    por_vencer_semana: int
    por_vencer_mes: int
    vencidos: int
    retirados: int
    por_estado: dict


class ImportVencimientosResult(BaseModel):
    success: bool
    registros_importados: int
    registros_actualizados: int
    errores: List[str]
