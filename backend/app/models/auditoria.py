from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, Text
from sqlalchemy.sql import func
from ..core.database import Base


class EvaluacionAuditoria(Base):
    """Evaluaciones de auditoría por sucursal y pilar"""
    __tablename__ = "evaluaciones_auditoria"

    id = Column(Integer, primary_key=True, index=True)
    sucursal_id = Column(Integer, nullable=False, index=True)
    periodo = Column(String(20), nullable=False)  # Ej: "2026-01"
    pilar = Column(String(50), nullable=False)  # orden_limpieza, cumplimiento_admin, gestion_clientes
    puntaje = Column(Numeric(5, 2))
    aprobado = Column(Boolean)
    observaciones = Column(Text)
    evaluador_id = Column(Integer)
    fecha_evaluacion = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
