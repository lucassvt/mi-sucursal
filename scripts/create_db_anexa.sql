-- =================================================
-- Script para crear la Base de Datos Anexa
-- Mi Sucursal - La Mascotera
-- =================================================
--
-- Ejecutar este script en el servidor PostgreSQL
-- como usuario con permisos de creación de BD
--
-- Ejemplo:
--   psql -U postgres -f create_db_anexa.sql
--
-- O desde pgAdmin ejecutar este script
-- =================================================

-- 1. Crear la base de datos
CREATE DATABASE mi_sucursal
    WITH
    OWNER = dux_user
    ENCODING = 'UTF8'
    LC_COLLATE = 'es_AR.UTF-8'
    LC_CTYPE = 'es_AR.UTF-8'
    TEMPLATE = template0
    CONNECTION LIMIT = -1;

-- Si el locale no está disponible, usar este alternativo:
-- CREATE DATABASE mi_sucursal
--     WITH
--     OWNER = dux_user
--     ENCODING = 'UTF8'
--     TEMPLATE = template0
--     CONNECTION LIMIT = -1;

-- 2. Conectar a la nueva base de datos
\c mi_sucursal

-- 3. Dar permisos al usuario dux_user
GRANT ALL PRIVILEGES ON DATABASE mi_sucursal TO dux_user;
GRANT ALL ON SCHEMA public TO dux_user;

-- 4. Verificar que la conexión funciona
SELECT current_database(), current_user;

-- =================================================
-- NOTA: Las tablas se crearán automáticamente
-- cuando el backend inicie, usando SQLAlchemy.
--
-- Tablas que se crearán:
--   - sugerencias_conteo
--   - productos_sugerencia_conteo
--   - descargos_auditoria
--
-- Si necesitas crearlas manualmente, usa:
-- =================================================

-- Tabla: sugerencias_conteo
CREATE TABLE IF NOT EXISTS sugerencias_conteo (
    id SERIAL PRIMARY KEY,
    sucursal_id INTEGER NOT NULL,
    sugerido_por_id INTEGER NOT NULL,
    productos JSONB NOT NULL,
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

CREATE INDEX idx_sugerencias_sucursal ON sugerencias_conteo(sucursal_id);
CREATE INDEX idx_sugerencias_estado ON sugerencias_conteo(estado);

-- Tabla: descargos_auditoria
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

CREATE INDEX idx_descargos_sucursal ON descargos_auditoria(sucursal_id);
CREATE INDEX idx_descargos_categoria ON descargos_auditoria(categoria);
CREATE INDEX idx_descargos_estado ON descargos_auditoria(estado);

-- Verificar tablas creadas
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
