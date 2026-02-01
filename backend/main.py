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
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: crear tablas si no existen
    # Solo crea las tablas de modelos propios (ventas_perdidas, evaluaciones_auditoria, tareas_sucursal)
    from app.models import VentaPerdida, EvaluacionAuditoria, TareaSucursal
    Base.metadata.create_all(bind=engine, tables=[
        VentaPerdida.__table__,
        EvaluacionAuditoria.__table__,
        TareaSucursal.__table__,
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
