'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Scissors,
  DollarSign,
  Calendar,
  History,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'
import { peluqueriaApi } from '@/lib/api'
import {
  getPreciosPeluqueriaDemo,
  getSolicitudesPeluqueriaDemo,
  getHistorialPreciosDemo,
  getResumenPeluqueriaDemo,
  type PrecioVigenteDemo,
  type SolicitudPeluqueriaDemo,
  type HistorialPrecioDemo,
} from '@/lib/demo-data'

type TipoServicio = 'BANO' | 'CORTE'
type EstadoSolicitud = 'pendiente' | 'aprobada' | 'rechazada' | ''

interface Resumen {
  precio_bano_actual: number
  precio_corte_actual: number
  fecha_vigencia_bano: string
  fecha_vigencia_corte: string
  solicitudes_pendientes: number
}

export default function PeluqueriaPage() {
  const router = useRouter()
  const { token, user, isAuthenticated, isLoading } = useAuthStore()

  // Estados principales
  const [preciosVigentes, setPreciosVigentes] = useState<PrecioVigenteDemo[]>([])
  const [solicitudes, setSolicitudes] = useState<SolicitudPeluqueriaDemo[]>([])
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [loading, setLoading] = useState(true)

  // Estados del modal de solicitud
  const [showModal, setShowModal] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [nuevaSolicitud, setNuevaSolicitud] = useState({
    tipo_servicio: 'BANO' as TipoServicio,
    precio_propuesto: 0,
    motivo: '',
  })

  // Estados del historial
  const [showHistorial, setShowHistorial] = useState(false)
  const [tipoHistorial, setTipoHistorial] = useState<TipoServicio>('BANO')
  const [historial, setHistorial] = useState<HistorialPrecioDemo[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)

  // Estados de permisos
  const [puedeAprobar, setPuedeAprobar] = useState(false)

  // Estados de filtros
  const [filtroEstado, setFiltroEstado] = useState<EstadoSolicitud>('')

  // Estados de mensajes
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modal de resolución
  const [showResolverModal, setShowResolverModal] = useState(false)
  const [solicitudAResolver, setSolicitudAResolver] = useState<SolicitudPeluqueriaDemo | null>(null)
  const [accionResolver, setAccionResolver] = useState<'aprobar' | 'rechazar'>('aprobar')
  const [comentarioResolucion, setComentarioResolucion] = useState('')

  // Verificación de autenticación
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  // Verificar permisos
  useEffect(() => {
    if (user) {
      const rolesSupervisor = ['supervisor', 'encargado', 'admin', 'gerente', 'gerencia']
      const userRol = (user?.rol || '').toLowerCase()
      const userPuesto = (user?.puesto || '').toLowerCase()
      const esSupervisor = rolesSupervisor.some(r => userRol.includes(r) || userPuesto.includes(r))
      setPuedeAprobar(esSupervisor)
    }
  }, [user])

  // Cargar datos
  useEffect(() => {
    if (token) {
      loadData()
    }
  }, [token, filtroEstado])

  const loadData = async () => {
    setLoading(true)
    try {
      const isDemo = token?.startsWith('demo-token')

      if (isDemo) {
        // Modo demo
        setPreciosVigentes(getPreciosPeluqueriaDemo())
        setResumen(getResumenPeluqueriaDemo())

        let solicitudesDemo = getSolicitudesPeluqueriaDemo()
        if (filtroEstado) {
          solicitudesDemo = solicitudesDemo.filter(s => s.estado === filtroEstado)
        }
        setSolicitudes(solicitudesDemo)
      } else {
        // Modo real - llamadas a API
        const [preciosData, resumenData, solicitudesData] = await Promise.all([
          peluqueriaApi.preciosVigentes(token!),
          peluqueriaApi.resumen(token!),
          peluqueriaApi.solicitudes(token!, filtroEstado || undefined),
        ])
        setPreciosVigentes(preciosData as PrecioVigenteDemo[])
        setResumen(resumenData)
        setSolicitudes(solicitudesData as SolicitudPeluqueriaDemo[])
      }
    } catch (err) {
      console.error('Error cargando datos:', err)
      setError('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const loadHistorial = async (tipo: TipoServicio) => {
    setLoadingHistorial(true)
    setTipoHistorial(tipo)
    setShowHistorial(true)

    try {
      const isDemo = token?.startsWith('demo-token')

      if (isDemo) {
        setHistorial(getHistorialPreciosDemo(tipo))
      } else {
        const data = await peluqueriaApi.historial(token!, tipo)
        setHistorial(data as HistorialPrecioDemo[])
      }
    } catch (err) {
      console.error('Error cargando historial:', err)
    } finally {
      setLoadingHistorial(false)
    }
  }

  const getPrecioActual = (tipo: TipoServicio): number => {
    const precio = preciosVigentes.find(p => p.tipo_servicio === tipo)
    return precio?.precio_base || 0
  }

  const handleEnviarSolicitud = async () => {
    if (!nuevaSolicitud.precio_propuesto || !nuevaSolicitud.motivo.trim()) {
      setError('Complete todos los campos requeridos')
      return
    }

    setEnviando(true)
    setError('')

    try {
      const isDemo = token?.startsWith('demo-token')

      if (isDemo) {
        // Simular en modo demo
        const nuevaSol: SolicitudPeluqueriaDemo = {
          id: Date.now(),
          tipo_servicio: nuevaSolicitud.tipo_servicio,
          precio_actual: getPrecioActual(nuevaSolicitud.tipo_servicio),
          precio_propuesto: nuevaSolicitud.precio_propuesto,
          motivo: nuevaSolicitud.motivo,
          estado: 'pendiente',
          fecha_solicitud: new Date().toISOString().split('T')[0],
          solicitante_nombre: user?.nombre || 'Usuario',
          solicitante_id: user?.id || 1,
        }
        setSolicitudes(prev => [nuevaSol, ...prev])
        if (resumen) {
          setResumen({ ...resumen, solicitudes_pendientes: resumen.solicitudes_pendientes + 1 })
        }
      } else {
        await peluqueriaApi.crearSolicitud(token!, {
          tipo_servicio: nuevaSolicitud.tipo_servicio,
          precio_propuesto: nuevaSolicitud.precio_propuesto,
          motivo: nuevaSolicitud.motivo,
        })
        await loadData()
      }

      setSuccess('Solicitud enviada correctamente')
      setShowModal(false)
      setNuevaSolicitud({ tipo_servicio: 'BANO', precio_propuesto: 0, motivo: '' })
    } catch (err: any) {
      setError(err.message || 'Error al enviar la solicitud')
    } finally {
      setEnviando(false)
    }
  }

  const handleResolver = async () => {
    if (!solicitudAResolver) return

    setEnviando(true)
    setError('')

    try {
      const isDemo = token?.startsWith('demo-token')

      if (isDemo) {
        // Simular en modo demo
        setSolicitudes(prev => prev.map(s => {
          if (s.id === solicitudAResolver.id) {
            return {
              ...s,
              estado: accionResolver === 'aprobar' ? 'aprobada' : 'rechazada',
              fecha_resolucion: new Date().toISOString().split('T')[0],
              resuelto_por_nombre: user?.nombre || 'Supervisor',
              comentario_resolucion: comentarioResolucion,
            }
          }
          return s
        }))
        if (resumen && accionResolver === 'aprobar') {
          setResumen({ ...resumen, solicitudes_pendientes: Math.max(0, resumen.solicitudes_pendientes - 1) })
        }
      } else {
        await peluqueriaApi.resolverSolicitud(token!, solicitudAResolver.id, {
          accion: accionResolver,
          comentario: comentarioResolucion,
        })
        await loadData()
      }

      setSuccess(`Solicitud ${accionResolver === 'aprobar' ? 'aprobada' : 'rechazada'} correctamente`)
      setShowResolverModal(false)
      setSolicitudAResolver(null)
      setComentarioResolucion('')
    } catch (err: any) {
      setError(err.message || 'Error al resolver la solicitud')
    } finally {
      setEnviando(false)
    }
  }

  const formatPrecio = (precio: number) => {
    return precio.toLocaleString('es-AR')
  }

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR')
  }

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Clock className="w-4 h-4 text-yellow-400" />
      case 'aprobada':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'rechazada':
        return <XCircle className="w-4 h-4 text-red-400" />
      default:
        return null
    }
  }

  const getEstadoClass = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
      case 'aprobada':
        return 'bg-green-500/10 text-green-400 border-green-500/30'
      case 'rechazada':
        return 'bg-red-500/10 text-red-400 border-red-500/30'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30'
    }
  }

  // Loading inicial
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-mascotera-turquesa border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Sidebar />

      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Scissors className="w-8 h-8 text-mascotera-turquesa" />
              Peluqueria - Precios de Servicios
            </h1>
            <p className="text-gray-400 mt-1">
              Control de precios base por sucursal. El precio final lo define el peluquero segun raza o tratamientos especiales.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-mascotera-turquesa hover:bg-mascotera-turquesa/80 text-black font-medium rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
            Solicitar Cambio de Precio
          </button>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
            <button onClick={() => setError('')} className="ml-auto">
              <X className="w-4 h-4 text-red-400" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-green-400">{success}</p>
            <button onClick={() => setSuccess('')} className="ml-auto">
              <X className="w-4 h-4 text-green-400" />
            </button>
          </div>
        )}

        {/* Cards de Resumen */}
        {resumen && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-400">
                    ${formatPrecio(resumen.precio_bano_actual)}
                  </p>
                  <p className="text-xs text-gray-400">Precio Bano</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Scissors className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">
                    ${formatPrecio(resumen.precio_corte_actual)}
                  </p>
                  <p className="text-xs text-gray-400">Precio Corte</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-400">
                    {formatFecha(resumen.fecha_vigencia_bano)}
                  </p>
                  <p className="text-xs text-gray-400">Vigencia Bano</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-400">
                    {resumen.solicitudes_pendientes}
                  </p>
                  <p className="text-xs text-gray-400">Solicitudes Pend.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Precios Vigentes */}
        <div className="glass rounded-2xl overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-mascotera-turquesa" />
              Precios Vigentes
            </h2>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="w-8 h-8 border-2 border-mascotera-turquesa border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {preciosVigentes.map((precio) => (
                <div key={precio.id} className="p-4 flex items-center justify-between hover:bg-gray-800/30">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      precio.tipo_servicio === 'BANO' ? 'bg-blue-500/20' : 'bg-green-500/20'
                    }`}>
                      {precio.tipo_servicio === 'BANO' ? (
                        <DollarSign className="w-5 h-5 text-blue-400" />
                      ) : (
                        <Scissors className="w-5 h-5 text-green-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {precio.tipo_servicio === 'BANO' ? 'Bano' : 'Corte'}
                      </p>
                      <p className="text-sm text-gray-400">
                        Desde: {formatFecha(precio.fecha_vigencia_desde)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className={`text-xl font-bold ${
                      precio.tipo_servicio === 'BANO' ? 'text-blue-400' : 'text-green-400'
                    }`}>
                      ${formatPrecio(precio.precio_base)}
                    </p>
                    <button
                      onClick={() => loadHistorial(precio.tipo_servicio)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                    >
                      <History className="w-4 h-4" />
                      Historial
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historial expandible */}
        {showHistorial && (
          <div className="glass rounded-2xl overflow-hidden mb-6">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-mascotera-turquesa" />
                Historial de Precios - {tipoHistorial === 'BANO' ? 'Bano' : 'Corte'}
              </h2>
              <button
                onClick={() => setShowHistorial(false)}
                className="p-1 hover:bg-gray-800 rounded"
              >
                <ChevronUp className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {loadingHistorial ? (
              <div className="p-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-mascotera-turquesa border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {historial.map((item, index) => (
                  <div key={item.id} className="p-4 hover:bg-gray-800/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium flex items-center gap-2">
                          ${formatPrecio(item.precio_base)}
                          {index === 0 && (
                            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                              Actual
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-400">
                          Vigente: {formatFecha(item.fecha_vigencia_desde)}
                          {item.fecha_vigencia_hasta ? ` - ${formatFecha(item.fecha_vigencia_hasta)}` : ' - Presente'}
                        </p>
                        {item.motivo_cambio && (
                          <p className="text-xs text-gray-500 mt-1">
                            Motivo: {item.motivo_cambio}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-400">
                        <p>Por: {item.creado_por_nombre}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Solicitudes de Modificación */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-mascotera-turquesa" />
              Solicitudes de Modificacion
            </h2>
            <div className="flex gap-2">
              {(['', 'pendiente', 'aprobada', 'rechazada'] as EstadoSolicitud[]).map((estado) => (
                <button
                  key={estado || 'todas'}
                  onClick={() => setFiltroEstado(estado)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    filtroEstado === estado
                      ? 'bg-mascotera-turquesa text-black'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {estado === '' ? 'Todas' : estado.charAt(0).toUpperCase() + estado.slice(1) + 's'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="w-8 h-8 border-2 border-mascotera-turquesa border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : solicitudes.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Send className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay solicitudes {filtroEstado ? filtroEstado + 's' : ''}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {solicitudes.map((solicitud) => (
                <div key={solicitud.id} className="p-4 hover:bg-gray-800/30">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 ${getEstadoClass(solicitud.estado)} p-1.5 rounded`}>
                        {getEstadoIcon(solicitud.estado)}
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {solicitud.tipo_servicio === 'BANO' ? 'Bano' : 'Corte'}
                        </p>
                        <p className="text-sm text-gray-300">
                          ${formatPrecio(solicitud.precio_actual)}
                          <span className="text-gray-500 mx-2">→</span>
                          <span className="text-mascotera-turquesa font-medium">
                            ${formatPrecio(solicitud.precio_propuesto)}
                          </span>
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          {solicitud.motivo}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Solicitado por {solicitud.solicitante_nombre} el {formatFecha(solicitud.fecha_solicitud)}
                        </p>
                        {solicitud.fecha_resolucion && (
                          <p className="text-xs text-gray-500">
                            Resuelto por {solicitud.resuelto_por_nombre} el {formatFecha(solicitud.fecha_resolucion)}
                            {solicitud.comentario_resolucion && `: ${solicitud.comentario_resolucion}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs border ${getEstadoClass(solicitud.estado)}`}>
                        {solicitud.estado.charAt(0).toUpperCase() + solicitud.estado.slice(1)}
                      </span>
                      {puedeAprobar && solicitud.estado === 'pendiente' && (
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => {
                              setSolicitudAResolver(solicitud)
                              setAccionResolver('aprobar')
                              setShowResolverModal(true)
                            }}
                            className="p-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded transition-colors"
                            title="Aprobar"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSolicitudAResolver(solicitud)
                              setAccionResolver('rechazar')
                              setShowResolverModal(true)
                            }}
                            className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
                            title="Rechazar"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal Solicitar Cambio de Precio */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-6 w-full max-w-lg mx-4 border border-mascotera-turquesa/30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Solicitar Cambio de Precio</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Tipo de Servicio */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Servicio
                </label>
                <select
                  value={nuevaSolicitud.tipo_servicio}
                  onChange={(e) => setNuevaSolicitud({...nuevaSolicitud, tipo_servicio: e.target.value as TipoServicio})}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-mascotera-turquesa focus:outline-none"
                >
                  <option value="BANO">Bano</option>
                  <option value="CORTE">Corte</option>
                </select>
              </div>

              {/* Precio Actual (solo lectura) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Precio Actual
                </label>
                <div className="px-3 py-2 bg-gray-800/30 border border-gray-700 rounded-lg text-gray-400">
                  ${formatPrecio(getPrecioActual(nuevaSolicitud.tipo_servicio))}
                </div>
              </div>

              {/* Precio Propuesto */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Precio Propuesto *
                </label>
                <input
                  type="number"
                  value={nuevaSolicitud.precio_propuesto || ''}
                  onChange={(e) => setNuevaSolicitud({...nuevaSolicitud, precio_propuesto: Number(e.target.value)})}
                  placeholder="Ej: 3500"
                  min="0"
                  step="100"
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-mascotera-turquesa focus:outline-none"
                />
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Motivo de la solicitud *
                </label>
                <textarea
                  value={nuevaSolicitud.motivo}
                  onChange={(e) => setNuevaSolicitud({...nuevaSolicitud, motivo: e.target.value})}
                  placeholder="Explica por que se necesita el cambio de precio..."
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white resize-none focus:border-mascotera-turquesa focus:outline-none"
                />
              </div>

              {/* Nota informativa */}
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-sm text-yellow-400">
                  Nota: El precio base es referencial. El peluquero puede ajustar el precio final
                  segun la raza del animal o tratamientos especiales necesarios.
                </p>
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
                onClick={handleEnviarSolicitud}
                disabled={enviando || !nuevaSolicitud.precio_propuesto || !nuevaSolicitud.motivo.trim()}
                className="flex-1 px-4 py-2 bg-mascotera-turquesa hover:bg-mascotera-turquesa/80 text-black font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {enviando ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Resolver Solicitud */}
      {showResolverModal && solicitudAResolver && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-6 w-full max-w-md mx-4 border border-mascotera-turquesa/30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {accionResolver === 'aprobar' ? 'Aprobar' : 'Rechazar'} Solicitud
              </h2>
              <button onClick={() => setShowResolverModal(false)} className="p-2 hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-gray-800/50">
                <p className="text-sm text-gray-400">Servicio</p>
                <p className="text-white font-medium">
                  {solicitudAResolver.tipo_servicio === 'BANO' ? 'Bano' : 'Corte'}
                </p>
                <p className="text-sm text-gray-300 mt-2">
                  ${formatPrecio(solicitudAResolver.precio_actual)} → ${formatPrecio(solicitudAResolver.precio_propuesto)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Comentario (opcional)
                </label>
                <textarea
                  value={comentarioResolucion}
                  onChange={(e) => setComentarioResolucion(e.target.value)}
                  placeholder="Agregar un comentario..."
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white resize-none focus:border-mascotera-turquesa focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowResolverModal(false)}
                className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleResolver}
                disabled={enviando}
                className={`flex-1 px-4 py-2 font-medium rounded-lg disabled:opacity-50 transition-colors ${
                  accionResolver === 'aprobar'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {enviando ? 'Procesando...' : accionResolver === 'aprobar' ? 'Aprobar' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
