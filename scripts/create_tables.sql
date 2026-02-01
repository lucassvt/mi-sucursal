-- Script para crear las tablas del sistema Mi Sucursal
-- Ejecutar en la base de datos dux_integrada

-- Tabla de ventas perdidas
CREATE TABLE IF NOT EXISTS ventas_perdidas (
    id SERIAL PRIMARY KEY,
    sucursal_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    cod_item VARCHAR(50) NULL,
    item_nombre VARCHAR(500) NOT NULL,
    marca VARCHAR(255),
    cantidad INTEGER NOT NULL DEFAULT 1,
    es_producto_nuevo BOOLEAN DEFAULT FALSE,
    observaciones TEXT,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para ventas_perdidas
CREATE INDEX IF NOT EXISTS idx_ventas_perdidas_sucursal ON ventas_perdidas(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_ventas_perdidas_fecha ON ventas_perdidas(fecha_registro);
CREATE INDEX IF NOT EXISTS idx_ventas_perdidas_cod_item ON ventas_perdidas(cod_item);

-- Tabla de evaluaciones de auditoría
CREATE TABLE IF NOT EXISTS evaluaciones_auditoria (
    id SERIAL PRIMARY KEY,
    sucursal_id INTEGER NOT NULL,
    periodo VARCHAR(20) NOT NULL,
    pilar VARCHAR(50) NOT NULL,
    puntaje DECIMAL(5,2),
    aprobado BOOLEAN,
    observaciones TEXT,
    evaluador_id INTEGER,
    fecha_evaluacion TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para evaluaciones_auditoria
CREATE INDEX IF NOT EXISTS idx_eval_auditoria_sucursal ON evaluaciones_auditoria(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_eval_auditoria_periodo ON evaluaciones_auditoria(periodo);
CREATE INDEX IF NOT EXISTS idx_eval_auditoria_pilar ON evaluaciones_auditoria(pilar);

-- Tabla de tareas de sucursal
CREATE TABLE IF NOT EXISTS tareas_sucursal (
    id SERIAL PRIMARY KEY,
    sucursal_id INTEGER NOT NULL,
    titulo VARCHAR(300) NOT NULL,
    descripcion TEXT,
    asignado_por INTEGER,
    fecha_asignacion DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente',
    completado_por INTEGER NULL,
    fecha_completado TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para tareas_sucursal
CREATE INDEX IF NOT EXISTS idx_tareas_sucursal_sucursal ON tareas_sucursal(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_tareas_sucursal_estado ON tareas_sucursal(estado);
CREATE INDEX IF NOT EXISTS idx_tareas_sucursal_vencimiento ON tareas_sucursal(fecha_vencimiento);

-- Check constraint para estado de tareas
ALTER TABLE tareas_sucursal
ADD CONSTRAINT chk_tareas_estado
CHECK (estado IN ('pendiente', 'en_progreso', 'completada'));

-- Comentarios
COMMENT ON TABLE ventas_perdidas IS 'Registro de ventas perdidas por falta de stock o producto nuevo';
COMMENT ON TABLE evaluaciones_auditoria IS 'Evaluaciones de los pilares de auditoría por sucursal';
COMMENT ON TABLE tareas_sucursal IS 'Tareas asignadas a cada sucursal';
