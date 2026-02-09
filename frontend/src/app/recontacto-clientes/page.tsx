'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  UserCheck,
  Upload,
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
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'
import { recontactosApi } from '@/lib/api'
import { getResumenRecontactosTodasDemo } from '@/lib/demo-data'

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
}

interface Resumen {
  total_clientes: number
  pendientes: number
  contactados_hoy: number
  contactados_semana: number
  recuperados: number
  no_interesados: number
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
  { value: 'telefono', label: 'Telefono', icon: Phone },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
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
      const isDemo = token?.startsWith('demo-token')

      if (isDemo) {
        setResumenTodas(getResumenRecontactosTodasDemo())
      } else {
        const data = await recontactosApi.resumenTodas(token!)
        setResumenTodas(data)
      }
    } catch (err) {
      console.error('Error loading resumen todas:', err)
    } finally {
      setLoadingTodas(false)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const isDemo = token?.startsWith('demo-token')

      if (isDemo) {
        setClientes([
          { id: 1, cliente_codigo: 'CLI001', cliente_nombre: 'Juan Perez', cliente_telefono: '3816123456', cliente_email: 'juan@email.com', mascota: 'Rocky', especie: 'Perro', tamano: 'Grande', marca_habitual: 'Royal Canin', ultimo_producto: 'Royal Canin Medium Adult 15kg', ultima_compra: '2024-01-15', dias_sin_comprar: 45, monto_ultima_compra: '$15.000', estado: 'pendiente', cantidad_contactos: 0, ultimo_contacto: null },
          { id: 2, cliente_codigo: 'CLI002', cliente_nombre: 'Maria Garcia', cliente_telefono: '3816789012', cliente_email: null, mascota: 'Luna', especie: 'Gato', tamano: 'Mediano', marca_habitual: 'Purina Pro Plan', ultimo_producto: 'Pro Plan Cat Adult 7.5kg', ultima_compra: '2024-01-10', dias_sin_comprar: 50, monto_ultima_compra: '$8.500', estado: 'contactado', cantidad_contactos: 2, ultimo_contacto: '2024-02-01T10:30:00' },
          { id: 3, cliente_codigo: 'CLI003', cliente_nombre: 'Carlos Lopez', cliente_telefono: '3815555555', cliente_email: 'carlos@email.com', mascota: 'Max', especie: 'Perro', tamano: 'Chico', marca_habitual: 'Eukanuba', ultimo_producto: 'Eukanuba Small Breed 3kg', ultima_compra: '2023-12-20', dias_sin_comprar: 70, monto_ultima_compra: '$22.000', estado: 'pendiente', cantidad_contactos: 1, ultimo_contacto: '2024-01-28T15:00:00' },
        ])
        setResumen({
          total_clientes: 3,
          pendientes: 2,
          contactados_hoy: 0,
          contactados_semana: 1,
          recuperados: 0,
          no_interesados: 0
        })
      } else {
        const [clientesData, resumenData] = await Promise.all([
          recontactosApi.list(token!, filtroEstado || undefined),
          recontactosApi.resumen(token!)
        ])
        setClientes(clientesData)
        setResumen(resumenData)
      }
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenContactModal = (cliente: Cliente) => {
    setSelectedCliente(cliente)
    setMedioContacto('telefono')
    setResultadoContacto('')
    setNotasContacto('')
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
      const isDemo = token?.startsWith('demo-token')
      if (isDemo) {
        setClientes(prev => prev.map(c =>
          c.id === selectedCliente.id
            ? {
                ...c,
                estado: resultadoContacto === 'interesado' ? 'recuperado' :
                        resultadoContacto === 'no_interesado' ? 'no_interesado' :
                        resultadoContacto === 'deceso' ? 'deceso' : 'contactado',
                cantidad_contactos: c.cantidad_contactos + 1,
                ultimo_contacto: new Date().toISOString()
              }
            : c
        ))
        setSuccess('Contacto registrado')
      } else {
        await recontactosApi.registrarContacto(token!, {
          cliente_recontacto_id: selectedCliente.id,
          medio: medioContacto,
          resultado: resultadoContacto,
          notas: notasContacto || undefined
        })
        setSuccess('Contacto registrado correctamente')
        loadData()
      }
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
      const isDemo = token?.startsWith('demo-token')

      if (isDemo) {
        const text = await file.text()
        const delimiter = text.slice(0, 500).includes(';') ? ';' : ','
        const lines = text.split('\n').filter(l => l.trim())
        const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase())

        const findCol = (names: string[]) => headers.findIndex(h => names.includes(h))
        const colNombre = findCol(['nombre', 'cliente', 'nombre del cliente'])
        const colTel = findCol(['telefono', 'teléfono', 'numero', 'número', 'tel'])
        const colMascota = findCol(['mascota', 'nombre mascota'])
        const colEspecie = findCol(['especie', 'tipo'])
        const colTamano = findCol(['tamaño', 'tamano', 'talla'])
        const colMarca = findCol(['marca habitual', 'marca', 'marca_habitual'])
        const colProducto = findCol(['ultimo producto', 'producto', 'ultimo_producto', 'último producto'])
        const colFecha = findCol(['ultima compra', 'ultima_compra', 'fecha'])
        const colDias = findCol(['dias sin comprar', 'dias_sin_comprar', 'dias'])
        const colMonto = findCol(['monto', 'monto_ultima_compra'])

        const nuevosClientes: Cliente[] = []
        let importados = 0
        const errores: string[] = []

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(delimiter).map(c => c.trim())
          const nombre = colNombre >= 0 ? cols[colNombre] : ''
          if (!nombre) {
            errores.push(`Fila ${i}: Nombre vacio`)
            continue
          }

          nuevosClientes.push({
            id: Date.now() + i,
            cliente_codigo: null,
            cliente_nombre: nombre,
            cliente_telefono: colTel >= 0 ? cols[colTel] || null : null,
            cliente_email: null,
            mascota: colMascota >= 0 ? cols[colMascota] || null : null,
            especie: colEspecie >= 0 ? cols[colEspecie] || null : null,
            tamano: colTamano >= 0 ? cols[colTamano] || null : null,
            marca_habitual: colMarca >= 0 ? cols[colMarca] || null : null,
            ultimo_producto: colProducto >= 0 ? cols[colProducto] || null : null,
            ultima_compra: colFecha >= 0 ? cols[colFecha] || null : null,
            dias_sin_comprar: colDias >= 0 ? parseInt(cols[colDias]) || null : null,
            monto_ultima_compra: colMonto >= 0 ? cols[colMonto] || null : null,
            estado: 'pendiente',
            cantidad_contactos: 0,
            ultimo_contacto: null
          })
          importados++
        }

        setClientes(prev => [...prev, ...nuevosClientes])
        setResumen(prev => prev ? {
          ...prev,
          total_clientes: prev.total_clientes + importados,
          pendientes: prev.pendientes + importados
        } : prev)
        setImportResult({ success: true, registros_importados: importados, registros_actualizados: 0, errores })
        setSuccess(`Se importaron ${importados} clientes del CSV`)
      } else {
        const result = await recontactosApi.importar(token!, file)
        setImportResult(result)
        if (result.success) {
          loadData()
        }
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
      default: return estado
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
          {!esEncargado && (
            <div className="flex gap-3">
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
            </div>
          )}
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
              <div className="grid grid-cols-5 gap-4 mb-6">
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
                          </div>
                          <div className="flex items-center gap-2">
                            {cliente.estado !== 'recuperado' && cliente.estado !== 'no_interesado' && cliente.estado !== 'deceso' && (
                              <button
                                onClick={() => handleOpenContactModal(cliente)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-mascotera-turquesa text-black text-sm font-medium hover:bg-mascotera-turquesa/80 transition-colors"
                              >
                                <Phone className="w-4 h-4" />
                                Registrar Contacto
                              </button>
                            )}
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
          </>
        )}
      </main>
    </div>
  )
}
