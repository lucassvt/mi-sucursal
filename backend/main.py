from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, init_anexa_db
from app.routes import (
    auth_router,
    dashboard_router,
    ventas_perdidas_router,
    items_router,
    auditoria_router,
    cierres_router,
    tareas_router,
    ajustes_stock_router,
    pedidosya_router,
    vencimientos_router,
    recontactos_router,
    # Rutas para BD Anexa (mi_sucursal)
    sugerencias_router,
    descargos_router,
    auditoria_mensual_router,
    facturas_router,
    conteo_stock_router,
    tareas_resumen_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: crear tablas si no existen

    # 1. Tablas en BD DUX (modelos propios que se guardan junto a datos de DUX)
    from app.models import VentaPerdida, EvaluacionAuditoria, TareaSucursal
    Base.metadata.create_all(bind=engine, tables=[
        VentaPerdida.__table__,
        EvaluacionAuditoria.__table__,
        TareaSucursal.__table__,
    ])

    # 2. Tablas en BD Anexa (mi_sucursal) - nuevas funcionalidades
    try:
        from app.models.tarea_foto import TareaFoto  # noqa: F401
        from app.models.tareas_resumen import TareasResumenSemanal  # noqa: F401
        from app.models.reporte_pdf import ReporteAuditoriaPDF  # noqa: F401
        init_anexa_db()
        print("BD Anexa (mi_sucursal) inicializada correctamente")
    except Exception as e:
        print(f"Advertencia: No se pudo inicializar BD Anexa: {e}")
        print("Las funciones de sugerencias y descargos no estarán disponibles")

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

# Routers - BD DUX
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(ventas_perdidas_router)
app.include_router(items_router)
app.include_router(auditoria_router)
app.include_router(cierres_router)
app.include_router(tareas_router)
app.include_router(ajustes_stock_router)
app.include_router(pedidosya_router)
app.include_router(vencimientos_router)
app.include_router(recontactos_router)

# Routers - BD Anexa (mi_sucursal)
app.include_router(sugerencias_router)
app.include_router(descargos_router)
app.include_router(auditoria_mensual_router)
app.include_router(facturas_router)
app.include_router(conteo_stock_router)
app.include_router(tareas_resumen_router)


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
