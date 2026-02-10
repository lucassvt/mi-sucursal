from sqlalchemy import Column, Integer, String, DateTime, Date, Boolean, Text, Numeric
from sqlalchemy.sql import func
from ..core.database import BaseAnexa


class ProductoVencimiento(BaseAnexa):
    """Tabla para productos proximos a vencer o vencidos"""
    __tablename__ = "productos_vencimientos"

    id = Column(Integer, primary_key=True, index=True)
    sucursal_id = Column(Integer, nullable=False, index=True)
    employee_id = Column(Integer, nullable=True)  # Quien registro

    # Datos del producto
    cod_item = Column(String(50), nullable=True, index=True)
    producto = Column(String(500), nullable=False)
    cantidad = Column(Integer, nullable=False, default=1)
    # Valorización
    precio_unitario = Column(Numeric(12, 2), nullable=True)  # Costo unitario del producto
    valor_total = Column(Numeric(12, 2), nullable=True)  # precio_unitario * cantidad

    # Fechas
    fecha_vencimiento = Column(Date, nullable=False, index=True)
    fecha_registro = Column(DateTime(timezone=True), server_default=func.now())

    # Estado: proximo, vencido, retirado
    estado = Column(String(20), default="proximo", index=True)

    # Accion tomada
    fecha_retiro = Column(DateTime(timezone=True), nullable=True)
    notas = Column(Text, nullable=True)

    # Accion comercial: descuento, promocion, devolucion, destruccion, donacion, etc.
    tiene_accion_comercial = Column(Boolean, default=False)
    accion_comercial = Column(String(50), nullable=True)  # Tipo de accion
    porcentaje_descuento = Column(Integer, nullable=True)  # Si aplica descuento, el %

    # Rotación entre sucursales
    sucursal_destino_id = Column(Integer, nullable=True)
    sucursal_destino_nombre = Column(String(100), nullable=True)
    fecha_movimiento = Column(Date, nullable=True)

    # Origen (cuando fue recibido de otra sucursal)
    sucursal_origen_id = Column(Integer, nullable=True)
    sucursal_origen_nombre = Column(String(100), nullable=True)

    # Origen de datos
    importado = Column(Boolean, default=False)  # True si vino de CSV
    mes_importacion = Column(String(7), nullable=True)  # YYYY-MM
