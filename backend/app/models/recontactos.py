from sqlalchemy import Column, Integer, String, DateTime, Date, Boolean, Text, ForeignKey
from sqlalchemy.sql import func
from ..core.database import BaseAnexa


class ClienteRecontacto(BaseAnexa):
    """Tabla para clientes a recontactar - BD mi_sucursal"""
    __tablename__ = "clientes_recontacto"

    id = Column(Integer, primary_key=True, index=True)
    sucursal_id = Column(Integer, nullable=False, index=True)

    # Datos del cliente
    cliente_codigo = Column(String(50), nullable=True, index=True)
    cliente_nombre = Column(String(300), nullable=False)
    cliente_telefono = Column(String(50), nullable=True)
    cliente_email = Column(String(200), nullable=True)

    # Datos de mascota
    mascota = Column(String(200), nullable=True)  # Nombre de la mascota
    especie = Column(String(50), nullable=True)  # Perro, Gato, etc.
    tamano = Column(String(50), nullable=True)  # Chico, Mediano, Grande
    marca_habitual = Column(String(200), nullable=True)  # Marca que suele comprar
    ultimo_producto = Column(String(500), nullable=True)  # Ultimo producto comprado

    # Datos de compra
    ultima_compra = Column(Date, nullable=True)
    dias_sin_comprar = Column(Integer, nullable=True)
    monto_ultima_compra = Column(String(50), nullable=True)

    # Estado: pendiente, contactado, no_interesado, recuperado, recordatorio
    estado = Column(String(30), default="pendiente", index=True)

    # Recordatorio personalizado
    recordatorio_motivo = Column(Text, nullable=True)
    recordatorio_dias = Column(Integer, nullable=True)
    recordatorio_fecha_proximo = Column(Date, nullable=True)
    recordatorio_activo = Column(Boolean, default=False)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Origen de datos
    importado = Column(Boolean, default=False)
    mes_importacion = Column(String(7), nullable=True)


class RegistroContacto(BaseAnexa):
    """Tabla para registrar contactos realizados a clientes - BD mi_sucursal"""
    __tablename__ = "registros_contacto"

    id = Column(Integer, primary_key=True, index=True)
    cliente_recontacto_id = Column(Integer, ForeignKey("clientes_recontacto.id"), nullable=False, index=True)
    employee_id = Column(Integer, nullable=False)
    sucursal_id = Column(Integer, nullable=False, index=True)

    # Datos del contacto
    fecha_contacto = Column(DateTime(timezone=True), server_default=func.now())
    medio = Column(String(30), nullable=False)  # telefono, whatsapp, email, presencial
    resultado = Column(String(50), nullable=False)  # contactado, no_contesta, numero_erroneo, interesado, no_interesado
    notas = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
