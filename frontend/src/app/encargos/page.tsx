'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Package,
  Plus,
  X,
  ChevronDown,
  Trash2,
  Search,
  Info,
  Truck,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'
import { encargosApi, itemsApi, clientesApi } from '@/lib/api'

const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente', color: 'yellow' },
  { value: 'pedido_proveedor', label: 'Pedido al proveedor', color: 'blue' },
  { value: 'sin_stock', label: 'Sin stock', color: 'orange' },
  { value: 'en_deposito_central', label: 'En depósito central/Alem', color: 'purple' },
  { value: 'en_sucursal_destino', label: 'En sucursal destino', color: 'cyan' },
  { value: 'vendido', label: 'Vendido', color: 'green' },
  { value: 'cancelado', label: 'Cancelado', color: 'red' },
]

const SUCURSALES = [
  { id: 7, nombre: 'ALEM' },
  { id: 8, nombre: 'ARENALES' },
  { id: 9, nombre: 'BANDA' },
  { id: 10, nombre: 'BELGRANO' },
  { id: 11, nombre: 'BELGRANO SUR' },
  { id: 12, nombre: 'CATAMARCA' },
  { id: 13, nombre: 'CONCEPCION' },
  { id: 14, nombre: 'CONGRESO' },
  { id: 16, nombre: 'LAPRIDA' },
  { id: 17, nombre: 'LEGUIZAMON' },
  { id: 18, nombre: 'MUÑECAS' },
  { id: 20, nombre: 'NEUQUEN OLASCOAGA' },
  { id: 21, nombre: 'PARQUE' },
  { id: 22, nombre: 'PINAR I' },
  { id: 26, nombre: 'YERBA BUENA' },
]

interface ProveedorInfo {
  nombre: string
  detalles: { destino: string; pedido: string; entrega: string; nota?: string }[]
}

const PROVEEDORES_INFO: ProveedorInfo[] = [
  {
    nombre: 'La Cabaña Central',
    detalles: [
      { destino: 'Ruta 9', pedido: 'Hasta el domingo', entrega: 'Lunes' },
      { destino: 'Congreso, Laprida y Alem', pedido: 'Un dia antes', entrega: 'Lunes, Miercoles y Viernes' },
      { destino: 'Yerba Buena', pedido: 'Un dia antes', entrega: 'Martes y Jueves' },
      { destino: 'Concepcion', pedido: '-', entrega: 'Retiran ellos cuando vienen a capital', nota: 'Coordinan retiro propio' },
      { destino: 'Pinar y Banda', pedido: 'Se pide para Ruta 9 o Alem', entrega: 'Segun punto de entrega' },
    ],
  },
  {
    nombre: 'Josmayo',
    detalles: [
      { destino: 'General', pedido: 'Cualquier dia', entrega: 'Al dia siguiente' },
      { destino: 'Belgrano Sur', pedido: 'Consultar con vendedor', entrega: 'Camion Lun/Mie o Jue/Vie, llega al dia siguiente' },
      { destino: 'Concepcion', pedido: 'Hasta miercoles antes de las 18:00', entrega: 'Jueves' },
      { destino: 'Ruta 9', pedido: 'Hasta el jueves', entrega: 'Viernes' },
    ],
  },
  {
    nombre: 'Frual',
    detalles: [
      { destino: 'General', pedido: 'Lunes hasta las 10:00', entrega: 'Martes' },
      { destino: 'General', pedido: 'Jueves hasta las 10:00', entrega: 'Viernes' },
    ],
  },
  {
    nombre: 'La Cabaña (Salta)',
    detalles: [
      { destino: 'General', pedido: 'Hasta viernes a las 16:00', entrega: 'Lunes y Martes' },
    ],
  },
  {
    nombre: 'Dimacol',
    detalles: [
      { destino: 'Ruta 9', pedido: 'Hasta el miercoles', entrega: 'Viernes' },
    ],
  },
  {
    nombre: 'Alcivet',
    detalles: [
      { destino: 'Alem', pedido: 'Durante la mañana', entrega: 'En el dia' },
      { destino: 'Alem', pedido: 'Despues del mediodia', entrega: 'Al dia siguiente' },
    ],
  },
  {
    nombre: 'Baza',
    detalles: [
      { destino: 'Alem', pedido: 'Lunes o Jueves', entrega: 'Al dia siguiente' },
    ],
  },
]

// ── Motor de reglas de entrega ──
interface DeliveryRule {
  proveedor: string
  sucursalIds: number[]      // vacío = todas ("General")
  diasEntrega: number[]      // 0=Dom, 1=Lun, ..., 6=Sab
  leadTimeDays: number
  orderDays: number[] | null // null = cualquier día
  orderCutoffHour: number | null
  manualOnly: boolean
  nota: string | null
}

const RUTA9_SUCURSALES = [10, 12, 18, 21] // Belgrano, Catamarca, Muñecas, Parque
const SUCURSALES_SIN_COBERTURA = [8, 11, 17, 20] // Arenales, Belgrano Sur, Leguizamón, Neuquén

const DELIVERY_RULES: DeliveryRule[] = [
  // La Cabaña Central
  { proveedor: 'La Cabaña Central', sucursalIds: [7, 14, 16], diasEntrega: [1, 3, 5], leadTimeDays: 1, orderDays: null, orderCutoffHour: null, manualOnly: false, nota: null },
  { proveedor: 'La Cabaña Central', sucursalIds: [26], diasEntrega: [2, 4], leadTimeDays: 1, orderDays: null, orderCutoffHour: null, manualOnly: false, nota: null },
  { proveedor: 'La Cabaña Central', sucursalIds: [13], diasEntrega: [], leadTimeDays: 0, orderDays: null, orderCutoffHour: null, manualOnly: true, nota: 'Coordinan retiro propio' },
  { proveedor: 'La Cabaña Central', sucursalIds: [22, 9], diasEntrega: [], leadTimeDays: 0, orderDays: null, orderCutoffHour: null, manualOnly: true, nota: 'Se pide para Ruta 9 o Alem' },
  { proveedor: 'La Cabaña Central', sucursalIds: RUTA9_SUCURSALES, diasEntrega: [1], leadTimeDays: 1, orderDays: [0], orderCutoffHour: null, manualOnly: false, nota: null },
  // Josmayo
  { proveedor: 'Josmayo', sucursalIds: [], diasEntrega: [], leadTimeDays: 1, orderDays: null, orderCutoffHour: null, manualOnly: false, nota: null }, // General: día siguiente
  { proveedor: 'Josmayo', sucursalIds: [11], diasEntrega: [], leadTimeDays: 0, orderDays: null, orderCutoffHour: null, manualOnly: true, nota: 'Consultar con vendedor' },
  { proveedor: 'Josmayo', sucursalIds: [13], diasEntrega: [4], leadTimeDays: 1, orderDays: [3], orderCutoffHour: 18, manualOnly: false, nota: null },
  { proveedor: 'Josmayo', sucursalIds: RUTA9_SUCURSALES, diasEntrega: [5], leadTimeDays: 1, orderDays: [4], orderCutoffHour: null, manualOnly: false, nota: null },
  // Frual
  { proveedor: 'Frual', sucursalIds: [], diasEntrega: [2], leadTimeDays: 1, orderDays: [1], orderCutoffHour: 10, manualOnly: false, nota: null },
  { proveedor: 'Frual', sucursalIds: [], diasEntrega: [5], leadTimeDays: 1, orderDays: [4], orderCutoffHour: 10, manualOnly: false, nota: null },
  // La Cabaña (Salta)
  { proveedor: 'La Cabaña (Salta)', sucursalIds: [], diasEntrega: [1, 2], leadTimeDays: 3, orderDays: [5], orderCutoffHour: 16, manualOnly: false, nota: null },
  // Dimacol
  { proveedor: 'Dimacol', sucursalIds: RUTA9_SUCURSALES, diasEntrega: [5], leadTimeDays: 2, orderDays: [3], orderCutoffHour: null, manualOnly: false, nota: null },
  // Alcivet
  { proveedor: 'Alcivet', sucursalIds: [7], diasEntrega: [], leadTimeDays: 0, orderDays: null, orderCutoffHour: 12, manualOnly: false, nota: 'Pedido durante la mañana: entrega en el día' },
  { proveedor: 'Alcivet', sucursalIds: [7], diasEntrega: [], leadTimeDays: 1, orderDays: null, orderCutoffHour: null, manualOnly: false, nota: 'Pedido después del mediodía: entrega al día siguiente' },
  // Baza
  { proveedor: 'Baza', sucursalIds: [7], diasEntrega: [], leadTimeDays: 1, orderDays: [1, 4], orderCutoffHour: null, manualOnly: false, nota: null },
]

const PROVEEDOR_NOMBRES = Array.from(new Set(DELIVERY_RULES.map(r => r.proveedor)))

function getEarliestDelivery(proveedor: string, sucursalId: number): { date: Date | null; manual: boolean; nota: string | null; enRuta9: boolean } {
  // Buscar reglas específicas para esta sucursal
  let rules = DELIVERY_RULES.filter(r => r.proveedor === proveedor && r.sucursalIds.includes(sucursalId))

  // Si no hay reglas específicas, buscar "General" (sucursalIds vacío)
  const enRuta9 = rules.length === 0 && SUCURSALES_SIN_COBERTURA.includes(sucursalId)
  if (rules.length === 0) {
    rules = DELIVERY_RULES.filter(r => r.proveedor === proveedor && r.sucursalIds.length === 0)
  }

  if (rules.length === 0) return { date: null, manual: false, nota: null, enRuta9 }

  // Si alguna regla es manual, retornar manual
  const manualRule = rules.find(r => r.manualOnly)
  if (manualRule) return { date: null, manual: true, nota: manualRule.nota, enRuta9 }

  const now = new Date()
  let earliest: Date | null = null

  for (const rule of rules) {
    // Encontrar el próximo día de pedido válido
    for (let offset = 0; offset < 14; offset++) {
      const candidateOrder = new Date(now)
      candidateOrder.setDate(candidateOrder.getDate() + offset)
      const dayOfWeek = candidateOrder.getDay()

      // Verificar si es día válido de pedido
      if (rule.orderDays && !rule.orderDays.includes(dayOfWeek)) continue

      // Verificar hora límite (solo aplica para hoy)
      if (offset === 0 && rule.orderCutoffHour !== null && now.getHours() >= rule.orderCutoffHour) continue

      // Calcular fecha de entrega
      let deliveryDate = new Date(candidateOrder)
      deliveryDate.setDate(deliveryDate.getDate() + rule.leadTimeDays)

      // Si hay días de entrega específicos, avanzar al próximo día válido
      if (rule.diasEntrega.length > 0) {
        for (let d = 0; d < 14; d++) {
          if (rule.diasEntrega.includes(deliveryDate.getDay())) break
          deliveryDate.setDate(deliveryDate.getDate() + 1)
        }
      }

      if (!earliest || deliveryDate < earliest) {
        earliest = deliveryDate
      }
      break // Ya encontramos el próximo pedido válido para esta regla
    }
  }

  return { date: earliest, manual: false, nota: null, enRuta9 }
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function EncargosPage() {
  const router = useRouter()
  const { token, user, isAuthenticated, isLoading } = useAuthStore()
  const [tab, setTab] = useState<'encargos' | 'info'>('encargos')
  const [encargos, setEncargos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<string>('')
  const [filtroSucursal, setFiltroSucursal] = useState<number | undefined>(undefined)

  // Admin check
  const esAdminSuperior = (() => {
    const rolesAltos = ['gerente', 'gerencia', 'supervisor', 'jefe', 'auditor', 'encargado superior']
    const excluir = ['encargado de local', 'encargado de ventas', 'encargado de sucursal', 'administrativo']
    const userRol = (user?.rol || '').toLowerCase()
    const userPuesto = (user?.puesto || '').toLowerCase()
    if (excluir.some(e => userRol.includes(e) || userPuesto.includes(e))) return false
    if (userRol === 'admin' || userPuesto === 'admin') return true
    return rolesAltos.some(r => userRol.includes(r) || userPuesto.includes(r))
  })()

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [productoNombre, setProductoNombre] = useState('')
  const [productoCodigo, setProductoCodigo] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [fechaNecesaria, setFechaNecesaria] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [clienteEmail, setClienteEmail] = useState('')
  const [clienteId, setClienteId] = useState<number | undefined>(undefined)
  const [clienteQuery, setClienteQuery] = useState('')
  const [clienteResults, setClienteResults] = useState<any[]>([])
  const [showClienteResults, setShowClienteResults] = useState(false)
  const [searchingCliente, setSearchingCliente] = useState(false)
  const [formSucursalId, setFormSucursalId] = useState<number | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)
  const [proveedorNombre, setProveedorNombre] = useState('')

  // Delivery validation
  const activeSucursalId = esAdminSuperior ? formSucursalId : user?.sucursal_id
  const deliveryInfo = proveedorNombre
    ? getEarliestDelivery(proveedorNombre, activeSucursalId || 0)
    : null
  const fechaInvalida = (() => {
    if (!deliveryInfo?.date || !fechaNecesaria) return false
    const needed = new Date(fechaNecesaria + 'T00:00:00')
    const earliest = new Date(deliveryInfo.date)
    earliest.setHours(0, 0, 0, 0)
    return needed < earliest
  })()

  // Buscador de productos
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [productoManual, setProductoManual] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  const loadEncargos = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await encargosApi.listar(token, filtroEstado || undefined, filtroSucursal)
      setEncargos(data)
    } catch (err) {
      console.error('Error cargando encargos:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) loadEncargos()
  }, [token, filtroEstado, filtroSucursal])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    setProductoManual(false)
    if (query.length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }
    setSearching(true)
    setShowResults(true)
    try {
      const results = await itemsApi.search(token!, query)
      setSearchResults(results)
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const selectProduct = (item: any) => {
    setProductoNombre(item.item || item.nombre)
    setProductoCodigo(item.cod_item || '')
    setSearchQuery(item.item || item.nombre)
    setShowResults(false)
    setProductoManual(false)
  }

  const useManualName = () => {
    setProductoNombre(searchQuery.trim())
    setProductoCodigo('')
    setShowResults(false)
    setProductoManual(true)
  }

  const handleClienteSearch = async (query: string) => {
    setClienteQuery(query)
    setClienteId(undefined)
    setClienteNombre(query)
    setClienteTelefono('')
    setClienteEmail('')
    if (query.length < 2) {
      setClienteResults([])
      setShowClienteResults(false)
      return
    }
    setSearchingCliente(true)
    setShowClienteResults(true)
    try {
      const results = await clientesApi.buscar(token!, query)
      setClienteResults(results)
    } catch {
      setClienteResults([])
    } finally {
      setSearchingCliente(false)
    }
  }

  const selectCliente = (c: any) => {
    setClienteId(c.id)
    setClienteNombre(c.nombre)
    setClienteTelefono(c.telefono)
    setClienteEmail(c.email || '')
    setClienteQuery(c.nombre)
    setShowClienteResults(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !productoNombre.trim() || !proveedorNombre) return
    if (esAdminSuperior && !formSucursalId) return
    if (fechaInvalida) return
    setSubmitting(true)
    try {
      await encargosApi.crear(token, {
        producto_nombre: productoNombre.trim(),
        producto_codigo: productoCodigo.trim() || undefined,
        cantidad,
        fecha_necesaria: fechaNecesaria ? new Date(fechaNecesaria).toISOString() : undefined,
        observaciones: observaciones.trim() || undefined,
        cliente_id: clienteId,
        cliente_nombre: clienteNombre.trim() || undefined,
        cliente_telefono: clienteTelefono.trim() || undefined,
        cliente_email: clienteEmail.trim() || undefined,
        sucursal_id: esAdminSuperior ? formSucursalId : undefined,
        proveedor_nombre: proveedorNombre || undefined,
      })
      setProductoNombre('')
      setProductoCodigo('')
      setSearchQuery('')
      setCantidad(1)
      setFechaNecesaria('')
      setObservaciones('')
      setClienteNombre('')
      setClienteTelefono('')
      setClienteEmail('')
      setClienteId(undefined)
      setClienteQuery('')
      setFormSucursalId(undefined)
      setProveedorNombre('')
      setShowForm(false)
      setProductoManual(false)
      loadEncargos()
    } catch (err) {
      console.error('Error creando encargo:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEstadoChange = async (id: number, nuevoEstado: string) => {
    if (!token) return
    try {
      await encargosApi.actualizar(token, id, { estado: nuevoEstado })
      loadEncargos()
    } catch (err) {
      console.error('Error actualizando encargo:', err)
    }
  }

  const handleEliminar = async (id: number) => {
    if (!token || !confirm('¿Eliminar este encargo?')) return
    try {
      await encargosApi.eliminar(token, id)
      loadEncargos()
    } catch (err) {
      console.error('Error eliminando encargo:', err)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mascotera-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-mascotera-turquesa"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mascotera-dark flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-mascotera-turquesa/20 flex items-center justify-center">
              <Package className="w-6 h-6 text-mascotera-turquesa" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Encargos</h1>
              <p className="text-gray-400 text-sm">Gestión de productos por encargo</p>
            </div>
          </div>
          {tab === 'encargos' && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mascotera-turquesa text-black font-medium hover:bg-mascotera-turquesa/80 transition-all"
            >
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? 'Cancelar' : 'Nuevo Encargo'}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-800/30 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab('encargos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'encargos'
                ? 'bg-mascotera-turquesa/20 text-mascotera-turquesa'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            Encargos
          </button>
          <button
            onClick={() => setTab('info')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'info'
                ? 'bg-mascotera-turquesa/20 text-mascotera-turquesa'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Info className="w-4 h-4" />
            Proveedores y Entregas
          </button>
        </div>

        {/* Tab: Info Proveedores */}
        {tab === 'info' && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
              <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-blue-300/80 text-sm">
                Dias de pedido y entrega de cada proveedor. Tene en cuenta los horarios limite para que tu pedido llegue a tiempo.
              </p>
            </div>

            {PROVEEDORES_INFO.map((prov) => (
              <div key={prov.nombre} className="glass rounded-xl border border-gray-800 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-800 bg-gray-800/30">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <Truck className="w-4 h-4 text-mascotera-turquesa" />
                    {prov.nombre}
                  </h3>
                </div>
                <div className="divide-y divide-gray-800/50">
                  {prov.detalles.map((d, i) => (
                    <div key={i} className="px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                      <span className="text-mascotera-amarillo text-sm font-medium min-w-[140px]">{d.destino}</span>
                      <span className="flex items-center gap-1.5 text-gray-400 text-sm">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        Pedido: <span className="text-gray-200">{d.pedido}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-gray-400 text-sm">
                        <Truck className="w-3.5 h-3.5 text-green-400" />
                        Entrega: <span className="text-gray-200">{d.entrega}</span>
                      </span>
                      {d.nota && (
                        <span className="flex items-center gap-1.5 text-yellow-400/70 text-xs">
                          <AlertTriangle className="w-3 h-3" />
                          {d.nota}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Encargos */}
        {tab === 'encargos' && <>
        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="glass rounded-xl p-6 mb-6 border border-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Sucursal (solo admins) */}
              {esAdminSuperior && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Sucursal *</label>
                  <select
                    value={formSucursalId || ''}
                    onChange={e => setFormSucursalId(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-mascotera-turquesa"
                    required
                  >
                    <option value="">Seleccionar sucursal</option>
                    {SUCURSALES.map(s => (
                      <option key={s.id} value={s.id} className="bg-gray-900">{s.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Producto con buscador */}
              <div className="relative">
                <label className="block text-sm text-gray-400 mb-1">Producto *</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => handleSearch(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowResults(true)}
                    onBlur={() => setTimeout(() => setShowResults(false), 200)}
                    placeholder="Buscar producto..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-mascotera-turquesa"
                  />
                </div>
                {productoNombre && (
                  <p className="mt-1 text-xs text-mascotera-turquesa">
                    Seleccionado: {productoNombre}{productoCodigo ? ` (${productoCodigo})` : ''}
                  </p>
                )}
                {showResults && (
                  <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg max-h-60 overflow-y-auto shadow-xl">
                    {searching ? (
                      <div className="p-3 text-center text-gray-400 text-sm">Buscando...</div>
                    ) : searchResults.length > 0 ? (
                      <>
                        {searchResults.map((item, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => selectProduct(item)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors border-b border-gray-800/50 last:border-0"
                          >
                            {item.cod_item && (
                              <span className="text-mascotera-turquesa text-xs font-mono mr-2">{item.cod_item}</span>
                            )}
                            <span className="text-white text-sm">{item.item}</span>
                            {item.marca_nombre && (
                              <span className="text-gray-500 text-xs ml-2">({item.marca_nombre})</span>
                            )}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={useManualName}
                          className="w-full text-left px-4 py-2 text-yellow-400 hover:bg-gray-800 transition-colors text-sm border-t border-gray-700"
                        >
                          No lo encuentro, usar &quot;{searchQuery}&quot;
                        </button>
                      </>
                    ) : searchQuery.length >= 2 ? (
                      <div>
                        <div className="p-3 text-center text-gray-400 text-sm">No se encontraron productos</div>
                        <button
                          type="button"
                          onClick={useManualName}
                          className="w-full text-left px-4 py-2 text-yellow-400 hover:bg-gray-800 transition-colors text-sm border-t border-gray-700"
                        >
                          Usar &quot;{searchQuery}&quot; como nombre
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Código de producto */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Código de producto</label>
                <input
                  type="text"
                  value={productoCodigo}
                  onChange={e => setProductoCodigo(e.target.value)}
                  placeholder="Ej: 01234"
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-mascotera-turquesa font-mono"
                />
              </div>

              {/* Cliente con buscador */}
              <div className="relative">
                <label className="block text-sm text-gray-400 mb-1">Cliente</label>
                <input
                  type="text"
                  value={clienteQuery}
                  onChange={e => handleClienteSearch(e.target.value)}
                  onFocus={() => clienteResults.length > 0 && setShowClienteResults(true)}
                  onBlur={() => setTimeout(() => setShowClienteResults(false), 200)}
                  placeholder="Buscar cliente por nombre o tel..."
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-mascotera-turquesa"
                />
                {clienteId && (
                  <p className="mt-1 text-xs text-mascotera-turquesa">Cliente existente: {clienteNombre}</p>
                )}
                {showClienteResults && (
                  <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg max-h-48 overflow-y-auto shadow-xl">
                    {searchingCliente ? (
                      <div className="p-3 text-center text-gray-400 text-sm">Buscando...</div>
                    ) : clienteResults.length > 0 ? (
                      clienteResults.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectCliente(c)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors border-b border-gray-800/50 last:border-0"
                        >
                          <span className="text-white text-sm">{c.nombre}</span>
                          <span className="text-gray-500 text-xs ml-2">({c.telefono})</span>
                        </button>
                      ))
                    ) : clienteQuery.length >= 2 ? (
                      <button
                        type="button"
                        onClick={() => setShowClienteResults(false)}
                        className="w-full p-3 text-center text-gray-400 text-sm hover:bg-gray-800 transition-colors"
                      >
                        Cliente nuevo - completar tel. abajo
                      </button>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Teléfono cliente */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Teléfono cliente *</label>
                <input
                  type="text"
                  value={clienteTelefono}
                  onChange={e => setClienteTelefono(e.target.value)}
                  placeholder="Ej: 381-4001234"
                  disabled={!!clienteId}
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-mascotera-turquesa disabled:opacity-50"
                />
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Cantidad</label>
                <input
                  type="number"
                  min={1}
                  value={cantidad}
                  onChange={e => setCantidad(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-mascotera-turquesa"
                />
              </div>

              {/* Proveedor */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Proveedor *</label>
                <select
                  value={proveedorNombre}
                  onChange={e => setProveedorNombre(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-mascotera-turquesa"
                  required
                >
                  <option value="">Seleccionar proveedor</option>
                  {PROVEEDOR_NOMBRES.map(p => (
                    <option key={p} value={p} className="bg-gray-900">{p}</option>
                  ))}
                </select>
                {deliveryInfo && !deliveryInfo.manual && deliveryInfo.date && (
                  <p className="mt-1 text-xs text-green-400">
                    Entrega más temprana: {formatDateShort(deliveryInfo.date)}
                    {deliveryInfo.enRuta9 && ' (en Ruta 9)'}
                  </p>
                )}
                {deliveryInfo?.manual && (
                  <p className="mt-1 text-xs text-yellow-400">
                    {deliveryInfo.nota || 'Entrega se coordina manualmente'}
                  </p>
                )}
                {deliveryInfo && !deliveryInfo.manual && !deliveryInfo.date && (
                  <p className="mt-1 text-xs text-red-400">
                    Este proveedor no entrega a esta sucursal
                  </p>
                )}
                {deliveryInfo?.enRuta9 && !deliveryInfo.manual && (
                  <p className="mt-1 text-xs text-blue-400">
                    Entrega en Ruta 9 — luego se redistribuye
                  </p>
                )}
              </div>

              {/* Fecha necesaria */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Fecha necesaria para el cliente</label>
                <input
                  type="date"
                  value={fechaNecesaria}
                  onChange={e => setFechaNecesaria(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg bg-gray-800/50 border text-white focus:outline-none focus:border-mascotera-turquesa ${fechaInvalida ? 'border-red-500' : 'border-gray-700'}`}
                />
                {fechaInvalida && deliveryInfo?.date && (
                  <p className="mt-1 text-xs text-red-400">
                    No se puede entregar antes del {formatDateShort(deliveryInfo.date)}
                  </p>
                )}
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Observaciones</label>
                <input
                  type="text"
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  placeholder="Notas adicionales..."
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-mascotera-turquesa"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={submitting || !productoNombre.trim() || !proveedorNombre || (esAdminSuperior && !formSucursalId) || fechaInvalida}
                className="px-6 py-2 rounded-lg bg-mascotera-turquesa text-black font-medium hover:bg-mascotera-turquesa/80 transition-all disabled:opacity-50"
              >
                {submitting ? 'Guardando...' : 'Guardar Encargo'}
              </button>
            </div>
          </form>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Filtro sucursal (admins) */}
          {esAdminSuperior && (
            <select
              value={filtroSucursal || ''}
              onChange={e => setFiltroSucursal(e.target.value ? parseInt(e.target.value) : undefined)}
              className="px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700 text-sm text-white focus:outline-none focus:border-mascotera-turquesa"
            >
              <option value="">Todas las sucursales</option>
              {SUCURSALES.map(s => (
                <option key={s.id} value={s.id} className="bg-gray-900">{s.nombre}</option>
              ))}
            </select>
          )}

          {/* Filtro estado */}
          <div className="flex gap-2">
            <button
              onClick={() => setFiltroEstado('')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                !filtroEstado ? 'bg-mascotera-turquesa/20 text-mascotera-turquesa border border-mascotera-turquesa/30' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              Todos
            </button>
            {ESTADOS.map(e => (
              <button
                key={e.value}
                onClick={() => setFiltroEstado(e.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filtroEstado === e.value ? 'bg-mascotera-turquesa/20 text-mascotera-turquesa border border-mascotera-turquesa/30' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla */}
        <div className="glass rounded-xl border border-gray-800 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-mascotera-turquesa mx-auto"></div>
            </div>
          ) : encargos.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay encargos registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 text-left">
                    {esAdminSuperior && (
                      <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Sucursal</th>
                    )}
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Código</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Producto</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Proveedor</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Cliente</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Cant.</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Vendedor</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">F. Encargo</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">F. Necesaria</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Estado</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Obs.</th>
                    {esAdminSuperior && (
                      <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase w-10"></th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {encargos.map(enc => (
                    <tr key={enc.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                      {esAdminSuperior && (
                        <td className="px-4 py-3 text-mascotera-turquesa text-sm font-medium">{enc.sucursal_nombre || '-'}</td>
                      )}
                      <td className="px-4 py-3 text-mascotera-turquesa font-mono text-sm">{enc.producto_codigo || '-'}</td>
                      <td className="px-4 py-3 text-white font-medium">{enc.producto_nombre}</td>
                      <td className="px-4 py-3 text-purple-300 text-sm">{enc.proveedor_nombre || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="text-gray-300">{enc.cliente_nombre || '-'}</div>
                        {enc.cliente_telefono && <div className="text-gray-500 text-xs">{enc.cliente_telefono}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{enc.cantidad}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm">{enc.employee_nombre || '-'}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm">{formatDate(enc.fecha_encargo)}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm">{formatDate(enc.fecha_necesaria)}</td>
                      <td className="px-4 py-3">
                        <div className="relative inline-block">
                          <select
                            value={enc.estado}
                            onChange={e => handleEstadoChange(enc.id, e.target.value)}
                            className="appearance-none bg-transparent border border-gray-700 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:border-mascotera-turquesa cursor-pointer pr-7"
                          >
                            {ESTADOS.map(e => (
                              <option key={e.value} value={e.value} className="bg-gray-900">
                                {e.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm max-w-[200px] truncate">
                        {enc.observaciones || '-'}
                      </td>
                      {esAdminSuperior && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleEliminar(enc.id)}
                            className="text-gray-500 hover:text-red-400 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>}
      </main>
    </div>
  )
}
