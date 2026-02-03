from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.routes import (
    auth_router,
    dashboard_router,
    ventas_perdidas_router,
    items_router,
    auditoria_router,
    cierres_router,
    tareas_router,
    ajustes_stock_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: crear tablas si no existen
    # Solo crea las tablas de modelos propios
    from app.models import VentaPerdida, EvaluacionAuditoria, TareaSucursal, AjusteStock
    Base.metadata.create_all(bind=engine, tables=[
        VentaPerdida.__table__,
        EvaluacionAuditoria.__table__,
        TareaSucursal.__table__,
        AjusteStock.__table__,
    ])
    print("Mi Sucursal API iniciada")
    yield
    # Shutdown
    print("Mi Sucursal API detenida")


app = FastAPI(
    title="Mi Sucursal API",
    description="API para el sistema Mi Sucursal de La Mascotera",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(ventas_perdidas_router)
app.include_router(items_router)
app.include_router(auditoria_router)
app.include_router(cierres_router)
app.include_router(tareas_router)
app.include_router(ajustes_stock_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "mi-sucursal"}


@app.get("/")
async def root():
    return {
        "service": "Mi Sucursal API",
        "version": "1.0.0",
        "docs": "/docs"
    }


# DEBUG: Endpoint temporal para ver tabla de depósitos
@app.get("/debug/depositos")
async def debug_depositos():
    from sqlalchemy import text
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        # Ver estructura de la tabla
        result = db.execute(text("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'depositos'
            ORDER BY ordinal_position
        """))
        columns = [{"column": row[0], "type": row[1]} for row in result]

        # Ver datos
        result = db.execute(text("SELECT * FROM depositos LIMIT 50"))
        rows = [dict(row._mapping) for row in result]

        return {
            "table_structure": columns,
            "data": rows
        }
    finally:
        db.close()


# DEBUG: Endpoint para ver relación sucursales-depósitos
@app.get("/debug/sucursales-depositos")
async def debug_sucursales_depositos():
    from sqlalchemy import text
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT s.id, s.nombre, s.codigo, s.deposito_id, d.deposito as deposito_nombre
            FROM sucursales s
            LEFT JOIN depositos d ON s.deposito_id = d.id
            ORDER BY s.id
        """))
        rows = [dict(row._mapping) for row in result]
        return {"sucursales_depositos": rows}
    finally:
        db.close()
