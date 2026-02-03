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
