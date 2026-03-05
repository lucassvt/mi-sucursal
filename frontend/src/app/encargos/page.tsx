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
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'
import { encargosApi, itemsApi, dashboardApi } from '@/lib/api'

const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente', color: 'yellow' },
  { value: 'pedido_proveedor', label: 'Pedido al proveedor', color: 'blue' },
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

export default function EncargosPage() {
  const router = useRouter()
  const { token, user, isAuthenticated, isLoading } = useAuthStore()
  const [encargos, setEncargos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<string>('')
  const [filtroSucursal, setFiltroSucursal] = useState<number | undefined>(undefined)

  // Admin check
  const esAdminSuperior = (() => {
    const rolesAltos = ['admin', 'gerente', 'gerencia', 'supervisor', 'jefe', 'auditor']
    const userRol = (user?.rol || '').toLowerCase()
    const userPuesto = (user?.puesto || '').toLowerCase()
    return rolesAltos.some(r => userRol.includes(r) || userPuesto.includes(r))
  })()

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [productoNombre, setProductoNombre] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [fechaNecesaria, setFechaNecesaria] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [formSucursalId, setFormSucursalId] = useState<number | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)

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
    setSearchQuery(item.item || item.nombre)
    setShowResults(false)
    setProductoManual(false)
  }

  const useManualName = () => {
    setProductoNombre(searchQuery.trim())
    setShowResults(false)
    setProductoManual(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !productoNombre.trim()) return
    if (esAdminSuperior && !formSucursalId) return
    setSubmitting(true)
    try {
      await encargosApi.crear(token, {
        producto_nombre: productoNombre.trim(),
        cantidad,
        fecha_necesaria: fechaNecesaria ? new Date(fechaNecesaria).toISOString() : undefined,
        observaciones: observaciones.trim() || undefined,
        cliente_nombre: clienteNombre.trim() || undefined,
        sucursal_id: esAdminSuperior ? formSucursalId : undefined,
      })
      setProductoNombre('')
      setSearchQuery('')
      setCantidad(1)
      setFechaNecesaria('')
      setObservaciones('')
      setClienteNombre('')
      setFormSucursalId(undefined)
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-mascotera-turquesa/20 flex items-center justify-center">
              <Package className="w-6 h-6 text-mascotera-turquesa" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Encargos</h1>
              <p className="text-gray-400 text-sm">Gestión de productos por encargo</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mascotera-turquesa text-black font-medium hover:bg-mascotera-turquesa/80 transition-all"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancelar' : 'Nuevo Encargo'}
          </button>
        </div>

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
                    placeholder="Buscar producto..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-mascotera-turquesa"
                  />
                </div>
                {productoNombre && (
                  <p className="mt-1 text-xs text-mascotera-turquesa">
                    Seleccionado: {productoNombre}
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

              {/* Cliente */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Cliente</label>
                <input
                  type="text"
                  value={clienteNombre}
                  onChange={e => setClienteNombre(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-mascotera-turquesa"
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

              {/* Fecha necesaria */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Fecha necesaria para el cliente</label>
                <input
                  type="date"
                  value={fechaNecesaria}
                  onChange={e => setFechaNecesaria(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-mascotera-turquesa"
                />
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
                disabled={submitting || !productoNombre.trim() || (esAdminSuperior && !formSucursalId)}
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
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Producto</th>
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
                      <td className="px-4 py-3 text-white font-medium">{enc.producto_nombre}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm">{enc.cliente_nombre || '-'}</td>
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
      </main>
    </div>
  )
}
