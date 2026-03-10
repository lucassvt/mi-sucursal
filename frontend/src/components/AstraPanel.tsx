'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Package, CheckCircle, Clock, User, Phone, Mail, ChevronDown, ChevronUp, Truck } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { astraApi } from '@/lib/api'

interface AstraPanelProps {
  open: boolean
  onClose: () => void
}

export default function AstraPanel({ open, onClose }: AstraPanelProps) {
  const { token } = useAuthStore()
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<string>('pendiente')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [detalle, setDetalle] = useState<any>(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [markingId, setMarkingId] = useState<number | null>(null)

  const cargarPedidos = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await astraApi.pedidos(token, filtro)
      setPedidos(data.pedidos || [])
    } catch (e: any) {
      if (e.message !== 'Tu sucursal no tiene acceso a Astra') {
        setError(e.message)
      }
    } finally {
      setLoading(false)
    }
  }, [token, filtro])

  useEffect(() => {
    if (open) {
      cargarPedidos()
    }
  }, [open, cargarPedidos])

  const verDetalle = async (pedidoId: number) => {
    if (expandedId === pedidoId) {
      setExpandedId(null)
      setDetalle(null)
      return
    }
    setExpandedId(pedidoId)
    setLoadingDetalle(true)
    try {
      const data = await astraApi.detalle(token!, pedidoId)
      setDetalle(data)
    } catch {
      setDetalle(null)
    } finally {
      setLoadingDetalle(false)
    }
  }

  const marcarEntregado = async (pedidoId: number) => {
    if (!token) return
    setMarkingId(pedidoId)
    try {
      await astraApi.marcarEntregado(token, pedidoId)
      cargarPedidos()
      setExpandedId(null)
      setDetalle(null)
    } catch (e: any) {
      alert(e.message || 'Error al marcar como entregado')
    } finally {
      setMarkingId(null)
    }
  }

  const estadoColor = (estado: string) => {
    switch (estado) {
      case 'pagado': return 'text-green-400 bg-green-400/10'
      case 'preparando': return 'text-yellow-400 bg-yellow-400/10'
      case 'enviado': return 'text-blue-400 bg-blue-400/10'
      case 'entregado': return 'text-emerald-400 bg-emerald-400/10'
      case 'cancelado': return 'text-red-400 bg-red-400/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  const formatFecha = (iso: string | null) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const formatMonto = (n: number) =>
    n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })

  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[420px] max-w-[90vw] bg-mascotera-oscuro border-l border-gray-700 z-50 transform transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <span className="text-lg">&#11088;</span>
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">Astra</h2>
              <p className="text-xs text-gray-400">Pedidos para retiro en sucursal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filtros */}
        <div className="p-3 border-b border-gray-800 flex gap-2">
          {[
            { value: 'pendiente', label: 'Pendientes' },
            { value: 'entregado', label: 'Entregados' },
            { value: 'todos', label: 'Todos' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filtro === f.value
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista de pedidos */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && pedidos.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay pedidos {filtro === 'pendiente' ? 'pendientes' : ''}</p>
            </div>
          )}

          {!loading && pedidos.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-gray-700 bg-gray-800/50 overflow-hidden"
            >
              {/* Pedido header */}
              <button
                onClick={() => verDetalle(p.id)}
                className="w-full p-3 text-left hover:bg-gray-800/80 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-white text-sm">{p.codigo}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoColor(p.estado)}`}>
                    {p.estado}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{p.vendedor?.nombre || 'Vendedor'}</span>
                  <span>{formatMonto(p.total)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">
                    {p.cantidad_items} item{p.cantidad_items !== 1 ? 's' : ''} &middot; {formatFecha(p.created_at)}
                  </span>
                  {expandedId === p.id
                    ? <ChevronUp className="w-4 h-4 text-gray-500" />
                    : <ChevronDown className="w-4 h-4 text-gray-500" />
                  }
                </div>
              </button>

              {/* Detalle expandido */}
              {expandedId === p.id && (
                <div className="border-t border-gray-700 p-3 bg-gray-900/50">
                  {loadingDetalle ? (
                    <div className="flex justify-center py-4">
                      <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : detalle ? (
                    <div className="space-y-3">
                      {/* Vendedor info */}
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-300 uppercase tracking-wide">Vendedor</p>
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <User className="w-3.5 h-3.5" />
                          <span>{detalle.vendedor?.nombre}</span>
                        </div>
                        {detalle.vendedor?.telefono && (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{detalle.vendedor.telefono}</span>
                          </div>
                        )}
                        {detalle.vendedor?.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Mail className="w-3.5 h-3.5" />
                            <span>{detalle.vendedor.email}</span>
                          </div>
                        )}
                      </div>

                      {/* Items */}
                      <div>
                        <p className="text-xs font-medium text-gray-300 uppercase tracking-wide mb-1">Productos</p>
                        <div className="space-y-1">
                          {detalle.items?.map((item: any) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-gray-300 truncate flex-1 mr-2">
                                {item.cantidad}x {item.producto_nombre}
                              </span>
                              <span className="text-gray-400 whitespace-nowrap">
                                {formatMonto(item.subtotal)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Totales */}
                      <div className="border-t border-gray-700 pt-2 space-y-1">
                        {detalle.descuento > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Descuento</span>
                            <span className="text-green-400">-{formatMonto(detalle.descuento)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-bold">
                          <span className="text-white">Total</span>
                          <span className="text-white">{formatMonto(detalle.total)}</span>
                        </div>
                      </div>

                      {/* Fechas */}
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Creado: {formatFecha(detalle.created_at)}</span>
                        </div>
                        {detalle.fecha_pago && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>Pagado: {formatFecha(detalle.fecha_pago)}</span>
                          </div>
                        )}
                        {detalle.fecha_entrega && (
                          <div className="flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            <span>Entregado: {formatFecha(detalle.fecha_entrega)}</span>
                          </div>
                        )}
                      </div>

                      {/* Notas */}
                      {(detalle.notas_vendedor || detalle.notas_admin) && (
                        <div className="text-xs">
                          {detalle.notas_vendedor && (
                            <p className="text-gray-400"><strong>Nota vendedor:</strong> {detalle.notas_vendedor}</p>
                          )}
                          {detalle.notas_admin && (
                            <p className="text-gray-400"><strong>Nota admin:</strong> {detalle.notas_admin}</p>
                          )}
                        </div>
                      )}

                      {/* Boton entregar */}
                      {['pagado', 'preparando', 'enviado'].includes(detalle.estado) && (
                        <button
                          onClick={() => marcarEntregado(detalle.id)}
                          disabled={markingId === detalle.id}
                          className="w-full mt-1 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {markingId === detalle.id ? (
                            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Marcar como entregado
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center">Error al cargar detalle</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
