# Mi Sucursal - La Mascotera

Sistema de gestión para sucursales de La Mascotera.

## Stack Tecnológico

- **Frontend:** Next.js 14 + React 18 + Tailwind CSS
- **Backend:** FastAPI + SQLAlchemy
- **Base de datos:** PostgreSQL (dux_integrada)
- **Deploy:** Docker + Docker Compose

## Estructura del Proyecto

```
mi-sucursal/
├── frontend/          # Next.js 14
├── backend/           # FastAPI
├── scripts/           # Scripts SQL
└── docker-compose.yml
```

## Módulos

1. **Dashboard** - Status de ventas (espejo del Portal Vendedores)
2. **Ventas Perdidas** - Registro de productos no vendidos
3. **Auditoría** - Stock negativo y pilares de evaluación
4. **Cierre de Cajas** - Integrado con sistema de finanzas
5. **Tareas** - Tareas asignadas a la sucursal

## Configuración

### Variables de entorno - Backend

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/dux_integrada
SECRET_KEY=your-secret-key
VENDEDORES_API_URL=http://localhost:8011/vendedores-api
```

### Variables de entorno - Frontend

```env
NEXT_PUBLIC_API_URL=http://localhost:8003
```

## Desarrollo Local

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8003

# Frontend
cd frontend
npm install
npm run dev
```

## Deploy con Docker

```bash
# Desarrollo
docker-compose up --build

# Producción
docker-compose -f docker-compose.prod.yml up --build -d
```

## Puertos

- Frontend: 3003
- Backend: 8003

## Base de datos

Ejecutar el script de creación de tablas:

```bash
psql -U dux_user -d dux_integrada -f scripts/create_tables.sql
```

## URL de acceso (producción)

- http://66.97.35.249/misucursal
