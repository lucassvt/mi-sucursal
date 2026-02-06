from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from ..core.database import Base


class VentaPerdida(Base):
    """Registro de ventas perdidas por falta de stock o producto no disponible"""
    __tablename__ = "ventas_perdidas"

    id = Column(Integer, primary_key=True, index=True)
    sucursal_id = Column(Integer, nullable=False, index=True)
    employee_id = Column(Integer, nullable=False, index=True)  # ID de employees en dux_integrada
    cod_item = Column(String(50), nullable=True)  # NULL si es producto nuevo
    item_nombre = Column(String(500), nullable=False)
    marca = Column(String(255))
    cantidad = Column(Integer, nullable=False, default=1)
    es_producto_nuevo = Column(Boolean, default=False)
    motivo = Column(String(50), nullable=False, default='sin_stock')  # sin_stock, precio, otro, producto_nuevo
    observaciones = Column(Text)
    fecha_registro = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
