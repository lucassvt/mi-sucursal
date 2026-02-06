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
    asignado_por_nombre: 'Encargado',
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
    creado_por_nombre: 'Encargado',
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
    resuelto_por_nombre: 'Encargado',
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
      { id: 2, tipo_servicio: 'BANO', precio_base: 2200, fecha_vigencia_desde: diasAtras(90), fecha_vigencia_hasta: diasAtras(30), creado_por_nombre: 'Encargado', motivo_cambio: 'Ajuste por inflación' },
      { id: 3, tipo_servicio: 'BANO', precio_base: 2000, fecha_vigencia_desde: diasAtras(180), fecha_vigencia_hasta: diasAtras(90), creado_por_nombre: 'Gerencia', motivo_cambio: 'Precio inicial' },
    ]
  }
  return [
    { id: 4, tipo_servicio: 'CORTE', precio_base: 3500, fecha_vigencia_desde: diasAtras(15), fecha_vigencia_hasta: null, creado_por_nombre: 'Encargado', motivo_cambio: 'Solicitud aprobada' },
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
  asignado_por_nombre: 'Encargado Demo',
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
    revisado_por_nombre: 'Encargado',
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
    revisado_por_nombre: 'Encargado',
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
    resuelto_por_nombre: 'Encargado',
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
    resuelto_por_nombre: 'Encargado',
    comentario_supervisor: 'Ya se hizo conteo la semana pasada de estos productos',
  },
]

// Obtener sugerencias pendientes (para badge en encargado)
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
    resuelto_por_nombre: 'Encargado',
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
    resuelto_por_nombre: 'Encargado',
    comentario_auditor: 'Se confirma la caída del sistema. Descargo válido.',
  },
]

// Obtener descargos pendientes
export const getDescargosPendientesDemo = () =>
  getDescargosAuditoriaDemo().filter(d => d.estado === 'pendiente')

// Obtener descargos por categoría
export const getDescargosPorCategoriaDemo = (categoria: CategoriaDescargo) =>
  getDescargosAuditoriaDemo().filter(d => d.categoria === categoria)

// ==================== SUCURSALES ====================

export interface SucursalDemo {
  id: number
  nombre: string
  tiene_veterinaria: boolean
  tiene_peluqueria: boolean
}

// Lista de sucursales para selector de encargados
export const getSucursalesDemo = (): SucursalDemo[] => [
  { id: 7, nombre: 'ALEM', tiene_veterinaria: true, tiene_peluqueria: true },
  { id: 8, nombre: 'ARENALES', tiene_veterinaria: false, tiene_peluqueria: true },
  { id: 9, nombre: 'BANDA', tiene_veterinaria: false, tiene_peluqueria: true },
  { id: 10, nombre: 'BELGRANO', tiene_veterinaria: false, tiene_peluqueria: true },
  { id: 11, nombre: 'BELGRANO SUR', tiene_veterinaria: false, tiene_peluqueria: true },
  { id: 12, nombre: 'CATAMARCA', tiene_veterinaria: false, tiene_peluqueria: true },
  { id: 13, nombre: 'CONCEPCION', tiene_veterinaria: false, tiene_peluqueria: true },
  { id: 14, nombre: 'CONGRESO', tiene_veterinaria: true, tiene_peluqueria: true },
  { id: 16, nombre: 'LAPRIDA', tiene_veterinaria: true, tiene_peluqueria: true },
  { id: 17, nombre: 'LEGUIZAMON', tiene_veterinaria: false, tiene_peluqueria: false },
  { id: 18, nombre: 'MUÑECAS', tiene_veterinaria: false, tiene_peluqueria: true },
  { id: 20, nombre: 'NEUQUEN OLASCOAGA', tiene_veterinaria: false, tiene_peluqueria: true },
  { id: 21, nombre: 'PARQUE', tiene_veterinaria: false, tiene_peluqueria: true },
  { id: 22, nombre: 'PINAR I', tiene_veterinaria: false, tiene_peluqueria: true },
  { id: 26, nombre: 'YERBA BUENA', tiene_veterinaria: true, tiene_peluqueria: true },
]

// ==================== VENTAS POR TIPO ====================

export interface VentasPorTipoDemo {
  sucursal_id: number
  nro_pto_vta: number
  periodo: string
  ventas: {
    productos: { total: number; cantidad: number; porcentaje: number }
    veterinaria: { total: number; cantidad: number; porcentaje: number }
    peluqueria: { total: number; cantidad: number; porcentaje: number }
  }
  total_general: number
  total_transacciones: number
}

// Ventas del día de ejemplo
export const getVentasPorTipoDemo = (periodo: 'hoy' | 'semana' | 'mes' | 'año' = 'hoy'): VentasPorTipoDemo => {
  // Simular diferentes valores según el periodo
  const multiplicador = periodo === 'hoy' ? 1 : periodo === 'semana' ? 7 : periodo === 'mes' ? 30 : 365

  const productosBase = 125000 * multiplicador
  const veterinariaBase = 45000 * multiplicador
  const peluqueriaBase = 32000 * multiplicador
  const total = productosBase + veterinariaBase + peluqueriaBase

  return {
    sucursal_id: 1,
    nro_pto_vta: 1,
    periodo,
    ventas: {
      productos: {
        total: productosBase,
        cantidad: Math.round(15 * multiplicador),
        porcentaje: Math.round(productosBase / total * 100 * 10) / 10,
      },
      veterinaria: {
        total: veterinariaBase,
        cantidad: Math.round(8 * multiplicador),
        porcentaje: Math.round(veterinariaBase / total * 100 * 10) / 10,
      },
      peluqueria: {
        total: peluqueriaBase,
        cantidad: Math.round(6 * multiplicador),
        porcentaje: Math.round(peluqueriaBase / total * 100 * 10) / 10,
      },
    },
    total_general: total,
    total_transacciones: Math.round(29 * multiplicador),
  }
}

// ==================== OBJETIVOS DE SUCURSAL ====================

export interface ObjetivosSucursalDemo {
  existe: boolean
  sucursal_id: number
  sucursal_nombre: string
  periodo: string
  objetivo_venta_general: number
  proveedores: {
    senda: { piso: number; techo: number }
    jaspe_liwue: { piso: number; techo: number }
    productos_estrella: { piso: number; techo: number }
  }
  objetivo_turnos_peluqueria: number
  objetivo_consultas_veterinaria: number
  objetivo_vacunas: number
  tiene_veterinaria: boolean
  tiene_peluqueria: boolean
  mensaje?: string
}

// Obtener objetivos demo para una sucursal
// ==================== VENTAS PERDIDAS ====================

export interface VentaPerdidaDemo {
  id: number
  sucursal_id: number
  employee_id: number
  cod_item: string | null
  item_nombre: string
  marca: string | null
  cantidad: number
  es_producto_nuevo: boolean
  motivo: string
  observaciones: string | null
  fecha_registro: string
  employee_nombre: string
}

export interface ResumenVentasPerdidasDemo {
  total_registros: number
  total_unidades: number
  sin_stock: number
  por_precio: number
  otros: number
  productos_nuevos: number
}

// Ventas perdidas de ejemplo
export const getVentasPerdidasDemo = (): VentaPerdidaDemo[] => [
  {
    id: 1,
    sucursal_id: 1,
    employee_id: 5,
    cod_item: 'ALIM015',
    item_nombre: 'Royal Canin Urinary S/O 10kg',
    marca: 'Royal Canin',
    cantidad: 2,
    es_producto_nuevo: false,
    motivo: 'sin_stock',
    observaciones: 'Cliente preguntó específicamente por esta variedad',
    fecha_registro: diasAtras(0) + 'T10:30:00',
    employee_nombre: 'Vendedor Demo',
  },
  {
    id: 2,
    sucursal_id: 1,
    employee_id: 5,
    cod_item: null,
    item_nombre: 'Alimento para hurones marca Ferret',
    marca: 'Ferret Premium',
    cantidad: 1,
    es_producto_nuevo: true,
    motivo: 'producto_nuevo',
    observaciones: 'Varios clientes preguntaron por alimento para hurones',
    fecha_registro: diasAtras(1) + 'T15:45:00',
    employee_nombre: 'Vendedor Demo',
  },
  {
    id: 3,
    sucursal_id: 1,
    employee_id: 6,
    cod_item: 'ACC001',
    item_nombre: 'Collar antipulgas Seresto gato',
    marca: 'Bayer',
    cantidad: 3,
    es_producto_nuevo: false,
    motivo: 'sin_stock',
    observaciones: 'Sin stock hace 2 semanas',
    fecha_registro: diasAtras(2) + 'T11:20:00',
    employee_nombre: 'María Vendedora',
  },
  {
    id: 4,
    sucursal_id: 1,
    employee_id: 5,
    cod_item: 'ALIM008',
    item_nombre: 'Dog Chow Adulto 21kg',
    marca: 'Purina',
    cantidad: 5,
    es_producto_nuevo: false,
    motivo: 'precio',
    observaciones: 'Cliente dijo que en otro lado estaba más barato',
    fecha_registro: diasAtras(3) + 'T09:15:00',
    employee_nombre: 'Vendedor Demo',
  },
  {
    id: 5,
    sucursal_id: 1,
    employee_id: 6,
    cod_item: null,
    item_nombre: 'Arena sanitaria biodegradable de maíz',
    marca: null,
    cantidad: 2,
    es_producto_nuevo: true,
    motivo: 'producto_nuevo',
    observaciones: 'Cliente buscaba arena ecológica',
    fecha_registro: diasAtras(5) + 'T14:00:00',
    employee_nombre: 'María Vendedora',
  },
  {
    id: 6,
    sucursal_id: 1,
    employee_id: 5,
    cod_item: 'ALIM006',
    item_nombre: 'Pedigree Adulto 21kg',
    marca: 'Pedigree',
    cantidad: 1,
    es_producto_nuevo: false,
    motivo: 'otro',
    observaciones: 'Bolsa rota, no se pudo vender',
    fecha_registro: diasAtras(4) + 'T16:30:00',
    employee_nombre: 'Vendedor Demo',
  },
]

// Resumen de ventas perdidas del mes
export const getResumenVentasPerdidasDemo = (): ResumenVentasPerdidasDemo => ({
  total_registros: 6,
  total_unidades: 14,
  sin_stock: 2,
  por_precio: 1,
  otros: 1,
  productos_nuevos: 2,
})

// Resumen de ventas perdidas de TODAS las sucursales (para encargados)
export interface ResumenVentasPerdidasSucursalDemo {
  sucursal_id: number
  sucursal_nombre: string
  total_registros: number
  total_unidades: number
  sin_stock: number
  por_precio: number
  otros: number
  productos_nuevos: number
}

export const getResumenVentasPerdidasTodasDemo = (): ResumenVentasPerdidasSucursalDemo[] => [
  { sucursal_id: 7, sucursal_nombre: 'ALEM', total_registros: 15, total_unidades: 28, sin_stock: 8, por_precio: 3, otros: 2, productos_nuevos: 2 },
  { sucursal_id: 16, sucursal_nombre: 'LAPRIDA', total_registros: 12, total_unidades: 22, sin_stock: 6, por_precio: 2, otros: 1, productos_nuevos: 3 },
  { sucursal_id: 10, sucursal_nombre: 'BELGRANO', total_registros: 8, total_unidades: 15, sin_stock: 5, por_precio: 1, otros: 1, productos_nuevos: 1 },
  { sucursal_id: 14, sucursal_nombre: 'CONGRESO', total_registros: 10, total_unidades: 18, sin_stock: 4, por_precio: 3, otros: 2, productos_nuevos: 1 },
  { sucursal_id: 26, sucursal_nombre: 'YERBA BUENA', total_registros: 6, total_unidades: 10, sin_stock: 3, por_precio: 1, otros: 0, productos_nuevos: 2 },
  { sucursal_id: 18, sucursal_nombre: 'MUÑECAS', total_registros: 9, total_unidades: 16, sin_stock: 5, por_precio: 2, otros: 1, productos_nuevos: 1 },
  { sucursal_id: 21, sucursal_nombre: 'PARQUE', total_registros: 4, total_unidades: 7, sin_stock: 2, por_precio: 1, otros: 0, productos_nuevos: 1 },
  { sucursal_id: 8, sucursal_nombre: 'ARENALES', total_registros: 7, total_unidades: 12, sin_stock: 4, por_precio: 1, otros: 1, productos_nuevos: 1 },
  { sucursal_id: 12, sucursal_nombre: 'CATAMARCA', total_registros: 5, total_unidades: 9, sin_stock: 3, por_precio: 0, otros: 1, productos_nuevos: 1 },
  { sucursal_id: 9, sucursal_nombre: 'BANDA', total_registros: 3, total_unidades: 5, sin_stock: 2, por_precio: 0, otros: 0, productos_nuevos: 1 },
]

// ==================== RECONTACTOS - RESUMEN TODAS ====================

export interface ResumenRecontactosSucursalDemo {
  sucursal_id: number
  sucursal_nombre: string
  total_clientes: number
  pendientes: number
  contactados: number
  recuperados: number
  no_interesados: number
  decesos: number
  contactados_semana: number
  contactados_hoy: number
}

export const getResumenRecontactosTodasDemo = (): ResumenRecontactosSucursalDemo[] => [
  { sucursal_id: 7, sucursal_nombre: 'ALEM', total_clientes: 25, pendientes: 8, contactados: 5, recuperados: 9, no_interesados: 2, decesos: 1, contactados_semana: 6, contactados_hoy: 2 },
  { sucursal_id: 16, sucursal_nombre: 'LAPRIDA', total_clientes: 18, pendientes: 12, contactados: 2, recuperados: 3, no_interesados: 1, decesos: 0, contactados_semana: 3, contactados_hoy: 1 },
  { sucursal_id: 10, sucursal_nombre: 'BELGRANO', total_clientes: 22, pendientes: 5, contactados: 4, recuperados: 10, no_interesados: 2, decesos: 1, contactados_semana: 5, contactados_hoy: 0 },
  { sucursal_id: 14, sucursal_nombre: 'CONGRESO', total_clientes: 15, pendientes: 10, contactados: 2, recuperados: 2, no_interesados: 1, decesos: 0, contactados_semana: 2, contactados_hoy: 0 },
  { sucursal_id: 26, sucursal_nombre: 'YERBA BUENA', total_clientes: 12, pendientes: 3, contactados: 2, recuperados: 5, no_interesados: 1, decesos: 1, contactados_semana: 4, contactados_hoy: 1 },
  { sucursal_id: 18, sucursal_nombre: 'MUÑECAS', total_clientes: 20, pendientes: 14, contactados: 3, recuperados: 2, no_interesados: 1, decesos: 0, contactados_semana: 1, contactados_hoy: 0 },
  { sucursal_id: 21, sucursal_nombre: 'PARQUE', total_clientes: 10, pendientes: 2, contactados: 1, recuperados: 6, no_interesados: 1, decesos: 0, contactados_semana: 3, contactados_hoy: 1 },
  { sucursal_id: 8, sucursal_nombre: 'ARENALES', total_clientes: 16, pendientes: 9, contactados: 3, recuperados: 3, no_interesados: 1, decesos: 0, contactados_semana: 2, contactados_hoy: 0 },
  { sucursal_id: 12, sucursal_nombre: 'CATAMARCA', total_clientes: 8, pendientes: 6, contactados: 1, recuperados: 1, no_interesados: 0, decesos: 0, contactados_semana: 1, contactados_hoy: 0 },
  { sucursal_id: 9, sucursal_nombre: 'BANDA', total_clientes: 14, pendientes: 4, contactados: 3, recuperados: 5, no_interesados: 1, decesos: 1, contactados_semana: 4, contactados_hoy: 2 },
]

// Items buscables para ventas perdidas (simula API de items_central)
export interface ItemBuscableDemo {
  cod_item: string
  item: string
  marca_nombre: string | null
  stock: Record<string, number>
}

export const getItemsBuscablesDemo = (query: string): ItemBuscableDemo[] => {
  const items: ItemBuscableDemo[] = [
    { cod_item: 'ALIM001', item: 'Royal Canin Medium Adult 15kg', marca_nombre: 'Royal Canin', stock: { ALEM: 12, LAPRIDA: 8 } },
    { cod_item: 'ALIM002', item: 'Purina Pro Plan Cachorro 15kg', marca_nombre: 'Purina', stock: { ALEM: 5, LAPRIDA: 3 } },
    { cod_item: 'ALIM003', item: 'Eukanuba Large Breed 15kg', marca_nombre: 'Eukanuba', stock: { ALEM: 7, LAPRIDA: 4 } },
    { cod_item: 'ALIM004', item: 'Hills Science Diet Adult 12kg', marca_nombre: 'Hills', stock: { ALEM: 4, LAPRIDA: 6 } },
    { cod_item: 'ALIM005', item: 'Excellent Gato Adulto 10kg', marca_nombre: 'Excellent', stock: { ALEM: 15, LAPRIDA: 10 } },
    { cod_item: 'ALIM006', item: 'Pedigree Adulto 21kg', marca_nombre: 'Pedigree', stock: { ALEM: 8, LAPRIDA: 5 } },
    { cod_item: 'ALIM007', item: 'Whiskas Gato Adulto 10kg', marca_nombre: 'Whiskas', stock: { ALEM: 6, LAPRIDA: 4 } },
    { cod_item: 'ALIM008', item: 'Dog Chow Adulto 21kg', marca_nombre: 'Purina', stock: { ALEM: 0, LAPRIDA: 2 } },
    { cod_item: 'ACC001', item: 'Collar antipulgas Seresto perro', marca_nombre: 'Bayer', stock: { ALEM: 3, LAPRIDA: 1 } },
    { cod_item: 'ACC002', item: 'Collar antipulgas Seresto gato', marca_nombre: 'Bayer', stock: { ALEM: 0, LAPRIDA: 0 } },
    { cod_item: 'ALIM015', item: 'Royal Canin Urinary S/O 10kg', marca_nombre: 'Royal Canin', stock: { ALEM: 0, LAPRIDA: 1 } },
    { cod_item: 'ALIM016', item: 'Royal Canin Renal 10kg', marca_nombre: 'Royal Canin', stock: { ALEM: 2, LAPRIDA: 0 } },
  ]

  const q = query.toLowerCase()
  return items.filter(i =>
    i.item.toLowerCase().includes(q) ||
    i.cod_item.toLowerCase().includes(q) ||
    (i.marca_nombre && i.marca_nombre.toLowerCase().includes(q))
  )
}

// ==================== AUDITORIA MENSUAL ====================

export interface AuditoriaMensualDemo {
  id: number
  sucursal_id: number
  periodo: string  // "2026-01"
  orden_limpieza: number | null
  pedidos: number | null
  gestion_administrativa: number | null
  club_mascotera: number | null
  control_stock_caja: number | null
  puntaje_total: number | null
  observaciones: string | null
}

export const getAuditoriaMensualDemo = (): AuditoriaMensualDemo[] => {
  const hoy = new Date()

  // Datos fijos para 4 meses anteriores (puntajes mejoran gradualmente)
  const datosBase = [
    // Mes más reciente (i=1): mejor puntaje
    { ol: 82, pe: 78, ga: 75, cm: 85, cs: 70, obs: 'Muy buen mes en general' },
    // 2 meses atrás
    { ol: 72, pe: 68, ga: 65, cm: 74, cs: 60, obs: null },
    // 3 meses atrás
    { ol: 65, pe: 58, ga: 62, cm: 55, cs: 52, obs: null },
    // 4 meses atrás
    { ol: 55, pe: 48, ga: 50, cm: 52, cs: 45, obs: null },
  ]

  return datosBase.map((d, i) => {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - (i + 1), 1)
    const periodo = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
    const promedio = Math.round((d.ol + d.pe + d.ga + d.cm + d.cs) / 5 * 10) / 10

    return {
      id: i + 1,
      sucursal_id: 7,
      periodo,
      orden_limpieza: d.ol,
      pedidos: d.pe,
      gestion_administrativa: d.ga,
      club_mascotera: d.cm,
      control_stock_caja: d.cs,
      puntaje_total: promedio,
      observaciones: d.obs,
    }
  })
}

// ==================== AUDITORIA MENSUAL - TODAS LAS SUCURSALES ====================

export interface AuditoriaMensualSucursalDemo {
  sucursal_id: number
  sucursal_nombre: string
  periodos: Array<{
    periodo: string
    orden_limpieza: number | null
    pedidos: number | null
    gestion_administrativa: number | null
    club_mascotera: number | null
    control_stock_caja: number | null
    puntaje_total: number | null
    observaciones: string | null
  }>
}

export const getAuditoriaMensualTodasDemo = (): AuditoriaMensualSucursalDemo[] => {
  const hoy = new Date()
  const periodos = Array.from({ length: 4 }, (_, i) => {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - (i + 1), 1)
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
  })

  const sucursales = getSucursalesDemo()

  // Puntajes base por sucursal (simulan diferentes niveles de rendimiento)
  const puntajesBase: Record<number, { ol: number; pe: number; ga: number; cm: number; cs: number }> = {
    7:  { ol: 85, pe: 80, ga: 78, cm: 88, cs: 72 },
    8:  { ol: 72, pe: 65, ga: 60, cm: 70, cs: 58 },
    9:  { ol: 68, pe: 55, ga: 52, cm: 62, cs: 48 },
    10: { ol: 90, pe: 88, ga: 85, cm: 92, cs: 80 },
    11: { ol: 60, pe: 50, ga: 45, cm: 55, cs: 42 },
    12: { ol: 78, pe: 72, ga: 70, cm: 75, cs: 65 },
    13: { ol: 55, pe: 48, ga: 40, cm: 50, cs: 38 },
    14: { ol: 82, pe: 76, ga: 74, cm: 80, cs: 68 },
    16: { ol: 75, pe: 70, ga: 68, cm: 72, cs: 62 },
    17: { ol: 45, pe: 38, ga: 35, cm: 40, cs: 30 },
    18: { ol: 88, pe: 82, ga: 80, cm: 86, cs: 75 },
    20: { ol: 65, pe: 58, ga: 55, cm: 60, cs: 50 },
    21: { ol: 70, pe: 62, ga: 58, cm: 65, cs: 55 },
    22: { ol: 80, pe: 75, ga: 72, cm: 78, cs: 66 },
    26: { ol: 92, pe: 90, ga: 88, cm: 95, cs: 85 },
  }

  return sucursales.map(s => {
    const base = puntajesBase[s.id] || { ol: 60, pe: 55, ga: 50, cm: 58, cs: 45 }
    return {
      sucursal_id: s.id,
      sucursal_nombre: s.nombre,
      periodos: periodos.map((periodo, i) => {
        // Puntajes mejoran gradualmente (mes más reciente = mejor)
        const factor = 1 - (i * 0.08)
        const ol = Math.round(base.ol * factor)
        const pe = Math.round(base.pe * factor)
        const ga = Math.round(base.ga * factor)
        const cm = Math.round(base.cm * factor)
        const cs = Math.round(base.cs * factor)
        const prom = Math.round((ol + pe + ga + cm + cs) / 5 * 10) / 10
        return {
          periodo,
          orden_limpieza: ol,
          pedidos: pe,
          gestion_administrativa: ga,
          club_mascotera: cm,
          control_stock_caja: cs,
          puntaje_total: prom,
          observaciones: i === 0 ? null : null,
        }
      }),
    }
  })
}

export const getObjetivosSucursalDemo = (sucursalId?: number): ObjetivosSucursalDemo => {
  const sucursal = sucursalId
    ? getSucursalesDemo().find(s => s.id === sucursalId)
    : null

  const hoy = new Date()
  const periodo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`

  // Simular que febrero 2026 no tiene objetivos cargados (como en la BD real)
  const mesActual = hoy.getMonth() + 1
  const añoActual = hoy.getFullYear()
  const sinObjetivos = mesActual === 2 && añoActual === 2026

  if (sinObjetivos) {
    return {
      existe: false,
      sucursal_id: sucursalId || 1,
      sucursal_nombre: sucursal?.nombre || 'Sucursal Centro',
      periodo,
      objetivo_venta_general: 0,
      proveedores: {
        senda: { piso: 0, techo: 0 },
        jaspe_liwue: { piso: 0, techo: 0 },
        productos_estrella: { piso: 0, techo: 0 }
      },
      objetivo_turnos_peluqueria: 0,
      objetivo_consultas_veterinaria: 0,
      objetivo_vacunas: 0,
      tiene_veterinaria: sucursal?.tiene_veterinaria ?? true,
      tiene_peluqueria: sucursal?.tiene_peluqueria ?? true,
      mensaje: 'No hay objetivos cargados para este periodo. Contacte a Gerencia.'
    }
  }

  // Objetivos de enero como en la BD real
  return {
    existe: true,
    sucursal_id: sucursalId || 1,
    sucursal_nombre: sucursal?.nombre || 'Sucursal Centro',
    periodo,
    objetivo_venta_general: 50000000, // $50M
    proveedores: {
      senda: { piso: 300, techo: 600 },
      jaspe_liwue: { piso: 200, techo: 400 },
      productos_estrella: { piso: 1500000, techo: 3000000 }
    },
    objetivo_turnos_peluqueria: sucursal?.tiene_peluqueria ? 50 : 0,
    objetivo_consultas_veterinaria: sucursal?.tiene_veterinaria ? 30 : 0,
    objetivo_vacunas: sucursal?.tiene_veterinaria ? 20 : 0,
    tiene_veterinaria: sucursal?.tiene_veterinaria ?? true,
    tiene_peluqueria: sucursal?.tiene_peluqueria ?? true,
  }
}

// ==========================================
// FACTURAS DE PROVEEDORES
// ==========================================

export interface ProveedorDemo {
  id: number
  nombre: string
  origen: 'dux' | 'custom'
}

const PROVEEDORES_DEMO: ProveedorDemo[] = [
  { id: 1, nombre: 'FRUAL', origen: 'dux' },
  { id: 2, nombre: 'ALIMASC', origen: 'dux' },
  { id: 3, nombre: 'ROYAL EUKA - NUTRIPET', origen: 'dux' },
  { id: 4, nombre: 'OLD PRINCE - ORG COMERCIAL DON TOMAS SRL', origen: 'dux' },
  { id: 5, nombre: 'ALICAN NUTRISUR', origen: 'dux' },
  { id: 6, nombre: 'CONURBANO DISTRIBUCION', origen: 'dux' },
  { id: 7, nombre: 'KUALCOS SRL', origen: 'dux' },
  { id: 8, nombre: 'DIMACOL SRL', origen: 'dux' },
  { id: 9, nombre: 'JOSMAYO SRL', origen: 'dux' },
  { id: 10, nombre: 'TIERRA MIA SA', origen: 'dux' },
  { id: 11, nombre: 'AQUALIC AGUAS SRL', origen: 'dux' },
  { id: 12, nombre: 'BAZA DEPO RUTA 9', origen: 'dux' },
]

export const getProveedoresBuscablesDemo = (query: string): ProveedorDemo[] => {
  const q = query.toLowerCase()
  return PROVEEDORES_DEMO.filter(p => p.nombre.toLowerCase().includes(q))
}

export interface FacturaDemo {
  id: number
  sucursal_id: number
  employee_id: number
  proveedor_nombre: string
  numero_factura: string | null
  tiene_inconsistencia: boolean
  detalle_inconsistencia: string | null
  observaciones: string | null
  fecha_factura: string | null
  fecha_registro: string
  employee_nombre: string
}

export const getFacturasDemo = (): FacturaDemo[] => [
  {
    id: 1,
    sucursal_id: 1,
    employee_id: 1,
    proveedor_nombre: 'FRUAL',
    numero_factura: 'FC-A-00012345',
    tiene_inconsistencia: false,
    detalle_inconsistencia: null,
    observaciones: null,
    fecha_factura: diasAtras(1),
    fecha_registro: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    employee_nombre: 'Juan Perez',
  },
  {
    id: 2,
    sucursal_id: 1,
    employee_id: 2,
    proveedor_nombre: 'ALIMASC',
    numero_factura: 'FC-B-00098765',
    tiene_inconsistencia: true,
    detalle_inconsistencia: 'Faltan 2 bultos de alimento balanceado que figuran en la factura pero no llegaron',
    observaciones: 'Se contacto al proveedor',
    fecha_factura: diasAtras(2),
    fecha_registro: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    employee_nombre: 'Maria Garcia',
  },
  {
    id: 3,
    sucursal_id: 1,
    employee_id: 1,
    proveedor_nombre: 'ROYAL EUKA - NUTRIPET',
    numero_factura: null,
    tiene_inconsistencia: false,
    detalle_inconsistencia: null,
    observaciones: 'Entrega parcial, resto llega el viernes',
    fecha_factura: diasAtras(3),
    fecha_registro: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    employee_nombre: 'Juan Perez',
  },
  {
    id: 4,
    sucursal_id: 1,
    employee_id: 3,
    proveedor_nombre: 'KUALCOS SRL',
    numero_factura: 'FC-A-00045678',
    tiene_inconsistencia: true,
    detalle_inconsistencia: 'Precio de 3 productos no coincide con lo pactado, diferencia de $15.000',
    observaciones: null,
    fecha_factura: diasAtras(5),
    fecha_registro: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    employee_nombre: 'Carlos Lopez',
  },
  {
    id: 5,
    sucursal_id: 1,
    employee_id: 2,
    proveedor_nombre: 'CONURBANO DISTRIBUCION',
    numero_factura: 'FC-A-00033210',
    tiene_inconsistencia: false,
    detalle_inconsistencia: null,
    observaciones: null,
    fecha_factura: diasAtras(7),
    fecha_registro: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    employee_nombre: 'Maria Garcia',
  },
]
