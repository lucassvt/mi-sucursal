'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  UserCheck,
  Upload,
  Download,
  Phone,
  Mail,
  MessageCircle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  PawPrint,
  ShoppingBag,
  Tag,
  Building2,
  TrendingUp,
  MessageSquare,
  Bell,
  RefreshCw,
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'
import { recontactosApi } from '@/lib/api'

interface Cliente {
  id: number
  cliente_codigo: string | null
  cliente_nombre: string
  cliente_telefono: string | null
  cliente_email: string | null
  // Datos de mascota
  mascota: string | null
  especie: string | null
  tamano: string | null
  marca_habitual: string | null
  ultimo_producto: string | null
  // Datos de compra
  ultima_compra: string | null
  dias_sin_comprar: number | null
  monto_ultima_compra: string | null
  estado: string
  cantidad_contactos: number
  ultimo_contacto: string | null
  ultimo_contacto_resultado: string | null
  ultimo_contacto_notas: string | null
  ultimo_contacto_medio: string | null
  ultimo_contacto_employee: string | null
  // Recordatorio
  recordatorio_motivo: string | null
  recordatorio_dias: number | null
  recordatorio_fecha_proximo: string | null
  recordatorio_activo: boolean
}

interface Resumen {
  total_clientes: number
  pendientes: number
  contactados_hoy: number
  contactados_semana: number
  recuperados: number
  no_interesados: number
  recordatorios: number
}

interface ResumenSucursal {
  sucursal_id: number
  sucursal_nombre: string
  total_clientes: number
  pendientes: number
  contactados: number
  recuperados: number
  no_interesados: number
  decesos: number
  contactados_semana: number
  contactados_hoy: number
}

const MEDIOS_CONTACTO = [
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'telefono', label: 'Telefono', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
]

const RESULTADOS_CONTACTO = [
  { value: 'interesado', label: 'Positivo - Interesado/Va a comprar', positivo: true },
  { value: 'contactado', label: 'Contactado - Sin definir aun', positivo: null },
  { value: 'no_contesta', label: 'No contesta', positivo: null },
  { value: 'numero_erroneo', label: 'Numero erroneo', positivo: null },
  { value: 'no_interesado', label: 'Negativo - No le interesa', positivo: false },
  { value: 'deceso', label: 'Deceso de mascota', positivo: false },
]

export default function RecontactoClientesPage() {
  const router = useRouter()
  const { token, user, isAuthenticated, isLoading } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const esEncargado = (() => {
    const rolesEncargado = ['encargado', 'admin', 'gerente', 'gerencia', 'auditor', 'supervisor', 'jefe']
    const userRol = (user?.rol || '').toLowerCase()
    const userPuesto = (user?.puesto || '').toLowerCase()
    return rolesEncargado.some(r => userRol.includes(r) || userPuesto.includes(r))
  })()

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<string>('')

  // Encargado: resumen todas sucursales
  const [resumenTodas, setResumenTodas] = useState<ResumenSucursal[]>([])
  const [loadingTodas, setLoadingTodas] = useState(false)

  // Modal contacto
  const [showContactModal, setShowContactModal] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [medioContacto, setMedioContacto] = useState('telefono')
  const [resultadoContacto, setResultadoContacto] = useState('')
  const [notasContacto, setNotasContacto] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Recordatorio en modal contacto
  const [crearRecordatorio, setCrearRecordatorio] = useState(false)
  const [recordatorioMotivo, setRecordatorioMotivo] = useState('')
  const [recordatorioDias, setRecordatorioDias] = useState(30)
  // Modal reprogramar
  const [showReprogramarModal, setShowReprogramarModal] = useState(false)
  const [reprogramarCliente, setReprogramarCliente] = useState<Cliente | null>(null)
  const [reprogramarDias, setReprogramarDias] = useState(30)

  // Expanded client
  const [expandedCliente, setExpandedCliente] = useState<number | null>(null)

  // Messages
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Import
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (token) {
      loadData()
      if (esEncargado) {
        loadResumenTodas()
      }
    }
  }, [token, filtroEstado, esEncargado])

  const loadResumenTodas = async () => {
    try {
      setLoadingTodas(true)
      const data = await recontactosApi.resumenTodas(token!)
      setResumenTodas(data)
    } catch (err) {
      console.error('Error loading resumen todas:', err)
    } finally {
      setLoadingTodas(false)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [clientesData, resumenData] = await Promise.all([
        recontactosApi.list(token!, filtroEstado || undefined),
        recontactosApi.resumen(token!)
      ])
      setClientes(clientesData)
      setResumen(resumenData)
    } catch (err) {
      console.error('Error loading data:', err)
      setClientes([])
      setResumen({ total_clientes: 0, pendientes: 0, contactados_hoy: 0, contactados_semana: 0, recuperados: 0, no_interesados: 0, recordatorios: 0 })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenContactModal = (cliente: Cliente) => {
    setSelectedCliente(cliente)
    setMedioContacto('telefono')
    setResultadoContacto('')
    setNotasContacto('')
    setCrearRecordatorio(false)
    setRecordatorioMotivo('')
    setRecordatorioDias(30)
    setShowContactModal(true)
  }

  const handleRegistrarContacto = async () => {
    if (!selectedCliente || !resultadoContacto) {
      setError('Selecciona un resultado')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await recontactosApi.registrarContacto(token!, {
        cliente_recontacto_id: selectedCliente.id,
        medio: medioContacto,
        resultado: resultadoContacto,
        notas: notasContacto || undefined,
        ...(crearRecordatorio && recordatorioMotivo && recordatorioDias > 0 ? {
          recordatorio_motivo: recordatorioMotivo,
          recordatorio_dias: recordatorioDias,
        } : {})
      })
      setSuccess(crearRecordatorio ? 'Contacto registrado con recordatorio' : 'Contacto registrado correctamente')
      loadData()
      setShowContactModal(false)
    } catch (err: any) {
      setError(err.message || 'Error al registrar contacto')
    } finally {
      setSubmitting(false)
    }
  }

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportResult(null)
    setError('')

    try {
      const result = await recontactosApi.importar(token!, file)
      setImportResult(result)
      if (result.success) {
        loadData()
      }
    } catch (err: any) {
      setError(err.message || 'Error al importar')
    } finally {
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-500/20 text-yellow-400'
      case 'contactado': return 'bg-blue-500/20 text-blue-400'
      case 'recuperado': return 'bg-green-500/20 text-green-400'
      case 'no_interesado': return 'bg-gray-500/20 text-gray-400'
      case 'deceso': return 'bg-red-500/20 text-red-400'
      case 'recordatorio': return 'bg-purple-500/20 text-purple-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente'
      case 'contactado': return 'Contactado'
      case 'recuperado': return 'Recuperado'
      case 'no_interesado': return 'No interesado'
      case 'deceso': return 'Deceso'
      case 'recordatorio': return 'Recordatorio'
      default: return estado
    }
  }

  const handleCompletarRecordatorio = async (clienteId: number) => {
    try {
      await recontactosApi.completarRecordatorio(token!, clienteId)
      setSuccess('Recordatorio completado')
      loadData()
    } catch (err: any) {
      setError(err.message || 'Error al completar recordatorio')
    }
  }

  const handleReprogramarRecordatorio = async () => {
    if (!reprogramarCliente || reprogramarDias <= 0) return
    try {
      await recontactosApi.reprogramarRecordatorio(token!, reprogramarCliente.id, reprogramarDias)
      setSuccess('Recordatorio reprogramado')
      setShowReprogramarModal(false)
      loadData()
    } catch (err: any) {
      setError(err.message || 'Error al reprogramar recordatorio')
    }
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-mascotera-turquesa border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // Totales para encargado
  const totales = resumenTodas.reduce((acc, s) => ({
    total_clientes: acc.total_clientes + s.total_clientes,
    pendientes: acc.pendientes + s.pendientes,
    contactados: acc.contactados + s.contactados,
    recuperados: acc.recuperados + s.recuperados,
    no_interesados: acc.no_interesados + s.no_interesados,
    decesos: acc.decesos + s.decesos,
    contactados_semana: acc.contactados_semana + s.contactados_semana,
    contactados_hoy: acc.contactados_hoy + s.contactados_hoy,
  }), { total_clientes: 0, pendientes: 0, contactados: 0, recuperados: 0, no_interesados: 0, decesos: 0, contactados_semana: 0, contactados_hoy: 0 })

  return (
    <div className="min-h-screen">
      <Sidebar />

      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <UserCheck className="w-8 h-8 text-mascotera-turquesa" />
              Recontacto Clientes
            </h1>
            <p className="text-gray-400 mt-2">{esEncargado ? 'Resumen por sucursal' : 'Gestion de clientes a recontactar'}</p>
          </div>
          <div className="flex gap-3">
            {esEncargado && (
              <button
                onClick={async () => {
                  try {
                    await recontactosApi.exportarCSV(token!, filtroEstado || undefined)
                    setSuccess('CSV exportado correctamente')
                  } catch {
                    setError('Error al exportar CSV')
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mascotera-turquesa text-black font-medium hover:bg-mascotera-turquesa/80 transition-colors"
              >
                <Download className="w-5 h-5" />
                Exportar CSV
              </button>
            )}
            {!esEncargado && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportCSV}
                  accept=".csv"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  <Upload className="w-5 h-5" />
                  {importing ? 'Importando...' : 'Importar CSV'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ============ VISTA ENCARGADO ============ */}
        {esEncargado && (
          <div>
            {/* Cards resumen global */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{totales.total_clientes}</p>
                    <p className="text-xs text-gray-400">Total clientes</p>
                  </div>
                </div>
              </div>
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-400">{totales.pendientes}</p>
                    <p className="text-xs text-gray-400">Pendientes</p>
                  </div>
                </div>
              </div>
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-400">{totales.recuperados}</p>
                    <p className="text-xs text-gray-400">Recuperados</p>
                  </div>
                </div>
              </div>
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-mascotera-turquesa/20 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-mascotera-turquesa" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-mascotera-turquesa">{totales.contactados_semana}</p>
                    <p className="text-xs text-gray-400">Contactados esta semana</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla por sucursal */}
            {loadingTodas ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-mascotera-turquesa border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : resumenTodas.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center text-gray-400">
                <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay datos de recontactos</p>
              </div>
            ) : (
              <div className="glass rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-800">
                  <h2 className="font-semibold text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-mascotera-turquesa" />
                    Recontactos por Sucursal ({resumenTodas.length})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400">
                        <th className="text-left px-4 py-3 font-medium">Sucursal</th>
                        <th className="text-center px-3 py-3 font-medium">Total</th>
                        <th className="text-center px-3 py-3 font-medium">Pendientes</th>
                        <th className="text-center px-3 py-3 font-medium">Contactados hoy</th>
                        <th className="text-center px-3 py-3 font-medium">Contactados semana</th>
                        <th className="text-center px-3 py-3 font-medium">Recuperados</th>
                        <th className="text-center px-3 py-3 font-medium">No interesados</th>
                        <th className="text-center px-3 py-3 font-medium">Avance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumenTodas.map((s) => {
                        const avance = s.total_clientes > 0
                          ? Math.round(((s.recuperados + s.contactados + s.no_interesados + s.decesos) / s.total_clientes) * 100)
                          : 0
                        return (
                          <tr key={s.sucursal_id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                            <td className="px-4 py-3">
                              <span className="text-white font-medium">{s.sucursal_nombre}</span>
                            </td>
                            <td className="text-center px-3 py-3 text-white font-medium">{s.total_clientes}</td>
                            <td className="text-center px-3 py-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.pendientes > 0 ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-500'}`}>
                                {s.pendientes}
                              </span>
                            </td>
                            <td className="text-center px-3 py-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.contactados_hoy > 0 ? 'bg-mascotera-turquesa/20 text-mascotera-turquesa' : 'text-gray-500'}`}>
                                {s.contactados_hoy}
                              </span>
                            </td>
                            <td className="text-center px-3 py-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.contactados_semana > 0 ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500'}`}>
                                {s.contactados_semana}
                              </span>
                            </td>
                            <td className="text-center px-3 py-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.recuperados > 0 ? 'bg-green-500/20 text-green-400' : 'text-gray-500'}`}>
                                {s.recuperados}
                              </span>
                            </td>
                            <td className="text-center px-3 py-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.no_interesados > 0 ? 'bg-gray-500/20 text-gray-400' : 'text-gray-500'}`}>
                                {s.no_interesados}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      avance >= 70 ? 'bg-green-500' : avance >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${avance}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-medium w-10 text-right ${
                                  avance >= 70 ? 'text-green-400' : avance >= 40 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                  {avance}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    {/* Fila totales */}
                    <tfoot>
                      <tr className="border-t border-gray-700 bg-gray-800/30">
                        <td className="px-4 py-3 font-bold text-white">TOTAL</td>
                        <td className="text-center px-3 py-3 font-bold text-white">{totales.total_clientes}</td>
                        <td className="text-center px-3 py-3 font-bold text-yellow-400">{totales.pendientes}</td>
                        <td className="text-center px-3 py-3 font-bold text-mascotera-turquesa">{totales.contactados_hoy}</td>
                        <td className="text-center px-3 py-3 font-bold text-blue-400">{totales.contactados_semana}</td>
                        <td className="text-center px-3 py-3 font-bold text-green-400">{totales.recuperados}</td>
                        <td className="text-center px-3 py-3 font-bold text-gray-400">{totales.no_interesados}</td>
                        <td className="px-3 py-3">
                          {(() => {
                            const avanceTotal = totales.total_clientes > 0
                              ? Math.round(((totales.recuperados + totales.contactados + totales.no_interesados + totales.decesos) / totales.total_clientes) * 100)
                              : 0
                            return (
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-mascotera-turquesa" />
                                <span className={`text-sm font-bold ${
                                  avanceTotal >= 70 ? 'text-green-400' : avanceTotal >= 40 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                  {avanceTotal}%
                                </span>
                              </div>
                            )
                          })()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============ LISTA DE CLIENTES ============ */}
        {(
          <>
            {/* Mensajes */}
            {error && (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 mb-4">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
                <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 mb-4">
                <CheckCircle className="w-5 h-5" />
                <span>{success}</span>
                <button onClick={() => setSuccess('')} className="ml-auto"><X className="w-4 h-4" /></button>
              </div>
            )}

            {/* Import Result */}
            {importResult && (
              <div className={`p-4 rounded-lg mb-4 ${importResult.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
                <p className={importResult.success ? 'text-green-400' : 'text-yellow-400'}>
                  Importados: {importResult.registros_importados} | Actualizados: {importResult.registros_actualizados}
                </p>
                {importResult.errores?.length > 0 && (
                  <div className="mt-2 text-sm text-gray-400">
                    <p>Errores ({importResult.errores.length}):</p>
                    <ul className="list-disc list-inside">
                      {importResult.errores.slice(0, 5).map((err: string, i: number) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button onClick={() => setImportResult(null)} className="text-sm text-gray-500 mt-2">Cerrar</button>
              </div>
            )}

            {/* Resumen */}
            {resumen && (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-6">
                <div className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{resumen.total_clientes}</p>
                      <p className="text-xs text-gray-400">Total clientes</p>
                    </div>
                  </div>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-400">{resumen.pendientes}</p>
                      <p className="text-xs text-gray-400">Pendientes</p>
                    </div>
                  </div>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-400">{resumen.recordatorios}</p>
                      <p className="text-xs text-gray-400">Recordatorios</p>
                    </div>
                  </div>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-mascotera-turquesa/20 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-mascotera-turquesa" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-mascotera-turquesa">{resumen.contactados_hoy}</p>
                      <p className="text-xs text-gray-400">Contactados hoy</p>
                    </div>
                  </div>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-400">{resumen.recuperados}</p>
                      <p className="text-xs text-gray-400">Recuperados</p>
                    </div>
                  </div>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-500/20 flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-400">{resumen.no_interesados}</p>
                      <p className="text-xs text-gray-400">No interesados</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filtros */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setFiltroEstado('')}
                className={`px-4 py-2 rounded-lg text-sm ${!filtroEstado ? 'bg-mascotera-turquesa text-black' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFiltroEstado('pendiente')}
                className={`px-4 py-2 rounded-lg text-sm ${filtroEstado === 'pendiente' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                Pendientes
              </button>
              <button
                onClick={() => setFiltroEstado('contactado')}
                className={`px-4 py-2 rounded-lg text-sm ${filtroEstado === 'contactado' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                Contactados
              </button>
              <button
                onClick={() => setFiltroEstado('recuperado')}
                className={`px-4 py-2 rounded-lg text-sm ${filtroEstado === 'recuperado' ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                Recuperados
              </button>
              <button
                onClick={() => setFiltroEstado('recordatorio')}
                className={`px-4 py-2 rounded-lg text-sm ${filtroEstado === 'recordatorio' ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                Recordatorios
              </button>
            </div>

            {/* Lista */}
            <div className="glass rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-gray-800">
                <h2 className="font-semibold text-white">Clientes ({clientes.length})</h2>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-2 border-mascotera-turquesa border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              ) : clientes.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay clientes registrados</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {clientes.map((cliente) => (
                    <div key={cliente.id} className="hover:bg-gray-800/30 transition-colors">
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getEstadoColor(cliente.estado)}`}>
                                {getEstadoLabel(cliente.estado)}
                              </span>
                              <span className="text-white font-medium">{cliente.cliente_nombre}</span>
                              {cliente.cliente_codigo && (
                                <span className="text-mascotera-turquesa text-sm">({cliente.cliente_codigo})</span>
                              )}
                            </div>
                            {cliente.estado === 'recordatorio' && cliente.recordatorio_motivo && (
                              <div className="mt-1 flex items-center gap-2 text-xs">
                                <Bell className="w-3 h-3 text-purple-400" />
                                <span className="text-purple-300">{cliente.recordatorio_motivo}</span>
                                {cliente.recordatorio_dias && (
                                  <span className="text-gray-500">(cada {cliente.recordatorio_dias} dias)</span>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-400">
                              {cliente.cliente_telefono && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {cliente.cliente_telefono}
                                </span>
                              )}
                              {cliente.mascota && (
                                <span className="flex items-center gap-1 text-purple-300">
                                  <PawPrint className="w-3 h-3" />
                                  {cliente.mascota}
                                  {cliente.especie && <span className="text-gray-500">({cliente.especie}{cliente.tamano ? ` - ${cliente.tamano}` : ''})</span>}
                                </span>
                              )}
                              {cliente.marca_habitual && (
                                <span className="flex items-center gap-1 text-mascotera-turquesa">
                                  <Tag className="w-3 h-3" />
                                  {cliente.marca_habitual}
                                </span>
                              )}
                              {cliente.dias_sin_comprar && (
                                <span className="text-yellow-400">
                                  {cliente.dias_sin_comprar} dias sin comprar
                                </span>
                              )}
                              {cliente.cantidad_contactos > 0 && (
                                <span>{cliente.cantidad_contactos} contacto(s)</span>
                              )}
                            </div>
                            {/* Notas del último contacto - visible para contactados/recuperados */}
                            {cliente.ultimo_contacto_notas && cliente.estado !== 'pendiente' && (
                              <div className="mt-1 flex items-start gap-2 text-xs bg-gray-800/60 rounded px-2 py-1">
                                <MessageSquare className="w-3 h-3 mt-0.5 text-mascotera-turquesa flex-shrink-0" />
                                <div className="flex-1">
                                  <span className="text-gray-300">{cliente.ultimo_contacto_notas}</span>
                                  {cliente.ultimo_contacto_employee && (
                                    <span className="text-gray-500 ml-2">— {cliente.ultimo_contacto_employee}</span>
                                  )}
                                  {cliente.ultimo_contacto_medio && (
                                    <span className="text-gray-500 ml-1">({cliente.ultimo_contacto_medio})</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {cliente.estado === 'recordatorio' ? (
                              <>
                                <button
                                  onClick={() => handleCompletarRecordatorio(cliente.id)}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-500 transition-colors"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Completar
                                </button>
                                <button
                                  onClick={() => {
                                    setReprogramarCliente(cliente)
                                    setReprogramarDias(cliente.recordatorio_dias || 30)
                                    setShowReprogramarModal(true)
                                  }}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                  Reprogramar
                                </button>
                              </>
                            ) : cliente.estado !== 'recuperado' && cliente.estado !== 'no_interesado' && cliente.estado !== 'deceso' ? (
                              <button
                                onClick={() => handleOpenContactModal(cliente)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-mascotera-turquesa text-black text-sm font-medium hover:bg-mascotera-turquesa/80 transition-colors"
                              >
                                <Phone className="w-4 h-4" />
                                Registrar Contacto
                              </button>
                            ) : null}
                            <button
                              onClick={() => setExpandedCliente(expandedCliente === cliente.id ? null : cliente.id)}
                              className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600"
                            >
                              {expandedCliente === cliente.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Detalles expandidos */}
                      {expandedCliente === cliente.id && (
                        <div className="px-4 pb-4 pt-0">
                          <div className="bg-gray-800/50 rounded-lg p-4 space-y-3 text-sm">
                            {/* Datos de mascota */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                              <div>
                                <p className="text-gray-500 text-xs">Mascota</p>
                                <p className="text-white">{cliente.mascota || '-'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs">Especie</p>
                                <p className="text-white">{cliente.especie || '-'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs">Tamano</p>
                                <p className="text-white">{cliente.tamano || '-'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs">Marca habitual</p>
                                <p className="text-mascotera-turquesa font-medium">{cliente.marca_habitual || '-'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs">Ultimo producto</p>
                                <p className="text-white">{cliente.ultimo_producto || '-'}</p>
                              </div>
                            </div>

                            <div className="border-t border-gray-700 pt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-gray-500 text-xs">Telefono</p>
                                <p className="text-white">{cliente.cliente_telefono || '-'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs">Email</p>
                                <p className="text-white">{cliente.cliente_email || '-'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs">Ultima compra</p>
                                <p className="text-white">
                                  {cliente.ultima_compra
                                    ? new Date(cliente.ultima_compra).toLocaleDateString('es-AR')
                                    : '-'}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs">Monto</p>
                                <p className="text-white">{cliente.monto_ultima_compra || '-'}</p>
                              </div>
                            </div>

                            {cliente.ultimo_contacto && (
                              <div className="border-t border-gray-700 pt-3">
                                <p className="text-gray-500 text-xs">Ultimo contacto</p>
                                <p className="text-white">
                                  {new Date(cliente.ultimo_contacto).toLocaleString('es-AR')}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Registrar Contacto */}
            {showContactModal && selectedCliente && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="glass rounded-2xl p-6 w-full max-w-md mx-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">Registrar Contacto</h2>
                    <button onClick={() => setShowContactModal(false)} className="text-gray-400 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mb-4 bg-gray-800/50 rounded-lg p-3 space-y-1">
                    <p className="text-white font-medium">{selectedCliente.cliente_nombre}</p>
                    {selectedCliente.cliente_telefono && (
                      <p className="text-mascotera-turquesa text-sm flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {selectedCliente.cliente_telefono}
                      </p>
                    )}
                    {selectedCliente.mascota && (
                      <p className="text-purple-300 text-sm flex items-center gap-1">
                        <PawPrint className="w-3 h-3" /> {selectedCliente.mascota}
                        {selectedCliente.especie && ` (${selectedCliente.especie})`}
                      </p>
                    )}
                    {selectedCliente.marca_habitual && (
                      <p className="text-gray-400 text-sm flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3" /> Marca: {selectedCliente.marca_habitual}
                      </p>
                    )}
                    {selectedCliente.ultimo_producto && (
                      <p className="text-gray-400 text-sm">Ultimo: {selectedCliente.ultimo_producto}</p>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* Medio de contacto */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Medio de contacto</label>
                      <div className="flex gap-2">
                        {MEDIOS_CONTACTO.map((medio) => {
                          const Icon = medio.icon
                          return (
                            <button
                              key={medio.value}
                              type="button"
                              onClick={() => setMedioContacto(medio.value)}
                              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                medioContacto === medio.value
                                  ? 'bg-mascotera-turquesa text-black'
                                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                              {medio.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Resultado */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Resultado del contacto</label>
                      <div className="space-y-2">
                        {RESULTADOS_CONTACTO.map((res) => (
                          <button
                            key={res.value}
                            type="button"
                            onClick={() => setResultadoContacto(res.value)}
                            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors border ${
                              resultadoContacto === res.value
                                ? res.positivo === true
                                  ? 'bg-green-500/20 border-green-500/50 text-green-300'
                                  : res.positivo === false
                                  ? 'bg-red-500/20 border-red-500/50 text-red-300'
                                  : 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                            }`}
                          >
                            {res.positivo === true && '+ '}
                            {res.positivo === false && '- '}
                            {res.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Notas */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Notas (opcional)</label>
                      <textarea
                        value={notasContacto}
                        onChange={(e) => setNotasContacto(e.target.value)}
                        rows={3}
                        placeholder="Agregar notas sobre el contacto..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-mascotera-turquesa resize-none"
                      />
                    </div>

                    {/* Recordatorio */}
                    <div className="border-t border-gray-700 pt-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={crearRecordatorio}
                          onChange={(e) => setCrearRecordatorio(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-600 text-purple-500 focus:ring-purple-500 bg-gray-800"
                        />
                        <Bell className="w-4 h-4 text-purple-400" />
                        <span className="text-sm text-purple-300">Crear recordatorio</span>
                      </label>

                      {crearRecordatorio && (
                        <div className="mt-3 space-y-3 pl-6">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Motivo del recordatorio</label>
                            <input
                              type="text"
                              value={recordatorioMotivo}
                              onChange={(e) => setRecordatorioMotivo(e.target.value)}
                              placeholder="Ej: Comprar alimento, vacuna, etc."
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Recordar en (dias)</label>
                            <input
                              type="number"
                              value={recordatorioDias}
                              onChange={(e) => setRecordatorioDias(parseInt(e.target.value) || 0)}
                              min={1}
                              className="w-32 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => setShowContactModal(false)}
                      className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleRegistrarContacto}
                      disabled={submitting || !resultadoContacto}
                      className="px-4 py-2 rounded-lg bg-mascotera-turquesa text-black font-medium hover:bg-mascotera-turquesa/80 disabled:opacity-50"
                    >
                      {submitting ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* Modal Reprogramar Recordatorio */}
            {showReprogramarModal && reprogramarCliente && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="glass rounded-2xl p-6 w-full max-w-sm mx-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-blue-400" />
                      Reprogramar Recordatorio
                    </h2>
                    <button onClick={() => setShowReprogramarModal(false)} className="text-gray-400 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mb-4 bg-gray-800/50 rounded-lg p-3">
                    <p className="text-white font-medium">{reprogramarCliente.cliente_nombre}</p>
                    {reprogramarCliente.recordatorio_motivo && (
                      <p className="text-purple-300 text-sm mt-1 flex items-center gap-1">
                        <Bell className="w-3 h-3" /> {reprogramarCliente.recordatorio_motivo}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Recordar nuevamente en (dias)</label>
                    <input
                      type="number"
                      value={reprogramarDias}
                      onChange={(e) => setReprogramarDias(parseInt(e.target.value) || 0)}
                      min={1}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => setShowReprogramarModal(false)}
                      className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleReprogramarRecordatorio}
                      disabled={reprogramarDias <= 0}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50"
                    >
                      Reprogramar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
