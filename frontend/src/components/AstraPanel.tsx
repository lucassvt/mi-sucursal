'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Package, CheckCircle, Clock, User, Phone, ChevronDown, ChevronUp, Truck, RefreshCw, Receipt, CreditCard, Mail, ArrowLeft } from 'lucide-react'
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
  const [mounted, setMounted] = useState(false)
  const [comprobante, setComprobante] = useState<any>(null)
  const [loadingComprobante, setLoadingComprobante] = useState(false)

  useEffect(() => { setMounted(true) }, [])

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
      setExpandedId(null)
      setDetalle(null)
      setComprobante(null)
    }
  }, [open, cargarPedidos])

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

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

  const verComprobante = async (pedidoId: number) => {
    if (!token) return
    setLoadingComprobante(true)
    try {
      const data = await astraApi.comprobantePago(token, pedidoId)
      setComprobante(data)
    } catch {
      alert('Error al obtener comprobante de pago')
    } finally {
      setLoadingComprobante(false)
    }
  }

  const estadoBadge = (estado: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      pagado: { bg: 'bg-green-500/15 border-green-500/30', text: 'text-green-400', label: 'Pagado' },
      preparando: { bg: 'bg-amber-500/15 border-amber-500/30', text: 'text-amber-400', label: 'Preparando' },
      enviado: { bg: 'bg-blue-500/15 border-blue-500/30', text: 'text-blue-400', label: 'Enviado' },
      entregado: { bg: 'bg-emerald-500/15 border-emerald-500/30', text: 'text-emerald-400', label: 'Entregado' },
      cancelado: { bg: 'bg-red-500/15 border-red-500/30', text: 'text-red-400', label: 'Cancelado' },
    }
    const s = map[estado] || { bg: 'bg-gray-500/15 border-gray-500/30', text: 'text-gray-400', label: estado }
    return (
      <span className={`text-[11px] px-2 py-0.5 rounded border font-medium ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    )
  }

  const formatFecha = (iso: string | null) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const formatMonto = (n: number) =>
    '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  if (!mounted) return null

  const content = (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[9998] transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full z-[9999] transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: 'min(400px, calc(100vw - 280px))' }}
      >
        <div className="h-full flex flex-col bg-[#0d1117] border-l border-gray-700/50 shadow-2xl shadow-black/50">

          {/* Header */}
          <div className="shrink-0 px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">&#11088;</span>
              <div>
                <h2 className="font-bold text-white text-base leading-tight">Pedidos Astra</h2>
                <p className="text-[11px] text-gray-500">Retiro en sucursal</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => cargarPedidos()}
                disabled={loading}
                className="p-1.5 rounded-md hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
                title="Actualizar"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="shrink-0 px-4 py-2.5 border-b border-gray-800/50 flex gap-1.5">
            {([
              { value: 'pendiente', label: 'Pendientes' },
              { value: 'entregado', label: 'Entregados' },
              { value: 'todos', label: 'Todos' },
            ] as const).map((f) => (
              <button
                key={f.value}
                onClick={() => setFiltro(f.value)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  filtro === f.value
                    ? 'bg-purple-500/20 text-purple-300 shadow-sm shadow-purple-500/10'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Vista Comprobante */}
            {comprobante && (
              <div className="p-4 space-y-3">
                <button
                  onClick={() => setComprobante(null)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Volver a pedidos
                </button>

                <div className="flex items-center justify-center">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-green-400 bg-green-500/15 border border-green-500/25">
                    <CheckCircle className="w-4 h-4" />
                    PAGO APROBADO
                  </span>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">ID Pago MP</span>
                    <span className="text-white font-mono font-semibold">#{comprobante.payment_id}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Pedido</span>
                    <span className="text-white">{comprobante.pedido_codigo}</span>
                  </div>
                  {comprobante.description && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Descripcion</span>
                      <span className="text-gray-300 text-right text-[11px] max-w-[180px]">{comprobante.description}</span>
                    </div>
                  )}
                </div>

                <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Total pagado</span>
                    <span className="text-white font-bold text-sm">{formatMonto(comprobante.total_paid)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Neto recibido</span>
                    <span className="text-green-400 font-semibold">{formatMonto(comprobante.net_received)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Comision MP</span>
                    <span className="text-red-400">-{formatMonto(comprobante.mp_fee)}</span>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 flex items-center gap-1"><CreditCard className="w-3 h-3" />Metodo</span>
                    <span className="text-white">{comprobante.payment_method}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Tipo</span>
                    <span className="text-white">{comprobante.payment_type}</span>
                  </div>
                  {comprobante.installments > 1 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Cuotas</span>
                      <span className="text-white">{comprobante.installments}x {formatMonto(comprobante.total_paid / comprobante.installments)}</span>
                    </div>
                  )}
                </div>

                <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                  {comprobante.payer_name && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 flex items-center gap-1"><User className="w-3 h-3" />Pagador</span>
                      <span className="text-white">{comprobante.payer_name}</span>
                    </div>
                  )}
                  {comprobante.payer_email && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3" />Email</span>
                      <span className="text-white text-[11px]">{comprobante.payer_email}</span>
                    </div>
                  )}
                </div>

                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" />Aprobado</span>
                    <span className="text-white">{comprobante.date_approved ? formatFecha(comprobante.date_approved) : '-'}</span>
                  </div>
                </div>
              </div>
            )}

            {!comprobante && loading && (
              <div className="flex items-center justify-center py-16">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!comprobante && error && !loading && (
              <div className="m-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            {!comprobante && !loading && !error && pedidos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-600">
                <Package className="w-8 h-8 mb-2" />
                <p className="text-sm">Sin pedidos</p>
              </div>
            )}

            {!comprobante && !loading && pedidos.length > 0 && (
              <div className="p-3 space-y-1.5">
                {pedidos.map((p) => {
                  const isExpanded = expandedId === p.id
                  return (
                    <div key={p.id} className={`rounded-lg overflow-hidden transition-colors ${
                      isExpanded ? 'bg-gray-800/70 ring-1 ring-purple-500/20' : 'bg-gray-800/30 hover:bg-gray-800/50'
                    }`}>
                      {/* Row */}
                      <button
                        onClick={() => verDetalle(p.id)}
                        className="w-full px-3.5 py-2.5 text-left"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-xs font-semibold text-white">{p.codigo}</span>
                            {estadoBadge(p.estado)}
                          </div>
                          <span className="text-sm font-semibold text-white whitespace-nowrap">{formatMonto(p.total)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[11px] text-gray-500 truncate">
                            {p.vendedor?.nombre} &middot; {p.cantidad_items} prod. &middot; {formatFecha(p.created_at)}
                          </span>
                          {isExpanded
                            ? <ChevronUp className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                            : <ChevronDown className="w-3.5 h-3.5 text-gray-600 shrink-0" />}
                        </div>
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-3.5 pb-3 border-t border-gray-700/50">
                          {loadingDetalle ? (
                            <div className="flex justify-center py-4">
                              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                          ) : detalle ? (
                            <div className="pt-2.5 space-y-2.5">
                              {/* Vendedor */}
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <User className="w-3 h-3 shrink-0" />
                                <span>{detalle.vendedor?.nombre}</span>
                                {detalle.vendedor?.telefono && (
                                  <>
                                    <Phone className="w-3 h-3 shrink-0 ml-1" />
                                    <span>{detalle.vendedor.telefono}</span>
                                  </>
                                )}
                              </div>

                              {/* Items */}
                              <div className="bg-black/20 rounded-md p-2.5 space-y-1">
                                {detalle.items?.map((item: any) => (
                                  <div key={item.id} className="flex justify-between text-xs">
                                    <span className="text-gray-300 truncate mr-2">
                                      <span className="text-gray-500">{item.cantidad}x</span> {item.producto_nombre}
                                    </span>
                                    <span className="text-gray-500 whitespace-nowrap">{formatMonto(item.subtotal)}</span>
                                  </div>
                                ))}
                                <div className="flex justify-between text-xs font-semibold pt-1.5 mt-1.5 border-t border-gray-700/50">
                                  <span className="text-gray-300">Total</span>
                                  <span className="text-white">{formatMonto(detalle.total)}</span>
                                </div>
                              </div>

                              {/* Fechas */}
                              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-gray-600">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatFecha(detalle.created_at)}</span>
                                {detalle.fecha_pago && <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-600" /> Pagado {formatFecha(detalle.fecha_pago)}</span>}
                                {detalle.fecha_entrega && <span className="flex items-center gap-1"><Truck className="w-3 h-3 text-emerald-600" /> Entregado {formatFecha(detalle.fecha_entrega)}</span>}
                              </div>

                              {/* Comprobante de pago */}
                              {detalle.mp_payment_id && detalle.mp_status === 'approved' && (
                                <button
                                  onClick={() => verComprobante(detalle.id)}
                                  disabled={loadingComprobante}
                                  className="w-full py-2 rounded-md bg-purple-600/20 text-purple-300 border border-purple-500/25 hover:bg-purple-600/30 transition-colors text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                                >
                                  {loadingComprobante ? (
                                    <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Receipt className="w-3.5 h-3.5" />
                                  )}
                                  Ver comprobante de pago
                                </button>
                              )}

                              {/* Notas */}
                              {(detalle.notas_vendedor || detalle.notas_admin) && (
                                <div className="text-[11px] text-gray-500 bg-black/20 rounded-md p-2">
                                  {detalle.notas_vendedor && <p><span className="text-gray-400">Vendedor:</span> {detalle.notas_vendedor}</p>}
                                  {detalle.notas_admin && <p><span className="text-gray-400">Sucursal:</span> {detalle.notas_admin}</p>}
                                </div>
                              )}

                              {/* Action */}
                              {['pagado', 'preparando', 'enviado'].includes(detalle.estado) && (
                                <button
                                  onClick={() => marcarEntregado(detalle.id)}
                                  disabled={markingId === detalle.id}
                                  className="w-full py-2 rounded-md bg-emerald-600/20 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-600/30 transition-colors text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                  {markingId === detalle.id ? (
                                    <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-3.5 h-3.5" />
                                  )}
                                  Confirmar entrega
                                </button>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-600 text-center py-3">Error al cargar</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )

  return createPortal(content, document.body)
}
