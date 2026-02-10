"""
Modelo: Conteos de Stock
Base de datos: mi_sucursal (anexa)

Los encargados crean tareas de conteo con productos seleccionados.
Los empleados registran el stock real de cada producto.
El campo fecha_conteo registra el momento exacto del conteo (importante para gestion de compras).
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Numeric, ForeignKey
from sqlalchemy.sql import func
from ..core.database import BaseAnexa


class ConteoStock(BaseAnexa):
    """
    Conteo de stock asociado a una tarea de control.
    Vincula con: tareas_sucursal (por tarea_id), employees (por empleado_id), sucursales (por sucursal_id)
    """
    __tablename__ = "conteos_stock"

    id = Column(Integer, primary_key=True, index=True)

    # Vinculacion con BD DUX
    tarea_id = Column(Integer, nullable=False, index=True)  # FK logico a tareas_sucursal
    sucursal_id = Column(Integer, nullable=False, index=True)  # FK logico a sucursales
    empleado_id = Column(Integer, nullable=False)  # FK logico a employees (quien hace el conteo)

    # Estado del workflow
    estado = Column(String(20), nullable=False, default="borrador", index=True)
    # Estados: borrador, enviado, aprobado, rechazado, cerrado

    # Fecha/hora del conteo - SE SETEA AL GUARDAR O ENVIAR
    # Importante para gestion de compras
    fecha_conteo = Column(DateTime, nullable=True)

    # Revision
    revisado_por = Column(Integer, nullable=True)  # FK logico a employees
    fecha_revision = Column(DateTime, nullable=True)
    comentarios_auditor = Column(Text, nullable=True)

    # Agregados calculados
    valorizacion_diferencia = Column(Numeric(14, 2), nullable=False, default=0)
    total_productos = Column(Integer, nullable=False, default=0)
    productos_contados = Column(Integer, nullable=False, default=0)
    productos_con_diferencia = Column(Integer, nullable=False, default=0)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ProductoConteo(BaseAnexa):
    """
    Producto individual dentro de un conteo de stock.
    Snapshot de datos del producto al momento de crear la tarea.
    """
    __tablename__ = "productos_conteo"

    id = Column(Integer, primary_key=True, index=True)
    conteo_id = Column(Integer, ForeignKey("conteos_stock.id"), nullable=False, index=True)

    # Datos del producto (snapshot al momento de la tarea)
    cod_item = Column(String(50), nullable=False, index=True)
    nombre = Column(String(500), nullable=False)
    precio = Column(Numeric(12, 2), nullable=False)
    stock_sistema = Column(Integer, nullable=False)

    # Datos del conteo (llenados por el empleado)
    stock_real = Column(Integer, nullable=True)
    diferencia = Column(Integer, nullable=True)  # stock_real - stock_sistema
    observaciones = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
