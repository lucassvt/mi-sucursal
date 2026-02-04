// Datos de demo compartidos entre todas las páginas

export interface TareaDemo {
  id: number
  categoria: string
  titulo: string
  descripcion?: string
  estado: string
  fecha_asignacion: string
  fecha_vencimiento: string
  asignado_por_nombre?: string
}

// Función para calcular fechas relativas
const diasAtras = (dias: number) =>
  new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

const diasAdelante = (dias: number) =>
  new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

const hoy = () => new Date().toISOString().split('T')[0]

// Tareas de demo unificadas
export const getTareasDemo = (): TareaDemo[] => [
  // ORDEN Y LIMPIEZA - 3 tareas (para mostrar en auditoría)
  {
    id: 1,
    categoria: 'ORDEN Y LIMPIEZA',
    titulo: 'Limpiar vitrinas de exhibición',
    descripcion: 'Limpiar y organizar las vitrinas principales',
    estado: 'pendiente',
    fecha_asignacion: diasAtras(8), // 8 días sin completar (aparece en auditoría)
    fecha_vencimiento: diasAdelante(2),
    asignado_por_nombre: 'Gerencia',
  },
  {
    id: 2,
    categoria: 'ORDEN Y LIMPIEZA',
    titulo: 'Ordenar depósito trasero',
    descripcion: 'Reorganizar productos en el depósito por categoría',
    estado: 'en_progreso',
    fecha_asignacion: diasAtras(12), // 12 días sin completar (aparece en auditoría)
    fecha_vencimiento: diasAtras(2), // Vencida
    asignado_por_nombre: 'Supervisor',
  },
  {
    id: 3,
    categoria: 'ORDEN Y LIMPIEZA',
    titulo: 'Limpiar área de veterinaria',
    descripcion: 'Desinfectar y ordenar el área de atención veterinaria',
    estado: 'completada',
    fecha_asignacion: diasAtras(5),
    fecha_vencimiento: hoy(),
    asignado_por_nombre: 'Encargado',
  },
  // MANTENIMIENTO SUCURSAL - 1 tarea
  {
    id: 4,
    categoria: 'MANTENIMIENTO SUCURSAL',
    titulo: 'Revisar aire acondicionado',
    descripcion: 'Verificar funcionamiento y limpiar filtros',
    estado: 'pendiente',
    fecha_asignacion: hoy(),
    fecha_vencimiento: diasAdelante(5),
    asignado_por_nombre: 'Gerencia',
  },
  // CONTROL Y GESTION DE STOCK - 1 tarea
  {
    id: 5,
    categoria: 'CONTROL Y GESTION DE STOCK',
    titulo: 'Inventario de alimentos balanceados',
    descripcion: 'Contar y registrar stock de alimentos para perros y gatos',
    estado: 'completada',
    fecha_asignacion: diasAtras(3),
    fecha_vencimiento: hoy(),
    asignado_por_nombre: 'Encargado',
  },
  // GESTION ADMINISTRATIVA EN SISTEMA - 1 tarea
  {
    id: 6,
    categoria: 'GESTION ADMINISTRATIVA EN SISTEMA',
    titulo: 'Actualizar precios en sistema',
    descripcion: 'Cargar nueva lista de precios de proveedor Royal Canin',
    estado: 'pendiente',
    fecha_asignacion: hoy(),
    fecha_vencimiento: diasAdelante(3),
    asignado_por_nombre: 'Administración',
  },
]

// ==================== PELUQUERÍA ====================

export interface PrecioVigenteDemo {
  id: number
  tipo_servicio: 'BANO' | 'CORTE'
  precio_base: number
  fecha_vigencia_desde: string
  fecha_vigencia_hasta: string | null
  creado_por_nombre: string
  sucursal_id: number
  sucursal_nombre: string
}

export interface SolicitudPeluqueriaDemo {
  id: number
  tipo_servicio: 'BANO' | 'CORTE'
  precio_actual: number
  precio_propuesto: number
  motivo: string
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  fecha_solicitud: string
  solicitante_nombre: string
  solicitante_id: number
  fecha_resolucion?: string
  resuelto_por_nombre?: string
  comentario_resolucion?: string
}

export interface HistorialPrecioDemo {
  id: number
  tipo_servicio: 'BANO' | 'CORTE'
  precio_base: number
  fecha_vigencia_desde: string
  fecha_vigencia_hasta: string | null
  creado_por_nombre: string
  motivo_cambio?: string
}

export const getPreciosPeluqueriaDemo = (): PrecioVigenteDemo[] => [
  {
    id: 1,
    tipo_servicio: 'BANO',
    precio_base: 2500,
    fecha_vigencia_desde: diasAtras(30),
    fecha_vigencia_hasta: null,
    creado_por_nombre: 'Administración',
    sucursal_id: 1,
    sucursal_nombre: 'Sucursal Centro',
  },
  {
    id: 2,
    tipo_servicio: 'CORTE',
    precio_base: 3500,
    fecha_vigencia_desde: diasAtras(15),
    fecha_vigencia_hasta: null,
    creado_por_nombre: 'Supervisor',
    sucursal_id: 1,
    sucursal_nombre: 'Sucursal Centro',
  },
]

export const getSolicitudesPeluqueriaDemo = (): SolicitudPeluqueriaDemo[] => [
  {
    id: 1,
    tipo_servicio: 'BANO',
    precio_actual: 2500,
    precio_propuesto: 2800,
    motivo: 'Aumento de costos de shampoo y acondicionador profesional',
    estado: 'pendiente',
    fecha_solicitud: diasAtras(2),
    solicitante_nombre: 'María López',
    solicitante_id: 5,
  },
  {
    id: 2,
    tipo_servicio: 'CORTE',
    precio_actual: 3000,
    precio_propuesto: 3500,
    motivo: 'Actualización de precios por inflación mensual',
    estado: 'aprobada',
    fecha_solicitud: diasAtras(20),
    solicitante_nombre: 'Juan Pérez',
    solicitante_id: 3,
    fecha_resolucion: diasAtras(18),
    resuelto_por_nombre: 'Supervisor',
    comentario_resolucion: 'Aprobado. Se actualiza precio desde el 15/01',
  },
  {
    id: 3,
    tipo_servicio: 'BANO',
    precio_actual: 2200,
    precio_propuesto: 2700,
    motivo: 'Propuesta rechazada - aumento muy elevado',
    estado: 'rechazada',
    fecha_solicitud: diasAtras(45),
    solicitante_nombre: 'Carlos Gómez',
    solicitante_id: 4,
    fecha_resolucion: diasAtras(43),
    resuelto_por_nombre: 'Gerencia',
    comentario_resolucion: 'El aumento propuesto es muy alto. Se aprobó un incremento menor.',
  },
]

export const getHistorialPreciosDemo = (tipoServicio: 'BANO' | 'CORTE'): HistorialPrecioDemo[] => {
  if (tipoServicio === 'BANO') {
    return [
      { id: 1, tipo_servicio: 'BANO', precio_base: 2500, fecha_vigencia_desde: diasAtras(30), fecha_vigencia_hasta: null, creado_por_nombre: 'Administración' },
      { id: 2, tipo_servicio: 'BANO', precio_base: 2200, fecha_vigencia_desde: diasAtras(90), fecha_vigencia_hasta: diasAtras(30), creado_por_nombre: 'Supervisor', motivo_cambio: 'Ajuste por inflación' },
      { id: 3, tipo_servicio: 'BANO', precio_base: 2000, fecha_vigencia_desde: diasAtras(180), fecha_vigencia_hasta: diasAtras(90), creado_por_nombre: 'Gerencia', motivo_cambio: 'Precio inicial' },
    ]
  }
  return [
    { id: 4, tipo_servicio: 'CORTE', precio_base: 3500, fecha_vigencia_desde: diasAtras(15), fecha_vigencia_hasta: null, creado_por_nombre: 'Supervisor', motivo_cambio: 'Solicitud aprobada' },
    { id: 5, tipo_servicio: 'CORTE', precio_base: 3000, fecha_vigencia_desde: diasAtras(60), fecha_vigencia_hasta: diasAtras(15), creado_por_nombre: 'Administración', motivo_cambio: 'Ajuste trimestral' },
    { id: 6, tipo_servicio: 'CORTE', precio_base: 2800, fecha_vigencia_desde: diasAtras(120), fecha_vigencia_hasta: diasAtras(60), creado_por_nombre: 'Gerencia', motivo_cambio: 'Precio inicial' },
  ]
}

export const getResumenPeluqueriaDemo = () => ({
  precio_bano_actual: 2500,
  precio_corte_actual: 3500,
  fecha_vigencia_bano: diasAtras(30),
  fecha_vigencia_corte: diasAtras(15),
  solicitudes_pendientes: 1,
})

// ==================== CONTROL DE STOCK ====================

export interface ProductoConteoDemo {
  id: number
  cod_item: string
  nombre: string
  precio: number
  stock_sistema: number
  stock_real?: number
  diferencia?: number
  observaciones?: string
}

export interface ConteoStockDemo {
  id: number
  tarea_id: number
  sucursal_id: number
  fecha_conteo: string
  estado: 'borrador' | 'enviado' | 'revisado' | 'aprobado' | 'rechazado'
  empleado_id: number
  empleado_nombre: string
  revisado_por?: number
  revisado_por_nombre?: string
  fecha_revision?: string
  comentarios_auditor?: string
  valorizacion_diferencia: number
  productos: ProductoConteoDemo[]
  total_productos: number
  productos_contados: number
  productos_con_diferencia: number
  created_at: string
}

export interface TareaControlStockDemo extends TareaDemo {
  tipo_tarea: 'CONTROL_STOCK'
  conteo_id?: number
}

// Productos de ejemplo para conteo
export const getProductosConteoDemo = (): ProductoConteoDemo[] => [
  { id: 1, cod_item: 'ALIM001', nombre: 'Royal Canin Medium Adult 15kg', precio: 45000, stock_sistema: 12 },
  { id: 2, cod_item: 'ALIM002', nombre: 'Purina Pro Plan Cachorro 15kg', precio: 38000, stock_sistema: 8 },
  { id: 3, cod_item: 'ALIM003', nombre: 'Eukanuba Large Breed 15kg', precio: 42000, stock_sistema: 5 },
  { id: 4, cod_item: 'ALIM004', nombre: 'Hills Science Diet Adult 12kg', precio: 52000, stock_sistema: 7 },
  { id: 5, cod_item: 'ALIM005', nombre: 'Excellent Gato Adulto 10kg', precio: 28000, stock_sistema: 15 },
  { id: 6, cod_item: 'ALIM006', nombre: 'Pedigree Adulto 21kg', precio: 32000, stock_sistema: 10 },
  { id: 7, cod_item: 'ALIM007', nombre: 'Whiskas Gato Adulto 10kg', precio: 24000, stock_sistema: 8 },
  { id: 8, cod_item: 'ALIM008', nombre: 'Dog Chow Adulto 21kg', precio: 28000, stock_sistema: 12 },
]

// Productos disponibles para buscar y seleccionar (simulando API de items)
export const getProductosBuscablesDemo = (query: string): ProductoConteoDemo[] => {
  const productos = [
    { id: 101, cod_item: 'ALIM001', nombre: 'Royal Canin Medium Adult 15kg', precio: 45000, stock_sistema: 12 },
    { id: 102, cod_item: 'ALIM002', nombre: 'Purina Pro Plan Cachorro 15kg', precio: 38000, stock_sistema: 8 },
    { id: 103, cod_item: 'ALIM003', nombre: 'Eukanuba Large Breed 15kg', precio: 42000, stock_sistema: 5 },
    { id: 104, cod_item: 'ALIM004', nombre: 'Hills Science Diet Adult 12kg', precio: 52000, stock_sistema: 7 },
    { id: 105, cod_item: 'ALIM005', nombre: 'Excellent Gato Adulto 10kg', precio: 28000, stock_sistema: 15 },
    { id: 106, cod_item: 'ALIM006', nombre: 'Pedigree Adulto 21kg', precio: 32000, stock_sistema: 10 },
    { id: 107, cod_item: 'ALIM007', nombre: 'Whiskas Gato Adulto 10kg', precio: 24000, stock_sistema: 8 },
    { id: 108, cod_item: 'ALIM008', nombre: 'Dog Chow Adulto 21kg', precio: 28000, stock_sistema: 12 },
    { id: 109, cod_item: 'ALIM009', nombre: 'Royal Canin Maxi Adult 15kg', precio: 48000, stock_sistema: 6 },
    { id: 110, cod_item: 'ALIM010', nombre: 'Pro Plan Senior 13kg', precio: 42000, stock_sistema: 4 },
  ]
  const q = query.toLowerCase()
  return productos.filter(p =>
    p.nombre.toLowerCase().includes(q) ||
    p.cod_item.toLowerCase().includes(q)
  )
}

// Conteo en borrador (tarea activa)
export const getConteoStockDemo = (tareaId: number): ConteoStockDemo => ({
  id: 1,
  tarea_id: tareaId,
  sucursal_id: 1,
  fecha_conteo: hoy(),
  estado: 'borrador',
  empleado_id: 0,
  empleado_nombre: 'Vendedor Demo',
  valorizacion_diferencia: 0,
  productos: getProductosConteoDemo(),
  total_productos: 8,
  productos_contados: 0,
  productos_con_diferencia: 0,
  created_at: new Date().toISOString(),
})

// Tarea especial de control de stock para HOY (genera alerta)
export const getTareaControlStockDemo = (): TareaControlStockDemo => ({
  id: 100,
  categoria: 'CONTROL Y GESTION DE STOCK',
  tipo_tarea: 'CONTROL_STOCK',
  titulo: 'Conteo de Alimentos Balanceados - Febrero 2024',
  descripcion: 'Realizar conteo fisico de alimentos balanceados en deposito principal',
  estado: 'pendiente',
  fecha_asignacion: diasAtras(1),
  fecha_vencimiento: hoy(), // Vence HOY - genera alerta
  asignado_por_nombre: 'Supervisor Demo',
  conteo_id: 1,
})

// Conteos historicos para auditoria
export const getConteosHistoricosDemo = (): ConteoStockDemo[] => [
  {
    id: 2,
    tarea_id: 50,
    sucursal_id: 1,
    fecha_conteo: diasAtras(15),
    estado: 'aprobado',
    empleado_id: 3,
    empleado_nombre: 'Juan Perez',
    revisado_por: 1,
    revisado_por_nombre: 'Supervisor',
    fecha_revision: diasAtras(14),
    comentarios_auditor: 'Diferencias justificadas por rotura de packaging',
    valorizacion_diferencia: -45000,
    productos: [
      { id: 10, cod_item: 'ALIM001', nombre: 'Royal Canin Medium Adult 15kg', precio: 45000, stock_sistema: 10, stock_real: 9, diferencia: -1 },
      { id: 11, cod_item: 'ALIM003', nombre: 'Eukanuba Large Breed 15kg', precio: 42000, stock_sistema: 6, stock_real: 6, diferencia: 0 },
    ],
    total_productos: 2,
    productos_contados: 2,
    productos_con_diferencia: 1,
    created_at: diasAtras(15),
  },
  {
    id: 3,
    tarea_id: 51,
    sucursal_id: 1,
    fecha_conteo: diasAtras(30),
    estado: 'aprobado',
    empleado_id: 4,
    empleado_nombre: 'Maria Garcia',
    revisado_por: 1,
    revisado_por_nombre: 'Supervisor',
    fecha_revision: diasAtras(29),
    valorizacion_diferencia: -28000,
    productos: [
      { id: 20, cod_item: 'ALIM005', nombre: 'Excellent Gato Adulto 10kg', precio: 28000, stock_sistema: 15, stock_real: 14, diferencia: -1 },
    ],
    total_productos: 1,
    productos_contados: 1,
    productos_con_diferencia: 1,
    created_at: diasAtras(30),
  },
]

// Resumen para seccion de auditoria
export const getResumenControlStockAuditoriaDemo = () => ({
  conteos_pendientes: 1,
  conteos_revisados_mes: 2,
  diferencia_total_mes: -3,
  valorizacion_diferencia_mes: -73000,
  ultimos_conteos: getConteosHistoricosDemo(),
})

// ==================== SUGERENCIAS DE CONTEO ====================

export interface SugerenciaConteoDemo {
  id: number
  productos: Array<{
    cod_item: string
    nombre: string
    precio: number
    stock_sistema: number
  }>
  motivo: string
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  fecha_sugerencia: string
  sugerido_por_id: number
  sugerido_por_nombre: string
  fecha_resolucion?: string
  resuelto_por_nombre?: string
  fecha_programada?: string
  comentario_supervisor?: string
}

// Sugerencias de ejemplo
export const getSugerenciasConteoDemo = (): SugerenciaConteoDemo[] => [
  {
    id: 1,
    productos: [
      { cod_item: 'ALIM001', nombre: 'Royal Canin Medium Adult 15kg', precio: 45000, stock_sistema: 12 },
      { cod_item: 'ALIM009', nombre: 'Royal Canin Maxi Adult 15kg', precio: 48000, stock_sistema: 6 },
    ],
    motivo: 'Mucha rotación esta semana, varios clientes preguntaron y noté diferencias en góndola',
    estado: 'pendiente',
    fecha_sugerencia: diasAtras(1),
    sugerido_por_id: 5,
    sugerido_por_nombre: 'Carlos Vendedor',
  },
  {
    id: 2,
    productos: [
      { cod_item: 'ALIM005', nombre: 'Excellent Gato Adulto 10kg', precio: 28000, stock_sistema: 15 },
    ],
    motivo: 'El sistema dice 15 unidades pero en góndola veo menos',
    estado: 'aprobada',
    fecha_sugerencia: diasAtras(5),
    sugerido_por_id: 6,
    sugerido_por_nombre: 'María Vendedora',
    fecha_resolucion: diasAtras(4),
    resuelto_por_nombre: 'Supervisor',
    fecha_programada: diasAdelante(2),
    comentario_supervisor: 'Programado para el viernes',
  },
  {
    id: 3,
    productos: [
      { cod_item: 'ALIM006', nombre: 'Pedigree Adulto 21kg', precio: 32000, stock_sistema: 10 },
      { cod_item: 'ALIM008', nombre: 'Dog Chow Adulto 21kg', precio: 28000, stock_sistema: 12 },
    ],
    motivo: 'Llegó mercadería nueva y no estoy seguro si se cargó bien',
    estado: 'rechazada',
    fecha_sugerencia: diasAtras(10),
    sugerido_por_id: 5,
    sugerido_por_nombre: 'Carlos Vendedor',
    fecha_resolucion: diasAtras(9),
    resuelto_por_nombre: 'Supervisor',
    comentario_supervisor: 'Ya se hizo conteo la semana pasada de estos productos',
  },
]

// Obtener sugerencias pendientes (para badge en supervisor)
export const getSugerenciasPendientesDemo = () =>
  getSugerenciasConteoDemo().filter(s => s.estado === 'pendiente')

// ==================== DESCARGOS DE AUDITORÍA ====================

export type CategoriaDescargo =
  | 'orden_limpieza'
  | 'pedidos'
  | 'gestion_administrativa'
  | 'club_mascotera'
  | 'control_stock_caja'

export interface DescargoAuditoriaDemo {
  id: number
  categoria: CategoriaDescargo
  titulo: string
  descripcion: string
  estado: 'pendiente' | 'aprobado' | 'rechazado'
  fecha_descargo: string
  creado_por_id: number
  creado_por_nombre: string
  fecha_resolucion?: string
  resuelto_por_nombre?: string
  comentario_auditor?: string
  // Referencia opcional al item específico (tarea, conteo, etc.)
  referencia_id?: number
  referencia_tipo?: string
}

export const CATEGORIAS_DESCARGO: { id: CategoriaDescargo; label: string }[] = [
  { id: 'orden_limpieza', label: 'Orden y Limpieza' },
  { id: 'pedidos', label: 'Plataforma de Pedidos' },
  { id: 'gestion_administrativa', label: 'Gestión Administrativa' },
  { id: 'club_mascotera', label: 'Servicios Club La Mascotera' },
  { id: 'control_stock_caja', label: 'Control de Stock y Caja' },
]

// Descargos de ejemplo
export const getDescargosAuditoriaDemo = (): DescargoAuditoriaDemo[] => [
  {
    id: 1,
    categoria: 'orden_limpieza',
    titulo: 'Retraso en limpieza de vitrinas',
    descripcion: 'La semana pasada tuvimos faltante de personal por enfermedad (2 empleados con certificado médico). Estamos poniéndonos al día con las tareas pendientes.',
    estado: 'aprobado',
    fecha_descargo: diasAtras(3),
    creado_por_id: 5,
    creado_por_nombre: 'Juan Vendedor',
    fecha_resolucion: diasAtras(2),
    resuelto_por_nombre: 'Supervisor',
    comentario_auditor: 'Descargo aceptado. Se verificó el parte de enfermedad.',
    referencia_id: 1,
    referencia_tipo: 'tarea',
  },
  {
    id: 2,
    categoria: 'control_stock_caja',
    titulo: 'Diferencia de caja día 15/01',
    descripcion: 'La diferencia de $1.250 se debe a un error en el vuelto de una venta grande. El cliente devolvió el excedente al día siguiente.',
    estado: 'pendiente',
    fecha_descargo: diasAtras(1),
    creado_por_id: 6,
    creado_por_nombre: 'María Cajera',
  },
  {
    id: 3,
    categoria: 'pedidos',
    titulo: 'Pedidos rechazados por falta de stock',
    descripcion: 'Los 3 pedidos rechazados de la semana fueron por productos que figuraban en sistema pero no estaban físicamente. Ya se reportó el ajuste de stock.',
    estado: 'pendiente',
    fecha_descargo: diasAtras(2),
    creado_por_id: 5,
    creado_por_nombre: 'Juan Vendedor',
  },
  {
    id: 4,
    categoria: 'club_mascotera',
    titulo: 'Alto porcentaje consumidor final',
    descripcion: 'Muchos clientes nuevos esta semana que aún no tienen cuenta en el club. Se les ofreció registrarse pero prefirieron no hacerlo.',
    estado: 'rechazado',
    fecha_descargo: diasAtras(5),
    creado_por_id: 7,
    creado_por_nombre: 'Carlos Vendedor',
    fecha_resolucion: diasAtras(4),
    resuelto_por_nombre: 'Auditor',
    comentario_auditor: 'El porcentaje sigue muy por encima de la meta. Se requiere mayor esfuerzo en captación.',
  },
  {
    id: 5,
    categoria: 'gestion_administrativa',
    titulo: 'Facturas pendientes de cargar',
    descripcion: 'El sistema estuvo caído 2 días y no se pudieron cargar las facturas. Ya se regularizó.',
    estado: 'aprobado',
    fecha_descargo: diasAtras(7),
    creado_por_id: 6,
    creado_por_nombre: 'María Cajera',
    fecha_resolucion: diasAtras(6),
    resuelto_por_nombre: 'Supervisor',
    comentario_auditor: 'Se confirma la caída del sistema. Descargo válido.',
  },
]

// Obtener descargos pendientes
export const getDescargosPendientesDemo = () =>
  getDescargosAuditoriaDemo().filter(d => d.estado === 'pendiente')

// Obtener descargos por categoría
export const getDescargosPorCategoriaDemo = (categoria: CategoriaDescargo) =>
  getDescargosAuditoriaDemo().filter(d => d.categoria === categoria)
