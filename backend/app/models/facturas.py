from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Date
from sqlalchemy.sql import func
from ..core.database import BaseAnexa


class ProveedorCustom(BaseAnexa):
    """Proveedores agregados por usuarios (no existentes en DUX)"""
    __tablename__ = "proveedores_custom"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    cuit = Column(String(20), nullable=True)
    created_by_id = Column(Integer, nullable=False)
    sucursal_id = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())


class FacturaProveedor(BaseAnexa):
    """Registro de facturas de proveedores con imagen"""
    __tablename__ = "facturas_proveedores"

    id = Column(Integer, primary_key=True, index=True)
    sucursal_id = Column(Integer, nullable=False, index=True)
    employee_id = Column(Integer, nullable=False, index=True)

    # Proveedor (uno de los dos: DUX o custom)
    proveedor_id = Column(Integer, nullable=True)        # id_proveedor de tabla compras (DUX)
    proveedor_custom_id = Column(Integer, nullable=True)  # FK logico a proveedores_custom
    proveedor_nombre = Column(String(255), nullable=False)  # nombre desnormalizado

    numero_factura = Column(String(50), nullable=True)
    imagen_base64 = Column(Text, nullable=True)

    # Inconsistencia para auditoria
    tiene_inconsistencia = Column(Boolean, default=False)
    detalle_inconsistencia = Column(Text, nullable=True)

    observaciones = Column(Text, nullable=True)
    fecha_factura = Column(Date, nullable=True)
    fecha_registro = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
