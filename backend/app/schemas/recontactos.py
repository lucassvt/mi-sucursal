from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List


class ClienteRecontactoCreate(BaseModel):
    cliente_codigo: Optional[str] = None
    cliente_nombre: str
    cliente_telefono: Optional[str] = None
    cliente_email: Optional[str] = None
    # Datos de mascota
    mascota: Optional[str] = None
    especie: Optional[str] = None
    tamano: Optional[str] = None
    marca_habitual: Optional[str] = None
    ultimo_producto: Optional[str] = None
    # Datos de compra
    ultima_compra: Optional[date] = None
    dias_sin_comprar: Optional[int] = None
    monto_ultima_compra: Optional[str] = None
    # Recordatorio opcional
    recordatorio_motivo: Optional[str] = None
    recordatorio_dias: Optional[int] = None


class ClienteRecontactoResponse(BaseModel):
    id: int
    sucursal_id: int
    cliente_codigo: Optional[str]
    cliente_nombre: str
    cliente_telefono: Optional[str]
    cliente_email: Optional[str]
    # Datos de mascota
    mascota: Optional[str] = None
    especie: Optional[str] = None
    tamano: Optional[str] = None
    marca_habitual: Optional[str] = None
    ultimo_producto: Optional[str] = None
    # Datos de compra
    ultima_compra: Optional[date]
    dias_sin_comprar: Optional[int]
    monto_ultima_compra: Optional[str]
    estado: str
    created_at: datetime
    importado: bool
    cantidad_contactos: Optional[int] = None
    ultimo_contacto: Optional[datetime] = None
    ultimo_contacto_resultado: Optional[str] = None
    ultimo_contacto_notas: Optional[str] = None
    ultimo_contacto_medio: Optional[str] = None
    ultimo_contacto_employee: Optional[str] = None
    # Recordatorio
    recordatorio_motivo: Optional[str] = None
    recordatorio_dias: Optional[int] = None
    recordatorio_fecha_proximo: Optional[date] = None
    recordatorio_activo: Optional[bool] = False

    class Config:
        from_attributes = True


class RegistroContactoCreate(BaseModel):
    cliente_recontacto_id: int
    medio: str  # telefono, whatsapp, email, presencial
    resultado: str  # contactado, no_contesta, numero_erroneo, interesado, no_interesado
    notas: Optional[str] = None
    # Recordatorio opcional
    recordatorio_motivo: Optional[str] = None
    recordatorio_dias: Optional[int] = None


class RegistroContactoResponse(BaseModel):
    id: int
    cliente_recontacto_id: int
    employee_id: int
    fecha_contacto: datetime
    medio: str
    resultado: str
    notas: Optional[str]
    employee_nombre: Optional[str] = None

    class Config:
        from_attributes = True


class RecontactosResumen(BaseModel):
    total_clientes: int
    pendientes: int
    contactados_hoy: int
    contactados_semana: int
    recuperados: int
    no_interesados: int
    recordatorios: int = 0
    por_estado: dict


class ImportRecontactosResult(BaseModel):
    success: bool
    registros_importados: int
    registros_actualizados: int
    errores: List[str]
