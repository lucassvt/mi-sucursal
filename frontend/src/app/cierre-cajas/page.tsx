'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Wallet,
  Plus,
  Check,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'
import { cierresApi } from '@/lib/api'

export default function CierreCajasPage() {
  const router = useRouter()
  const { token, user, isAuthenticated, isLoading } = useAuthStore()
  const [cierres, setCierres] = useState<any[]>([])
  const [pendientes, setPendientes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Vista encargado
  const [cierresTodas, setCierresTodas] = useState<any[]>([])
  const [loadingTodas, setLoadingTodas] = useState(false)

  // Solo admin, gerencia, encargado superior ven todas las cajas
  // Encargado de sucursal ve su propia caja como un vendedor
  const esEncargado = (() => {
    const userRol = (user?.rol || '').toLowerCase()
    const userPuesto = (user?.puesto || '').toLowerCase()

    // "Encargado Superior" tiene acceso global
    if (userRol.includes('encargado superior') || userPuesto.includes('encargado superior')) return true

    // Otros roles admin/gerencia (NO "encargado" genérico)
    const rolesAdmin = ['admin', 'gerente', 'gerencia', 'auditor', 'supervisor', 'jefe']
    return rolesAdmin.some(r => userRol.includes(r) || userPuesto.includes(r))
  })()

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [cajas, setCajas] = useState<any[]>([])
  const [selectedCaja, setSelectedCaja] = useState('')
  const [fechaCaja, setFechaCaja] = useState('')
  const [montoEfectivo, setMontoEfectivo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (token) {
      loadData()
      if (esEncargado) {
        loadCierresTodas()
      }
    }
  }, [token, esEncargado])

  const loadData = async () => {
    try {
      const [cierresData, pendientesData, cajasData] = await Promise.all([
        cierresApi.list(token!),
        cierresApi.pendientes(token!),
        cierresApi.getCajas(token!),
      ])
      setCierres(cierresData)
      setPendientes(pendientesData.dias_pendientes || [])
      setCajas(cajasData)

      // Set default caja if only one
      if (cajasData.length === 1) {
        setSelectedCaja(cajasData[0].id.toString())
      }

      // Set default date to today (usando fecha local, no UTC)
      const now = new Date()
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      setFechaCaja(today)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCierresTodas = async () => {
    setLoadingTodas(true)
    try {
      const data = await cierresApi.todas(token!)
      setCierresTodas(data)
    } catch (error) {
      console.error('Error loading cierres todas:', error)
      setCierresTodas([])
    } finally {
      setLoadingTodas(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      await cierresApi.create(token!, {
        caja_id: parseInt(selectedCaja),
        fecha_caja: fechaCaja,
        monto_efectivo: parseInt(montoEfectivo.replace(/\./g, ''), 10),
      })

      setSuccess('Cierre registrado correctamente')
      resetForm()
      loadData()
    } catch (err: any) {
      setError(err.message || 'Error al registrar cierre')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setMontoEfectivo('')
    setTimeout(() => {
      setSuccess('')
      setShowForm(false)
    }, 2000)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-AR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    })
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'declarado':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
            <Clock className="w-3 h-3" />
            Pendiente
          </span>
        )
      case 'conciliado':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
            <CheckCircle className="w-3 h-3" />
            Conciliado
          </span>
        )
      case 'con_diferencia':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
            <XCircle className="w-3 h-3" />
            Con diferencia
          </span>
        )
      default:
        return <span className="text-xs text-gray-500">{estado}</span>
    }
  }

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Cierre de Cajas</h1>
            <p className="text-gray-400">
              {esEncargado ? 'Cierres de caja de todas las sucursales' : 'Declarar cierres diarios de caja'}
            </p>
          </div>
          {!esEncargado && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mascotera-turquesa text-black font-semibold hover:bg-mascotera-turquesa/90 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nuevo Cierre
            </button>
          )}
        </div>

        {/* Vista encargado: tabla de todas las sucursales */}
        {esEncargado && (
          <div className="glass rounded-2xl overflow-hidden mb-8">
            <div className="p-4 border-b border-gray-800">
              <h2 className="font-semibold text-white">Cierres del mes - Todas las sucursales</h2>
              <p className="text-sm text-gray-400">{cierresTodas.length} cierres registrados</p>
            </div>

            {loadingTodas ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-mascotera-turquesa border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : cierresTodas.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay cierres registrados este mes</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-gray-400 font-medium py-3 px-4">Fecha</th>
                      <th className="text-left text-gray-400 font-medium py-3 px-3">Sucursal</th>
                      <th className="text-left text-gray-400 font-medium py-3 px-3">Caja</th>
                      <th className="text-right text-gray-400 font-medium py-3 px-3">Declarado</th>
                      <th className="text-right text-gray-400 font-medium py-3 px-3">Sistema</th>
                      <th className="text-right text-gray-400 font-medium py-3 px-3">Diferencia</th>
                      <th className="text-center text-gray-400 font-medium py-3 px-3">Estado</th>
                      <th className="text-left text-gray-400 font-medium py-3 px-3">Empleado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cierresTodas.map((cierre) => (
                      <tr key={cierre.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="py-3 px-4 text-white">
                          {formatDate(cierre.fecha_caja)}
                        </td>
                        <td className="py-3 px-3 text-white font-medium">
                          {cierre.sucursal_nombre}
                        </td>
                        <td className="py-3 px-3 text-gray-400">
                          {cierre.caja_nombre}
                        </td>
                        <td className="py-3 px-3 text-right text-white font-semibold">
                          {formatCurrency(cierre.monto_declarado)}
                        </td>
                        <td className="py-3 px-3 text-right text-gray-300">
                          {cierre.monto_dux !== null ? formatCurrency(cierre.monto_dux) : '-'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {cierre.diferencia !== null ? (
                            <span className={`font-semibold flex items-center justify-end gap-1 ${
                              cierre.diferencia > 0
                                ? 'text-green-400'
                                : cierre.diferencia < 0
                                ? 'text-red-400'
                                : 'text-gray-400'
                            }`}>
                              {cierre.diferencia > 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : cierre.diferencia < 0 ? (
                                <TrendingDown className="w-3 h-3" />
                              ) : null}
                              {formatCurrency(Math.abs(cierre.diferencia))}
                            </span>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {getEstadoBadge(cierre.estado)}
                        </td>
                        <td className="py-3 px-3 text-gray-400 text-xs">
                          {cierre.empleado_nombre}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Vista vendedor: formulario y historial propio */}
        {!esEncargado && (
          <>
            {/* Dias pendientes */}
            {pendientes.length > 0 && (
              <div className="glass rounded-2xl p-4 mb-6 border border-yellow-500/30">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="text-white font-medium">Tenes cierres pendientes</p>
                    <p className="text-sm text-gray-400">
                      Dias sin declarar: {pendientes.map((fecha) => formatDate(fecha)).join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Formulario */}
            {showForm && (
              <div className="glass rounded-2xl p-6 mb-8">
                <h2 className="text-lg font-semibold text-white mb-4">Declarar Cierre</h2>

                {error && (
                  <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 mb-4">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="flex items-center gap-2 p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 mb-4">
                    <Check className="w-5 h-5" />
                    <span>{success}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm text-gray-300">Caja</label>
                      <select
                        value={selectedCaja}
                        onChange={(e) => setSelectedCaja(e.target.value)}
                        required
                        className="w-full mt-1 px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-mascotera-turquesa"
                      >
                        <option value="">Seleccionar caja</option>
                        {cajas.map((caja) => (
                          <option key={caja.id} value={caja.id}>
                            {caja.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm text-gray-300">Fecha</label>
                      <input
                        type="date"
                        value={fechaCaja}
                        onChange={(e) => setFechaCaja(e.target.value)}
                        required
                        className="w-full mt-1 px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-mascotera-turquesa"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-gray-300">Monto Efectivo</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={montoEfectivo}
                        onChange={(e) => {
                          // Solo permitir numeros y puntos (separador de miles)
                          const val = e.target.value.replace(/[^0-9.]/g, '')
                          setMontoEfectivo(val)
                        }}
                        required
                        placeholder="Ej: 185300"
                        className="w-full mt-1 px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-mascotera-turquesa"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={submitting || !selectedCaja}
                      className="px-6 py-3 rounded-lg bg-mascotera-turquesa text-black font-semibold hover:bg-mascotera-turquesa/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Guardando...' : 'Declarar Cierre'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-6 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Lista de cierres */}
            <div className="glass rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-gray-800">
                <h2 className="font-semibold text-white">Historial de Cierres</h2>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-2 border-mascotera-turquesa border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              ) : cierres.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay cierres registrados</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {cierres.map((cierre) => (
                    <div key={cierre.id} className="p-4 hover:bg-gray-800/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-gray-800">
                            <span className="text-xs text-gray-400">
                              {new Date(cierre.fecha_caja + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short' })}
                            </span>
                            <span className="text-lg font-bold text-white">
                              {new Date(cierre.fecha_caja + 'T12:00:00').getDate()}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{cierre.caja_nombre}</p>
                            <p className="text-sm text-gray-400">
                              {new Date(cierre.fecha_caja + 'T12:00:00').toLocaleDateString('es-AR', {
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm text-gray-400">Declarado</p>
                            <p className="text-lg font-bold text-white">
                              {formatCurrency(cierre.monto_declarado)}
                            </p>
                          </div>

                          {cierre.monto_dux !== null && (
                            <>
                              <div className="text-right">
                                <p className="text-sm text-gray-400">Sistema</p>
                                <p className="text-lg font-medium text-gray-300">
                                  {formatCurrency(cierre.monto_dux)}
                                </p>
                              </div>

                              <div className="text-right">
                                <p className="text-sm text-gray-400">Diferencia</p>
                                <p className={`text-lg font-bold flex items-center gap-1 ${
                                  cierre.diferencia > 0
                                    ? 'text-green-400'
                                    : cierre.diferencia < 0
                                    ? 'text-red-400'
                                    : 'text-gray-400'
                                }`}>
                                  {cierre.diferencia > 0 ? (
                                    <TrendingUp className="w-4 h-4" />
                                  ) : cierre.diferencia < 0 ? (
                                    <TrendingDown className="w-4 h-4" />
                                  ) : null}
                                  {formatCurrency(Math.abs(cierre.diferencia))}
                                </p>
                              </div>
                            </>
                          )}

                          <div>
                            {getEstadoBadge(cierre.estado)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
