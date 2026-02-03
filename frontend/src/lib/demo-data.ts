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
