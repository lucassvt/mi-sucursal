'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  Plus,
  Search,
  Trash2,
  AlertCircle,
  Check,
  X,
  Tag,
  Percent,
  DollarSign,
  Archive,
  Send,
  Edit3,
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'
import { vencimientosApi, itemsApi } from '@/lib/api'
import { getSucursalesDemo } from '@/lib/demo-data'

// Opciones de acción comercial
const ACCIONES_COMERCIALES = [
  { value: 'descuento', label: 'Descuento', icon: '💰' },
  { value: 'promocion', label: 'Promoción (2x1, combo)', icon: '🎁' },
  { value: 'devolucion', label: 'Devolución a proveedor', icon: '↩️' },
  { value: 'destruccion', label: 'Destrucción/Descarte', icon: '🗑️' },
  { value: 'donacion', label: 'Donación', icon: '❤️' },
  { value: 'consumo_interno', label: 'Consumo interno/Muestras', icon: '🏠' },
  { value: 'rotacion', label: 'Mover a otra sucursal', icon: '🔄' },
]

// Interfaces
interface Vencimiento {
  id: number
  sucursal_id: number
  employee_id: number | null
  cod_item: string | null
  producto: string
  cantidad: number
  fecha_vencimiento: string
  fecha_registro: string
  estado: 'proximo' | 'vencido' | 'retirado' | 'vendido' | 'enviado' | 'archivado'
  fecha_retiro: string | null
  notas: string | null
  importado: boolean
  dias_para_vencer: number | null
  // Valorización
  precio_unitario: number | null
  valor_total: number | null
  // Acción comercial
  tiene_accion_comercial: boolean
  accion_comercial: string | null
  porcentaje_descuento: number | null
  // Rotación entre sucursales
  sucursal_destino_id: number | null
  sucursal_destino_nombre: string | null
  fecha_movimiento: string | null
}

interface Resumen {
  total_registros: number
  por_vencer_semana: number
  por_vencer_mes: number
  vencidos: number
  retirados: number
  archivados: number
  por_estado: Record<string, number>
  valor_total_vencidos: number
  valor_total_proximos: number
}

// Demo data
const diasAtras = (dias: number) =>
  new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
const diasAdelante = (dias: number) =>
  new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

const getVencimientosDemo = (): Vencimiento[] => [
  {
    id: 1,
    sucursal_id: 1,
    employee_id: 5,
    cod_item: 'ALIM001',
    producto: 'Royal Canin Medium Adult 15kg',
    cantidad: 3,
    fecha_vencimiento: diasAdelante(5),
    fecha_registro: diasAtras(10),
    estado: 'proximo',
    fecha_retiro: null,
    notas: null,
    importado: false,
    dias_para_vencer: 5,
    precio_unitario: 45000,
    valor_total: 135000,
    tiene_accion_comercial: true,
    accion_comercial: 'descuento',
    porcentaje_descuento: 20,
    sucursal_destino_id: null,
    sucursal_destino_nombre: null,
    fecha_movimiento: null,
  },
  {
    id: 2,
    sucursal_id: 1,
    employee_id: 5,
    cod_item: 'ALIM003',
    producto: 'Eukanuba Large Breed 15kg',
    cantidad: 2,
    fecha_vencimiento: diasAdelante(3),
    fecha_registro: diasAtras(15),
    estado: 'proximo',
    fecha_retiro: null,
    notas: 'Revisar estado del empaque',
    importado: true,
    dias_para_vencer: 3,
    precio_unitario: 52000,
    valor_total: 104000,
    tiene_accion_comercial: true,
    accion_comercial: 'promocion',
    porcentaje_descuento: null,
    sucursal_destino_id: null,
    sucursal_destino_nombre: null,
    fecha_movimiento: null,
  },
  {
    id: 3,
    sucursal_id: 1,
    employee_id: 6,
    cod_item: 'ACC005',
    producto: 'Snack dental Pedigree x10',
    cantidad: 5,
    fecha_vencimiento: diasAtras(2),
    fecha_registro: diasAtras(30),
    estado: 'vencido',
    fecha_retiro: null,
    notas: null,
    importado: false,
    dias_para_vencer: -2,
    precio_unitario: 3500,
    valor_total: 17500,
    tiene_accion_comercial: false,
    accion_comercial: null,
    porcentaje_descuento: null,
    sucursal_destino_id: null,
    sucursal_destino_nombre: null,
    fecha_movimiento: null,
  },
  {
    id: 4,
    sucursal_id: 1,
    employee_id: 5,
    cod_item: 'ALIM008',
    producto: 'Dog Chow Adulto 21kg',
    cantidad: 1,
    fecha_vencimiento: diasAtras(5),
    fecha_registro: diasAtras(20),
    estado: 'retirado',
    fecha_retiro: diasAtras(3),
    notas: 'Movido a Laprida por mejor rotacion',
    importado: false,
    dias_para_vencer: -5,
    precio_unitario: 28000,
    valor_total: 28000,
    tiene_accion_comercial: true,
    accion_comercial: 'rotacion',
    porcentaje_descuento: null,
    sucursal_destino_id: 3,
    sucursal_destino_nombre: 'LAPRIDA',
    fecha_movimiento: diasAtras(3),
  },
  {
    id: 5,
    sucursal_id: 1,
    employee_id: 5,
    cod_item: 'MED001',
    producto: 'Antiparasitario Frontline Plus',
    cantidad: 8,
    fecha_vencimiento: diasAdelante(15),
    fecha_registro: diasAtras(5),
    estado: 'proximo',
    fecha_retiro: null,
    notas: null,
    importado: true,
    dias_para_vencer: 15,
    precio_unitario: 15000,
    valor_total: 120000,
    tiene_accion_comercial: false,
    accion_comercial: null,
    porcentaje_descuento: null,
    sucursal_destino_id: null,
    sucursal_destino_nombre: null,
    fecha_movimiento: null,
  },
]

const getResumenDemo = (): Resumen => ({
  total_registros: 5,
  por_vencer_semana: 2,
  por_vencer_mes: 3,
  vencidos: 1,
  retirados: 1,
  archivados: 0,
  por_estado: { proximo: 3, vencido: 1, retirado: 1 },
  valor_total_vencidos: 17500,
  valor_total_proximos: 359000,
})

const getItemsBuscablesDemo = (query: string) => {
  const items = [
    { cod_item: 'ALIM001', item: 'Royal Canin Medium Adult 15kg', marca_nombre: 'Royal Canin', costo: 45000 },
    { cod_item: 'ALIM003', item: 'Eukanuba Large Breed 15kg', marca_nombre: 'Eukanuba', costo: 52000 },
    { cod_item: 'ALIM008', item: 'Dog Chow Adulto 21kg', marca_nombre: 'Purina', costo: 28000 },
    { cod_item: 'MED001', item: 'Antiparasitario Frontline Plus', marca_nombre: 'Merial', costo: 15000 },
    { cod_item: 'ACC005', item: 'Snack dental Pedigree x10', marca_nombre: 'Pedigree', costo: 3500 },
  ]
  const q = query.toLowerCase()
  return items.filter(i =>
    i.item.toLowerCase().includes(q) ||
    i.cod_item.toLowerCase().includes(q) ||
    i.marca_nombre.toLowerCase().includes(q)
  )
}

export default function VencimientosPage() {
  const router = useRouter()
  const { token, user, isAuthenticated, isLoading } = useAuthStore()
  const [vencimientos, setVencimientos] = useState<Vencimiento[]>([])
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<string>('')

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [productoManual, setProductoManual] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [notas, setNotas] = useState('')
  // Acción comercial
  const [tieneAccionComercial, setTieneAccionComercial] = useState(false)
  const [accionComercial, setAccionComercial] = useState('')
  const [porcentajeDescuento, setPorcentajeDescuento] = useState<number | ''>('')
  // Rotación entre sucursales
  const [sucursalDestinoId, setSucursalDestinoId] = useState<number | ''>('')
  const [sucursalDestinoNombre, setSucursalDestinoNombre] = useState('')
  const [fechaMovimiento, setFechaMovimiento] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Inline edit state
  const [mostrarArchivados, setMostrarArchivados] = useState(false)
  const [editingDiscountId, setEditingDiscountId] = useState<number | null>(null)
  const [editDiscountValue, setEditDiscountValue] = useState<string>('')
  const [sendingToSucursalId, setSendingToSucursalId] = useState<number | null>(null)
  const [selectedSucursalDestino, setSelectedSucursalDestino] = useState<string>('')
  const [selectedSucursalDestinoNombre, setSelectedSucursalDestinoNombre] = useState('')

  const isDemo = token?.startsWith('demo-token')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (token) {
      loadData()
    }
  }, [token, filtroEstado, mostrarArchivados])

  const loadData = async () => {
    try {
      if (isDemo) {
        let data = getVencimientosDemo()
        if (filtroEstado) {
          data = data.filter(v => v.estado === filtroEstado)
        } else if (!mostrarArchivados) {
          data = data.filter(v => v.estado !== 'archivado')
        }
        setVencimientos(data)
        setResumen(getResumenDemo())
      } else {
        const [vencimientosData, resumenData] = await Promise.all([
          vencimientosApi.list(token!, filtroEstado || undefined, mostrarArchivados),
          vencimientosApi.resumen(token!),
        ])
        setVencimientos(vencimientosData)
        setResumen(resumenData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (searchQuery.length < 2) return
    setSearching(true)
    try {
      if (isDemo) {
        const results = getItemsBuscablesDemo(searchQuery)
        setSearchResults(results)
      } else {
        const results = await itemsApi.search(token!, searchQuery)
        setSearchResults(results)
      }
    } catch (error) {
      console.error('Error searching:', error)
    } finally {
      setSearching(false)
    }
  }

  const selectItem = (item: any) => {
    setSelectedItem(item)
    setProductoManual(item.item)
    setSearchResults([])
    setSearchQuery('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fechaVencimiento) {
      setError('Fecha de vencimiento es requerida')
      return
    }
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      const producto = selectedItem ? selectedItem.item : productoManual

      if (isDemo) {
        const nuevoVencimiento: Vencimiento = {
          id: Date.now(),
          sucursal_id: 1,
          employee_id: 5,
          cod_item: selectedItem?.cod_item || null,
          producto,
          cantidad,
          fecha_vencimiento: fechaVencimiento,
          fecha_registro: new Date().toISOString(),
          estado: new Date(fechaVencimiento) < new Date() ? 'vencido' : 'proximo',
          fecha_retiro: null,
          notas: notas || null,
          importado: false,
          dias_para_vencer: Math.ceil((new Date(fechaVencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          precio_unitario: selectedItem?.costo || null,
          valor_total: selectedItem?.costo ? selectedItem.costo * cantidad : null,
          tiene_accion_comercial: tieneAccionComercial,
          accion_comercial: tieneAccionComercial ? accionComercial || null : null,
          porcentaje_descuento: tieneAccionComercial && accionComercial === 'descuento' ? (porcentajeDescuento || null) as number | null : null,
          sucursal_destino_id: accionComercial === 'rotacion' && sucursalDestinoId ? sucursalDestinoId as number : null,
          sucursal_destino_nombre: accionComercial === 'rotacion' ? sucursalDestinoNombre || null : null,
          fecha_movimiento: accionComercial === 'rotacion' ? fechaMovimiento || null : null,
        }
        setVencimientos(prev => [nuevoVencimiento, ...prev])
        setResumen(prev => prev ? {
          ...prev,
          total_registros: prev.total_registros + 1,
          por_vencer_mes: prev.por_vencer_mes + 1,
        } : prev)
        setSuccess('Vencimiento registrado correctamente (modo demo)')
        resetForm()
      } else {
        await vencimientosApi.create(token!, {
          cod_item: selectedItem?.cod_item || null,
          producto,
          cantidad,
          fecha_vencimiento: fechaVencimiento,
          notas: notas || null,
          precio_unitario: selectedItem?.costo || null,
          tiene_accion_comercial: tieneAccionComercial,
          accion_comercial: tieneAccionComercial ? accionComercial || null : null,
          porcentaje_descuento: tieneAccionComercial && accionComercial === 'descuento' ? (porcentajeDescuento || null) : null,
          sucursal_destino_id: accionComercial === 'rotacion' && sucursalDestinoId ? sucursalDestinoId : null,
          sucursal_destino_nombre: accionComercial === 'rotacion' ? sucursalDestinoNombre || null : null,
          fecha_movimiento: accionComercial === 'rotacion' ? fechaMovimiento || null : null,
        })
        setSuccess('Vencimiento registrado correctamente')
        resetForm()
        loadData()
      }
    } catch (err: any) {
      setError(err.message || 'Error al registrar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateEstado = async (id: number, nuevoEstado: string) => {
    try {
      if (isDemo) {
        setVencimientos(prev => prev.map(v =>
          v.id === id ? { ...v, estado: nuevoEstado as any } : v
        ))
      } else {
        await vencimientosApi.update(token!, id, { estado: nuevoEstado })
        loadData()
      }
    } catch (error) {
      console.error('Error updating:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este registro?')) return
    try {
      if (isDemo) {
        setVencimientos(prev => prev.filter(v => v.id !== id))
      } else {
        await vencimientosApi.delete(token!, id)
        loadData()
      }
    } catch (error) {
      console.error('Error deleting:', error)
    }
  }

  const handleMarcarVendido = async (id: number, descuento: number) => {
    try {
      if (isDemo) {
        setVencimientos(prev => prev.map(v =>
          v.id === id ? { ...v, estado: 'vendido' as const, tiene_accion_comercial: true, accion_comercial: 'descuento', porcentaje_descuento: descuento } : v
        ))
      } else {
        await vencimientosApi.update(token!, id, {
          estado: 'vendido',
          tiene_accion_comercial: true,
          accion_comercial: 'descuento',
          porcentaje_descuento: descuento,
        })
        loadData()
      }
      setEditingDiscountId(null)
      setEditDiscountValue('')
    } catch (error) {
      console.error('Error marking as sold:', error)
    }
  }

  const handleEnviarSucursal = async (id: number, sucursalId: number, sucursalNombre: string) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      if (isDemo) {
        setVencimientos(prev => prev.map(v =>
          v.id === id ? { ...v, estado: 'enviado' as const, sucursal_destino_id: sucursalId, sucursal_destino_nombre: sucursalNombre, fecha_movimiento: today } : v
        ))
      } else {
        await vencimientosApi.update(token!, id, {
          estado: 'enviado',
          sucursal_destino_id: sucursalId,
          sucursal_destino_nombre: sucursalNombre,
          fecha_movimiento: today,
        })
        loadData()
      }
      setSendingToSucursalId(null)
      setSelectedSucursalDestino('')
      setSelectedSucursalDestinoNombre('')
    } catch (error) {
      console.error('Error sending to branch:', error)
    }
  }

  const handleArchivar = async (id: number) => {
    try {
      if (isDemo) {
        setVencimientos(prev => prev.map(v =>
          v.id === id ? { ...v, estado: 'archivado' as const } : v
        ))
      } else {
        await vencimientosApi.update(token!, id, { estado: 'archivado' })
        loadData()
      }
    } catch (error) {
      console.error('Error archiving:', error)
    }
  }

  const handleUpdateDiscount = async (id: number, newDiscount: number) => {
    try {
      if (isDemo) {
        setVencimientos(prev => prev.map(v =>
          v.id === id ? { ...v, porcentaje_descuento: newDiscount, tiene_accion_comercial: true, accion_comercial: 'descuento' } : v
        ))
      } else {
        await vencimientosApi.update(token!, id, {
          porcentaje_descuento: newDiscount,
          tiene_accion_comercial: true,
          accion_comercial: 'descuento',
        })
        loadData()
      }
      setEditingDiscountId(null)
      setEditDiscountValue('')
    } catch (error) {
      console.error('Error updating discount:', error)
    }
  }

  const resetForm = () => {
    setSelectedItem(null)
    setSearchQuery('')
    setSearchResults([])
    setProductoManual('')
    setCantidad(1)
    setFechaVencimiento('')
    setNotas('')
    setTieneAccionComercial(false)
    setAccionComercial('')
    setPorcentajeDescuento('')
    setSucursalDestinoId('')
    setSucursalDestinoNombre('')
    setFechaMovimiento('')
    setTimeout(() => {
      setSuccess('')
      setShowForm(false)
    }, 2000)
  }

  const getEstadoBadge = (estado: string, diasParaVencer: number | null) => {
    if (estado === 'archivado') {
      return <span className="px-2 py-1 rounded-full text-xs bg-gray-500/20 text-gray-500">Archivado</span>
    }
    if (estado === 'vendido') {
      return <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">Vendido</span>
    }
    if (estado === 'enviado') {
      return <span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400">Enviado</span>
    }
    if (estado === 'retirado') {
      return <span className="px-2 py-1 rounded-full text-xs bg-gray-500/20 text-gray-400">Retirado</span>
    }
    if (estado === 'vencido' || (diasParaVencer !== null && diasParaVencer < 0)) {
      return <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">Vencido</span>
    }
    if (diasParaVencer !== null && diasParaVencer <= 7) {
      return <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">Vence pronto</span>
    }
    return <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">Vigente</span>
  }

  const getAccionComercialBadge = (venc: Vencimiento) => {
    if (!venc.tiene_accion_comercial || !venc.accion_comercial) return null
    const accion = ACCIONES_COMERCIALES.find(a => a.value === venc.accion_comercial)
    if (!accion) return null

    return (
      <span className="px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-300 flex items-center gap-1">
        <span>{accion.icon}</span>
        <span>{accion.label}</span>
        {venc.accion_comercial === 'descuento' && venc.porcentaje_descuento && (
          <span className="font-semibold">({venc.porcentaje_descuento}%)</span>
        )}
        {venc.accion_comercial === 'rotacion' && venc.sucursal_destino_nombre && (
          <span className="font-semibold">→ {venc.sucursal_destino_nombre}</span>
        )}
      </span>
    )
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
            <h1 className="text-2xl font-bold text-white">Gestión de Vencimientos</h1>
            <p className="text-gray-400">Controlá los productos próximos a vencer</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mascotera-turquesa text-black font-semibold hover:bg-mascotera-turquesa/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Agregar Vencimiento
          </button>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-mascotera-turquesa/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-mascotera-turquesa" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{resumen?.total_registros || 0}</p>
                <p className="text-xs text-gray-400">Total registros</p>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-400">{resumen?.por_vencer_semana || 0}</p>
                <p className="text-xs text-gray-400">Vencen esta semana</p>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-400">{resumen?.por_vencer_mes || 0}</p>
                <p className="text-xs text-gray-400">Vencen este mes</p>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{resumen?.vencidos || 0}</p>
                <p className="text-xs text-gray-400">Vencidos</p>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{resumen?.retirados || 0}</p>
                <p className="text-xs text-gray-400">Retirados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Valorización */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">
                  ${(resumen?.valor_total_vencidos || 0).toLocaleString('es-AR')}
                </p>
                <p className="text-xs text-gray-400">Valor productos vencidos</p>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-400">
                  ${(resumen?.valor_total_proximos || 0).toLocaleString('es-AR')}
                </p>
                <p className="text-xs text-gray-400">Valor productos por vencer</p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario */}
        {showForm && (
          <div className="glass rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Nuevo Producto por Vencer</h2>

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
              {/* Búsqueda de producto */}
              <div className="space-y-2">
                <label className="text-sm text-gray-300">Buscar producto (opcional)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Buscar por nombre, código o marca..."
                    className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-mascotera-turquesa"
                  />
                  <button
                    type="button"
                    onClick={handleSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-700 divide-y divide-gray-700">
                    {searchResults.map((item) => (
                      <button
                        key={item.cod_item}
                        type="button"
                        onClick={() => selectItem(item)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-800/50 text-left"
                      >
                        <Package className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-white">{item.item}</p>
                          <p className="text-xs text-gray-400">{item.cod_item}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedItem && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-mascotera-turquesa/10 border border-mascotera-turquesa/30">
                    <Package className="w-5 h-5 text-mascotera-turquesa" />
                    <div className="flex-1">
                      <p className="text-white">{selectedItem.item}</p>
                      <p className="text-xs text-gray-400">
                        {selectedItem.cod_item}
                        {selectedItem.costo && (
                          <span className="ml-2 text-mascotera-turquesa font-semibold">
                            Precio: ${selectedItem.costo.toLocaleString('es-AR')}
                          </span>
                        )}
                      </p>
                    </div>
                    <button type="button" onClick={() => setSelectedItem(null)} className="p-1 hover:bg-gray-700 rounded">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                )}
              </div>

              {/* Producto manual si no hay seleccionado */}
              {!selectedItem && (
                <div>
                  <label className="text-sm text-gray-300">Nombre del producto</label>
                  <input
                    type="text"
                    value={productoManual}
                    onChange={(e) => setProductoManual(e.target.value)}
                    required={!selectedItem}
                    placeholder="Ej: Royal Canin Medium Adult 15kg"
                    className="w-full mt-1 px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-mascotera-turquesa"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-300">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={cantidad}
                    onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                    className="w-full mt-1 px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-mascotera-turquesa"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300">Fecha de vencimiento</label>
                  <input
                    type="date"
                    value={fechaVencimiento}
                    onChange={(e) => setFechaVencimiento(e.target.value)}
                    required
                    className="w-full mt-1 px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-mascotera-turquesa"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-300">Notas (opcional)</label>
                <input
                  type="text"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Observaciones adicionales"
                  className="w-full mt-1 px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-mascotera-turquesa"
                />
              </div>

              {/* Acción Comercial */}
              <div className="border-t border-gray-700 pt-4 mt-4">
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="tieneAccion"
                    checked={tieneAccionComercial}
                    onChange={(e) => {
                      setTieneAccionComercial(e.target.checked)
                      if (!e.target.checked) {
                        setAccionComercial('')
                        setPorcentajeDescuento('')
                      }
                    }}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-mascotera-turquesa focus:ring-mascotera-turquesa"
                  />
                  <label htmlFor="tieneAccion" className="text-gray-300 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    ¿Tiene acción comercial definida?
                  </label>
                </div>

                {tieneAccionComercial && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-8">
                    <div>
                      <label className="text-sm text-gray-300">Tipo de acción</label>
                      <select
                        value={accionComercial}
                        onChange={(e) => {
                          setAccionComercial(e.target.value)
                          if (e.target.value !== 'descuento') {
                            setPorcentajeDescuento('')
                          }
                        }}
                        className="w-full mt-1 px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-mascotera-turquesa"
                      >
                        <option value="">Seleccionar acción...</option>
                        {ACCIONES_COMERCIALES.map(ac => (
                          <option key={ac.value} value={ac.value}>
                            {ac.icon} {ac.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {accionComercial === 'descuento' && (
                      <div>
                        <label className="text-sm text-gray-300 flex items-center gap-2">
                          <Percent className="w-4 h-4" />
                          Porcentaje de descuento
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={porcentajeDescuento}
                          onChange={(e) => setPorcentajeDescuento(e.target.value ? parseInt(e.target.value) : '')}
                          placeholder="Ej: 20"
                          className="w-full mt-1 px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-mascotera-turquesa"
                        />
                      </div>
                    )}

                    {accionComercial === 'rotacion' && (
                      <>
                        <div>
                          <label className="text-sm text-gray-300">Sucursal destino</label>
                          <select
                            value={sucursalDestinoId}
                            onChange={(e) => {
                              const id = parseInt(e.target.value)
                              setSucursalDestinoId(id || '')
                              const suc = getSucursalesDemo().find(s => s.id === id)
                              setSucursalDestinoNombre(suc?.nombre || '')
                            }}
                            className="w-full mt-1 px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-mascotera-turquesa"
                          >
                            <option value="">Seleccionar sucursal...</option>
                            {getSucursalesDemo()
                              .filter(s => s.id !== (user?.sucursal_id || 0))
                              .map(s => (
                                <option key={s.id} value={s.id}>{s.nombre}</option>
                              ))
                            }
                          </select>
                        </div>
                        <div>
                          <label className="text-sm text-gray-300">Fecha de movimiento</label>
                          <input
                            type="date"
                            value={fechaMovimiento}
                            onChange={(e) => setFechaMovimiento(e.target.value)}
                            className="w-full mt-1 px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-mascotera-turquesa"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting || (!selectedItem && !productoManual)}
                  className="px-6 py-3 rounded-lg bg-mascotera-turquesa text-black font-semibold hover:bg-mascotera-turquesa/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Guardando...' : 'Registrar'}
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

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={() => setFiltroEstado('')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filtroEstado === '' ? 'bg-mascotera-turquesa text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltroEstado('proximo')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filtroEstado === 'proximo' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Por vencer
          </button>
          <button
            onClick={() => setFiltroEstado('vencido')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filtroEstado === 'vencido' ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Vencidos
          </button>
          <button
            onClick={() => setFiltroEstado('vendido')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filtroEstado === 'vendido' ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Vendidos
          </button>
          <button
            onClick={() => setFiltroEstado('enviado')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filtroEstado === 'enviado' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Enviados
          </button>
          <button
            onClick={() => setFiltroEstado('retirado')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filtroEstado === 'retirado' ? 'bg-gray-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Retirados
          </button>
          <div className="flex-1" />
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={mostrarArchivados}
              onChange={(e) => setMostrarArchivados(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-mascotera-turquesa"
            />
            Mostrar archivados
          </label>
        </div>

        {/* Lista de vencimientos */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-semibold text-white">Productos registrados</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-mascotera-turquesa border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : vencimientos.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay productos registrados</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {vencimientos.map((venc) => (
                <div key={venc.id} className="p-4 hover:bg-gray-800/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        venc.estado === 'archivado' ? 'bg-gray-500/10'
                          : venc.estado === 'vendido' ? 'bg-green-500/20'
                          : venc.estado === 'enviado' ? 'bg-blue-500/20'
                          : venc.estado === 'vencido' || (venc.dias_para_vencer !== null && venc.dias_para_vencer < 0) ? 'bg-red-500/20'
                          : venc.estado === 'retirado' ? 'bg-gray-500/20'
                          : venc.dias_para_vencer !== null && venc.dias_para_vencer <= 7 ? 'bg-yellow-500/20'
                          : 'bg-green-500/20'
                      }`}>
                        <Calendar className={`w-5 h-5 ${
                          venc.estado === 'archivado' ? 'text-gray-500'
                            : venc.estado === 'vendido' ? 'text-green-400'
                            : venc.estado === 'enviado' ? 'text-blue-400'
                            : venc.estado === 'vencido' || (venc.dias_para_vencer !== null && venc.dias_para_vencer < 0) ? 'text-red-400'
                            : venc.estado === 'retirado' ? 'text-gray-400'
                            : venc.dias_para_vencer !== null && venc.dias_para_vencer <= 7 ? 'text-yellow-400'
                            : 'text-green-400'
                        }`} />
                      </div>
                      <div>
                        <p className="text-white font-medium">{venc.producto}</p>
                        <p className="text-sm text-gray-400">
                          {venc.cod_item || 'Sin código'} • {venc.cantidad} uds
                        </p>
                        {venc.valor_total && (
                          <p className="text-sm font-semibold text-mascotera-turquesa mt-0.5">
                            ${venc.precio_unitario?.toLocaleString('es-AR')} c/u • Total: ${venc.valor_total.toLocaleString('es-AR')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end gap-1">
                        <p className="text-sm text-white">
                          {new Date(venc.fecha_vencimiento).toLocaleDateString('es-AR')}
                        </p>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {getEstadoBadge(venc.estado, venc.dias_para_vencer)}
                          {getAccionComercialBadge(venc)}
                        </div>
                      </div>
                      {/* Acciones para productos activos */}
                      {(venc.estado === 'proximo' || venc.estado === 'vencido') && (
                        <>
                          <button
                            onClick={() => { setEditingDiscountId(venc.id); setEditDiscountValue(venc.porcentaje_descuento?.toString() || '') }}
                            className="p-2 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
                            title="Editar descuento"
                          >
                            <Edit3 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              if (venc.porcentaje_descuento) {
                                handleMarcarVendido(venc.id, venc.porcentaje_descuento)
                              } else {
                                setEditingDiscountId(venc.id)
                                setEditDiscountValue('')
                              }
                            }}
                            className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                            title="Marcar como vendido"
                          >
                            <DollarSign className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setSendingToSucursalId(venc.id)}
                            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Enviar a otra sucursal"
                          >
                            <Send className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      {/* Archivar para productos no archivados */}
                      {venc.estado !== 'archivado' && (
                        <button
                          onClick={() => handleArchivar(venc.id)}
                          className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-500/10 rounded-lg transition-colors"
                          title="Archivar"
                        >
                          <Archive className="w-5 h-5" />
                        </button>
                      )}
                      {venc.estado !== 'archivado' && (
                        <button
                          onClick={() => handleDelete(venc.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline discount editor */}
                  {editingDiscountId === venc.id && (
                    <div className="flex items-center gap-2 mt-3 ml-13 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                      <Percent className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-gray-300">Descuento:</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={editDiscountValue}
                        onChange={(e) => setEditDiscountValue(e.target.value)}
                        placeholder="%"
                        className="w-20 px-2 py-1 rounded bg-gray-800 border border-gray-600 text-white text-sm"
                        autoFocus
                      />
                      <span className="text-sm text-gray-400">%</span>
                      <button
                        onClick={() => {
                          const val = parseInt(editDiscountValue)
                          if (val >= 1 && val <= 100) handleMarcarVendido(venc.id, val)
                        }}
                        disabled={!editDiscountValue || parseInt(editDiscountValue) < 1}
                        className="px-3 py-1 text-sm rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50"
                      >
                        Vendido
                      </button>
                      <button
                        onClick={() => {
                          const val = parseInt(editDiscountValue)
                          if (val >= 1 && val <= 100) handleUpdateDiscount(venc.id, val)
                        }}
                        disabled={!editDiscountValue || parseInt(editDiscountValue) < 1}
                        className="px-3 py-1 text-sm rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 disabled:opacity-50"
                      >
                        Solo descuento
                      </button>
                      <button
                        onClick={() => { setEditingDiscountId(null); setEditDiscountValue('') }}
                        className="p-1 text-gray-400 hover:bg-gray-700 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Inline branch selector */}
                  {sendingToSucursalId === venc.id && (
                    <div className="flex items-center gap-2 mt-3 ml-13 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                      <Send className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-gray-300">Enviar a:</span>
                      <select
                        value={selectedSucursalDestino}
                        onChange={(e) => {
                          const id = parseInt(e.target.value)
                          setSelectedSucursalDestino(e.target.value)
                          const suc = getSucursalesDemo().find(s => s.id === id)
                          setSelectedSucursalDestinoNombre(suc?.nombre || '')
                        }}
                        className="px-2 py-1 rounded bg-gray-800 border border-gray-600 text-white text-sm"
                      >
                        <option value="">Sucursal...</option>
                        {getSucursalesDemo()
                          .filter(s => s.id !== (user?.sucursal_id || 0))
                          .map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)
                        }
                      </select>
                      <button
                        onClick={() => selectedSucursalDestino && handleEnviarSucursal(
                          venc.id, parseInt(selectedSucursalDestino), selectedSucursalDestinoNombre
                        )}
                        disabled={!selectedSucursalDestino}
                        className="px-3 py-1 text-sm rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => { setSendingToSucursalId(null); setSelectedSucursalDestino(''); setSelectedSucursalDestinoNombre('') }}
                        className="p-1 text-gray-400 hover:bg-gray-700 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {venc.notas && (
                    <p className="mt-2 text-sm text-gray-400 pl-13">{venc.notas}</p>
                  )}
                  {venc.estado === 'enviado' && venc.sucursal_destino_nombre && (
                    <p className="mt-1 text-sm text-blue-400 pl-13">Enviado a: {venc.sucursal_destino_nombre}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
