# Mi Sucursal

Sistema operativo para sucursales de La Mascotera. Permite a vendedores y encargados gestionar tareas diarias, peluqueria, encargos, ventas perdidas, recontactos, cierres de caja y reparto, con scope multi-sucursal para gerentes y franquiciados.

## Stack

- **Backend**: FastAPI + SQLAlchemy en puerto 8005.
- **Frontend**: Next.js 14 con basePath `/misucursal` en puerto 3005.
- **DB**: PostgreSQL `dux_integrada` (principal) + `mi_sucursal` (anexa con tareas_fotos, config_peluqueria, encargos, clientes).
- **Auth**: login propio + scope multi-sucursal via `gerencia_sucursales_permitidas`.

## Modulos / paginas

- `/misucursal/dashboard` — KPIs operativos por sucursal.
- `/misucursal/tareas` — checklist diario + tareas asignadas.
- `/misucursal/peluqueria` — turnos y servicios.
- `/misucursal/encargos` — pedidos especiales de clientes.
- `/misucursal/ventas-perdidas` — registro de ventas no concretadas.
- `/misucursal/recontacto-clientes` — listado de clientes a contactar.
- `/misucursal/cierre-cajas` — flujo de cierre diario.
- `/misucursal/gerencia` — panel multi-sucursal para gerentes/franquiciados.

## SSoT - Sucursales

Migrado a vista canonica `v_sucursal_canonica` (consolidada con estado activo + servicios). Las queries arrancan de la vista en lugar de la tabla `sucursales` directa, garantizando que sucursales cerradas no aparezcan en ningun panel.

## Configuracion

```bash
cp backend/.env.example backend/.env
# Editar backend/.env con secrets reales

# Si usas Drive export: colocar /app/secrets/drive-sa.json
```

## Deploy

```bash
cd /var/www/mi-sucursal && docker compose up -d --build mi-sucursal-backend mi-sucursal-frontend
```

## Licencia

Codigo privado de La Mascotera.
