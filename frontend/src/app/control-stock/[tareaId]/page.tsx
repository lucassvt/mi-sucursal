'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Package,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Save,
  Send,
  Calculator,
  X,
  AlertCircle,
  Clock,
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'
import { controlStockApi } from '@/lib/api'

interface ProductoConteo {
  id: number
  cod_item: string
  nombre: string
  precio: number
  stock_sistema: number
  stock_real?: number
  diferencia?: number
  observaciones?: string
}

interface ConteoStock {
  id: number
  tarea_id: number
  sucursal_id: number
  fecha_conteo: string
  estado: 'borrador' | 'enviado' | 'revisado' | 'aprobado' | 'rechazado' | 'cerrado'
  empleado_id: number
  empleado_nombre: string
  revisado_por?: number
  revisado_por_nombre?: string
  fecha_revision?: string
  comentarios_auditor?: string
  valorizacion_diferencia: number
  productos: ProductoConteo[]
  total_productos: number
  productos_contados: number
  productos_con_diferencia: number
  created_at: string
}

export default function ConteoStockPage() {
  const router = useRouter()
  const params = useParams()
  const tareaId = Number(params.tareaId)
  const { token, isAuthenticated, isLoading } = useAuthStore()

  // Estados principales
  const [conteo, setConteo] = useState<ConteoStock | null>(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [enviando, setEnviando] = useState(false)

  // Estados de mensajes
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Verificacion de autenticacion
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  // Cargar datos
  useEffect(() => {
    if (token && tareaId) {
      loadData()
    }
  }, [token, tareaId])

  const loadData = async () => {
    setLoading(true)
    try {
      const conteoData = await controlStockApi.getConteo(token!, tareaId)
      setConteo(conteoData)
    } catch (err: any) {
      console.error('Error cargando datos:', err)
      setError('Error al cargar el conteo')
    } finally {
      setLoading(false)
    }
  }

  const handleStockRealChange = (productoId: number, value: string) => {
    if (!conteo) return

    const stockReal = value === '' ? undefined : parseInt(value, 10)

    setConteo(prev => {
      if (!prev) return prev

      const productosActualizados = prev.productos.map(p => {
        if (p.id === productoId) {
          const diferencia = stockReal !== undefined ? stockReal - p.stock_sistema : undefined
          return { ...p, stock_real: stockReal, diferencia }
        }
        return p
      })

      // Recalcular totales
      const productosContados = productosActualizados.filter(p => p.stock_real !== undefined).length
      const productosConDiferencia = productosActualizados.filter(p => p.diferencia && p.diferencia !== 0).length
      const valorizacionDiferencia = productosActualizados.reduce((sum, p) => {
        if (p.diferencia) {
          return sum + (p.diferencia * p.precio)
        }
        return sum
      }, 0)

      return {
        ...prev,
        productos: productosActualizados,
        productos_contados: productosContados,
        productos_con_diferencia: productosConDiferencia,
        valorizacion_diferencia: valorizacionDiferencia,
      }
    })
  }

  const handleObservacionesChange = (productoId: number, value: string) => {
    if (!conteo) return

    setConteo(prev => {
      if (!prev) return prev

      const productosActualizados = prev.productos.map(p => {
        if (p.id === productoId) {
          return { ...p, observaciones: value }
        }
        return p
      })

      return { ...prev, productos: productosActualizados }
    })
  }

  const handleGuardarBorrador = async () => {
    if (!conteo) return

    setGuardando(true)
    setError('')

    try {
      const updated = await controlStockApi.guardarBorrador(token!, conteo.id, conteo.productos.map(p => ({
        id: p.id,
        stock_real: p.stock_real,
        observaciones: p.observaciones,
      })))
      if (updated?.fecha_conteo) {
        setConteo(prev => prev ? { ...prev, fecha_conteo: updated.fecha_conteo } : prev)
      }
      setSuccess('Borrador guardado correctamente')
    } catch (err: any) {
      setError(err.message || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const handleEnviarConteo = async () => {
    if (!conteo) return

    // Validar que todos los productos esten contados
    const sinContar = conteo.productos.filter(p => p.stock_real === undefined)
    if (sinContar.length > 0) {
      setError(`Faltan ${sinContar.length} productos por contar`)
      return
    }

    setEnviando(true)
    setError('')

    try {
      const updated = await controlStockApi.enviarConteo(token!, conteo.id)
      setConteo(prev => prev ? {
        ...prev,
        estado: 'enviado',
        fecha_conteo: updated?.fecha_conteo || prev.fecha_conteo
      } : prev)
      setSuccess('Conteo enviado para revision')
    } catch (err: any) {
      setError(err.message || 'Error al enviar')
    } finally {
      setEnviando(false)
    }
  }

  const formatPrecio = (precio: number) => {
    return precio.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR')
  }

  const formatFechaHora = (fecha: string) => {
    const d = new Date(fecha)
    return d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + 'hs'
  }

  const getProgreso = () => {
    if (!conteo) return 0
    return Math.round((conteo.productos_contados / conteo.total_productos) * 100)
  }

  const getDiferenciaClass = (diferencia?: number) => {
    if (diferencia === undefined) return 'text-gray-500'
    if (diferencia === 0) return 'text-green-400'
    if (diferencia > 0) return 'text-blue-400'
    return 'text-red-400'
  }

  // Loading inicial
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-mascotera-turquesa border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const esEnviado = conteo?.estado === 'enviado' || conteo?.estado === 'aprobado' || conteo?.estado === 'rechazado' || conteo?.estado === 'cerrado'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Sidebar />

      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/tareas')}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Package className="w-7 h-7 text-green-400" />
                Conteo de Stock
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Registra el stock real de cada producto
              </p>
            </div>
          </div>

          {!esEnviado && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleGuardarBorrador}
                disabled={guardando || !conteo}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {guardando ? 'Guardando...' : 'Guardar Borrador'}
              </button>
              <button
                onClick={handleEnviarConteo}
                disabled={enviando || !conteo || conteo.productos_contados < conteo.total_productos}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {enviando ? 'Enviando...' : 'Enviar para Revision'}
              </button>
            </div>
          )}
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

        {/* Info de la tarea y estado */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{conteo?.total_productos || 0}</p>
                <p className="text-xs text-gray-400">Total Productos</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-400">{conteo?.productos_contados || 0}</p>
                <p className="text-xs text-gray-400">Contados</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-400">{conteo?.productos_con_diferencia || 0}</p>
                <p className="text-xs text-gray-400">Con Diferencia</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                (conteo?.valorizacion_diferencia || 0) < 0 ? 'bg-red-500/20' : 'bg-green-500/20'
              }`}>
                <Calculator className={`w-5 h-5 ${
                  (conteo?.valorizacion_diferencia || 0) < 0 ? 'text-red-400' : 'text-green-400'
                }`} />
              </div>
              <div>
                <p className={`text-xl font-bold ${
                  (conteo?.valorizacion_diferencia || 0) < 0 ? 'text-red-400' : 'text-green-400'
                }`}>
                  {(conteo?.valorizacion_diferencia || 0) < 0 ? '-' : ''}${formatPrecio(Math.abs(conteo?.valorizacion_diferencia || 0))}
                </p>
                <p className="text-xs text-gray-400">Valorizacion</p>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="glass rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Progreso del conteo</span>
            <div className="flex items-center gap-4">
              {conteo?.fecha_conteo && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Ultimo guardado: {formatFechaHora(conteo.fecha_conteo)}
                </span>
              )}
              <span className="text-sm text-gray-400">{conteo?.productos_contados || 0} de {conteo?.total_productos || 0} productos</span>
            </div>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-green-500 to-mascotera-turquesa h-3 rounded-full transition-all duration-300"
              style={{ width: `${getProgreso()}%` }}
            ></div>
          </div>
        </div>

        {/* Estado del conteo si ya fue enviado */}
        {esEnviado && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            conteo?.estado === 'cerrado' ? 'bg-blue-500/10 border border-blue-500/30' :
            conteo?.estado === 'aprobado' ? 'bg-green-500/10 border border-green-500/30' :
            conteo?.estado === 'rechazado' ? 'bg-red-500/10 border border-red-500/30' :
            'bg-yellow-500/10 border border-yellow-500/30'
          }`}>
            {conteo?.estado === 'cerrado' ? (
              <CheckCircle className="w-5 h-5 text-blue-400" />
            ) : conteo?.estado === 'aprobado' ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : conteo?.estado === 'rechazado' ? (
              <AlertCircle className="w-5 h-5 text-red-400" />
            ) : (
              <Clock className="w-5 h-5 text-yellow-400" />
            )}
            <div>
              <p className={`font-medium ${
                conteo?.estado === 'cerrado' ? 'text-blue-400' :
                conteo?.estado === 'aprobado' ? 'text-green-400' :
                conteo?.estado === 'rechazado' ? 'text-red-400' :
                'text-yellow-400'
              }`}>
                {conteo?.estado === 'cerrado' ? 'Conteo Cerrado en Auditoria' :
                 conteo?.estado === 'aprobado' ? 'Conteo Aprobado - Pendiente Cierre en Auditoria' :
                 conteo?.estado === 'rechazado' ? 'Conteo Rechazado' :
                 'Conteo Enviado - Pendiente de Revision'}
              </p>
              {conteo?.comentarios_auditor && (
                <p className="text-sm text-gray-400 mt-1">
                  Comentarios: {conteo.comentarios_auditor}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tabla de productos */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-semibold text-white">Productos a Contar</h2>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="w-8 h-8 border-2 border-mascotera-turquesa border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-800/50 text-left">
                    <th className="px-4 py-3 text-sm font-medium text-gray-400">Codigo</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-400">Producto</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-400 text-right">Precio</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-400 text-center">Stock Sistema</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-400 text-center">Stock Real</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-400 text-center">Diferencia</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-400">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {conteo?.productos.map((producto) => (
                    <tr key={producto.id} className="hover:bg-gray-800/30">
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-gray-400">{producto.cod_item}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white">{producto.nombre}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-gray-300">${formatPrecio(producto.precio)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-lg font-medium text-gray-300">{producto.stock_sistema}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          value={producto.stock_real ?? ''}
                          onChange={(e) => handleStockRealChange(producto.id, e.target.value)}
                          disabled={esEnviado}
                          min="0"
                          className="w-20 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-center focus:border-mascotera-turquesa focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="-"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-lg font-bold ${getDiferenciaClass(producto.diferencia)}`}>
                          {producto.diferencia !== undefined ? (
                            producto.diferencia > 0 ? `+${producto.diferencia}` : producto.diferencia
                          ) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={producto.observaciones || ''}
                          onChange={(e) => handleObservacionesChange(producto.id, e.target.value)}
                          disabled={esEnviado}
                          className="w-full px-2 py-1 bg-gray-800/50 border border-gray-700 rounded text-sm text-gray-300 focus:border-mascotera-turquesa focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="Opcional..."
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Resumen final */}
        {conteo && conteo.productos_contados > 0 && (
          <div className="mt-6 glass rounded-xl p-4">
            <h3 className="font-medium text-white mb-3">Resumen del Conteo</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Productos sin diferencia:</span>
                <span className="ml-2 text-green-400 font-medium">
                  {conteo.productos_contados - conteo.productos_con_diferencia}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Productos con diferencia:</span>
                <span className="ml-2 text-yellow-400 font-medium">
                  {conteo.productos_con_diferencia}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Valorizacion total:</span>
                <span className={`ml-2 font-medium ${conteo.valorizacion_diferencia < 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {conteo.valorizacion_diferencia < 0 ? '-' : ''}${formatPrecio(Math.abs(conteo.valorizacion_diferencia))}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
