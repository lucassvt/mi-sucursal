"""
Modelo: Sugerencias de Conteo de Stock
Base de datos: mi_sucursal (anexa)

Los vendedores sugieren productos para contar.
Los supervisores aprueban/rechazan y programan fecha.
Al aprobar, se crea una tarea de control de stock.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey, Numeric
from sqlalchemy.sql import func
from ..core.database import BaseAnexa


class SugerenciaConteo(BaseAnexa):
    """
    Sugerencias de conteo de stock hechas por vendedores.
    Vincula con: employees (por ID), sucursales (por ID), items_central (por cod_item)
    """
    __tablename__ = "sugerencias_conteo"

    id = Column(Integer, primary_key=True, index=True)

    # Vinculación con BD DUX
    sucursal_id = Column(Integer, nullable=False, index=True)  # FK lógico a sucursales
    sugerido_por_id = Column(Integer, nullable=False)  # FK lógico a employees

    # Productos sugeridos (JSON con array de productos)
    # Estructura: [{"cod_item": "X", "nombre": "Y", "precio": 1000, "stock_sistema": 10}, ...]
    productos = Column(JSON, nullable=False)

    # Motivo de la sugerencia
    motivo = Column(Text, nullable=False)

    # Estado del workflow
    estado = Column(String(20), nullable=False, default="pendiente", index=True)
    # Estados: pendiente, aprobada, rechazada

    # Datos de creación
    fecha_sugerencia = Column(DateTime, server_default=func.now())

    # Datos de resolución (cuando el supervisor responde)
    resuelto_por_id = Column(Integer, nullable=True)  # FK lógico a employees
    fecha_resolucion = Column(DateTime, nullable=True)
    fecha_programada = Column(String(10), nullable=True)  # YYYY-MM-DD para el conteo
    comentario_supervisor = Column(Text, nullable=True)

    # Si se aprobó, referencia a la tarea creada
    tarea_id = Column(Integer, nullable=True)  # FK lógico a tareas_sucursal

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ProductoSugerenciaConteo(BaseAnexa):
    """
    Detalle de productos en una sugerencia (alternativa normalizada).
    Se puede usar en lugar del JSON si se prefiere normalizar.
    """
    __tablename__ = "productos_sugerencia_conteo"

    id = Column(Integer, primary_key=True, index=True)
    sugerencia_id = Column(Integer, ForeignKey("sugerencias_conteo.id"), nullable=False, index=True)

    # Datos del producto (snapshot al momento de la sugerencia)
    cod_item = Column(String(50), nullable=False, index=True)  # FK lógico a items_central
    nombre = Column(String(500), nullable=False)
    precio = Column(Numeric(12, 2), nullable=False)
    stock_sistema = Column(Integer, nullable=False)

    created_at = Column(DateTime, server_default=func.now())
