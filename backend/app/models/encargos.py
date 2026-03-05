from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from ..core.database import BaseAnexa


class Encargo(BaseAnexa):
    """Encargos de productos especiales para clientes"""
    __tablename__ = "encargos"

    id = Column(Integer, primary_key=True, index=True)
    sucursal_id = Column(Integer, nullable=False, index=True)
    employee_id = Column(Integer, nullable=False)
    cliente_nombre = Column(String(300), nullable=True)
    producto_nombre = Column(String(500), nullable=False)
    cantidad = Column(Integer, nullable=False, default=1)
    fecha_encargo = Column(DateTime(timezone=True), server_default=func.now())
    fecha_necesaria = Column(DateTime(timezone=True), nullable=True)
    estado = Column(String(30), nullable=False, default="pendiente", index=True)
    # Estados: pendiente, pedido_proveedor, vendido, cancelado
    observaciones = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
