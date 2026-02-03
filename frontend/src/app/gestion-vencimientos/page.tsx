'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarClock,
  Plus,
  Upload,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  Trash2,
  AlertCircle,
  X,
  Search,
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'
import { vencimientosApi, itemsApi } from '@/lib/api'

interface Vencimiento {
  id: number
  cod_item: string | null
  producto: string
  cantidad: number
  lote: string | null
  fecha_vencimiento: string
  estado: string
  dias_para_vencer: number
  importado: boolean
}

interface Resumen {
  total_registros: number
  por_vencer_semana: number
  por_vencer_mes: number
  vencidos: number
  retirados: number
}

export default function GestionVencimientosPage() {
  const router = useRouter()
  const { token, isAuthenticated, isLoading } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [vencimientos, setVencimientos] = useState<Vencimiento[]>([])
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<string>('')

  // Form states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [productoManual, setProductoManual] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [lote, setLote] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Import states
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
    }
  }, [token, filtroEstado])

  const loadData = async () => {
    try {
      setLoading(true)
      const isDemo = token?.startsWith('demo-token')

      if (isDemo) {
        // Demo data
        setVencimientos([
          { id: 1, cod_item: 'ALIM001', producto: 'Alimento Premium Perro 15kg', cantidad: 5, lote: 'L2024-001', fecha_vencimiento: '2024-02-15', estado: 'proximo', dias_para_vencer: 10, importado: false },
          { id: 2, cod_item: 'ALIM002', producto: 'Alimento Gato Adulto 10kg', cantidad: 3, lote: 'L2024-002', fecha_vencimiento: '2024-02-08', estado: 'proximo', dias_para_vencer: 3, importado: true },
          { id: 3, cod_item: 'MED001', producto: 'Antiparasitario Canino', cantidad: 10, lote: 'M2023-050', fecha_vencimiento: '2024-01-30', estado: 'vencido', dias_para_vencer: -5, importado: false },
        ])
        setResumen({
          total_registros: 3,
          por_vencer_semana: 1,
          por_vencer_mes: 2,
          vencidos: 1,
          retirados: 0
        })
      } else {
        const [vencimientosData, resumenData] = await Promise.all([
          vencimientosApi.list(token!, filtroEstado || undefined),
          vencimientosApi.resumen(token!)
        ])
        setVencimientos(vencimientosData)
        setResumen(resumenData)
      }
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    try {
      const results = await itemsApi.search(token!, query)
      setSearchResults(results.slice(0, 10))
    } catch (err) {
      setSearchResults([])
    }
  }

  const handleSelectItem = (item: any) => {
    setSelectedItem(item)
    setSearchQuery(item.nombre || item.descripcion)
    setSearchResults([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const producto = selectedItem?.nombre || selectedItem?.descripcion || productoManual
    if (!producto) {
      setError('Ingresa un producto')
      return
    }
    if (!fechaVencimiento) {
      setError('Ingresa la fecha de vencimiento')
      return
    }

    setSubmitting(true)

    try {
      const isDemo = token?.startsWith('demo-token')
      if (isDemo) {
        const newItem: Vencimiento = {
          id: Date.now(),
          cod_item: selectedItem?.codigo || null,
          producto: producto,
          cantidad: cantidad,
          lote: lote || null,
          fecha_vencimiento: fechaVencimiento,
          estado: new Date(fechaVencimiento) < new Date() ? 'vencido' : 'proximo',
          dias_para_vencer: Math.ceil((new Date(fechaVencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
          importado: false
        }
        setVencimientos(prev => [newItem, ...prev])
        setSuccess('Producto registrado')
      } else {
        await vencimientosApi.create(token!, {
          cod_item: selectedItem?.codigo || null,
          producto: producto,
          cantidad: cantidad,
          lote: lote || null,
          fecha_vencimiento: fechaVencimiento
        })
        setSuccess('Producto registrado correctamente')
        loadData()
      }

      // Reset form
      setSelectedItem(null)
      setSearchQuery('')
      setProductoManual('')
      setCantidad(1)
      setLote('')
      setFechaVencimiento('')
      setShowForm(false)
    } catch (err: any) {
      setError(err.message || 'Error al registrar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarcarRetirado = async (id: number) => {
    try {
      const isDemo = token?.startsWith('demo-token')
      if (isDemo) {
        setVencimientos(prev => prev.map(v =>
          v.id === id ? { ...v, estado: 'retirado' } : v
        ))
      } else {
        await vencimientosApi.update(token!, id, { estado: 'retirado' })
        loadData()
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportResult(null)
    setError('')

    try {
      const result = await vencimientosApi.importarCSV(token!, file)
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

  const getEstadoColor = (estado: string, diasParaVencer: number) => {
    if (estado === 'retirado') return 'bg-gray-500/20 text-gray-400'
    if (estado === 'vencido' || diasParaVencer < 0) return 'bg-red-500/20 text-red-400'
    if (diasParaVencer <= 7) return 'bg-yellow-500/20 text-yellow-400'
    return 'bg-green-500/20 text-green-400'
  }

  const getEstadoLabel = (estado: string, diasParaVencer: number) => {
    if (estado === 'retirado') return 'Retirado'
    if (estado === 'vencido' || diasParaVencer < 0) return 'Vencido'
    if (diasParaVencer <= 7) return `${diasParaVencer} dias`
    return `${diasParaVencer} dias`
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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <CalendarClock className="w-8 h-8 text-mascotera-turquesa" />
              Gestion de Vencimientos
            </h1>
            <p className="text-gray-400 mt-2">Control de productos proximos a vencer</p>
          </div>
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
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mascotera-turquesa text-black font-medium hover:bg-mascotera-turquesa/80 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Registrar Producto
            </button>
          </div>
        </div>

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
              Importados: {importResult.registros_importados} registros
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
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-400">{resumen.por_vencer_semana}</p>
                  <p className="text-xs text-gray-400">Vencen esta semana</p>
                </div>
              </div>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-400">{resumen.por_vencer_mes}</p>
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
                  <p className="text-2xl font-bold text-red-400">{resumen.vencidos}</p>
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
                  <p className="text-2xl font-bold text-green-400">{resumen.retirados}</p>
                  <p className="text-xs text-gray-400">Retirados</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Formulario */}
        {showForm && (
          <div className="glass rounded-2xl p-6 mb-6 border border-mascotera-turquesa/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Registrar Producto por Vencer</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Buscar producto */}
                <div className="relative">
                  <label className="block text-sm text-gray-400 mb-1">Buscar Producto</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Buscar por codigo o nombre..."
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-mascotera-turquesa"
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {searchResults.map((item, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectItem(item)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm"
                        >
                          <span className="text-mascotera-turquesa">{item.codigo}</span>
                          <span className="text-white ml-2">{item.nombre || item.descripcion}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Producto manual */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">O escribir manualmente</label>
                  <input
                    type="text"
                    value={productoManual}
                    onChange={(e) => setProductoManual(e.target.value)}
                    placeholder="Nombre del producto"
                    disabled={!!selectedItem}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-mascotera-turquesa disabled:opacity-50"
                  />
                </div>

                {/* Cantidad */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Cantidad</label>
                  <input
                    type="number"
                    value={cantidad}
                    onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-mascotera-turquesa"
                  />
                </div>

                {/* Lote */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Lote (opcional)</label>
                  <input
                    type="text"
                    value={lote}
                    onChange={(e) => setLote(e.target.value)}
                    placeholder="Numero de lote"
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-mascotera-turquesa"
                  />
                </div>

                {/* Fecha vencimiento */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Fecha de Vencimiento</label>
                  <input
                    type="date"
                    value={fechaVencimiento}
                    onChange={(e) => setFechaVencimiento(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-mascotera-turquesa"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-mascotera-turquesa text-black font-medium hover:bg-mascotera-turquesa/80 disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
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
            onClick={() => setFiltroEstado('proximo')}
            className={`px-4 py-2 rounded-lg text-sm ${filtroEstado === 'proximo' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            Por vencer
          </button>
          <button
            onClick={() => setFiltroEstado('vencido')}
            className={`px-4 py-2 rounded-lg text-sm ${filtroEstado === 'vencido' ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            Vencidos
          </button>
          <button
            onClick={() => setFiltroEstado('retirado')}
            className={`px-4 py-2 rounded-lg text-sm ${filtroEstado === 'retirado' ? 'bg-gray-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            Retirados
          </button>
        </div>

        {/* Lista */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-semibold text-white">Productos ({vencimientos.length})</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-mascotera-turquesa border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : vencimientos.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay productos registrados</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {vencimientos.map((item) => (
                <div key={item.id} className="p-4 hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getEstadoColor(item.estado, item.dias_para_vencer)}`}>
                          {getEstadoLabel(item.estado, item.dias_para_vencer)}
                        </span>
                        {item.cod_item && (
                          <span className="text-mascotera-turquesa text-sm">{item.cod_item}</span>
                        )}
                        <span className="text-white font-medium">{item.producto}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                        <span>Cantidad: {item.cantidad}</span>
                        {item.lote && <span>Lote: {item.lote}</span>}
                        <span>Vence: {new Date(item.fecha_vencimiento).toLocaleDateString('es-AR')}</span>
                        {item.importado && <span className="text-blue-400">Importado</span>}
                      </div>
                    </div>
                    {item.estado !== 'retirado' && (
                      <button
                        onClick={() => handleMarcarRetirado(item.id)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-green-600 hover:text-white text-sm transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Marcar Retirado
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
