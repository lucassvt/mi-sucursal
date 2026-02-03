'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ListTodo,
  Clock,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Circle,
  Loader2,
  Sparkles,
  Wrench,
  Package,
  FileText,
  PlayCircle,
  Plus,
  X,
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'
import { tareasApi } from '@/lib/api'
import { getTareasDemo } from '@/lib/demo-data'

const CATEGORIAS = [
  {
    id: 'ORDEN Y LIMPIEZA',
    label: 'Orden y Limpieza',
    icon: Sparkles,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/30'
  },
  {
    id: 'MANTENIMIENTO SUCURSAL',
    label: 'Mantenimiento Sucursal',
    icon: Wrench,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30'
  },
  {
    id: 'CONTROL Y GESTION DE STOCK',
    label: 'Control y Gestión de Stock',
    icon: Package,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30'
  },
  {
    id: 'GESTION ADMINISTRATIVA EN SISTEMA',
    label: 'Gestión Administrativa en Sistema',
    icon: FileText,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30'
  },
]

const ESTADOS = [
  { id: 'pendiente', label: 'Pendiente', icon: Circle, color: 'text-gray-400' },
  { id: 'en_progreso', label: 'En Progreso', icon: PlayCircle, color: 'text-yellow-400' },
  { id: 'completada', label: 'Completada', icon: CheckCircle, color: 'text-green-400' },
]

interface Tarea {
  id: number
  categoria: string
  titulo: string
  descripcion?: string
  estado: string
  fecha_asignacion: string
  fecha_vencimiento: string
  asignado_por_nombre?: string
  fecha_completado?: string
}

export default function TareasPage() {
  const router = useRouter()
  const { token, user, isAuthenticated, isLoading } = useAuthStore()
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null)
  const [puedeCrear, setPuedeCrear] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [creando, setCreando] = useState(false)
  const [nuevaTarea, setNuevaTarea] = useState({
    categoria: 'ORDEN Y LIMPIEZA',
    titulo: '',
    descripcion: '',
    fecha_vencimiento: '',
  })

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (token) {
      loadData()
      checkPermisos()
    }
  }, [token])

  const checkPermisos = async () => {
    // En modo demo, verificar rol localmente
    if (token?.startsWith('demo-token')) {
      const rolesSupervisor = ['supervisor', 'encargado', 'admin', 'gerente', 'gerencia']
      const userRol = (user?.rol || '').toLowerCase()
      const userPuesto = (user?.puesto || '').toLowerCase()
      const esSupervisor = rolesSupervisor.some(r => userRol.includes(r) || userPuesto.includes(r))
      setPuedeCrear(esSupervisor)
      return
    }

    try {
      const result = await tareasApi.puedeCrear(token!)
      setPuedeCrear(result.puede_crear)
    } catch (error) {
      console.error('Error checking permisos:', error)
      setPuedeCrear(false)
    }
  }

  const loadData = async () => {
    try {
      const data = await tareasApi.list(token!)
      setTareas(data)
    } catch (error) {
      console.error('Error loading tareas:', error)
      // En modo demo, crear tareas de ejemplo
      setTareas(getTareasDemo())
    } finally {
      setLoading(false)
    }
  }

  const handleCrearTarea = async () => {
    if (!nuevaTarea.titulo.trim() || !nuevaTarea.fecha_vencimiento) return

    setCreando(true)

    // En modo demo, agregar tarea localmente
    if (token?.startsWith('demo-token')) {
      const newTarea: Tarea = {
        id: Date.now(),
        categoria: nuevaTarea.categoria,
        titulo: nuevaTarea.titulo,
        descripcion: nuevaTarea.descripcion,
        estado: 'pendiente',
        fecha_asignacion: new Date().toISOString().split('T')[0],
        fecha_vencimiento: nuevaTarea.fecha_vencimiento,
        asignado_por_nombre: user?.nombre || 'Supervisor',
      }
      setTareas(prev => [newTarea, ...prev])
      setShowModal(false)
      setNuevaTarea({
        categoria: 'ORDEN Y LIMPIEZA',
        titulo: '',
        descripcion: '',
        fecha_vencimiento: '',
      })
      setCreando(false)
      return
    }

    try {
      await tareasApi.create(token!, nuevaTarea)
      setShowModal(false)
      setNuevaTarea({
        categoria: 'ORDEN Y LIMPIEZA',
        titulo: '',
        descripcion: '',
        fecha_vencimiento: '',
      })
      loadData()
    } catch (error) {
      console.error('Error creando tarea:', error)
      alert('Error al crear la tarea. Verifica que tengas permisos.')
    } finally {
      setCreando(false)
    }
  }

  const handleCambiarEstado = async (tareaId: number, nuevoEstado: string) => {
    setUpdatingId(tareaId)
    try {
      await tareasApi.actualizarEstado(token!, tareaId, nuevoEstado)
      loadData()
    } catch (error) {
      console.error('Error actualizando estado:', error)
      // En modo demo, actualizar localmente
      setTareas(prev => prev.map(t =>
        t.id === tareaId
          ? { ...t, estado: nuevoEstado, fecha_completado: nuevoEstado === 'completada' ? new Date().toISOString() : undefined }
          : t
      ))
    } finally {
      setUpdatingId(null)
    }
  }

  const getTareasPorCategoria = (categoriaId: string) => {
    return tareas.filter(t => t.categoria === categoriaId)
  }

  const getConteoEstados = (categoriaId: string) => {
    const tareasCat = getTareasPorCategoria(categoriaId)
    return {
      pendientes: tareasCat.filter(t => t.estado === 'pendiente').length,
      enProgreso: tareasCat.filter(t => t.estado === 'en_progreso').length,
      completadas: tareasCat.filter(t => t.estado === 'completada').length,
      total: tareasCat.length,
    }
  }

  const getResumenGeneral = () => {
    return {
      pendientes: tareas.filter(t => t.estado === 'pendiente').length,
      enProgreso: tareas.filter(t => t.estado === 'en_progreso').length,
      completadas: tareas.filter(t => t.estado === 'completada').length,
      vencidas: tareas.filter(t => {
        if (t.estado === 'completada') return false
        const vencimiento = new Date(t.fecha_vencimiento)
        vencimiento.setHours(23, 59, 59)
        return vencimiento < new Date()
      }).length,
    }
  }

  const isVencida = (tarea: Tarea) => {
    if (tarea.estado === 'completada') return false
    const vencimiento = new Date(tarea.fecha_vencimiento)
    vencimiento.setHours(23, 59, 59)
    return vencimiento < new Date()
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-mascotera-turquesa border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const resumen = getResumenGeneral()

  return (
    <div className="min-h-screen">
      <Sidebar />

      <main className="ml-64 p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Tareas</h1>
            <p className="text-gray-400">Gestiona las tareas asignadas a tu sucursal</p>
          </div>
          {puedeCrear && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-mascotera-turquesa hover:bg-mascotera-turquesa/80 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nueva Tarea
            </button>
          )}
        </div>

        {/* Modal Crear Tarea */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="glass rounded-2xl p-6 w-full max-w-lg mx-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Nueva Tarea</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Categoría */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Categoría
                  </label>
                  <select
                    value={nuevaTarea.categoria}
                    onChange={(e) => setNuevaTarea({ ...nuevaTarea, categoria: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-mascotera-turquesa/50"
                  >
                    {CATEGORIAS.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={nuevaTarea.titulo}
                    onChange={(e) => setNuevaTarea({ ...nuevaTarea, titulo: e.target.value })}
                    placeholder="Ej: Limpiar vitrinas de exhibición"
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-mascotera-turquesa/50"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={nuevaTarea.descripcion}
                    onChange={(e) => setNuevaTarea({ ...nuevaTarea, descripcion: e.target.value })}
                    placeholder="Detalles adicionales de la tarea..."
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-mascotera-turquesa/50 resize-none"
                  />
                </div>

                {/* Fecha de vencimiento */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Fecha de vencimiento *
                  </label>
                  <input
                    type="date"
                    value={nuevaTarea.fecha_vencimiento}
                    onChange={(e) => setNuevaTarea({ ...nuevaTarea, fecha_vencimiento: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-mascotera-turquesa/50"
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCrearTarea}
                  disabled={creando || !nuevaTarea.titulo.trim() || !nuevaTarea.fecha_vencimiento}
                  className="flex-1 px-4 py-2 bg-mascotera-turquesa hover:bg-mascotera-turquesa/80 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear Tarea'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resumen General */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-500/20 flex items-center justify-center">
                <Circle className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{resumen.pendientes}</p>
                <p className="text-sm text-gray-400">Pendientes</p>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <PlayCircle className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-400">{resumen.enProgreso}</p>
                <p className="text-sm text-gray-400">En Progreso</p>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{resumen.completadas}</p>
                <p className="text-sm text-gray-400">Completadas</p>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{resumen.vencidas}</p>
                <p className="text-sm text-gray-400">Vencidas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Categorías */}
        {loading ? (
          <div className="glass rounded-2xl p-8 text-center">
            <div className="w-8 h-8 border-2 border-mascotera-turquesa border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {CATEGORIAS.map((categoria) => {
              const Icon = categoria.icon
              const tareasCategoria = getTareasPorCategoria(categoria.id)
              const conteo = getConteoEstados(categoria.id)
              const isExpanded = categoriaActiva === categoria.id

              return (
                <div
                  key={categoria.id}
                  className={`glass rounded-2xl overflow-hidden border ${categoria.borderColor} transition-all`}
                >
                  {/* Header de Categoría */}
                  <button
                    onClick={() => setCategoriaActiva(isExpanded ? null : categoria.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${categoria.bgColor} flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${categoria.color}`} />
                      </div>
                      <div className="text-left">
                        <h2 className="text-lg font-semibold text-white">{categoria.label}</h2>
                        <p className="text-sm text-gray-400">
                          {conteo.total} tarea{conteo.total !== 1 ? 's' : ''}
                          {conteo.pendientes > 0 && ` · ${conteo.pendientes} pendiente${conteo.pendientes !== 1 ? 's' : ''}`}
                          {conteo.enProgreso > 0 && ` · ${conteo.enProgreso} en progreso`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Mini badges de estado */}
                      <div className="flex items-center gap-2">
                        {conteo.pendientes > 0 && (
                          <span className="px-2 py-1 rounded-full text-xs bg-gray-500/20 text-gray-400">
                            {conteo.pendientes}
                          </span>
                        )}
                        {conteo.enProgreso > 0 && (
                          <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                            {conteo.enProgreso}
                          </span>
                        )}
                        {conteo.completadas > 0 && (
                          <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                            {conteo.completadas}
                          </span>
                        )}
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Lista de Tareas */}
                  {isExpanded && (
                    <div className="border-t border-gray-800">
                      {tareasCategoria.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                          <ListTodo className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p>No hay tareas en esta categoría</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-800">
                          {tareasCategoria.map((tarea) => (
                            <div
                              key={tarea.id}
                              className={`p-4 hover:bg-gray-800/20 transition-colors ${
                                tarea.estado === 'completada' ? 'opacity-60' : ''
                              }`}
                            >
                              <div className="flex items-start gap-4">
                                {/* Info de la tarea */}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className={`font-medium ${
                                      tarea.estado === 'completada'
                                        ? 'text-gray-400 line-through'
                                        : 'text-white'
                                    }`}>
                                      {tarea.titulo}
                                    </h3>
                                    {isVencida(tarea) && (
                                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
                                        <AlertTriangle className="w-3 h-3" />
                                        Vencida
                                      </span>
                                    )}
                                  </div>

                                  {tarea.descripcion && (
                                    <p className="text-sm text-gray-400 mb-2">{tarea.descripcion}</p>
                                  )}

                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      Asignada: {new Date(tarea.fecha_asignacion).toLocaleDateString('es-AR')}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      Vence: {new Date(tarea.fecha_vencimiento).toLocaleDateString('es-AR')}
                                    </span>
                                    {tarea.asignado_por_nombre && (
                                      <span>Por: {tarea.asignado_por_nombre}</span>
                                    )}
                                  </div>
                                </div>

                                {/* Selector de Estado */}
                                <div className="flex-shrink-0">
                                  <div className="relative">
                                    {updatingId === tarea.id ? (
                                      <div className="w-36 h-10 flex items-center justify-center">
                                        <Loader2 className="w-5 h-5 text-mascotera-turquesa animate-spin" />
                                      </div>
                                    ) : (
                                      <select
                                        value={tarea.estado}
                                        onChange={(e) => handleCambiarEstado(tarea.id, e.target.value)}
                                        className={`appearance-none w-36 px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-colors
                                          ${tarea.estado === 'pendiente'
                                            ? 'bg-gray-800/50 border-gray-600 text-gray-300'
                                            : tarea.estado === 'en_progreso'
                                            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                                            : 'bg-green-500/10 border-green-500/30 text-green-400'
                                          }
                                          focus:outline-none focus:ring-2 focus:ring-mascotera-turquesa/50`}
                                      >
                                        {ESTADOS.map((estado) => (
                                          <option key={estado.id} value={estado.id}>
                                            {estado.label}
                                          </option>
                                        ))}
                                      </select>
                                    )}
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
