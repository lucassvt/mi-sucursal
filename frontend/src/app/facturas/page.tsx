'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Search,
  Plus,
  AlertCircle,
  Check,
  X,
  AlertTriangle,
  Upload,
  Image,
  UserPlus,
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'
import { facturasApi } from '@/lib/api'
import {
  getProveedoresBuscablesDemo,
  getFacturasDemo,
} from '@/lib/demo-data'

export default function FacturasPage() {
  const router = useRouter()
  const { token, user, isAuthenticated, isLoading } = useAuthStore()
  const [facturas, setFacturas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Form
  const [showForm, setShowForm] = useState(false)
  const [proveedorQuery, setProveedorQuery] = useState('')
  const [proveedorResults, setProveedorResults] = useState<any[]>([])
  const [searchingProv, setSearchingProv] = useState(false)
  const [selectedProveedor, setSelectedProveedor] = useState<any>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [numeroFactura, setNumeroFactura] = useState('')
  const [imagenBase64, setImagenBase64] = useState<string | null>(null)
  const [imagenNombre, setImagenNombre] = useState('')
  const [tieneInconsistencia, setTieneInconsistencia] = useState(false)
  const [detalleInconsistencia, setDetalleInconsistencia] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [fechaFactura, setFechaFactura] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Modal nuevo proveedor
  const [showNuevoProveedor, setShowNuevoProveedor] = useState(false)
  const [nuevoProvNombre, setNuevoProvNombre] = useState('')
  const [nuevoProvCuit, setNuevoProvCuit] = useState('')
  const [creandoProveedor, setCreandoProveedor] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)

  const isDemo = token?.startsWith('demo-token')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (token) loadFacturas()
  }, [token])

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-clear mensajes
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  const loadFacturas = async () => {
    setLoading(true)
    try {
      if (isDemo) {
        setFacturas(getFacturasDemo())
      } else {
        const data = await facturasApi.list(token!)
        setFacturas(data)
      }
    } catch (error) {
      console.error('Error loading facturas:', error)
      setFacturas(getFacturasDemo())
    } finally {
      setLoading(false)
    }
  }

  const handleBuscarProveedor = async (query: string) => {
    setProveedorQuery(query)
    if (query.length < 2) {
      setProveedorResults([])
      setShowDropdown(false)
      return
    }

    setSearchingProv(true)
    setShowDropdown(true)
    try {
      if (isDemo) {
        setProveedorResults(getProveedoresBuscablesDemo(query))
      } else {
        const data = await facturasApi.buscarProveedores(token!, query)
        setProveedorResults(data)
      }
    } catch (err) {
      console.error('Error buscando proveedores:', err)
      setProveedorResults(getProveedoresBuscablesDemo(query))
    } finally {
      setSearchingProv(false)
    }
  }

  const handleSelectProveedor = (prov: any) => {
    setSelectedProveedor(prov)
    setProveedorQuery(prov.nombre)
    setShowDropdown(false)
  }

  const handleCrearProveedor = async () => {
    if (!nuevoProvNombre.trim()) return

    setCreandoProveedor(true)
    try {
      if (isDemo) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const nuevo = { id: 999, nombre: nuevoProvNombre.trim().toUpperCase(), origen: 'custom' }
        setSelectedProveedor(nuevo)
        setProveedorQuery(nuevo.nombre)
      } else {
        const nuevo = await facturasApi.crearProveedor(token!, {
          nombre: nuevoProvNombre.trim(),
          cuit: nuevoProvCuit || undefined,
        })
        setSelectedProveedor(nuevo)
        setProveedorQuery(nuevo.nombre)
      }
      setShowNuevoProveedor(false)
      setNuevoProvNombre('')
      setNuevoProvCuit('')
      setSuccess('Proveedor creado correctamente')
    } catch (err: any) {
      setError(err.message || 'Error al crear proveedor')
    } finally {
      setCreandoProveedor(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar 5MB')
      return
    }

    setImagenNombre(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      setImagenBase64(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRegistrar = async () => {
    if (!selectedProveedor) {
      setError('Selecciona un proveedor')
      return
    }
    if (tieneInconsistencia && !detalleInconsistencia.trim()) {
      setError('Detalla la inconsistencia encontrada')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        proveedor_id: selectedProveedor.origen === 'dux' ? selectedProveedor.id : null,
        proveedor_custom_id: selectedProveedor.origen === 'custom' ? selectedProveedor.id : null,
        proveedor_nombre: selectedProveedor.nombre,
        numero_factura: numeroFactura || null,
        imagen_base64: imagenBase64,
        tiene_inconsistencia: tieneInconsistencia,
        detalle_inconsistencia: tieneInconsistencia ? detalleInconsistencia : null,
        observaciones: observaciones || null,
        fecha_factura: fechaFactura || null,
      }

      if (isDemo) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const nueva = {
          id: Date.now(),
          sucursal_id: user?.sucursal_id || 1,
          employee_id: user?.id || 0,
          proveedor_nombre: selectedProveedor.nombre,
          numero_factura: numeroFactura || null,
          tiene_inconsistencia: tieneInconsistencia,
          detalle_inconsistencia: tieneInconsistencia ? detalleInconsistencia : null,
          observaciones: observaciones || null,
          fecha_factura: fechaFactura || null,
          fecha_registro: new Date().toISOString(),
          employee_nombre: `${user?.nombre || 'Demo'} ${user?.apellido || ''}`.trim(),
        }
        setFacturas(prev => [nueva, ...prev])
      } else {
        await facturasApi.create(token!, payload)
        loadFacturas()
      }

      setSuccess(tieneInconsistencia
        ? 'Factura registrada. Se creo un descargo en auditoria por la inconsistencia.'
        : 'Factura registrada correctamente')
      resetForm()
    } catch (err: any) {
      setError(err.message || 'Error al registrar factura')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setSelectedProveedor(null)
    setProveedorQuery('')
    setNumeroFactura('')
    setImagenBase64(null)
    setImagenNombre('')
    setTieneInconsistencia(false)
    setDetalleInconsistencia('')
    setObservaciones('')
    setFechaFactura('')
    if (fileInputRef.current) fileInputRef.current.value = ''
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Facturas Proveedores</h1>
            <p className="text-gray-400">Registro de facturas recibidas</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mascotera-turquesa text-black font-semibold hover:bg-mascotera-turquesa/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Registrar
          </button>
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
            <Check className="w-5 h-5" />
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Formulario */}
        {showForm && (
          <div className="glass rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-mascotera-turquesa" />
              Nueva Factura
            </h2>

            <div className="space-y-4">
              {/* Buscar proveedor */}
              <div className="relative" ref={dropdownRef}>
                <label className="text-sm text-gray-400 mb-1 block">Proveedor *</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={proveedorQuery}
                      onChange={(e) => {
                        handleBuscarProveedor(e.target.value)
                        setSelectedProveedor(null)
                      }}
                      placeholder="Buscar proveedor..."
                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-mascotera-turquesa"
                    />
                    {selectedProveedor && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
                    )}
                  </div>
                  <button
                    onClick={() => setShowNuevoProveedor(true)}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 transition-colors text-sm"
                    title="Agregar proveedor nuevo"
                  >
                    <UserPlus className="w-4 h-4" />
                    Nuevo
                  </button>
                </div>

                {/* Dropdown resultados */}
                {showDropdown && (proveedorResults.length > 0 || searchingProv) && (
                  <div className="absolute z-20 w-full mt-1 glass rounded-lg border border-gray-700 max-h-48 overflow-y-auto">
                    {searchingProv ? (
                      <div className="p-3 text-center text-gray-400 text-sm">Buscando...</div>
                    ) : (
                      proveedorResults.map((prov, i) => (
                        <button
                          key={`${prov.origen}-${prov.id}-${i}`}
                          onClick={() => handleSelectProveedor(prov)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-800/50 text-white text-sm flex items-center justify-between"
                        >
                          <span>{prov.nombre}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            prov.origen === 'dux' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                          }`}>
                            {prov.origen === 'dux' ? 'DUX' : 'Custom'}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Nro factura + Fecha */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Nro. Factura</label>
                  <input
                    type="text"
                    value={numeroFactura}
                    onChange={(e) => setNumeroFactura(e.target.value)}
                    placeholder="FC-A-00012345"
                    className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-mascotera-turquesa"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Fecha factura</label>
                  <input
                    type="date"
                    value={fechaFactura}
                    onChange={(e) => setFechaFactura(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-mascotera-turquesa"
                  />
                </div>
              </div>

              {/* Imagen */}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Imagen de la factura</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    {imagenNombre || 'Subir imagen'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {imagenBase64 && (
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-lg border border-gray-700 overflow-hidden">
                        <img src={imagenBase64} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <button
                        onClick={() => {
                          setImagenBase64(null)
                          setImagenNombre('')
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                        className="text-gray-500 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Max 5MB. Formatos: JPG, PNG, PDF</p>
              </div>

              {/* Inconsistencia */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tieneInconsistencia}
                    onChange={(e) => setTieneInconsistencia(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 text-orange-500 focus:ring-orange-500"
                  />
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-gray-300">Esta factura tiene una inconsistencia</span>
                </label>
                {tieneInconsistencia && (
                  <textarea
                    value={detalleInconsistencia}
                    onChange={(e) => setDetalleInconsistencia(e.target.value)}
                    placeholder="Detalla la inconsistencia encontrada (faltantes, precios incorrectos, etc.)..."
                    rows={3}
                    className="w-full mt-2 px-4 py-2 rounded-lg bg-orange-500/5 border border-orange-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  />
                )}
              </div>

              {/* Observaciones */}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Observaciones</label>
                <input
                  type="text"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Observaciones adicionales (opcional)"
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-mascotera-turquesa"
                />
              </div>

              {/* Boton registrar */}
              <button
                onClick={handleRegistrar}
                disabled={submitting || !selectedProveedor}
                className="w-full px-6 py-3 rounded-lg bg-mascotera-turquesa text-black font-semibold hover:bg-mascotera-turquesa/90 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Guardando...' : 'Registrar Factura'}
              </button>
            </div>
          </div>
        )}

        {/* Modal nuevo proveedor */}
        {showNuevoProveedor && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="glass rounded-2xl p-6 w-full max-w-md border border-purple-500/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-purple-400" />
                  Nuevo Proveedor
                </h3>
                <button onClick={() => setShowNuevoProveedor(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Nombre *</label>
                  <input
                    type="text"
                    value={nuevoProvNombre}
                    onChange={(e) => setNuevoProvNombre(e.target.value)}
                    placeholder="Nombre del proveedor"
                    className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">CUIT (opcional)</label>
                  <input
                    type="text"
                    value={nuevoProvCuit}
                    onChange={(e) => setNuevoProvCuit(e.target.value)}
                    placeholder="XX-XXXXXXXX-X"
                    className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <button
                  onClick={handleCrearProveedor}
                  disabled={creandoProveedor || !nuevoProvNombre.trim()}
                  className="w-full px-4 py-2 rounded-lg bg-purple-500 text-white font-semibold hover:bg-purple-600 disabled:opacity-50 transition-colors"
                >
                  {creandoProveedor ? 'Creando...' : 'Crear Proveedor'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de facturas */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-semibold text-white">Ultimas facturas</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-mascotera-turquesa border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : facturas.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay facturas registradas</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/50">
              {facturas.map((f) => (
                <div key={f.id} className="p-4 hover:bg-gray-800/20 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        f.tiene_inconsistencia
                          ? 'bg-orange-500/20'
                          : 'bg-mascotera-turquesa/20'
                      }`}>
                        {f.tiene_inconsistencia
                          ? <AlertTriangle className="w-5 h-5 text-orange-400" />
                          : <FileText className="w-5 h-5 text-mascotera-turquesa" />
                        }
                      </div>
                      <div>
                        <p className="text-white font-medium">{f.proveedor_nombre}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          {f.numero_factura && <span>{f.numero_factura}</span>}
                          {f.numero_factura && <span>-</span>}
                          <span>{f.employee_nombre}</span>
                        </div>
                        {f.tiene_inconsistencia && f.detalle_inconsistencia && (
                          <p className="mt-1 text-sm text-orange-400/80">
                            {f.detalle_inconsistencia}
                          </p>
                        )}
                        {f.observaciones && (
                          <p className="mt-1 text-sm text-gray-500">{f.observaciones}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {f.tiene_inconsistencia && (
                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-400 mb-1">
                          Inconsistencia
                        </span>
                      )}
                      <p className="text-xs text-gray-400">
                        {f.fecha_factura
                          ? new Date(f.fecha_factura + 'T12:00:00').toLocaleDateString('es-AR')
                          : new Date(f.fecha_registro).toLocaleDateString('es-AR')
                        }
                      </p>
                    </div>
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
