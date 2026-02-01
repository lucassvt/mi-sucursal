'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ListTodo,
  Check,
  Clock,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Circle,
  Loader2,
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'
import { tareasApi } from '@/lib/api'

export default function TareasPage() {
  const router = useRouter()
  const { token, isAuthenticated, isLoading } = useAuthStore()
  const [tareas, setTareas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [completingId, setCompletingId] = useState<number | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (token) {
      loadData()
    }
  }, [token])

  const loadData = async () => {
    try {
      const data = await tareasApi.list(token!)
      setTareas(data)
    } catch (error) {
      console.error('Error loading tareas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCompletar = async (tareaId: number) => {
    setCompletingId(tareaId)
    try {
      await tareasApi.completar(token!, tareaId)
      loadData()
    } catch (error) {
      console.error('Error completando tarea:', error)
    } finally {
      setCompletingId(null)
    }
  }

  const getStatusBadge = (tarea: any) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const vencimiento = new Date(tarea.fecha_vencimiento)
    vencimiento.setHours(0, 0, 0, 0)

    if (tarea.estado === 'completada') {
      return (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
          <CheckCircle className="w-3 h-3" />
          Completada
        </span>
      )
    }

    if (vencimiento < today) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">
          <AlertTriangle className="w-3 h-3" />
          Vencida
        </span>
      )
    }

    if (vencimiento.getTime() === today.getTime()) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
          <Clock className="w-3 h-3" />
          Vence hoy
        </span>
      )
    }

    return (
      <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400">
        <Circle className="w-3 h-3" />
        Pendiente
      </span>
    )
  }

  const tareasPendientes = tareas.filter((t) => t.estado !== 'completada')
  const tareasCompletadas = tareas.filter((t) => t.estado === 'completada')
  const tareasVencidas = tareasPendientes.filter((t) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const vencimiento = new Date(t.fecha_vencimiento)
    vencimiento.setHours(0, 0, 0, 0)
    return vencimiento < today
  })

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
          <h1 className="text-2xl font-bold text-white">Tareas</h1>
          <p className="text-gray-400">Tareas asignadas a tu sucursal</p>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="glass-card rounded-xl p-4">
            <p className="text-3xl font-bold text-white">{tareasPendientes.length}</p>
            <p className="text-sm text-gray-400">Pendientes</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-3xl font-bold text-red-400">{tareasVencidas.length}</p>
            <p className="text-sm text-gray-400">Vencidas</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-3xl font-bold text-green-400">{tareasCompletadas.length}</p>
            <p className="text-sm text-gray-400">Completadas</p>
          </div>
        </div>

        {/* Lista de tareas */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-semibold text-white">Todas las tareas</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-mascotera-turquesa border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : tareas.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <ListTodo className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay tareas asignadas</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {tareas.map((tarea) => (
                <div
                  key={tarea.id}
                  className={`p-4 hover:bg-gray-800/30 ${
                    tarea.estado === 'completada' ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox / Status */}
                    <div className="pt-1">
                      {tarea.estado === 'completada' ? (
                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-400" />
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCompletar(tarea.id)}
                          disabled={completingId === tarea.id}
                          className="w-6 h-6 rounded-full border-2 border-gray-600 hover:border-mascotera-turquesa flex items-center justify-center transition-colors disabled:opacity-50"
                        >
                          {completingId === tarea.id && (
                            <Loader2 className="w-3 h-3 text-mascotera-turquesa animate-spin" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3
                          className={`font-medium ${
                            tarea.estado === 'completada'
                              ? 'text-gray-400 line-through'
                              : 'text-white'
                          }`}
                        >
                          {tarea.titulo}
                        </h3>
                        {getStatusBadge(tarea)}
                      </div>

                      {tarea.descripcion && (
                        <p className="text-sm text-gray-400 mb-2">{tarea.descripcion}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Vence: {new Date(tarea.fecha_vencimiento).toLocaleDateString('es-AR')}
                        </span>
                        {tarea.asignado_por_nombre && (
                          <span>Asignada por: {tarea.asignado_por_nombre}</span>
                        )}
                        {tarea.fecha_completado && (
                          <span className="text-green-400">
                            Completada: {new Date(tarea.fecha_completado).toLocaleDateString('es-AR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
