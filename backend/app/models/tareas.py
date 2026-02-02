from sqlalchemy import Column, Integer, String, DateTime, Text, Date
from sqlalchemy.sql import func
from ..core.database import Base


# Categorías de tareas
CATEGORIAS_TAREAS = [
    "ORDEN Y LIMPIEZA",
    "MANTENIMIENTO SUCURSAL",
    "CONTROL Y GESTION DE STOCK",
    "GESTION ADMINISTRATIVA EN SISTEMA"
]


class TareaSucursal(Base):
    """Tareas asignadas a sucursales"""
    __tablename__ = "tareas_sucursal"

    id = Column(Integer, primary_key=True, index=True)
    sucursal_id = Column(Integer, nullable=False, index=True)
    categoria = Column(String(50), nullable=False, default="ORDEN Y LIMPIEZA")
    titulo = Column(String(300), nullable=False)
    descripcion = Column(Text)
    asignado_por = Column(Integer)  # Employee ID
    fecha_asignacion = Column(Date, nullable=False)
    fecha_vencimiento = Column(Date, nullable=False)
    estado = Column(String(20), default="pendiente")  # pendiente, en_progreso, completada
    completado_por = Column(Integer)
    fecha_completado = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
