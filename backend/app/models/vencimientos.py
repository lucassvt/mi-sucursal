from sqlalchemy import Column, Integer, String, DateTime, Date, Boolean, Text
from sqlalchemy.sql import func
from ..core.database import Base


class ProductoVencimiento(Base):
    """Tabla para productos proximos a vencer o vencidos"""
    __tablename__ = "productos_vencimientos"

    id = Column(Integer, primary_key=True, index=True)
    sucursal_id = Column(Integer, nullable=False, index=True)
    employee_id = Column(Integer, nullable=True)  # Quien registro

    # Datos del producto
    cod_item = Column(String(50), nullable=True, index=True)
    producto = Column(String(500), nullable=False)
    cantidad = Column(Integer, nullable=False, default=1)
    lote = Column(String(100), nullable=True)

    # Fechas
    fecha_vencimiento = Column(Date, nullable=False, index=True)
    fecha_registro = Column(DateTime(timezone=True), server_default=func.now())

    # Estado: proximo, vencido, retirado
    estado = Column(String(20), default="proximo", index=True)

    # Accion tomada
    fecha_retiro = Column(DateTime(timezone=True), nullable=True)
    notas = Column(Text, nullable=True)

    # Origen de datos
    importado = Column(Boolean, default=False)  # True si vino de CSV
    mes_importacion = Column(String(7), nullable=True)  # YYYY-MM
