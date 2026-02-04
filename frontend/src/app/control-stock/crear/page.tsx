'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Package,
  Search,
  Plus,
  X,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Calendar,
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'
import { controlStockApi } from '@/lib/api'
import {
  getProductosBuscablesDemo,
  type ProductoConteoDemo,
} from '@/lib/demo-data'

export default function CrearTareaControlStockPage() {
  const router = useRouter()
  const { token, user, isAuthenticated, isLoading } = useAuthStore()

  // Estados del formulario
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState('')

  // Estados de busqueda de productos
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProductoConteoDemo[]>([])
  const [searching, setSearching] = useState(false)
  const [productosSeleccionados, setProductosSeleccionados] = useState<ProductoConteoDemo[]>([])

  // Estados de envio
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Verificacion de autenticacion y permisos
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  // Verificar si es supervisor
  const esSupervisor = () => {
    const rolesSupervisor = ['supervisor', 'encargado', 'admin', 'gerente', 'gerencia']
    const userRol = (user?.rol || '').toLowerCase()
    const userPuesto = (user?.puesto || '').toLowerCase()
    return rolesSupervisor.some(r => userRol.includes(r) || userPuesto.includes(r))
  }

  // Buscar productos
  useEffect(() => {
    const buscar = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([])
        return
      }

      setSearching(true)
      try {
        const isDemo = token?.startsWith('demo-token')

        if (isDemo) {
          // Simular busqueda en demo
          await new Promise(resolve => setTimeout(resolve, 300))
          const results = getProductosBuscablesDemo(searchQuery)
          // Filtrar productos ya seleccionados
          setSearchResults(results.filter(r =>
            !productosSeleccionados.some(p => p.cod_item === r.cod_item)
          ))
        } else {
          const results = await controlStockApi.buscarProductos(token!, searchQuery)
          setSearchResults(results.filter((r: any) =>
            !productosSeleccionados.some(p => p.cod_item === r.cod_item)
          ))
        }
      } catch (err) {
        console.error('Error buscando:', err)
      } finally {
        setSearching(false)
      }
    }

    const timeoutId = setTimeout(buscar, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, token, productosSeleccionados])

  const handleAgregarProducto = (producto: ProductoConteoDemo) => {
    setProductosSeleccionados(prev => [...prev, producto])
    setSearchResults(prev => prev.filter(p => p.cod_item !== producto.cod_item))
    setSearchQuery('')
  }

  const handleQuitarProducto = (codItem: string) => {
    setProductosSeleccionados(prev => prev.filter(p => p.cod_item !== codItem))
  }

  const handleCrearTarea = async () => {
    // Validaciones
    if (!titulo.trim()) {
      setError('El titulo es requerido')
      return
    }
    if (!fechaVencimiento) {
      setError('La fecha de vencimiento es requerida')
      return
    }
    if (productosSeleccionados.length === 0) {
      setError('Debes seleccionar al menos un producto')
      return
    }

    setCreando(true)
    setError('')

    try {
      const isDemo = token?.startsWith('demo-token')

      if (isDemo) {
        // Simular creacion en demo
        await new Promise(resolve => setTimeout(resolve, 500))
        setSuccess('Tarea de control de stock creada correctamente')
        setTimeout(() => router.push('/tareas'), 1500)
      } else {
        await controlStockApi.crearTarea(token!, {
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || undefined,
          fecha_vencimiento: fechaVencimiento,
          productos: productosSeleccionados.map(p => ({
            cod_item: p.cod_item,
            nombre: p.nombre,
            precio: p.precio,
            stock_sistema: p.stock_sistema,
          })),
        })
        setSuccess('Tarea de control de stock creada correctamente')
        setTimeout(() => router.push('/tareas'), 1500)
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear la tarea')
    } finally {
      setCreando(false)
    }
  }

  const formatPrecio = (precio: number) => {
    return precio.toLocaleString('es-AR')
  }

  // Fecha minima: hoy
  const hoy = new Date().toISOString().split('T')[0]

  // Loading inicial
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-mascotera-turquesa border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // Verificar permisos (solo en modo demo permite a todos)
  const isDemo = token?.startsWith('demo-token')
  if (!isDemo && !esSupervisor()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Sidebar />
        <main className="ml-64 p-8">
          <div className="glass rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Acceso Denegado</h2>
            <p className="text-gray-400">Solo supervisores y encargados pueden crear tareas de control de stock.</p>
            <button
              onClick={() => router.push('/tareas')}
              className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Volver a Tareas
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Sidebar />

      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/tareas')}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Package className="w-7 h-7 text-green-400" />
              Crear Tarea de Control de Stock
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Selecciona los productos a contar y define la fecha limite
            </p>
          </div>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
            <button onClick={() => setError('')} className="ml-auto">
              <X className="w-4 h-4 text-red-400" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-green-400">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          {/* Columna izquierda: Formulario */}
          <div className="space-y-6">
            {/* Datos de la tarea */}
            <div className="glass rounded-xl p-6">
              <h2 className="font-semibold text-white mb-4">Datos de la Tarea</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Titulo *
                  </label>
                  <input
                    type="text"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ej: Conteo de Alimentos Balanceados - Febrero 2024"
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-mascotera-turquesa focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descripcion (opcional)
                  </label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Instrucciones adicionales para el conteo..."
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white resize-none focus:border-mascotera-turquesa focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Fecha Limite *
                  </label>
                  <input
                    type="date"
                    value={fechaVencimiento}
                    onChange={(e) => setFechaVencimiento(e.target.value)}
                    min={hoy}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-mascotera-turquesa focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Buscar productos */}
            <div className="glass rounded-xl p-6">
              <h2 className="font-semibold text-white mb-4">Agregar Productos</h2>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre o codigo..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-mascotera-turquesa focus:outline-none"
                />
              </div>

              {/* Resultados de busqueda */}
              {searchQuery.length >= 2 && (
                <div className="mt-3 max-h-64 overflow-y-auto">
                  {searching ? (
                    <div className="p-4 text-center">
                      <div className="w-5 h-5 border-2 border-mascotera-turquesa border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <p className="p-4 text-center text-gray-400 text-sm">
                      No se encontraron productos
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {searchResults.map((producto) => (
                        <div
                          key={producto.cod_item}
                          className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800"
                        >
                          <div>
                            <p className="text-white text-sm">{producto.nombre}</p>
                            <p className="text-gray-400 text-xs">
                              {producto.cod_item} | Stock: {producto.stock_sistema} | ${formatPrecio(producto.precio)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleAgregarProducto(producto)}
                            className="p-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Columna derecha: Productos seleccionados */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">
                Productos Seleccionados ({productosSeleccionados.length})
              </h2>
            </div>

            {productosSeleccionados.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">
                  Busca y agrega productos para el conteo
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {productosSeleccionados.map((producto) => (
                  <div
                    key={producto.cod_item}
                    className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700"
                  >
                    <div className="flex-1">
                      <p className="text-white text-sm">{producto.nombre}</p>
                      <p className="text-gray-400 text-xs">
                        {producto.cod_item} | Stock actual: {producto.stock_sistema}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-300 text-sm">
                        ${formatPrecio(producto.precio)}
                      </span>
                      <button
                        onClick={() => handleQuitarProducto(producto.cod_item)}
                        className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Boton crear */}
            <div className="mt-6 pt-4 border-t border-gray-700">
              <button
                onClick={handleCrearTarea}
                disabled={creando || productosSeleccionados.length === 0 || !titulo || !fechaVencimiento}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-5 h-5" />
                {creando ? 'Creando...' : 'Crear Tarea de Control de Stock'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
