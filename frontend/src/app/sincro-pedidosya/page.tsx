'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bike, WifiOff, Clock, ShoppingBag } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'

export default function SincroPedidosYAPage() {
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Bike className="w-8 h-8 text-mascotera-turquesa" />
            Sincro Pedidos YA
          </h1>
          <p className="text-gray-400 mt-2">
            Sincronizacion con la plataforma PedidosYa
          </p>
        </div>

        {/* Estado de conexion */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gray-700/50 flex items-center justify-center">
              <WifiOff className="w-8 h-8 text-gray-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Estado de Conexion</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-3 h-3 rounded-full bg-gray-500"></span>
                <span className="text-gray-400">Desconectado</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mensaje de proximamente */}
        <div className="glass rounded-2xl p-12 text-center">
          <div className="w-24 h-24 rounded-full bg-mascotera-turquesa/10 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-12 h-12 text-mascotera-turquesa" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Integracion Proximamente
          </h2>
          <p className="text-gray-400 max-w-md mx-auto mb-8">
            Estamos trabajando en la integracion con PedidosYa.
            Pronto podras ver y gestionar los pedidos directamente desde aqui.
          </p>

          {/* Features coming */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="bg-gray-800/30 rounded-xl p-4">
              <ShoppingBag className="w-8 h-8 text-mascotera-amarillo mx-auto mb-2" />
              <p className="text-sm text-gray-300">Ver pedidos entrantes</p>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-4">
              <Clock className="w-8 h-8 text-mascotera-amarillo mx-auto mb-2" />
              <p className="text-sm text-gray-300">Tiempos de entrega</p>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-4">
              <Bike className="w-8 h-8 text-mascotera-amarillo mx-auto mb-2" />
              <p className="text-sm text-gray-300">Estado de delivery</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
