-- ============================================================
-- Script para crear tablas faltantes en BD mi_sucursal
-- Ejecutar como: psql -U dux_user -h localhost -d mi_sucursal -f create_tables_mi_sucursal.sql
-- ============================================================

-- 1. SUGERENCIAS DE CONTEO (Control Stock)
CREATE TABLE IF NOT EXISTS sugerencias_conteo (
    id SERIAL PRIMARY KEY,
    sucursal_id INTEGER NOT NULL,
    sugerido_por_id INTEGER NOT NULL,
    productos JSON NOT NULL,
    motivo TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    fecha_sugerencia TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resuelto_por_id INTEGER,
    fecha_resolucion TIMESTAMP,
    fecha_programada VARCHAR(10),
    comentario_supervisor TEXT,
    tarea_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sug_conteo_sucursal ON sugerencias_conteo(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_sug_conteo_estado ON sugerencias_conteo(estado);

-- 2. PRODUCTOS SUGERENCIA CONTEO (Control Stock - detalle normalizado)
CREATE TABLE IF NOT EXISTS productos_sugerencia_conteo (
    id SERIAL PRIMARY KEY,
    sugerencia_id INTEGER NOT NULL REFERENCES sugerencias_conteo(id),
    cod_item VARCHAR(50) NOT NULL,
    nombre VARCHAR(500) NOT NULL,
    precio NUMERIC(12,2) NOT NULL,
    stock_sistema INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_prod_sug_sugerencia ON productos_sugerencia_conteo(sugerencia_id);
CREATE INDEX IF NOT EXISTS idx_prod_sug_cod_item ON productos_sugerencia_conteo(cod_item);

-- 3. DESCARGOS DE AUDITORIA
CREATE TABLE IF NOT EXISTS descargos_auditoria (
    id SERIAL PRIMARY KEY,
    sucursal_id INTEGER NOT NULL,
    creado_por_id INTEGER NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    titulo VARCHAR(300) NOT NULL,
    descripcion TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    fecha_descargo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resuelto_por_id INTEGER,
    fecha_resolucion TIMESTAMP,
    comentario_auditor TEXT,
    referencia_id INTEGER,
    referencia_tipo VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_descargos_sucursal ON descargos_auditoria(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_descargos_estado ON descargos_auditoria(estado);
CREATE INDEX IF NOT EXISTS idx_descargos_categoria ON descargos_auditoria(categoria);

-- 4. CLIENTES RECONTACTO
CREATE TABLE IF NOT EXISTS clientes_recontacto (
    id SERIAL PRIMARY KEY,
    sucursal_id INTEGER NOT NULL,
    cliente_codigo VARCHAR(50),
    cliente_nombre VARCHAR(300) NOT NULL,
    cliente_telefono VARCHAR(50),
    cliente_email VARCHAR(200),
    mascota VARCHAR(200),
    especie VARCHAR(50),
    tamano VARCHAR(50),
    marca_habitual VARCHAR(200),
    ultimo_producto VARCHAR(500),
    ultima_compra DATE,
    dias_sin_comprar INTEGER,
    monto_ultima_compra VARCHAR(50),
    estado VARCHAR(30) DEFAULT 'pendiente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    importado BOOLEAN DEFAULT FALSE,
    mes_importacion VARCHAR(7)
);
CREATE INDEX IF NOT EXISTS idx_recontacto_sucursal ON clientes_recontacto(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_recontacto_estado ON clientes_recontacto(estado);
CREATE INDEX IF NOT EXISTS idx_recontacto_codigo ON clientes_recontacto(cliente_codigo);

-- 5. REGISTROS DE CONTACTO (historial de llamadas/mensajes)
CREATE TABLE IF NOT EXISTS registros_contacto (
    id SERIAL PRIMARY KEY,
    cliente_recontacto_id INTEGER NOT NULL REFERENCES clientes_recontacto(id),
    employee_id INTEGER NOT NULL,
    sucursal_id INTEGER NOT NULL,
    fecha_contacto TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    medio VARCHAR(30) NOT NULL,
    resultado VARCHAR(50) NOT NULL,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reg_contacto_cliente ON registros_contacto(cliente_recontacto_id);
CREATE INDEX IF NOT EXISTS idx_reg_contacto_sucursal ON registros_contacto(sucursal_id);

-- 6. AUDITORIA MENSUAL (puntajes por sucursal/periodo)
CREATE TABLE IF NOT EXISTS auditoria_mensual (
    id SERIAL PRIMARY KEY,
    sucursal_id INTEGER NOT NULL,
    periodo VARCHAR(7) NOT NULL,
    orden_limpieza FLOAT,
    pedidos FLOAT,
    gestion_administrativa FLOAT,
    club_mascotera FLOAT,
    control_stock_caja FLOAT,
    puntaje_total FLOAT,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_audit_mensual_sucursal ON auditoria_mensual(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_audit_mensual_periodo ON auditoria_mensual(periodo);
CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_mensual_unique ON auditoria_mensual(sucursal_id, periodo);

-- 7. PROVEEDORES CUSTOM (proveedores creados por usuarios)
CREATE TABLE IF NOT EXISTS proveedores_custom (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    cuit VARCHAR(20),
    created_by_id INTEGER NOT NULL,
    sucursal_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_prov_custom_sucursal ON proveedores_custom(sucursal_id);

-- 8. FACTURAS PROVEEDORES
CREATE TABLE IF NOT EXISTS facturas_proveedores (
    id SERIAL PRIMARY KEY,
    sucursal_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    proveedor_id INTEGER,
    proveedor_custom_id INTEGER,
    proveedor_nombre VARCHAR(255) NOT NULL,
    numero_factura VARCHAR(50),
    imagen_base64 TEXT,
    tiene_inconsistencia BOOLEAN DEFAULT FALSE,
    detalle_inconsistencia TEXT,
    observaciones TEXT,
    fecha_factura DATE,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_fact_prov_sucursal ON facturas_proveedores(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_fact_prov_employee ON facturas_proveedores(employee_id);

-- 9. PRODUCTOS VENCIMIENTOS
CREATE TABLE IF NOT EXISTS productos_vencimientos (
    id SERIAL PRIMARY KEY,
    sucursal_id INTEGER NOT NULL,
    employee_id INTEGER,
    cod_item VARCHAR(50),
    producto VARCHAR(500) NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_unitario NUMERIC(12,2),
    valor_total NUMERIC(12,2),
    fecha_vencimiento DATE NOT NULL,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'proximo',
    fecha_retiro TIMESTAMP WITH TIME ZONE,
    notas TEXT,
    tiene_accion_comercial BOOLEAN DEFAULT FALSE,
    accion_comercial VARCHAR(50),
    porcentaje_descuento INTEGER,
    sucursal_destino_id INTEGER,
    sucursal_destino_nombre VARCHAR(100),
    fecha_movimiento DATE,
    importado BOOLEAN DEFAULT FALSE,
    mes_importacion VARCHAR(7)
);
CREATE INDEX IF NOT EXISTS idx_prod_venc_sucursal ON productos_vencimientos(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_prod_venc_fecha ON productos_vencimientos(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_prod_venc_estado ON productos_vencimientos(estado);
CREATE INDEX IF NOT EXISTS idx_prod_venc_cod_item ON productos_vencimientos(cod_item);

-- ============================================================
-- Verificacion
-- ============================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;
