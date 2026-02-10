"""
Modelo: Fotos de Tareas Completadas
Base de datos: mi_sucursal (anexa)
"""
from sqlalchemy import Column, Integer, String, DateTime, LargeBinary
from sqlalchemy.sql import func
from ..core.database import BaseAnexa


class TareaFoto(BaseAnexa):
    """Foto adjunta al completar una tarea"""
    __tablename__ = "tareas_fotos"

    id = Column(Integer, primary_key=True, index=True)
    tarea_id = Column(Integer, nullable=False, unique=True, index=True)
    filename = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=False)
    foto_data = Column(LargeBinary, nullable=False)
    subido_por = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
