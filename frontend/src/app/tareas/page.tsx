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
  Search,
  Lightbulb,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'
import { tareasApi, controlStockApi } from '@/lib/api'
import {
  getTareasDemo,
  getTareaControlStockDemo,
  getSugerenciasConteoDemo,
  getProductosBuscablesDemo,
  type SugerenciaConteoDemo,
  type ProductoConteoDemo,
} from '@/lib/demo-data'

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
  tipo_tarea?: 'GENERAL' | 'CONTROL_STOCK'
  conteo_id?: number
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
    sucursal_id: '',
  })
  const [sucursales, setSucursales] = useState<{ id: number; nombre: string }[]>([])

  // Estados para sugerencias de conteo
  const [sugerencias, setSugerencias] = useState<SugerenciaConteoDemo[]>([])
  const [showSugerenciaModal, setShowSugerenciaModal] = useState(false)
  const [creandoSugerencia, setCreandoSugerencia] = useState(false)
  const [searchQuerySugerencia, setSearchQuerySugerencia] = useState('')
  const [searchResultsSugerencia, setSearchResultsSugerencia] = useState<ProductoConteoDemo[]>([])
  const [searchingSugerencia, setSearchingSugerencia] = useState(false)
  const [productosSugerencia, setProductosSugerencia] = useState<ProductoConteoDemo[]>([])
  const [motivoSugerencia, setMotivoSugerencia] = useState('')
  const [showSugerenciasPanel, setShowSugerenciasPanel] = useState(false)
  const [sugerenciaSeleccionada, setSugerenciaSeleccionada] = useState<SugerenciaConteoDemo | null>(null)
  const [fechaProgramada, setFechaProgramada] = useState('')
  const [comentarioSupervisor, setComentarioSupervisor] = useState('')
  const [procesandoSugerencia, setProcesandoSugerencia] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  const esEncargado = (() => {
    const rolesEncargado = ['encargado', 'admin', 'gerente', 'gerencia', 'auditor', 'supervisor']
    const userRol = (user?.rol || '').toLowerCase()
    const userPuesto = (user?.puesto || '').toLowerCase()
    return rolesEncargado.some(r => userRol.includes(r) || userPuesto.includes(r))
  })()

  useEffect(() => {
    if (token) {
      loadData()
      checkPermisos()
      loadSugerencias()
      if (esEncargado) loadSucursales()
    }
  }, [token])

  const loadSucursales = async () => {
    try {
      if (token?.startsWith('demo-token')) return
      const data = await tareasApi.sucursales(token!)
      setSucursales(data)
    } catch (error) {
      console.error('Error loading sucursales:', error)
    }
  }

  // Buscar productos para sugerencia
  useEffect(() => {
    const buscar = async () => {
      if (searchQuerySugerencia.length < 2) {
        setSearchResultsSugerencia([])
        return
      }

      setSearchingSugerencia(true)
      try {
        const isDemo = token?.startsWith('demo-token')
        if (isDemo) {
          await new Promise(resolve => setTimeout(resolve, 300))
          const results = getProductosBuscablesDemo(searchQuerySugerencia)
          setSearchResultsSugerencia(results.filter(r =>
            !productosSugerencia.some(p => p.cod_item === r.cod_item)
          ))
        } else {
          const results = await controlStockApi.buscarProductos(token!, searchQuerySugerencia)
          setSearchResultsSugerencia(results.filter((r: any) =>
            !productosSugerencia.some(p => p.cod_item === r.cod_item)
          ))
        }
      } catch (err) {
        console.error('Error buscando:', err)
      } finally {
        setSearchingSugerencia(false)
      }
    }

    const timeoutId = setTimeout(buscar, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuerySugerencia, token, productosSugerencia])

  const checkPermisos = async () => {
    // En modo demo, verificar rol localmente
    if (token?.startsWith('demo-token')) {
      const rolesEncargado = ['encargado', 'admin', 'gerente', 'gerencia', 'supervisor']
      const userRol = (user?.rol || '').toLowerCase()
      const userPuesto = (user?.puesto || '').toLowerCase()
      const esEncargado = rolesEncargado.some(r => userRol.includes(r) || userPuesto.includes(r))
      setPuedeCrear(esEncargado)
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

  const loadSugerencias = async () => {
    try {
      const isDemo = token?.startsWith('demo-token')
      if (isDemo) {
        setSugerencias(getSugerenciasConteoDemo())
      } else {
        const data = await controlStockApi.listarSugerencias(token!)
        setSugerencias(data)
      }
    } catch (error) {
      console.error('Error loading sugerencias:', error)
      setSugerencias([])
    }
  }

  const loadData = async () => {
    try {
      const data = await tareasApi.list(token!)
      setTareas(data)
    } catch (error) {
      console.error('Error loading tareas:', error)
      setTareas([])
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
        asignado_por_nombre: user?.nombre || 'Encargado',
      }
      setTareas(prev => [newTarea, ...prev])
      setShowModal(false)
      setNuevaTarea({
        categoria: 'ORDEN Y LIMPIEZA',
        titulo: '',
        descripcion: '',
        fecha_vencimiento: '',
        sucursal_id: '',
      })
      setCreando(false)
      return
    }

    try {
      const payload: any = {
        categoria: nuevaTarea.categoria,
        titulo: nuevaTarea.titulo,
        descripcion: nuevaTarea.descripcion,
        fecha_vencimiento: nuevaTarea.fecha_vencimiento,
      }
      if (nuevaTarea.sucursal_id) {
        payload.sucursal_id = parseInt(nuevaTarea.sucursal_id)
      }
      await tareasApi.create(token!, payload)
      setShowModal(false)
      setNuevaTarea({
        categoria: 'ORDEN Y LIMPIEZA',
        titulo: '',
        descripcion: '',
        fecha_vencimiento: '',
        sucursal_id: '',
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

  // Handlers para sugerencias
  const handleAgregarProductoSugerencia = (producto: ProductoConteoDemo) => {
    setProductosSugerencia(prev => [...prev, producto])
    setSearchResultsSugerencia(prev => prev.filter(p => p.cod_item !== producto.cod_item))
    setSearchQuerySugerencia('')
  }

  const handleQuitarProductoSugerencia = (codItem: string) => {
    setProductosSugerencia(prev => prev.filter(p => p.cod_item !== codItem))
  }

  const handleCrearSugerencia = async () => {
    if (productosSugerencia.length === 0 || !motivoSugerencia.trim()) return

    setCreandoSugerencia(true)
    try {
      const isDemo = token?.startsWith('demo-token')
      if (isDemo) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const nuevaSugerencia: SugerenciaConteoDemo = {
          id: Date.now(),
          productos: productosSugerencia.map(p => ({
            cod_item: p.cod_item,
            nombre: p.nombre,
            precio: p.precio,
            stock_sistema: p.stock_sistema,
          })),
          motivo: motivoSugerencia.trim(),
          estado: 'pendiente',
          fecha_sugerencia: new Date().toISOString().split('T')[0],
          sugerido_por_id: user?.id || 0,
          sugerido_por_nombre: user?.nombre || 'Vendedor',
        }
        setSugerencias(prev => [nuevaSugerencia, ...prev])
      } else {
        await controlStockApi.crearSugerencia(token!, {
          productos: productosSugerencia.map(p => ({
            cod_item: p.cod_item,
            nombre: p.nombre,
            precio: p.precio,
            stock_sistema: p.stock_sistema,
          })),
          motivo: motivoSugerencia.trim(),
        })
        loadSugerencias()
      }
      setShowSugerenciaModal(false)
      setProductosSugerencia([])
      setMotivoSugerencia('')
    } catch (error) {
      console.error('Error creando sugerencia:', error)
      alert('Error al crear la sugerencia')
    } finally {
      setCreandoSugerencia(false)
    }
  }

  const handleResolverSugerencia = async (accion: 'aprobar' | 'rechazar') => {
    if (!sugerenciaSeleccionada) return
    if (accion === 'aprobar' && !fechaProgramada) {
      alert('Debes seleccionar una fecha para el conteo')
      return
    }

    setProcesandoSugerencia(true)
    try {
      const isDemo = token?.startsWith('demo-token')
      if (isDemo) {
        await new Promise(resolve => setTimeout(resolve, 500))
        setSugerencias(prev => prev.map(s =>
          s.id === sugerenciaSeleccionada.id
            ? {
                ...s,
                estado: accion === 'aprobar' ? 'aprobada' : 'rechazada',
                fecha_resolucion: new Date().toISOString().split('T')[0],
                resuelto_por_nombre: user?.nombre || 'Encargado',
                fecha_programada: accion === 'aprobar' ? fechaProgramada : undefined,
                comentario_supervisor: comentarioSupervisor || undefined,
              }
            : s
        ))

        // Si se aprueba, crear la tarea de conteo
        if (accion === 'aprobar') {
          const nuevaTareaConteo: Tarea = {
            id: Date.now(),
            categoria: 'CONTROL Y GESTION DE STOCK',
            tipo_tarea: 'CONTROL_STOCK',
            titulo: `Conteo sugerido: ${sugerenciaSeleccionada.productos.map(p => p.nombre).join(', ').substring(0, 50)}...`,
            descripcion: sugerenciaSeleccionada.motivo,
            estado: 'pendiente',
            fecha_asignacion: new Date().toISOString().split('T')[0],
            fecha_vencimiento: fechaProgramada,
            asignado_por_nombre: user?.nombre || 'Encargado',
            conteo_id: Date.now(),
          }
          setTareas(prev => [nuevaTareaConteo, ...prev])
        }
      } else {
        await controlStockApi.resolverSugerencia(token!, sugerenciaSeleccionada.id, {
          accion,
          fecha_programada: accion === 'aprobar' ? fechaProgramada : undefined,
          comentario: comentarioSupervisor || undefined,
        })
        loadSugerencias()
        loadData()
      }
      setSugerenciaSeleccionada(null)
      setFechaProgramada('')
      setComentarioSupervisor('')
    } catch (error) {
      console.error('Error resolviendo sugerencia:', error)
      alert('Error al procesar la sugerencia')
    } finally {
      setProcesandoSugerencia(false)
    }
  }

  const sugerenciasPendientes = sugerencias.filter(s => s.estado === 'pendiente')

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

  const isControlStock = (tarea: Tarea) => {
    return tarea.tipo_tarea === 'CONTROL_STOCK' ||
           (tarea.categoria === 'CONTROL Y GESTION DE STOCK' && tarea.conteo_id !== undefined)
  }

  const venceHoy = (tarea: Tarea) => {
    const hoy = new Date().toISOString().split('T')[0]
    return tarea.fecha_vencimiento === hoy
  }

  const handleClickTarea = (tarea: Tarea) => {
    // Si es tarea de control de stock y no esta completada, ir a pagina de conteo
    if (isControlStock(tarea) && tarea.estado !== 'completada') {
      router.push(`/control-stock/${tarea.id}`)
    }
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
          <div className="flex items-center gap-3">
            {/* Botón para sugerir conteo (todos pueden ver) */}
            <button
              onClick={() => setShowSugerenciaModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-lg transition-colors"
            >
              <Lightbulb className="w-5 h-5" />
              Sugerir Conteo
            </button>

            {/* Botón para ver sugerencias (encargados) */}
            {puedeCrear && sugerenciasPendientes.length > 0 && (
              <button
                onClick={() => setShowSugerenciasPanel(true)}
                className="relative flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-lg transition-colors"
              >
                <Eye className="w-5 h-5" />
                Sugerencias
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {sugerenciasPendientes.length}
                </span>
              </button>
            )}

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

                {/* Sucursal (solo encargados) */}
                {esEncargado && sucursales.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Sucursal *
                    </label>
                    <select
                      value={nuevaTarea.sucursal_id}
                      onChange={(e) => setNuevaTarea({ ...nuevaTarea, sucursal_id: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-mascotera-turquesa/50"
                    >
                      <option value="">Mi sucursal ({user?.sucursal_nombre || 'actual'})</option>
                      {sucursales.map((suc) => (
                        <option key={suc.id} value={suc.id}>
                          {suc.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Mensaje para crear tarea de conteo de stock */}
                {nuevaTarea.categoria === 'CONTROL Y GESTION DE STOCK' && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <p className="text-sm text-green-400 mb-2">
                      Para crear una tarea de conteo de stock con productos seleccionados:
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        router.push('/control-stock/crear')
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition-colors"
                    >
                      <Package className="w-4 h-4" />
                      Crear Tarea de Conteo
                    </button>
                  </div>
                )}

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

        {/* Modal Sugerir Conteo */}
        {showSugerenciaModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="glass rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Lightbulb className="w-6 h-6 text-amber-400" />
                    Sugerir Control de Stock
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Sugiere productos para contar. El encargado revisará y programará la fecha.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowSugerenciaModal(false)
                    setProductosSugerencia([])
                    setMotivoSugerencia('')
                    setSearchQuerySugerencia('')
                  }}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Buscar productos */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Buscar y agregar productos
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuerySugerencia}
                      onChange={(e) => setSearchQuerySugerencia(e.target.value)}
                      placeholder="Buscar por nombre o código..."
                      className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Resultados de búsqueda */}
                  {searchQuerySugerencia.length >= 2 && (
                    <div className="mt-2 max-h-40 overflow-y-auto">
                      {searchingSugerencia ? (
                        <div className="p-4 text-center">
                          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        </div>
                      ) : searchResultsSugerencia.length === 0 ? (
                        <p className="p-3 text-center text-gray-400 text-sm">No se encontraron productos</p>
                      ) : (
                        <div className="space-y-1">
                          {searchResultsSugerencia.slice(0, 5).map((producto) => (
                            <div
                              key={producto.cod_item}
                              className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg hover:bg-gray-800"
                            >
                              <div>
                                <p className="text-white text-sm">{producto.nombre}</p>
                                <p className="text-gray-400 text-xs">
                                  {producto.cod_item} | Stock: {producto.stock_sistema}
                                </p>
                              </div>
                              <button
                                onClick={() => handleAgregarProductoSugerencia(producto)}
                                className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Productos seleccionados */}
                {productosSugerencia.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Productos seleccionados ({productosSugerencia.length})
                    </label>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {productosSugerencia.map((producto) => (
                        <div
                          key={producto.cod_item}
                          className="flex items-center justify-between p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg"
                        >
                          <div>
                            <p className="text-white text-sm">{producto.nombre}</p>
                            <p className="text-gray-400 text-xs">{producto.cod_item}</p>
                          </div>
                          <button
                            onClick={() => handleQuitarProductoSugerencia(producto.cod_item)}
                            className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Motivo */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ¿Por qué sugieres este conteo? *
                  </label>
                  <textarea
                    value={motivoSugerencia}
                    onChange={(e) => setMotivoSugerencia(e.target.value)}
                    placeholder="Ej: Noté diferencias entre el sistema y la góndola, hubo mucha rotación esta semana..."
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowSugerenciaModal(false)
                    setProductosSugerencia([])
                    setMotivoSugerencia('')
                    setSearchQuerySugerencia('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCrearSugerencia}
                  disabled={creandoSugerencia || productosSugerencia.length === 0 || !motivoSugerencia.trim()}
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creandoSugerencia ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="w-4 h-4" />
                      Enviar Sugerencia
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Panel de Sugerencias (Encargado) */}
        {showSugerenciasPanel && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="glass rounded-2xl p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-purple-400" />
                    Sugerencias de Conteo
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Revisa las sugerencias de los vendedores y aprueba o rechaza
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowSugerenciasPanel(false)
                    setSugerenciaSeleccionada(null)
                  }}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {sugerenciaSeleccionada ? (
                // Detalle de sugerencia seleccionada
                <div className="space-y-4">
                  <button
                    onClick={() => setSugerenciaSeleccionada(null)}
                    className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    ← Volver a la lista
                  </button>

                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-white font-medium">
                          Sugerido por: {sugerenciaSeleccionada.sugerido_por_nombre}
                        </p>
                        <p className="text-sm text-gray-400">
                          {new Date(sugerenciaSeleccionada.fecha_sugerencia).toLocaleDateString('es-AR')}
                        </p>
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400">
                        Pendiente
                      </span>
                    </div>

                    <p className="text-gray-300 mb-4 italic">"{sugerenciaSeleccionada.motivo}"</p>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-300">
                        Productos sugeridos ({sugerenciaSeleccionada.productos.length}):
                      </p>
                      {sugerenciaSeleccionada.productos.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
                          <span className="text-white text-sm">{p.nombre}</span>
                          <span className="text-gray-400 text-xs">Stock: {p.stock_sistema}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Formulario de resolución */}
                  <div className="space-y-4 pt-4 border-t border-gray-700">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Fecha para el conteo (si apruebas) *
                      </label>
                      <input
                        type="date"
                        value={fechaProgramada}
                        onChange={(e) => setFechaProgramada(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Comentario (opcional)
                      </label>
                      <textarea
                        value={comentarioSupervisor}
                        onChange={(e) => setComentarioSupervisor(e.target.value)}
                        placeholder="Ej: Programado para el viernes por la tarde..."
                        rows={2}
                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleResolverSugerencia('rechazar')}
                        disabled={procesandoSugerencia}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <ThumbsDown className="w-5 h-5" />
                        Rechazar
                      </button>
                      <button
                        onClick={() => handleResolverSugerencia('aprobar')}
                        disabled={procesandoSugerencia || !fechaProgramada}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {procesandoSugerencia ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <ThumbsUp className="w-5 h-5" />
                        )}
                        Aprobar y Crear Tarea
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // Lista de sugerencias
                <div className="space-y-3">
                  {sugerencias.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No hay sugerencias</p>
                    </div>
                  ) : (
                    <>
                      {/* Tabs por estado */}
                      <div className="flex gap-2 mb-4">
                        <span className="px-3 py-1 rounded-full text-sm bg-amber-500/20 text-amber-400">
                          Pendientes: {sugerencias.filter(s => s.estado === 'pendiente').length}
                        </span>
                        <span className="px-3 py-1 rounded-full text-sm bg-green-500/20 text-green-400">
                          Aprobadas: {sugerencias.filter(s => s.estado === 'aprobada').length}
                        </span>
                        <span className="px-3 py-1 rounded-full text-sm bg-red-500/20 text-red-400">
                          Rechazadas: {sugerencias.filter(s => s.estado === 'rechazada').length}
                        </span>
                      </div>

                      {sugerencias.map((sugerencia) => (
                        <div
                          key={sugerencia.id}
                          className={`p-4 rounded-xl border transition-colors ${
                            sugerencia.estado === 'pendiente'
                              ? 'bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer'
                              : sugerencia.estado === 'aprobada'
                              ? 'bg-green-500/5 border-green-500/30'
                              : 'bg-red-500/5 border-red-500/30'
                          }`}
                          onClick={() => sugerencia.estado === 'pendiente' && setSugerenciaSeleccionada(sugerencia)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-white font-medium">{sugerencia.sugerido_por_nombre}</p>
                                <span className={`px-2 py-0.5 rounded-full text-xs ${
                                  sugerencia.estado === 'pendiente'
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : sugerencia.estado === 'aprobada'
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {sugerencia.estado === 'pendiente' ? 'Pendiente' :
                                   sugerencia.estado === 'aprobada' ? 'Aprobada' : 'Rechazada'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-400 mb-2">
                                {sugerencia.productos.length} producto{sugerencia.productos.length !== 1 ? 's' : ''} - {new Date(sugerencia.fecha_sugerencia).toLocaleDateString('es-AR')}
                              </p>
                              <p className="text-sm text-gray-300 line-clamp-2">"{sugerencia.motivo}"</p>
                              {sugerencia.fecha_programada && (
                                <p className="text-xs text-green-400 mt-2">
                                  📅 Programado: {new Date(sugerencia.fecha_programada).toLocaleDateString('es-AR')}
                                </p>
                              )}
                              {sugerencia.comentario_supervisor && (
                                <p className="text-xs text-gray-400 mt-1">
                                  💬 {sugerencia.comentario_supervisor}
                                </p>
                              )}
                            </div>
                            {sugerencia.estado === 'pendiente' && (
                              <span className="text-purple-400 text-sm">Ver →</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
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
                          {tareasCategoria.map((tarea) => {
                            const esTareaControlStock = isControlStock(tarea)
                            const venceHoyTarea = venceHoy(tarea)
                            const esClickeable = esTareaControlStock && tarea.estado !== 'completada'

                            return (
                            <div
                              key={tarea.id}
                              onClick={() => esClickeable && handleClickTarea(tarea)}
                              className={`p-4 transition-colors ${
                                tarea.estado === 'completada' ? 'opacity-60' : ''
                              } ${esClickeable ? 'cursor-pointer hover:bg-green-500/10' : 'hover:bg-gray-800/20'}
                              ${esTareaControlStock && venceHoyTarea && tarea.estado !== 'completada' ? 'border-l-4 border-yellow-400 bg-yellow-500/5' : ''}`}
                            >
                              <div className="flex items-start gap-4">
                                {/* Info de la tarea */}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <h3 className={`font-medium ${
                                      tarea.estado === 'completada'
                                        ? 'text-gray-400 line-through'
                                        : 'text-white'
                                    }`}>
                                      {tarea.titulo}
                                    </h3>
                                    {esTareaControlStock && tarea.estado !== 'completada' && (
                                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                                        <Package className="w-3 h-3" />
                                        Conteo
                                      </span>
                                    )}
                                    {venceHoyTarea && tarea.estado !== 'completada' && (
                                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400 animate-pulse">
                                        <AlertTriangle className="w-3 h-3" />
                                        Realizar hoy
                                      </span>
                                    )}
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
                                    {esClickeable && (
                                      <span className="text-green-400 font-medium">Click para abrir conteo →</span>
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
                          )})}
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
