'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  PackageX,
  Search,
  Plus,
  Package,
  AlertCircle,
  Check,
  X,
  DollarSign,
  HelpCircle,
  Sparkles,
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'
import { itemsApi, ventasPerdidasApi } from '@/lib/api'
import {
  getVentasPerdidasDemo,
  getResumenVentasPerdidasDemo,
  getItemsBuscablesDemo,
  getResumenVentasPerdidasTodasDemo,
} from '@/lib/demo-data'

const MOTIVOS = [
  { value: 'sin_stock', label: 'Sin Stock', icon: PackageX, color: 'yellow' },
  { value: 'precio', label: 'Precio', icon: DollarSign, color: 'green' },
  { value: 'otro', label: 'Otro', icon: HelpCircle, color: 'blue' },
  { value: 'producto_nuevo', label: 'Prod. Nuevo', icon: Sparkles, color: 'pink' },
]

export default function VentasPerdidasPage() {
  const router = useRouter()
  const { token, user, isAuthenticated, isLoading } = useAuthStore()
  const [ventas, setVentas] = useState<any[]>([])
  const [resumen, setResumen] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Vista encargado
  const [resumenTodas, setResumenTodas] = useState<any[]>([])
  const [loadingTodas, setLoadingTodas] = useState(false)

  const esEncargado = (() => {
    const rolesEncargado = ['encargado', 'admin', 'gerente', 'gerencia', 'auditor', 'supervisor']
    const userRol = (user?.rol || '').toLowerCase()
    const userPuesto = (user?.puesto || '').toLowerCase()
    return rolesEncargado.some(r => userRol.includes(r) || userPuesto.includes(r))
  })()

  // Form state
  const [motivoActivo, setMotivoActivo] = useState('sin_stock')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [cantidad, setCantidad] = useState(1)
  const [itemNombre, setItemNombre] = useState('')
  const [marca, setMarca] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Registro expandido (modal para producto nuevo / observaciones)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (token) {
      if (esEncargado) {
        loadResumenTodas()
      } else {
        loadData()
      }
    }
  }, [token, esEncargado])

  const isDemo = token?.startsWith('demo-token')

  const loadData = async () => {
    try {
      if (isDemo) {
        setVentas(getVentasPerdidasDemo())
        setResumen(getResumenVentasPerdidasDemo())
      } else {
        const [ventasData, resumenData] = await Promise.all([
          ventasPerdidasApi.list(token!),
          ventasPerdidasApi.resumen(token!),
        ])
        setVentas(ventasData)
        setResumen(resumenData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadResumenTodas = async () => {
    if (resumenTodas.length > 0) return // ya cargado
    setLoadingTodas(true)
    try {
      if (isDemo) {
        setResumenTodas(getResumenVentasPerdidasTodasDemo())
      } else {
        const data = await ventasPerdidasApi.resumenTodas(token!)
        setResumenTodas(data)
      }
    } catch (error) {
      console.error('Error loading resumen todas:', error)
      setResumenTodas(getResumenVentasPerdidasTodasDemo())
    } finally {
      setLoadingTodas(false)
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
    setItemNombre(item.item)
    setMarca(item.marca_nombre || '')
    setSearchResults([])
    setSearchQuery('')
  }

  const handleRegistrar = async () => {
    const esProductoNuevo = motivoActivo === 'producto_nuevo'

    if (esProductoNuevo && !itemNombre) {
      setError('Ingresa el nombre del producto')
      return
    }
    if (!esProductoNuevo && !selectedItem) {
      setError('Busca y selecciona un producto')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      if (isDemo) {
        const nuevaVenta = {
          id: Date.now(),
          sucursal_id: 1,
          employee_id: 5,
          cod_item: esProductoNuevo ? null : selectedItem?.cod_item,
          item_nombre: esProductoNuevo ? itemNombre : selectedItem?.item,
          marca: esProductoNuevo ? marca : selectedItem?.marca_nombre,
          cantidad,
          es_producto_nuevo: esProductoNuevo,
          motivo: motivoActivo,
          observaciones,
          fecha_registro: new Date().toISOString(),
          employee_nombre: 'Vendedor Demo',
        }
        setVentas(prev => [nuevaVenta, ...prev])
        setResumen((prev: any) => {
          if (!prev) return prev
          const key = motivoActivo === 'sin_stock' ? 'sin_stock'
            : motivoActivo === 'precio' ? 'por_precio'
            : motivoActivo === 'producto_nuevo' ? 'productos_nuevos'
            : 'otros'
          return {
            ...prev,
            total_registros: prev.total_registros + 1,
            total_unidades: (prev.total_unidades || 0) + cantidad,
            [key]: (prev[key] || 0) + 1,
          }
        })
        setSuccess('Venta perdida registrada')
        resetForm()
      } else {
        await ventasPerdidasApi.create(token!, {
          cod_item: esProductoNuevo ? null : selectedItem?.cod_item,
          item_nombre: esProductoNuevo ? itemNombre : selectedItem?.item,
          marca: esProductoNuevo ? marca : selectedItem?.marca_nombre,
          cantidad,
          es_producto_nuevo: esProductoNuevo,
          motivo: motivoActivo,
          observaciones,
        })
        setSuccess('Venta perdida registrada')
        resetForm()
        loadData()
      }
    } catch (err: any) {
      setError(err.message || 'Error al registrar')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setSelectedItem(null)
    setSearchQuery('')
    setSearchResults([])
    setCantidad(1)
    setItemNombre('')
    setMarca('')
    setObservaciones('')
    setShowForm(false)
    setTimeout(() => setSuccess(''), 3000)
  }

  const getMotivoColor = (motivo: string) => {
    switch (motivo) {
      case 'sin_stock': return 'text-yellow-400 bg-yellow-500/20'
      case 'precio': return 'text-green-400 bg-green-500/20'
      case 'otro': return 'text-blue-400 bg-blue-500/20'
      case 'producto_nuevo': return 'text-pink-400 bg-pink-500/20'
      default: return 'text-gray-400 bg-gray-500/20'
    }
  }

  const getMotivoLabel = (motivo: string) => {
    switch (motivo) {
      case 'sin_stock': return 'Sin Stock'
      case 'precio': return 'Precio'
      case 'otro': return 'Otro'
      case 'producto_nuevo': return 'Prod. Nuevo'
      default: return motivo
    }
  }

  const ventasFiltradas = ventas.filter(v => v.motivo === motivoActivo)

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Ventas Perdidas</h1>
            <p className="text-gray-400">{esEncargado ? 'Resumen por sucursal' : 'Registro rapido de ventas no concretadas'}</p>
          </div>
          {!esEncargado && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mascotera-turquesa text-black font-semibold hover:bg-mascotera-turquesa/90 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Registrar
            </button>
          )}
        </div>

        {/* Tabs encargado - removido, encargado va directo a vista todas */}

        {/* Vista: Todas las Sucursales (encargado) */}
        {esEncargado && (
          <div>
            {loadingTodas ? (
              <div className="glass rounded-2xl p-8 text-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : (
              <>
                {/* Resumen general */}
                {(() => {
                  const totales = resumenTodas.reduce((acc, s) => ({
                    registros: acc.registros + s.total_registros,
                    unidades: acc.unidades + s.total_unidades,
                    sin_stock: acc.sin_stock + s.sin_stock,
                    por_precio: acc.por_precio + s.por_precio,
                    otros: acc.otros + s.otros,
                    productos_nuevos: acc.productos_nuevos + s.productos_nuevos,
                  }), { registros: 0, unidades: 0, sin_stock: 0, por_precio: 0, otros: 0, productos_nuevos: 0 })

                  return (
                    <div className="grid grid-cols-6 gap-3 mb-6">
                      <div className="glass-card rounded-xl p-4">
                        <p className="text-2xl font-bold text-white">{totales.registros}</p>
                        <p className="text-xs text-gray-400">Total Registros</p>
                      </div>
                      <div className="glass-card rounded-xl p-4">
                        <p className="text-2xl font-bold text-white">{totales.unidades}</p>
                        <p className="text-xs text-gray-400">Total Unidades</p>
                      </div>
                      <div className="glass-card rounded-xl p-4">
                        <p className="text-2xl font-bold text-yellow-400">{totales.sin_stock}</p>
                        <p className="text-xs text-gray-400">Sin Stock</p>
                      </div>
                      <div className="glass-card rounded-xl p-4">
                        <p className="text-2xl font-bold text-green-400">{totales.por_precio}</p>
                        <p className="text-xs text-gray-400">Por Precio</p>
                      </div>
                      <div className="glass-card rounded-xl p-4">
                        <p className="text-2xl font-bold text-blue-400">{totales.otros}</p>
                        <p className="text-xs text-gray-400">Otros</p>
                      </div>
                      <div className="glass-card rounded-xl p-4">
                        <p className="text-2xl font-bold text-pink-400">{totales.productos_nuevos}</p>
                        <p className="text-xs text-gray-400">Prod. Nuevos</p>
                      </div>
                    </div>
                  )
                })()}

                {/* Tabla por sucursal */}
                <div className="glass rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-gray-800">
                    <h2 className="font-semibold text-white">Ventas perdidas por sucursal - Mes actual</h2>
                    <p className="text-sm text-gray-400">{resumenTodas.length} sucursales con registros</p>
                  </div>

                  {resumenTodas.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      <PackageX className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No hay registros este mes</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-700">
                            <th className="text-left text-gray-400 font-medium py-3 px-4">Sucursal</th>
                            <th className="text-center text-yellow-400 font-medium py-3 px-3">Sin Stock</th>
                            <th className="text-center text-green-400 font-medium py-3 px-3">Precio</th>
                            <th className="text-center text-blue-400 font-medium py-3 px-3">Otro</th>
                            <th className="text-center text-pink-400 font-medium py-3 px-3">Prod. Nuevo</th>
                            <th className="text-center text-white font-medium py-3 px-3">Total</th>
                            <th className="text-center text-gray-400 font-medium py-3 px-3">Unidades</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resumenTodas.map((s) => {
                            const getCellColor = (val: number) => {
                              if (val === 0) return ''
                              if (val <= 3) return 'bg-yellow-500/5'
                              if (val <= 6) return 'bg-orange-500/10'
                              return 'bg-red-500/10'
                            }
                            return (
                              <tr key={s.sucursal_id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                <td className="py-3 px-4 text-white font-medium">{s.sucursal_nombre}</td>
                                <td className={`text-center py-3 px-3 ${getCellColor(s.sin_stock)}`}>
                                  <span className={s.sin_stock > 0 ? 'text-yellow-400 font-semibold' : 'text-gray-600'}>{s.sin_stock}</span>
                                </td>
                                <td className={`text-center py-3 px-3 ${getCellColor(s.por_precio)}`}>
                                  <span className={s.por_precio > 0 ? 'text-green-400 font-semibold' : 'text-gray-600'}>{s.por_precio}</span>
                                </td>
                                <td className={`text-center py-3 px-3 ${getCellColor(s.otros)}`}>
                                  <span className={s.otros > 0 ? 'text-blue-400 font-semibold' : 'text-gray-600'}>{s.otros}</span>
                                </td>
                                <td className={`text-center py-3 px-3 ${getCellColor(s.productos_nuevos)}`}>
                                  <span className={s.productos_nuevos > 0 ? 'text-pink-400 font-semibold' : 'text-gray-600'}>{s.productos_nuevos}</span>
                                </td>
                                <td className="text-center py-3 px-3">
                                  <span className="text-white font-bold">{s.total_registros}</span>
                                </td>
                                <td className="text-center py-3 px-3 text-gray-400">{s.total_unidades}</td>
                              </tr>
                            )
                          })}
                          {/* Fila totales */}
                          {(() => {
                            const t = resumenTodas.reduce((acc, s) => ({
                              sin_stock: acc.sin_stock + s.sin_stock,
                              por_precio: acc.por_precio + s.por_precio,
                              otros: acc.otros + s.otros,
                              productos_nuevos: acc.productos_nuevos + s.productos_nuevos,
                              total_registros: acc.total_registros + s.total_registros,
                              total_unidades: acc.total_unidades + s.total_unidades,
                            }), { sin_stock: 0, por_precio: 0, otros: 0, productos_nuevos: 0, total_registros: 0, total_unidades: 0 })
                            return (
                              <tr className="border-t-2 border-purple-500/30 bg-purple-500/5">
                                <td className="py-3 px-4 text-purple-400 font-bold">TOTALES</td>
                                <td className="text-center py-3 px-3 text-yellow-400 font-bold">{t.sin_stock}</td>
                                <td className="text-center py-3 px-3 text-green-400 font-bold">{t.por_precio}</td>
                                <td className="text-center py-3 px-3 text-blue-400 font-bold">{t.otros}</td>
                                <td className="text-center py-3 px-3 text-pink-400 font-bold">{t.productos_nuevos}</td>
                                <td className="text-center py-3 px-3 text-white font-bold">{t.total_registros}</td>
                                <td className="text-center py-3 px-3 text-gray-300 font-bold">{t.total_unidades}</td>
                              </tr>
                            )
                          })()}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Vista: Mi Sucursal (solo vendedores) */}
        {!esEncargado && (
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
            <Check className="w-5 h-5" />
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Resumen Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="glass-card rounded-xl p-4">
            <p className="text-3xl font-bold text-red-400">{resumen?.sin_stock || 0}</p>
            <p className="text-sm text-gray-400">Sin Stock</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-3xl font-bold text-red-400">{resumen?.por_precio || 0}</p>
            <p className="text-sm text-gray-400">Por Precio</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-3xl font-bold text-blue-400">{resumen?.otros || 0}</p>
            <p className="text-sm text-gray-400">Otros</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-3xl font-bold text-pink-400">{resumen?.productos_nuevos || 0}</p>
            <p className="text-sm text-gray-400">Prod. Nuevos</p>
          </div>
        </div>

        {/* Formulario inline con tabs */}
        <div className="glass rounded-2xl p-6 mb-6">
          {/* Tabs de motivo */}
          <div className="flex gap-2 mb-4">
            {MOTIVOS.map((m) => {
              const Icon = m.icon
              const isActive = motivoActivo === m.value
              return (
                <button
                  key={m.value}
                  onClick={() => {
                    setMotivoActivo(m.value)
                    setSelectedItem(null)
                    setSearchQuery('')
                    setSearchResults([])
                    setItemNombre('')
                    setMarca('')
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? m.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                      : m.color === 'green' ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                      : m.color === 'blue' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                      : 'bg-pink-500/20 text-pink-400 border border-pink-500/50'
                      : 'bg-gray-800 text-gray-400 border border-transparent hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {m.label}
                </button>
              )
            })}
          </div>

          {/* Buscar producto / nombre manual */}
          {motivoActivo === 'producto_nuevo' ? (
            <div className="space-y-3">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={itemNombre}
                  onChange={(e) => setItemNombre(e.target.value)}
                  placeholder="Nombre del producto solicitado..."
                  className="flex-1 px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-mascotera-turquesa"
                />
                <input
                  type="text"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  placeholder="Marca (opcional)"
                  className="w-48 px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-mascotera-turquesa"
                />
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <label className="text-xs text-gray-500">Cant.</label>
                  <input
                    type="number"
                    min="1"
                    value={cantidad}
                    onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                    className="w-20 px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-mascotera-turquesa"
                  />
                </div>
                <input
                  type="text"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Observaciones (opcional)"
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-mascotera-turquesa"
                />
                <button
                  onClick={handleRegistrar}
                  disabled={submitting || !itemNombre}
                  className="px-6 py-2 rounded-lg bg-mascotera-turquesa text-black font-semibold hover:bg-mascotera-turquesa/90 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Buscador */}
              <div className="relative">
                <input
                  type="text"
                  value={selectedItem ? selectedItem.item : searchQuery}
                  onChange={(e) => {
                    if (selectedItem) {
                      setSelectedItem(null)
                      setSearchQuery(e.target.value)
                    } else {
                      setSearchQuery(e.target.value)
                    }
                  }}
                  onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Buscar producto..."
                  className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-mascotera-turquesa pr-10"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>

              {/* Resultados busqueda */}
              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-700 divide-y divide-gray-700">
                  {searchResults.map((item) => (
                    <button
                      key={item.cod_item}
                      type="button"
                      onClick={() => selectItem(item)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-800/50 text-left transition-colors"
                    >
                      <Package className="w-5 h-5 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-white">{item.item}</p>
                        <p className="text-xs text-gray-400">
                          {item.cod_item} {item.marca_nombre && `- ${item.marca_nombre}`}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Cantidad + Registrar */}
              <div className="flex items-center gap-3">
                <div>
                  <label className="text-xs text-gray-500">Cant.</label>
                  <input
                    type="number"
                    min="1"
                    value={cantidad}
                    onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                    className="w-20 px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-mascotera-turquesa"
                  />
                </div>
                <input
                  type="text"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Observaciones (opcional)"
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-mascotera-turquesa"
                />
                <button
                  onClick={handleRegistrar}
                  disabled={submitting || !selectedItem}
                  className="px-6 py-2 rounded-lg bg-mascotera-turquesa text-black font-semibold hover:bg-mascotera-turquesa/90 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lista de ventas perdidas */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-semibold text-white">Ultimos registros</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-mascotera-turquesa border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : ventas.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <PackageX className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay registros</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {ventas.map((venta) => (
                <div key={venta.id} className="p-4 hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getMotivoColor(venta.motivo || (venta.es_producto_nuevo ? 'producto_nuevo' : 'sin_stock'))}`}>
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{venta.item_nombre}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span className={`px-1.5 py-0.5 rounded text-xs ${getMotivoColor(venta.motivo || (venta.es_producto_nuevo ? 'producto_nuevo' : 'sin_stock'))}`}>
                            {getMotivoLabel(venta.motivo || (venta.es_producto_nuevo ? 'producto_nuevo' : 'sin_stock'))}
                          </span>
                          {venta.cod_item && <span>{venta.cod_item}</span>}
                          {venta.marca && <span>- {venta.marca}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">{venta.cantidad} uds</p>
                      <p className="text-xs text-gray-400">
                        {new Date(venta.fecha_registro).toLocaleDateString('es-AR')}
                      </p>
                    </div>
                  </div>
                  {venta.observaciones && (
                    <p className="mt-2 text-sm text-gray-500 ml-13">{venta.observaciones}</p>
                  )}
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
