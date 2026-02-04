const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8003'

interface FetchOptions extends RequestInit {
  token?: string
}

export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error de conexión' }))
    throw new Error(error.detail || 'Error en la solicitud')
  }

  return response.json()
}

// Auth
export const authApi = {
  login: (usuario: string, password: string) =>
    apiFetch<{ access_token: string; token_type: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usuario, password }),
    }),

  me: (token: string) =>
    apiFetch<any>('/api/auth/me', { token }),
}

// Dashboard
export const dashboardApi = {
  getVentas: (token: string) =>
    apiFetch<any>('/api/dashboard/ventas', { token }),

  getObjetivos: (token: string) =>
    apiFetch<any>('/api/dashboard/objetivos', { token }),
}

// Items
export const itemsApi = {
  search: (token: string, query: string) =>
    apiFetch<any[]>(`/api/items/search?q=${encodeURIComponent(query)}`, { token }),

  getStock: (token: string, codItem: string) =>
    apiFetch<any>(`/api/items/stock/${codItem}`, { token }),
}

// Ventas Perdidas
export const ventasPerdidasApi = {
  list: (token: string) =>
    apiFetch<any[]>('/api/ventas-perdidas', { token }),

  create: (token: string, data: any) =>
    apiFetch<any>('/api/ventas-perdidas', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  resumen: (token: string) =>
    apiFetch<any>('/api/ventas-perdidas/resumen', { token }),
}

// Auditoría
export const auditoriaApi = {
  stockNegativo: (token: string) =>
    apiFetch<any[]>('/api/auditoria/stock-negativo', { token }),

  pilares: (token: string) =>
    apiFetch<any[]>('/api/auditoria/pilares', { token }),

  resumen: (token: string) =>
    apiFetch<any>('/api/auditoria/resumen', { token }),

  clubMascotera: (token: string) =>
    apiFetch<{
      sucursal: string
      sucursal_dux_id: number
      periodo: string
      total_facturas: number
      facturas_consumidor_final: number
      porcentaje_consumidor_final: number
      meta_porcentaje: number
      cumple_meta: boolean
    }>('/api/auditoria/club-mascotera', { token }),
}

// Cierres de Caja
export const cierresApi = {
  list: (token: string) =>
    apiFetch<any[]>('/api/cierres-caja', { token }),

  create: (token: string, data: any) =>
    apiFetch<any>('/api/cierres-caja', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  pendientes: (token: string) =>
    apiFetch<any[]>('/api/cierres-caja/pendientes', { token }),

  retiros: (token: string) =>
    apiFetch<any[]>('/api/cierres-caja/retiros', { token }),

  getCajas: (token: string) =>
    apiFetch<any[]>('/api/cierres-caja/cajas', { token }),
}

// Tareas
export const tareasApi = {
  list: (token: string, estado?: string) =>
    apiFetch<any[]>(`/api/tareas${estado ? `?estado=${estado}` : ''}`, { token }),

  puedeCrear: (token: string) =>
    apiFetch<{ puede_crear: boolean }>('/api/tareas/puede-crear', { token }),

  create: (token: string, data: any) =>
    apiFetch<any>('/api/tareas', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  completar: (token: string, id: number) =>
    apiFetch<any>(`/api/tareas/${id}/completar`, {
      method: 'PUT',
      token,
    }),

  actualizarEstado: (token: string, id: number, estado: string) =>
    apiFetch<any>(`/api/tareas/${id}/estado`, {
      method: 'PUT',
      body: JSON.stringify({ estado }),
      token,
    }),

  vencidas: (token: string) =>
    apiFetch<any[]>('/api/tareas/vencidas', { token }),

  resumen: (token: string) =>
    apiFetch<any>('/api/tareas/resumen', { token }),
}

// Ajustes de Stock
export const ajustesStockApi = {
  list: (token: string, params?: { deposito_id?: number; mes?: string; tipo?: string }) => {
    const queryParams = new URLSearchParams()
    if (params?.deposito_id) queryParams.append('deposito_id', params.deposito_id.toString())
    if (params?.mes) queryParams.append('mes', params.mes)
    if (params?.tipo) queryParams.append('tipo', params.tipo)
    const query = queryParams.toString()
    return apiFetch<any[]>(`/api/ajustes-stock${query ? `?${query}` : ''}`, { token })
  },

  resumen: (token: string, params?: { deposito_id?: number; mes?: string }) => {
    const queryParams = new URLSearchParams()
    if (params?.deposito_id) queryParams.append('deposito_id', params.deposito_id.toString())
    if (params?.mes) queryParams.append('mes', params.mes)
    const query = queryParams.toString()
    return apiFetch<{
      total_ajustes: number
      total_ingresos: number
      total_egresos: number
      cantidad_neta: number
      meses_disponibles: string[]
      por_deposito: Array<{
        deposito: string
        total_ajustes: number
        cantidad_ingresos: number
        cantidad_egresos: number
      }>
    }>(`/api/ajustes-stock/resumen${query ? `?${query}` : ''}`, { token })
  },

  depositos: (token: string) =>
    apiFetch<{ depositos: Array<{ id: number; nombre: string; codigo: string }> }>('/api/ajustes-stock/depositos', { token }),

  importarCSV: async (token: string, file: File, mes?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (mes) formData.append('mes', mes)

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8003'}/api/ajustes-stock/importar-csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error al importar CSV' }))
      throw new Error(error.detail || 'Error en la solicitud')
    }

    return response.json()
  },
}

// Vencimientos
export const vencimientosApi = {
  list: (token: string, estado?: string) => {
    const queryParams = new URLSearchParams()
    if (estado) queryParams.append('estado', estado)
    const query = queryParams.toString()
    return apiFetch<any[]>(`/api/vencimientos${query ? `?${query}` : ''}`, { token })
  },

  create: (token: string, data: {
    cod_item?: string | null
    producto: string
    cantidad: number
    lote?: string | null
    fecha_vencimiento: string
  }) =>
    apiFetch<any>('/api/vencimientos', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  update: (token: string, id: number, data: { estado: string; notas?: string }) =>
    apiFetch<any>(`/api/vencimientos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),

  resumen: (token: string) =>
    apiFetch<{
      total_registros: number
      por_vencer_semana: number
      por_vencer_mes: number
      vencidos: number
      retirados: number
      por_estado: Record<string, number>
    }>('/api/vencimientos/resumen', { token }),

  importarCSV: async (token: string, file: File, mes?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (mes) formData.append('mes', mes)

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8003'}/api/vencimientos/importar-csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error al importar CSV' }))
      throw new Error(error.detail || 'Error en la solicitud')
    }

    return response.json()
  },

  delete: (token: string, id: number) =>
    apiFetch<any>(`/api/vencimientos/${id}`, {
      method: 'DELETE',
      token,
    }),
}

// Recontactos
export const recontactosApi = {
  list: (token: string, estado?: string) => {
    const queryParams = new URLSearchParams()
    if (estado) queryParams.append('estado', estado)
    const query = queryParams.toString()
    return apiFetch<any[]>(`/api/recontactos${query ? `?${query}` : ''}`, { token })
  },

  create: (token: string, data: {
    cliente_codigo?: string
    cliente_nombre: string
    cliente_telefono?: string
    cliente_email?: string
    ultima_compra?: string
    dias_sin_comprar?: number
  }) =>
    apiFetch<any>('/api/recontactos', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  registrarContacto: (token: string, data: {
    cliente_recontacto_id: number
    medio: string
    resultado: string
    notas?: string
  }) =>
    apiFetch<any>('/api/recontactos/registrar-contacto', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  getContactos: (token: string, clienteId: number) =>
    apiFetch<any[]>(`/api/recontactos/${clienteId}/contactos`, { token }),

  resumen: (token: string) =>
    apiFetch<{
      total_clientes: number
      pendientes: number
      contactados_hoy: number
      contactados_semana: number
      recuperados: number
      no_interesados: number
      por_estado: Record<string, number>
    }>('/api/recontactos/resumen', { token }),

  importar: async (token: string, file: File, mes?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (mes) formData.append('mes', mes)

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8003'}/api/recontactos/importar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error al importar' }))
      throw new Error(error.detail || 'Error en la solicitud')
    }

    return response.json()
  },

  actualizarEstado: (token: string, clienteId: number, estado: string) =>
    apiFetch<any>(`/api/recontactos/${clienteId}/estado?estado=${estado}`, {
      method: 'PUT',
      token,
    }),

  delete: (token: string, clienteId: number) =>
    apiFetch<any>(`/api/recontactos/${clienteId}`, {
      method: 'DELETE',
      token,
    }),
}

// Peluquería - Precios de Servicios
export const peluqueriaApi = {
  // Obtener precios vigentes de la sucursal
  preciosVigentes: (token: string) =>
    apiFetch<any[]>('/api/peluqueria/precios', { token }),

  // Obtener resumen (para cards)
  resumen: (token: string) =>
    apiFetch<{
      precio_bano_actual: number
      precio_corte_actual: number
      fecha_vigencia_bano: string
      fecha_vigencia_corte: string
      solicitudes_pendientes: number
    }>('/api/peluqueria/resumen', { token }),

  // Obtener historial de precios por tipo de servicio
  historial: (token: string, tipoServicio: 'BANO' | 'CORTE') =>
    apiFetch<any[]>(`/api/peluqueria/historial/${tipoServicio}`, { token }),

  // Listar solicitudes de modificación
  solicitudes: (token: string, estado?: string) => {
    const params = estado ? `?estado=${estado}` : ''
    return apiFetch<any[]>(`/api/peluqueria/solicitudes${params}`, { token })
  },

  // Crear solicitud de modificación
  crearSolicitud: (token: string, data: {
    tipo_servicio: 'BANO' | 'CORTE'
    precio_propuesto: number
    motivo: string
  }) =>
    apiFetch<any>('/api/peluqueria/solicitudes', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  // Aprobar/rechazar solicitud (solo supervisores)
  resolverSolicitud: (token: string, id: number, data: {
    accion: 'aprobar' | 'rechazar'
    comentario?: string
  }) =>
    apiFetch<any>(`/api/peluqueria/solicitudes/${id}/resolver`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),
}

// Control de Stock - Conteos de Inventario
export const controlStockApi = {
  // Crear tarea de control de stock con productos seleccionados (supervisor)
  crearTarea: (token: string, data: {
    titulo: string
    descripcion?: string
    fecha_vencimiento: string
    productos: Array<{
      cod_item: string
      nombre: string
      precio: number
      stock_sistema: number
    }>
  }) =>
    apiFetch<any>('/api/control-stock/tareas', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  // Obtener conteo asociado a una tarea
  getConteo: (token: string, tareaId: number) =>
    apiFetch<any>(`/api/control-stock/conteo/${tareaId}`, { token }),

  // Actualizar producto (empleado registra stock real)
  actualizarProducto: (token: string, conteoId: number, productoId: number, data: {
    stock_real: number
    observaciones?: string
  }) =>
    apiFetch<any>(`/api/control-stock/conteo/${conteoId}/producto/${productoId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),

  // Guardar borrador del conteo
  guardarBorrador: (token: string, conteoId: number, productos: Array<{
    id: number
    stock_real?: number
    observaciones?: string
  }>) =>
    apiFetch<any>(`/api/control-stock/conteo/${conteoId}/guardar`, {
      method: 'PUT',
      body: JSON.stringify({ productos }),
      token,
    }),

  // Enviar conteo para revisión
  enviarConteo: (token: string, conteoId: number) =>
    apiFetch<any>(`/api/control-stock/conteo/${conteoId}/enviar`, {
      method: 'POST',
      token,
    }),

  // Revisar conteo (auditor/supervisor)
  revisarConteo: (token: string, conteoId: number, data: {
    estado: 'aprobado' | 'rechazado'
    comentarios?: string
  }) =>
    apiFetch<any>(`/api/control-stock/conteo/${conteoId}/revisar`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),

  // Resumen para auditoría
  resumenAuditoria: (token: string) =>
    apiFetch<{
      conteos_pendientes: number
      conteos_revisados_mes: number
      diferencia_total_mes: number
      valorizacion_diferencia_mes: number
    }>('/api/control-stock/auditoria/resumen', { token }),

  // Listar conteos para auditoría
  listarConteos: (token: string, params?: { estado?: string; mes?: string }) => {
    const queryParams = new URLSearchParams()
    if (params?.estado) queryParams.append('estado', params.estado)
    if (params?.mes) queryParams.append('mes', params.mes)
    const query = queryParams.toString()
    return apiFetch<any[]>(`/api/control-stock/auditoria/conteos${query ? `?${query}` : ''}`, { token })
  },

  // Buscar productos para seleccionar (usa itemsApi)
  buscarProductos: (token: string, query: string) =>
    itemsApi.search(token, query),

  // === Sugerencias de Conteo (vendedores sugieren, supervisores aprueban) ===

  // Listar sugerencias
  listarSugerencias: (token: string, estado?: string) => {
    const params = estado ? `?estado=${estado}` : ''
    return apiFetch<any[]>(`/api/control-stock/sugerencias${params}`, { token })
  },

  // Crear sugerencia (vendedor)
  crearSugerencia: (token: string, data: {
    productos: Array<{
      cod_item: string
      nombre: string
      precio: number
      stock_sistema: number
    }>
    motivo: string
  }) =>
    apiFetch<any>('/api/control-stock/sugerencias', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  // Resolver sugerencia (supervisor: aprobar con fecha o rechazar)
  resolverSugerencia: (token: string, id: number, data: {
    accion: 'aprobar' | 'rechazar'
    fecha_programada?: string
    comentario?: string
  }) =>
    apiFetch<any>(`/api/control-stock/sugerencias/${id}/resolver`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),
}

// Descargos de Auditoría
export const descargosApi = {
  // Listar descargos (filtrable por categoría y estado)
  list: (token: string, params?: { categoria?: string; estado?: string }) => {
    const queryParams = new URLSearchParams()
    if (params?.categoria) queryParams.append('categoria', params.categoria)
    if (params?.estado) queryParams.append('estado', params.estado)
    const query = queryParams.toString()
    return apiFetch<any[]>(`/api/auditoria/descargos${query ? `?${query}` : ''}`, { token })
  },

  // Crear descargo (vendedor)
  create: (token: string, data: {
    categoria: string
    titulo: string
    descripcion: string
    referencia_id?: number
    referencia_tipo?: string
  }) =>
    apiFetch<any>('/api/auditoria/descargos', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  // Resolver descargo (auditor/supervisor)
  resolver: (token: string, id: number, data: {
    accion: 'aprobar' | 'rechazar'
    comentario?: string
  }) =>
    apiFetch<any>(`/api/auditoria/descargos/${id}/resolver`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),

  // Obtener resumen de descargos pendientes
  resumen: (token: string) =>
    apiFetch<{
      total_pendientes: number
      por_categoria: Record<string, number>
    }>('/api/auditoria/descargos/resumen', { token }),
}
