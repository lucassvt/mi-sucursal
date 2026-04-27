'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useScopeGerencia } from '@/hooks/useScopeGerencia'
import { useAuthStore } from '@/stores/auth-store'

export default function GerenciaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const { scope, loading, error } = useScopeGerencia()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (!scope || !scope.es_gerencia) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sin acceso a gerencia</h2>
          <p className="text-gray-600 text-sm mb-6">
            Tu usuario no tiene permiso de gestión de Mi Sucursal (Gerencia).
            Si esto es un error, contactá a un administrador.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        Error al cargar scope: {error}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Topbar gerencia */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
          <h1 className="font-semibold text-gray-900">Gerencia</h1>
          <span className="text-sm text-gray-500">
            {scope.sucursales.length} sucursal{scope.sucursales.length !== 1 ? 'es' : ''} en tu scope
          </span>
          <nav className="ml-auto flex gap-2 text-sm">
            <Link
              href="/gerencia"
              className={`px-3 py-1.5 rounded-lg ${
                pathname === '/gerencia' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Resumen
            </Link>
          </nav>
        </div>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
