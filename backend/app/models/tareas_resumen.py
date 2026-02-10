"""
Modelo: Resumen Semanal de Tareas por Sucursal
Base de datos: mi_sucursal (anexa)

Almacena el resumen de tareas archivadas semanalmente.
Cada registro = 1 sucursal + 1 categoria + 1 semana.
"""
from sqlalchemy import Column, Integer, String, Date, DateTime, Boolean, UniqueConstraint
from sqlalchemy.sql import func
from ..core.database import BaseAnexa


class TareasResumenSemanal(BaseAnexa):
    """Resumen semanal de tareas archivadas por sucursal y categoria"""
    __tablename__ = "tareas_resumen_semanal"
    __table_args__ = (
        UniqueConstraint('sucursal_id', 'categoria', 'semana_inicio', name='uq_resumen_semanal'),
    )

    id = Column(Integer, primary_key=True, index=True)
    sucursal_id = Column(Integer, nullable=False, index=True)
    categoria = Column(String(50), nullable=False, index=True)

    semana_inicio = Column(Date, nullable=False)  # Lunes de la semana
    semana_fin = Column(Date, nullable=False)      # Domingo de la semana
    periodo = Column(String(7), nullable=False, index=True)  # "2026-02"

    completadas = Column(Integer, nullable=False, default=0)
    vencidas = Column(Integer, nullable=False, default=0)
    pendientes_archivadas = Column(Integer, nullable=False, default=0)
    total = Column(Integer, nullable=False, default=0)

    # 0-100: completadas / total * 100
    puntaje = Column(Integer, nullable=False, default=0)

    # Para futuro envio a sistema externo "mi auditoria"
    enviado_api = Column(Boolean, default=False)
    fecha_envio_api = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
