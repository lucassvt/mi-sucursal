from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from ..core.database import BaseAnexa


class Cliente(BaseAnexa):
    """Clientes registrados - reutilizable para otros sistemas"""
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(300), nullable=False)
    telefono = Column(String(50), nullable=False)
    email = Column(String(200), nullable=True)
    sucursal_id = Column(Integer, nullable=True, index=True)  # Sucursal donde se registró
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
