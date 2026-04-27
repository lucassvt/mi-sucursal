'use client'

import { Fragment } from 'react'
import { useAuthStore } from '@/stores/auth-store'

/**
 * Fuerza re-mount de los hijos cuando cambia la sucursalActiva del store.
 * Usa Fragment con key para no insertar un div en el DOM (preserva layout flex/grid).
 * 2026-04-26: agregado para fixear selector de sucursal y no romper sidebar.
 */
export default function SucursalKeyWrapper({ children }: { children: React.ReactNode }) {
  const sucursalActiva = useAuthStore(s => s.sucursalActiva)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  if (!isAuthenticated) {
    return <>{children}</>
  }

  return <Fragment key={sucursalActiva?.id ?? 'no-suc'}>{children}</Fragment>
}
