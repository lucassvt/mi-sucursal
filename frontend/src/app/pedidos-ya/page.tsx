'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Truck, RefreshCw, Package } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'

export default function PedidosYAPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuthStore()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-mascotera-turquesa border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Sincro Pedidos YA</h1>
          <p className="text-gray-400">Sincronizacion con plataforma Pedidos YA</p>
        </div>

        <div className="glass-card rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Proximamente</h2>
          <p className="text-gray-400 max-w-md mx-auto">
            Esta seccion permitira sincronizar pedidos con la plataforma Pedidos YA,
            gestionar el stock disponible y procesar ordenes de delivery.
          </p>
        </div>
      </main>
    </div>
  )
}
