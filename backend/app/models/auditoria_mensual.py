from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from ..core.database import BaseAnexa


class AuditoriaMensual(BaseAnexa):
    """Puntajes mensuales de auditoria por sucursal - BD mi_sucursal"""
    __tablename__ = "auditoria_mensual"

    id = Column(Integer, primary_key=True, index=True)
    sucursal_id = Column(Integer, nullable=False, index=True)
    periodo = Column(String(7), nullable=False, index=True)  # "2026-01", "2025-12", etc.

    # Puntajes por categoria (0-100)
    orden_limpieza = Column(Float, nullable=True)
    pedidos = Column(Float, nullable=True)
    gestion_administrativa = Column(Float, nullable=True)
    club_mascotera = Column(Float, nullable=True)
    control_stock_caja = Column(Float, nullable=True)

    # Puntaje total calculado
    puntaje_total = Column(Float, nullable=True)

    observaciones = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
