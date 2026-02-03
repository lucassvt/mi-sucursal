from sqlalchemy import Column, Integer, String, DateTime, Date, Boolean, Text, ForeignKey
from sqlalchemy.sql import func
from ..core.database import Base


class ClienteRecontacto(Base):
    """Tabla para clientes a recontactar"""
    __tablename__ = "clientes_recontacto"

    id = Column(Integer, primary_key=True, index=True)
    sucursal_id = Column(Integer, nullable=False, index=True)

    # Datos del cliente
    cliente_codigo = Column(String(50), nullable=True, index=True)
    cliente_nombre = Column(String(300), nullable=False)
    cliente_telefono = Column(String(50), nullable=True)
    cliente_email = Column(String(200), nullable=True)

    # Datos de compra
    ultima_compra = Column(Date, nullable=True)
    dias_sin_comprar = Column(Integer, nullable=True)
    monto_ultima_compra = Column(String(50), nullable=True)

    # Estado: pendiente, contactado, no_interesado, recuperado
    estado = Column(String(30), default="pendiente", index=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Origen de datos
    importado = Column(Boolean, default=False)
    mes_importacion = Column(String(7), nullable=True)


class RegistroContacto(Base):
    """Tabla para registrar contactos realizados a clientes"""
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
