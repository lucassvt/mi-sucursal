from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..core.database import Base


class Sucursal(Base):
    """Tabla sucursal_central de dux_integrada"""
    __tablename__ = "sucursal_central"

    id = Column(Integer, primary_key=True, index=True)
    id_empresa = Column(Integer)
    sucursal = Column(String(200), nullable=False)
    synced_at = Column(DateTime(timezone=True))


class Employee(Base):
    """Tabla employees de dux_integrada"""
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    dux_id = Column(Integer, unique=True)
    usuario = Column(String(100), index=True)
    nombre = Column(String(200), nullable=False)
    apellido = Column(String(200))
    email = Column(String(200))
    telefono = Column(String(50))
    foto_perfil_url = Column(String(500))
    password_hash = Column(String(255))
    sucursal_id = Column(Integer, ForeignKey("sucursales.id"))
    rol = Column(String(50))
    puesto = Column(String(50))
    frase_estado = Column(String(300))
    activo = Column(Boolean, default=True)
    nivel = Column(String(50), default="vendedor")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class SucursalInfo(Base):
    """Tabla sucursales de dux_integrada (para info de sucursales)"""
    __tablename__ = "sucursales"

    id = Column(Integer, primary_key=True, index=True)
    dux_id = Column(Integer, unique=True)
    codigo = Column(String(20))
    nombre = Column(String(200), nullable=False)
    direccion = Column(String(300))
    telefono = Column(String(50))
    deposito_id = Column(Integer)
    tiene_veterinaria = Column(Boolean)
    tiene_peluqueria = Column(Boolean)
    activo = Column(Boolean)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True))
