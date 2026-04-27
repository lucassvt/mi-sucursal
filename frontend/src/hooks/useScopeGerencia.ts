'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'

export interface SucursalScope {
  id: number
  codigo: string
  nombre: string
  tipo: 'central' | 'franquicia'
  tipo_acceso: 'casa_central_global' | 'franquiciado' | 'explicito'
}

export interface ScopeGerencia {
  es_gerencia: boolean
  sucursales: SucursalScope[]
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/misucursal-api'

export function useScopeGerencia() {
  const { token } = useAuthStore()
  const [scope, setScope] = useState<ScopeGerencia | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    let cancel = false
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/gerencia/mi-scope`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!cancel) setScope(data)
      } catch (e: any) {
        if (!cancel) setError(e.message || 'Error')
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [token])

  return { scope, loading, error }
}
