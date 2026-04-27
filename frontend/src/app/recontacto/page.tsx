'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Phone, MessageSquare } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'

export default function RecontactoPage() {
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
          <h1 className="text-2xl font-bold text-white">Recontacto a Clientes</h1>
          <p className="text-gray-400">Seguimiento y contacto con clientes</p>
        </div>

        <div className="glass-card rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Proximamente</h2>
          <p className="text-gray-400 max-w-md mx-auto">
            Esta seccion permitira gestionar el seguimiento de clientes,
            programar recordatorios de contacto y llevar un historial de interacciones.
          </p>
        </div>
      </main>
    </div>
  )
}
