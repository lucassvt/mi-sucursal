from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# ===========================================
# BASE DE DATOS DUX (Solo lectura)
# Contiene: employees, sucursales, items, cajas, facturas, etc.
# ===========================================
engine_dux = create_engine(settings.DATABASE_URL)
SessionDux = sessionmaker(autocommit=False, autoflush=False, bind=engine_dux)
BaseDux = declarative_base()

# Alias para compatibilidad con código existente
engine = engine_dux
SessionLocal = SessionDux
Base = BaseDux


def get_db():
    """Conexión a BD DUX (solo lectura)"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ===========================================
# BASE DE DATOS ANEXA - MI SUCURSAL (Lectura/Escritura)
# Contiene: sugerencias, descargos, conteos, roles, etc.
# ===========================================
engine_anexa = create_engine(settings.DATABASE_ANEXA_URL)
SessionAnexa = sessionmaker(autocommit=False, autoflush=False, bind=engine_anexa)
BaseAnexa = declarative_base()


def get_db_anexa():
    """Conexión a BD Anexa (lectura/escritura)"""
    db = SessionAnexa()
    try:
        yield db
    finally:
        db.close()


def init_anexa_db():
    """Crear todas las tablas en la BD anexa"""
    BaseAnexa.metadata.create_all(bind=engine_anexa)
