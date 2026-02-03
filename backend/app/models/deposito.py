from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from ..core.database import Base


class Deposito(Base):
    """
    Tabla depositos de dux_integrada

    Los depósitos son almacenes donde se guarda el stock.
    Cada sucursal tiene asociado un depósito mediante sucursales.deposito_id
    """
    __tablename__ = "depositos"

    id = Column(Integer, primary_key=True, index=True)
    deposito = Column(String(200), nullable=False)  # Nombre del depósito
    codigo = Column(String(50))  # Código opcional
    synced_at = Column(DateTime(timezone=True))


class AjusteStock(Base):
    """
    Tabla para almacenar los ajustes de stock importados desde CSV/Google Sheets

    Estos datos provienen de un proceso manual de comparación entre el stock
    del sistema y el stock físico real.
    """
    __tablename__ = "ajustes_stock"

    id = Column(Integer, primary_key=True, index=True)
    deposito_id = Column(Integer, index=True)  # FK a depositos.id
    deposito_nombre = Column(String(200))  # Nombre del depósito (para referencia)
    fecha = Column(DateTime(timezone=True), nullable=False)  # Fecha del movimiento
    cod_item = Column(String(100), index=True)  # Código del producto
    producto = Column(String(500))  # Nombre/descripción del producto
    cantidad = Column(Integer, nullable=False)  # Cantidad ajustada (positiva o negativa)
    tipo_movimiento = Column(String(100))  # INGRESO, EGRESO, AJUSTE
    personal = Column(String(200))  # Quien realizó el ajuste
    costo = Column(String(50))  # Costo del ajuste (string por formato español)
    mes_importacion = Column(String(7))  # YYYY-MM del mes importado
    created_at = Column(DateTime(timezone=True), server_default=func.now())
