"""
Modelo: Reportes PDF de Auditoria Mensual
Base de datos: mi_sucursal (anexa)

Almacena reportes PDF de auditoria por sucursal y periodo.
Subida manual por ahora, preparado para descarga automatica futura.
"""
from sqlalchemy import Column, Integer, String, DateTime, LargeBinary, Text
from sqlalchemy.sql import func
from ..core.database import BaseAnexa


class ReporteAuditoriaPDF(BaseAnexa):
    """Reportes PDF de auditoria mensual"""
    __tablename__ = "reportes_auditoria_pdf"

    id = Column(Integer, primary_key=True, index=True)
    sucursal_id = Column(Integer, nullable=False, index=True)
    periodo = Column(String(7), nullable=False, index=True)  # "2026-02"

    filename = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=False, default="application/pdf")
    pdf_data = Column(LargeBinary, nullable=False)
    tamano_bytes = Column(Integer, nullable=False)

    uploaded_by = Column(Integer, nullable=False)
    origen = Column(String(20), nullable=False, default="manual")  # manual / automatico

    notas = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
