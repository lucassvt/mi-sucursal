"""
Modelo: Descargos de Auditoría
Base de datos: mi_sucursal (anexa)

Los empleados pueden hacer descargos para justificar
observaciones de auditoría. Los supervisores/auditores
aprueban o rechazan los descargos.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from ..core.database import BaseAnexa


# Categorías válidas de descargo
CATEGORIAS_DESCARGO = [
    "orden_limpieza",
    "pedidos",
    "gestion_administrativa",
    "club_mascotera",
    "control_stock_caja",
]


class DescargoAuditoria(BaseAnexa):
    """
    Descargos de auditoría hechos por empleados.
    Permiten justificar observaciones en cualquier categoría de auditoría.
    """
    __tablename__ = "descargos_auditoria"

    id = Column(Integer, primary_key=True, index=True)

    # Vinculación con BD DUX
    sucursal_id = Column(Integer, nullable=False, index=True)  # FK lógico a sucursales
    creado_por_id = Column(Integer, nullable=False)  # FK lógico a employees

    # Categoría del descargo (coincide con las categorías de auditoría)
    categoria = Column(String(50), nullable=False, index=True)
    # Valores: orden_limpieza, pedidos, gestion_administrativa, club_mascotera, control_stock_caja

    # Contenido del descargo
    titulo = Column(String(300), nullable=False)
    descripcion = Column(Text, nullable=False)

    # Estado del workflow
    estado = Column(String(20), nullable=False, default="pendiente", index=True)
    # Estados: pendiente, aprobado, rechazado

    # Datos de creación
    fecha_descargo = Column(DateTime, server_default=func.now())

    # Datos de resolución (cuando el auditor/supervisor responde)
    resuelto_por_id = Column(Integer, nullable=True)  # FK lógico a employees
    fecha_resolucion = Column(DateTime, nullable=True)
    comentario_auditor = Column(Text, nullable=True)

    # Referencia opcional a un item específico (tarea, conteo, etc.)
    referencia_id = Column(Integer, nullable=True)
    referencia_tipo = Column(String(50), nullable=True)  # tarea, conteo, cierre_caja, etc.

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
