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
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'
import { itemsApi, ventasPerdidasApi } from '@/lib/api'

export default function VentasPerdidasPage() {
  const router = useRouter()
  const { token, isAuthenticated, isLoading } = useAuthStore()
  const [ventas, setVentas] = useState<any[]>([])
  const [resumen, setResumen] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [cantidad, setCantidad] = useState(1)
  const [esProductoNuevo, setEsProductoNuevo] = useState(false)
  const [itemNombre, setItemNombre] = useState('')
  const [marca, setMarca] = useState('')
  const [observaciones, setObservaciones] = useState('')
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
    }
  }, [token])

  const loadData = async () => {
    try {
      const [ventasData, resumenData] = await Promise.all([
        ventasPerdidasApi.list(token!),
        ventasPerdidasApi.resumen(token!),
      ])
      setVentas(ventasData)
      setResumen(resumenData)
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
      const results = await itemsApi.search(token!, searchQuery)
      setSearchResults(results)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      await ventasPerdidasApi.create(token!, {
        cod_item: esProductoNuevo ? null : selectedItem?.cod_item,
        item_nombre: esProductoNuevo ? itemNombre : selectedItem?.item,
        marca: esProductoNuevo ? marca : selectedItem?.marca_nombre,
        cantidad,
        es_producto_nuevo: esProductoNuevo,
        observaciones,
      })

      setSuccess('Venta perdida registrada correctamente')
      resetForm()
      loadData()
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
    setEsProductoNuevo(false)
    setItemNombre('')
    setMarca('')
    setObservaciones('')
    setTimeout(() => {
      setSuccess('')
      setShowForm(false)
    }, 2000)
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
            <h1 className="text-2xl font-bold text-white">Ventas Perdidas</h1>
            <p className="text-gray-400">Registrá productos que no pudiste vender</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mascotera-turquesa text-black font-semibold hover:bg-mascotera-turquesa/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Registrar Venta Perdida
          </button>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card rounded-xl p-4">
            <p className="text-3xl font-bold text-white">{resumen?.total_registros || 0}</p>
            <p className="text-sm text-gray-400">Total registros (mes)</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-3xl font-bold text-mascotera-turquesa">{resumen?.total_unidades || 0}</p>
            <p className="text-sm text-gray-400">Unidades perdidas</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-3xl font-bold text-mascotera-amarillo">{resumen?.falta_stock || 0}</p>
            <p className="text-sm text-gray-400">Por falta de stock</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-3xl font-bold text-pink-400">{resumen?.productos_nuevos || 0}</p>
            <p className="text-sm text-gray-400">Productos nuevos</p>
          </div>
        </div>

        {/* Formulario */}
        {showForm && (
          <div className="glass rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Nueva Venta Perdida</h2>

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
              {/* Toggle producto nuevo */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={esProductoNuevo}
                    onChange={(e) => {
                      setEsProductoNuevo(e.target.checked)
                      setSelectedItem(null)
                    }}
                    className="w-4 h-4 rounded border-gray-600 text-mascotera-turquesa focus:ring-mascotera-turquesa"
                  />
                  <span className="text-gray-300">Es un producto que no tenemos en catálogo</span>
                </label>
              </div>

              {!esProductoNuevo ? (
                /* Búsqueda de producto existente */
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Buscar producto</label>
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

                  {/* Resultados de búsqueda */}
                  {searchResults.length > 0 && (
                    <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-700 divide-y divide-gray-700">
                      {searchResults.map((item) => (
                        <button
                          key={item.cod_item}
                          type="button"
                          onClick={() => selectItem(item)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-800/50 text-left"
                        >
                          <Package className="w-5 h-5 text-gray-400" />
                          <div className="flex-1">
                            <p className="text-white">{item.item}</p>
                            <p className="text-xs text-gray-400">
                              {item.cod_item} • {item.marca_nombre}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Producto seleccionado */}
                  {selectedItem && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-mascotera-turquesa/10 border border-mascotera-turquesa/30">
                      <Package className="w-5 h-5 text-mascotera-turquesa" />
                      <div className="flex-1">
                        <p className="text-white">{selectedItem.item}</p>
                        <p className="text-xs text-gray-400">
                          {selectedItem.cod_item} • {selectedItem.marca_nombre}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedItem(null)}
                        className="p-1 hover:bg-gray-700 rounded"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Producto nuevo */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-300">Nombre del producto</label>
                    <input
                      type="text"
                      value={itemNombre}
                      onChange={(e) => setItemNombre(e.target.value)}
                      required
                      placeholder="Nombre del producto solicitado"
                      className="w-full mt-1 px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-mascotera-turquesa"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-300">Marca (opcional)</label>
                    <input
                      type="text"
                      value={marca}
                      onChange={(e) => setMarca(e.target.value)}
                      placeholder="Marca solicitada"
                      className="w-full mt-1 px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-mascotera-turquesa"
                    />
                  </div>
                </div>
              )}

              {/* Cantidad y observaciones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-300">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={cantidad}
                    onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                    required
                    className="w-full mt-1 px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-mascotera-turquesa"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300">Observaciones (opcional)</label>
                  <input
                    type="text"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Ej: Cliente preguntó por presentación de 15kg"
                    className="w-full mt-1 px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-mascotera-turquesa"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting || (!esProductoNuevo && !selectedItem) || (esProductoNuevo && !itemNombre)}
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

        {/* Lista de ventas perdidas */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-semibold text-white">Últimos registros</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-mascotera-turquesa border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : ventas.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <PackageX className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay ventas perdidas registradas</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {ventas.map((venta) => (
                <div key={venta.id} className="p-4 hover:bg-gray-800/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        venta.es_producto_nuevo ? 'bg-pink-500/20' : 'bg-mascotera-amarillo/20'
                      }`}>
                        <Package className={`w-5 h-5 ${
                          venta.es_producto_nuevo ? 'text-pink-400' : 'text-mascotera-amarillo'
                        }`} />
                      </div>
                      <div>
                        <p className="text-white font-medium">{venta.item_nombre}</p>
                        <p className="text-sm text-gray-400">
                          {venta.cod_item || 'Producto nuevo'} • {venta.marca || '-'}
                        </p>
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
                    <p className="mt-2 text-sm text-gray-400 pl-13">{venta.observaciones}</p>
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
