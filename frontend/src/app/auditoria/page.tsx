'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  ShoppingCart,
  FileText,
  Users,
  Package,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  TrendingUp,
  Receipt,
  ArrowLeftRight,
  Wallet,
  BarChart3,
  MessageCircle,
  Plus,
  X,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Trophy,
  Building2,
  ChevronDown,
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'
import { tareasApi, auditoriaApi, ajustesStockApi, controlStockApi, descargosApi, auditoriaMensualApi, tareasResumenApi, reportesPdfApi } from '@/lib/api'
import {
  CATEGORIAS_DESCARGO,
  type DescargoAuditoriaDemo,
  type CategoriaDescargo,
  type AuditoriaMensualDemo,
  type AuditoriaMensualSucursalDemo,
} from '@/lib/demo-data'

interface TareaAuditoria {
  id: number
  titulo: string
  dias_sin_completar: number
  estado: string
}

interface DatosAuditoria {
  ordenLimpieza: {
    porcentajePendientes: number
    totalTareas: number
    pendientes: number
    tareasAtrasadas: TareaAuditoria[]
  }
  pedidos: {
    porcentajeRechazados: number
    totalPedidos: number
    rechazados: number
    sinDatos?: boolean
  }
  gestionAdministrativa: {
    porcentajeGastosSobreVentas: number
    gastosMes: number
    ventasMes: number
    pedidosPendientesFacturar: number
    transferenciasPendientes: number
    transferenciasManuales?: boolean
  }
  clubMascotera: {
    porcentajeVentasConsumidorFinal: number
    ticketsConsumidorFinal: number
    ticketsTotal: number
    montoConsumidorFinal: number
    montoTotal: number
    metaPorcentaje?: number
    cumpleMeta?: boolean
    periodo?: string
  }
  controlStockCaja: {
    diferenciaCaja: number
    valorizacionAjusteStock: number
    totalAjustes?: number
    ingresos?: number
    egresos?: number
    mesesDisponibles?: string[]
    porDeposito?: Array<{
      deposito: string
      total_ajustes: number
      cantidad_ingresos: number
      cantidad_egresos: number
    }>
    // Conteos de stock
    conteosPendientes?: number
    conteosRevisadosMes?: number
    diferenciaTotalMes?: number
    valorizacionDiferenciaMes?: number
    conteosPorCerrar?: number
    ultimosConteos?: Array<{
      id: number
      fecha_conteo: string
      estado: string
      empleado_nombre: string
      productos_con_diferencia: number
      valorizacion_diferencia: number
    }>
  }
}

const CATEGORIAS = [
  {
    id: 'orden_limpieza',
    label: 'Orden y Limpieza',
    icon: Sparkles,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/30',
  },
  {
    id: 'pedidos',
    label: 'Plataforma de Pedidos',
    icon: ShoppingCart,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
  },
  {
    id: 'gestion_administrativa',
    label: 'Gestión Administrativa',
    icon: FileText,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30',
  },
  {
    id: 'club_mascotera',
    label: 'Servicios Club La Mascotera',
    icon: Users,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
  },
  {
    id: 'control_stock_caja',
    label: 'Control de Stock y Caja',
    icon: Package,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
  },
]

export default function AuditoriaPage() {
  const router = useRouter()
  const { token, user, isAuthenticated, isLoading } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null)
  const [datos, setDatos] = useState<DatosAuditoria | null>(null)

  // Estados para descargos
  const [descargos, setDescargos] = useState<DescargoAuditoriaDemo[]>([])
  const [showDescargoModal, setShowDescargoModal] = useState(false)
  const [showDescargosPanel, setShowDescargosPanel] = useState(false)
  const [creandoDescargo, setCreandoDescargo] = useState(false)
  const [nuevoDescargo, setNuevoDescargo] = useState({
    categoria: 'orden_limpieza' as CategoriaDescargo,
    titulo: '',
    descripcion: '',
    periodo: '',
  })
  const [descargoSeleccionado, setDescargoSeleccionado] = useState<DescargoAuditoriaDemo | null>(null)
  const [comentarioAuditor, setComentarioAuditor] = useState('')
  const [procesandoDescargo, setProcesandoDescargo] = useState(false)
  const [filtroEstadoDescargo, setFiltroEstadoDescargo] = useState<string>('todos')

  // Estado para auditoría mensual (histórico de puntajes)
  const [historicoMensual, setHistoricoMensual] = useState<AuditoriaMensualDemo[]>([])

  // Estado para historial de tareas y reportes PDF
  const [historialTareas, setHistorialTareas] = useState<any[]>([])
  const [reportesPdf, setReportesPdf] = useState<any[]>([])

  // Estado para conteos de stock en auditoria
  const [conteosAuditoria, setConteosAuditoria] = useState<any[]>([])
  const [cerrandoConteo, setCerrandoConteo] = useState<number | null>(null)

  // Estado para vista encargado - todas las sucursales
  const [auditoriaTodas, setAuditoriaTodas] = useState<AuditoriaMensualSucursalDemo[]>([])
  const [loadingTodas, setLoadingTodas] = useState(true)
  const [sucursalExpandida, setSucursalExpandida] = useState<number | null>(null)

  // Selector de sucursal para encargados
  const [sucursalesAuditoria, setSucursalesAuditoria] = useState<{ id: number; nombre: string }[]>([])
  const [sucursalAuditoriaId, setSucursalAuditoriaId] = useState<number | null>(null)

  // Verificar si es encargado/auditor
  const esEncargado = (() => {
    const rolesEncargado = ['encargado', 'admin', 'gerente', 'gerencia', 'auditor', 'supervisor', 'jefe']
    const userRol = (user?.rol || '').toLowerCase()
    const userPuesto = (user?.puesto || '').toLowerCase()
    return rolesEncargado.some(r => userRol.includes(r) || userPuesto.includes(r))
  })()

  const loadDescargos = async () => {
    try {
      const data = await descargosApi.list(token!)
      setDescargos(data)
    } catch (error) {
      console.error('Error loading descargos:', error)
      setDescargos([])
    }
  }

  const loadHistoricoMensual = async (sucursalId?: number) => {
    try {
      let data
      if (sucursalId && esEncargado) {
        data = await auditoriaMensualApi.listBySucursal(token!, sucursalId, 4)
      } else {
        data = await auditoriaMensualApi.list(token!, 4)
      }
      setHistoricoMensual(data)
    } catch (error) {
      console.error('Error loading historico mensual:', error)
      setHistoricoMensual([])
    }
  }

  const loadHistorialTareas = async () => {
    try {
      const data = await tareasResumenApi.list(token!, undefined, 8)
      setHistorialTareas(data)
    } catch (error) {
      console.error('Error loading historial tareas:', error)
      setHistorialTareas([])
    }
  }

  const loadReportesPdf = async (sucursalId?: number) => {
    try {
      const data = await reportesPdfApi.list(token!, sucursalId)
      setReportesPdf(data)
    } catch (error) {
      console.error('Error loading reportes:', error)
      setReportesPdf([])
    }
  }


  const handleVerPdf = async (reporteId: number) => {
    try {
      const res = await fetch(reportesPdfApi.getUrl(reporteId), {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Error al descargar PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (error) {
      console.error('Error descargando PDF:', error)
      alert('Error al abrir el PDF')
    }
  }

  const handleCerrarConteo = async (conteoId: number) => {
    if (!confirm('¿Cerrar este conteo? La tarea se marcará como completada.')) return
    setCerrandoConteo(conteoId)
    try {
      await controlStockApi.cerrarConteo(token!, conteoId)
      // Recargar conteos y resumen
      try {
        const conteosList = await controlStockApi.listarConteos(token!)
        setConteosAuditoria(conteosList || [])
        const resumen = await controlStockApi.resumenAuditoria(token!)
        if (datos) {
          setDatos({
            ...datos,
            controlStockCaja: {
              ...datos.controlStockCaja,
              conteosPorCerrar: resumen.conteos_por_cerrar ?? 0,
              conteosRevisadosMes: resumen.conteos_revisados_mes ?? 0,
            }
          })
        }
      } catch (e) {
        console.log('Error recargando conteos:', e)
      }
    } catch (error) {
      console.error('Error cerrando conteo:', error)
      alert('Error al cerrar el conteo')
    } finally {
      setCerrandoConteo(null)
    }
  }

  const loadAuditoriaTodas = async () => {
    setLoadingTodas(true)
    try {
      const data = await auditoriaMensualApi.listTodas(token!)
      setAuditoriaTodas(data)
    } catch (error) {
      console.error('Error loading auditoria todas:', error)
      setAuditoriaTodas([])
    } finally {
      setLoadingTodas(false)
    }
  }

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (token) {
      if (esEncargado) {
        // Cargar lista de sucursales para selector
        tareasApi.sucursales(token!).then((data) => {
          setSucursalesAuditoria(data)
          // Si el usuario no tiene sucursal asignada, auto-seleccionar la primera
          if (!user?.sucursal_id && data.length > 0) {
            setSucursalAuditoriaId(data[0].id)
          } else {
            // Si tiene sucursal, cargar datos normalmente
            loadData()
            loadHistoricoMensual()
            loadReportesPdf()
          }
        }).catch(() => {
          loadData()
          loadHistoricoMensual()
          loadReportesPdf()
        })
        loadAuditoriaTodas()
      } else {
        loadData()
        loadHistoricoMensual()
        loadReportesPdf()
      }
      loadDescargos()
      loadHistorialTareas()
    }
  }, [token])

  // Recargar datos cuando cambie la sucursal seleccionada en auditoría
  useEffect(() => {
    if (token && sucursalAuditoriaId) {
      loadData(sucursalAuditoriaId)
      loadHistoricoMensual(sucursalAuditoriaId)
      loadReportesPdf(sucursalAuditoriaId)
    }
  }, [sucursalAuditoriaId])

  const handleCrearDescargo = async () => {
    if (!nuevoDescargo.titulo.trim() || !nuevoDescargo.descripcion.trim()) return

    setCreandoDescargo(true)
    try {
      await descargosApi.create(token!, {
        categoria: nuevoDescargo.categoria,
        titulo: nuevoDescargo.titulo.trim(),
        descripcion: nuevoDescargo.descripcion.trim(),
        periodo: nuevoDescargo.periodo || undefined,
      })
      loadDescargos()
      setShowDescargoModal(false)
      setNuevoDescargo({ categoria: 'orden_limpieza', titulo: '', descripcion: '', periodo: '' })
    } catch (error) {
      console.error('Error creando descargo:', error)
      alert('Error al crear el descargo')
    } finally {
      setCreandoDescargo(false)
    }
  }

  const handleResolverDescargo = async (accion: 'aprobar' | 'rechazar') => {
    if (!descargoSeleccionado) return

    setProcesandoDescargo(true)
    try {
      await descargosApi.resolver(token!, descargoSeleccionado.id, {
        accion,
        comentario: comentarioAuditor || undefined,
      })
      loadDescargos()
      setDescargoSeleccionado(null)
      setComentarioAuditor('')
    } catch (error) {
      console.error('Error resolviendo descargo:', error)
      alert('Error al procesar el descargo')
    } finally {
      setProcesandoDescargo(false)
    }
  }

  const descargosPendientes = descargos.filter(d => d.estado === 'pendiente')
  const descargosFiltrados = filtroEstadoDescargo === 'todos'
    ? descargos
    : descargos.filter(d => d.estado === filtroEstadoDescargo)

  const loadData = async (sucursalId?: number) => {
    const targetSucursal = sucursalId || user?.sucursal_id || 7
    try {
      const [tareasData, clubMascoteraData, ajustesStockData, gestionAdminData] = await Promise.all([
        tareasApi.list(token!).catch(() => []),
        auditoriaApi.clubMascotera(token!, targetSucursal).catch(() => null),
        ajustesStockApi.resumen(token!).catch(() => null),
        auditoriaApi.gestionAdministrativa(token!, targetSucursal).catch(() => null),
      ])

      // Procesar tareas de Orden y Limpieza
      const tareasOrdenLimpieza = tareasData.filter((t: any) => t.categoria === 'ORDEN Y LIMPIEZA')
      const pendientesOL = tareasOrdenLimpieza.filter((t: any) => t.estado !== 'completada')
      const tareasAtrasadas = pendientesOL
        .map((t: any) => {
          const fechaAsignacion = new Date(t.fecha_asignacion)
          const hoy = new Date()
          const diasSinCompletar = Math.floor((hoy.getTime() - fechaAsignacion.getTime()) / (1000 * 60 * 60 * 24))
          return {
            id: t.id,
            titulo: t.titulo,
            dias_sin_completar: diasSinCompletar,
            estado: t.estado,
          }
        })
        .filter((t: TareaAuditoria) => t.dias_sin_completar > 5)

      // Procesar datos de Club La Mascotera
      const clubMascotera = clubMascoteraData ? {
        porcentajeVentasConsumidorFinal: clubMascoteraData.porcentaje_consumidor_final,
        ticketsConsumidorFinal: clubMascoteraData.facturas_consumidor_final,
        ticketsTotal: clubMascoteraData.total_facturas,
        montoConsumidorFinal: 0,
        montoTotal: 0,
        metaPorcentaje: clubMascoteraData.meta_porcentaje,
        cumpleMeta: clubMascoteraData.cumple_meta,
        periodo: clubMascoteraData.periodo,
      } : {
        porcentajeVentasConsumidorFinal: 0,
        ticketsConsumidorFinal: 0,
        ticketsTotal: 0,
        montoConsumidorFinal: 0,
        montoTotal: 0,
      }

      // Cargar datos de conteos de stock
      let resumenConteos: any = null
      try {
        resumenConteos = await controlStockApi.resumenAuditoria(token!)
      } catch (e) {
        console.log('Conteos no disponibles:', e)
      }

      // Cargar lista de conteos para auditoria (aprobados + cerrados + enviados)
      try {
        const conteosList = await controlStockApi.listarConteos(token!)
        setConteosAuditoria(conteosList || [])
      } catch (e) {
        console.log('Lista conteos no disponible:', e)
      }

      const controlStockCaja = {
        diferenciaCaja: 0,
        valorizacionAjusteStock: ajustesStockData?.cantidad_neta || 0,
        totalAjustes: ajustesStockData?.total_ajustes || 0,
        ingresos: ajustesStockData?.total_ingresos || 0,
        egresos: ajustesStockData?.total_egresos || 0,
        mesesDisponibles: ajustesStockData?.meses_disponibles || [],
        porDeposito: ajustesStockData?.por_deposito || [],
        conteosPendientes: resumenConteos?.conteos_pendientes ?? 0,
        conteosRevisadosMes: resumenConteos?.conteos_revisados_mes ?? 0,
        diferenciaTotalMes: resumenConteos?.diferencia_total_mes ?? 0,
        valorizacionDiferenciaMes: resumenConteos?.valorizacion_diferencia_mes ?? 0,
        conteosPorCerrar: resumenConteos?.conteos_por_cerrar ?? 0,
        ultimosConteos: resumenConteos?.ultimos_conteos?.map((c: any) => ({
          id: c.id,
          fecha_conteo: c.fecha_conteo,
          estado: c.estado,
          empleado_nombre: c.empleado_nombre,
          productos_con_diferencia: c.productos_con_diferencia,
          valorizacion_diferencia: c.valorizacion_diferencia,
        })) || [],
      }

      // Procesar datos de Gestión Administrativa
      const gestionAdministrativa = gestionAdminData ? {
        porcentajeGastosSobreVentas: gestionAdminData.porcentaje_gastos_ventas,
        gastosMes: gestionAdminData.gastos_mes,
        ventasMes: gestionAdminData.ventas_mes,
        pedidosPendientesFacturar: gestionAdminData.pedidos_pendientes_facturar,
        transferenciasPendientes: gestionAdminData.transferencias_pendientes,
        transferenciasManuales: gestionAdminData.transferencias_manual,
      } : {
        porcentajeGastosSobreVentas: 0,
        gastosMes: 0,
        ventasMes: 0,
        pedidosPendientesFacturar: 0,
        transferenciasPendientes: 0,
        transferenciasManuales: true,
      }

      setDatos({
        ordenLimpieza: {
          porcentajePendientes: tareasOrdenLimpieza.length > 0
            ? Math.round((pendientesOL.length / tareasOrdenLimpieza.length) * 100)
            : 0,
          totalTareas: tareasOrdenLimpieza.length,
          pendientes: pendientesOL.length,
          tareasAtrasadas,
        },
        pedidos: {
          porcentajeRechazados: 0,
          totalPedidos: 0,
          rechazados: 0,
          sinDatos: true,
        },
        gestionAdministrativa,
        clubMascotera,
        controlStockCaja,
      })
    } catch (error) {
      console.error('Error loading data:', error)
      setDatos(null)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const getColorByPercentage = (value: number, inverted: boolean = false) => {
    if (inverted) {
      // Para valores donde menor es mejor (rechazados, gastos)
      if (value <= 10) return 'text-green-400'
      if (value <= 20) return 'text-yellow-400'
      return 'text-red-400'
    } else {
      // Para valores donde mayor es mejor
      if (value >= 80) return 'text-green-400'
      if (value >= 50) return 'text-yellow-400'
      return 'text-red-400'
    }
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Auditoría</h1>
            <p className="text-gray-400">
              {esEncargado
                ? 'Rendimiento de todas las sucursales'
                : 'Control y seguimiento de indicadores de la sucursal'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Selector de Sucursal - Solo para Encargados */}
            {esEncargado && sucursalesAuditoria.length > 0 && (
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-mascotera-turquesa" />
                <div className="relative">
                  <select
                    value={sucursalAuditoriaId || ''}
                    onChange={(e) => {
                      const id = parseInt(e.target.value)
                      if (id) setSucursalAuditoriaId(id)
                    }}
                    className="appearance-none bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-mascotera-turquesa focus:border-transparent min-w-[200px] text-sm"
                  >
                    {user?.sucursal_id && (
                      <option value="">Mi sucursal ({user?.sucursal_nombre})</option>
                    )}
                    {sucursalesAuditoria.map(suc => (
                      <option key={suc.id} value={suc.id}>
                        {suc.nombre}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Botón para crear descargo (solo vendedores) */}
            {!esEncargado && (
              <button
                onClick={() => setShowDescargoModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Hacer Descargo
              </button>
            )}

            {/* Botón para ver descargos (encargados/auditores) */}
            {esEncargado && (
              <button
                onClick={() => setShowDescargosPanel(true)}
                className="relative flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-lg transition-colors"
              >
                <Eye className="w-5 h-5" />
                Ver Descargos
                {descargosPendientes.length > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {descargosPendientes.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Modal Crear Descargo */}
        {showDescargoModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="glass rounded-2xl p-6 w-full max-w-lg mx-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <MessageCircle className="w-6 h-6 text-blue-400" />
                    Nuevo Descargo
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Justifica una observación de auditoría
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDescargoModal(false)
                    setNuevoDescargo({ categoria: 'orden_limpieza', titulo: '', descripcion: '', periodo: '' })
                  }}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Categoría */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Categoría *
                  </label>
                  <select
                    value={nuevoDescargo.categoria}
                    onChange={(e) => setNuevoDescargo({ ...nuevoDescargo, categoria: e.target.value as CategoriaDescargo })}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  >
                    {CATEGORIAS_DESCARGO.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mes de auditoría */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Mes de auditoría
                  </label>
                  <select
                    value={nuevoDescargo.periodo}
                    onChange={(e) => setNuevoDescargo({ ...nuevoDescargo, periodo: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Seleccionar mes...</option>
                    {(() => {
                      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
                      const opciones = []
                      const hoy = new Date()
                      for (let i = 0; i < 4; i++) {
                        const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
                        const periodo = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
                        opciones.push(
                          <option key={periodo} value={periodo}>
                            {meses[fecha.getMonth()]} {fecha.getFullYear()}
                          </option>
                        )
                      }
                      return opciones
                    })()}
                  </select>
                </div>

                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Título del descargo *
                  </label>
                  <input
                    type="text"
                    value={nuevoDescargo.titulo}
                    onChange={(e) => setNuevoDescargo({ ...nuevoDescargo, titulo: e.target.value })}
                    placeholder="Ej: Diferencia de caja día 15/01"
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descripción / Justificación *
                  </label>
                  <textarea
                    value={nuevoDescargo.descripcion}
                    onChange={(e) => setNuevoDescargo({ ...nuevoDescargo, descripcion: e.target.value })}
                    placeholder="Explica detalladamente la situación y la justificación..."
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowDescargoModal(false)
                    setNuevoDescargo({ categoria: 'orden_limpieza', titulo: '', descripcion: '', periodo: '' })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCrearDescargo}
                  disabled={creandoDescargo || !nuevoDescargo.titulo.trim() || !nuevoDescargo.descripcion.trim()}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creandoDescargo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Enviar Descargo
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Panel de Descargos (Encargado/Auditor) */}
        {showDescargosPanel && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="glass rounded-2xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <MessageCircle className="w-6 h-6 text-purple-400" />
                    Descargos de Auditoría
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Revisa y resuelve los descargos del personal
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDescargosPanel(false)
                    setDescargoSeleccionado(null)
                  }}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {descargoSeleccionado ? (
                // Detalle del descargo seleccionado
                <div className="space-y-4">
                  <button
                    onClick={() => setDescargoSeleccionado(null)}
                    className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    ← Volver a la lista
                  </button>

                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-xs text-purple-400 uppercase">
                          {CATEGORIAS_DESCARGO.find(c => c.id === descargoSeleccionado.categoria)?.label}
                          {descargoSeleccionado.periodo && (() => {
                            const [y, m] = descargoSeleccionado.periodo.split('-')
                            const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
                            return ` · ${meses[parseInt(m) - 1]} ${y}`
                          })()}
                        </span>
                        <h3 className="text-lg font-medium text-white mt-1">
                          {descargoSeleccionado.titulo}
                        </h3>
                        <p className="text-sm text-gray-400">
                          Por: {descargoSeleccionado.creado_por_nombre} - {new Date(descargoSeleccionado.fecha_descargo).toLocaleDateString('es-AR')}
                        </p>
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400">
                        Pendiente
                      </span>
                    </div>

                    <div className="bg-gray-800/50 rounded-lg p-4 mt-4">
                      <p className="text-gray-300 whitespace-pre-wrap">{descargoSeleccionado.descripcion}</p>
                    </div>
                  </div>

                  {/* Formulario de resolución */}
                  <div className="space-y-4 pt-4 border-t border-gray-700">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Comentario del auditor (opcional)
                      </label>
                      <textarea
                        value={comentarioAuditor}
                        onChange={(e) => setComentarioAuditor(e.target.value)}
                        placeholder="Observaciones o motivo de la resolución..."
                        rows={2}
                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleResolverDescargo('rechazar')}
                        disabled={procesandoDescargo}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <ThumbsDown className="w-5 h-5" />
                        Rechazar
                      </button>
                      <button
                        onClick={() => handleResolverDescargo('aprobar')}
                        disabled={procesandoDescargo}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {procesandoDescargo ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <ThumbsUp className="w-5 h-5" />
                        )}
                        Aprobar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // Lista de descargos
                <div className="space-y-4">
                  {/* Filtros */}
                  <div className="flex gap-2">
                    {['todos', 'pendiente', 'aprobado', 'rechazado'].map((estado) => (
                      <button
                        key={estado}
                        onClick={() => setFiltroEstadoDescargo(estado)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          filtroEstadoDescargo === estado
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {estado === 'todos' ? 'Todos' :
                         estado === 'pendiente' ? `Pendientes (${descargos.filter(d => d.estado === 'pendiente').length})` :
                         estado === 'aprobado' ? `Aprobados (${descargos.filter(d => d.estado === 'aprobado').length})` :
                         `Rechazados (${descargos.filter(d => d.estado === 'rechazado').length})`}
                      </button>
                    ))}
                  </div>

                  {/* Lista */}
                  {descargosFiltrados.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No hay descargos</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {descargosFiltrados.map((descargo) => (
                        <div
                          key={descargo.id}
                          className={`p-4 rounded-xl border transition-colors ${
                            descargo.estado === 'pendiente'
                              ? 'bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer'
                              : descargo.estado === 'aprobado'
                              ? 'bg-green-500/5 border-green-500/30'
                              : 'bg-red-500/5 border-red-500/30'
                          }`}
                          onClick={() => descargo.estado === 'pendiente' && setDescargoSeleccionado(descargo)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-gray-500 uppercase">
                                  {CATEGORIAS_DESCARGO.find(c => c.id === descargo.categoria)?.label}
                                  {descargo.periodo && (() => {
                                    const [y, m] = descargo.periodo.split('-')
                                    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
                                    return ` · ${meses[parseInt(m) - 1]} ${y}`
                                  })()}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs ${
                                  descargo.estado === 'pendiente'
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : descargo.estado === 'aprobado'
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {descargo.estado === 'pendiente' ? 'Pendiente' :
                                   descargo.estado === 'aprobado' ? 'Aprobado' : 'Rechazado'}
                                </span>
                              </div>
                              <h4 className="text-white font-medium">{descargo.titulo}</h4>
                              <p className="text-sm text-gray-400 mt-1">
                                {descargo.creado_por_nombre} - {new Date(descargo.fecha_descargo).toLocaleDateString('es-AR')}
                              </p>
                              <p className="text-sm text-gray-300 mt-2 line-clamp-2">{descargo.descripcion}</p>
                              {descargo.comentario_auditor && (
                                <p className="text-xs text-gray-400 mt-2 italic">
                                  💬 Auditor: {descargo.comentario_auditor}
                                </p>
                              )}
                            </div>
                            {descargo.estado === 'pendiente' && (
                              <span className="text-purple-400 text-sm">Ver →</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== VISTA ENCARGADO: Tabla de sucursales ===== */}
        {esEncargado && (
          <div className="mb-6">
            {loadingTodas ? (
              <div className="glass rounded-2xl p-8 text-center">
                <div className="w-8 h-8 border-2 border-mascotera-turquesa border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : auditoriaTodas.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center">
                <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No hay datos de auditoría mensual cargados</p>
              </div>
            ) : (
              <>
                {/* Cards resumen */}
                {(() => {
                  const todasConUltimo = auditoriaTodas.filter(s => s.periodos.length > 0)
                  const promedioGeneral = todasConUltimo.length > 0
                    ? Math.round(todasConUltimo.reduce((sum, s) => sum + (s.periodos[0]?.puntaje_total || 0), 0) / todasConUltimo.length * 10) / 10
                    : 0
                  const excelentes = todasConUltimo.filter(s => (s.periodos[0]?.puntaje_total || 0) >= 80).length
                  const regulares = todasConUltimo.filter(s => {
                    const p = s.periodos[0]?.puntaje_total || 0
                    return p >= 40 && p < 60
                  }).length
                  const bajos = todasConUltimo.filter(s => (s.periodos[0]?.puntaje_total || 0) < 40).length

                  return (
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      <div className="glass rounded-xl p-4 border border-indigo-500/30">
                        <p className="text-sm text-gray-400">Promedio General</p>
                        <p className={`text-3xl font-bold mt-1 ${
                          promedioGeneral >= 80 ? 'text-green-400' :
                          promedioGeneral >= 60 ? 'text-yellow-400' :
                          promedioGeneral >= 40 ? 'text-orange-400' : 'text-red-400'
                        }`}>{promedioGeneral}</p>
                      </div>
                      <div className="glass rounded-xl p-4 border border-green-500/30">
                        <p className="text-sm text-gray-400">Excelentes (80+)</p>
                        <p className="text-3xl font-bold mt-1 text-green-400">{excelentes}</p>
                      </div>
                      <div className="glass rounded-xl p-4 border border-orange-500/30">
                        <p className="text-sm text-gray-400">Regulares (40-59)</p>
                        <p className="text-3xl font-bold mt-1 text-orange-400">{regulares}</p>
                      </div>
                      <div className="glass rounded-xl p-4 border border-red-500/30">
                        <p className="text-sm text-gray-400">Bajo rendimiento (&lt;40)</p>
                        <p className="text-3xl font-bold mt-1 text-red-400">{bajos}</p>
                      </div>
                    </div>
                  )
                })()}

                {/* Tabla principal de sucursales */}
                <div className="glass rounded-2xl p-6 border border-indigo-500/30">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Rendimiento por Sucursal</h2>
                      <p className="text-sm text-gray-400">Click en una sucursal para ver detalle por categoría</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left text-gray-400 font-medium py-2 pr-4">Sucursal</th>
                          {auditoriaTodas[0]?.periodos.map((p) => {
                            const [year, month] = p.periodo.split('-')
                            const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
                            return (
                              <th key={p.periodo} className="text-center text-gray-400 font-medium py-2 px-3 min-w-[80px]">
                                {monthNames[parseInt(month) - 1]} {year}
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {auditoriaTodas.map((sucursal) => {
                          const isExpanded = sucursalExpandida === sucursal.sucursal_id

                          return (
                            <React.Fragment key={sucursal.sucursal_id}>
                              <tr
                                className={`border-b border-gray-800/50 cursor-pointer transition-colors ${
                                  isExpanded ? 'bg-indigo-500/10' : 'hover:bg-gray-800/30'
                                }`}
                                onClick={() => setSucursalExpandida(isExpanded ? null : sucursal.sucursal_id)}
                              >
                                <td className="py-3 pr-4">
                                  <div className="flex items-center gap-2">
                                    <svg
                                      className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    <span className="text-white font-medium">{sucursal.sucursal_nombre}</span>
                                  </div>
                                </td>
                                {sucursal.periodos.map((p) => {
                                  const valor = p.puntaje_total
                                  const colorClass = valor === null ? 'text-gray-600' :
                                    valor >= 80 ? 'text-green-400' :
                                    valor >= 60 ? 'text-yellow-400' :
                                    valor >= 40 ? 'text-orange-400' : 'text-red-400'
                                  const bgClass = valor === null ? '' :
                                    valor >= 80 ? 'bg-green-500/10' :
                                    valor >= 60 ? 'bg-yellow-500/10' :
                                    valor >= 40 ? 'bg-orange-500/10' : 'bg-red-500/10'
                                  return (
                                    <td key={p.periodo} className={`text-center py-3 px-3 ${bgClass}`}>
                                      <span className={`font-bold ${colorClass}`}>
                                        {valor !== null ? valor : '-'}
                                      </span>
                                    </td>
                                  )
                                })}
                              </tr>

                              {/* Detalle expandido por categoría */}
                              {isExpanded && (
                                <>
                                  {[
                                    { key: 'orden_limpieza', label: 'Orden y Limpieza', icon: '✨' },
                                    { key: 'pedidos', label: 'Pedidos', icon: '🛒' },
                                    { key: 'gestion_administrativa', label: 'Gestion Adm.', icon: '📋' },
                                    { key: 'club_mascotera', label: 'Club Mascotera', icon: '👥' },
                                    { key: 'control_stock_caja', label: 'Stock y Caja', icon: '📦' },
                                  ].map((cat) => (
                                    <tr key={cat.key} className="border-b border-gray-800/30 bg-indigo-500/5">
                                      <td className="py-2 pr-4 pl-10 text-gray-400 text-xs flex items-center gap-1">
                                        <span>{cat.icon}</span> {cat.label}
                                      </td>
                                      {sucursal.periodos.map((p) => {
                                        const valor = p[cat.key as keyof typeof p] as number | null
                                        const colorClass = valor === null ? 'text-gray-600' :
                                          valor >= 80 ? 'text-green-400' :
                                          valor >= 60 ? 'text-yellow-400' :
                                          valor >= 40 ? 'text-orange-400' : 'text-red-400'
                                        return (
                                          <td key={p.periodo} className="text-center py-2 px-3">
                                            <span className={`text-xs ${colorClass}`}>
                                              {valor !== null ? valor : '-'}
                                            </span>
                                          </td>
                                        )
                                      })}
                                    </tr>
                                  ))}
                                </>
                              )}
                            </React.Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Leyenda de colores */}
                  <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-green-500/30 inline-block"></span> 80-100 Excelente
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-yellow-500/30 inline-block"></span> 60-79 Bueno
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-orange-500/30 inline-block"></span> 40-59 Regular
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-red-500/30 inline-block"></span> 0-39 Bajo
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== Histórico + Categorías (visible para todos) ===== */}
        {/* Historico de Puntajes Mensuales */}
            {(() => {
              // Si no hay datos reales, generar placeholders para los últimos 4 meses
              const mesesMostrar: AuditoriaMensualDemo[] = historicoMensual.length > 0
                ? historicoMensual
                : (() => {
                    const placeholder: AuditoriaMensualDemo[] = []
                    const hoy = new Date()
                    for (let i = 0; i < 4; i++) {
                      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
                      const periodo = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
                      placeholder.push({
                        id: 0,
                        sucursal_id: 0,
                        periodo,
                        orden_limpieza: null,
                        pedidos: null,
                        gestion_administrativa: null,
                        club_mascotera: null,
                        control_stock_caja: null,
                        puntaje_total: null,
                        observaciones: null,
                      })
                    }
                    return placeholder
                  })()

              return (
              <div className="glass rounded-2xl p-6 mb-6 border border-indigo-500/30">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Rendimiento Mensual</h2>
                    <p className="text-sm text-gray-400">Puntajes de los ultimos meses</p>
                  </div>
                </div>

                {historicoMensual.length === 0 && (
                  <div className="mb-4 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
                    <p className="text-sm text-gray-400">
                      Aun no se cargaron puntajes de auditoria. Los datos se mostraran a medida que se registren.
                    </p>
                  </div>
                )}

                {/* Tabla de puntajes */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left text-gray-400 font-medium py-2 pr-4">Categoria</th>
                        {mesesMostrar.map((m) => {
                          const [year, month] = m.periodo.split('-')
                          const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
                          return (
                            <th key={m.periodo} className="text-center text-gray-400 font-medium py-2 px-3 min-w-[80px]">
                              {monthNames[parseInt(month) - 1]} {year}
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: 'orden_limpieza', label: 'Orden y Limpieza', icon: '✨' },
                        { key: 'pedidos', label: 'Pedidos', icon: '🛒' },
                        { key: 'gestion_administrativa', label: 'Gestion Adm.', icon: '📋' },
                        { key: 'club_mascotera', label: 'Club Mascotera', icon: '👥' },
                        { key: 'control_stock_caja', label: 'Stock y Caja', icon: '📦' },
                      ].map((cat) => (
                        <tr key={cat.key} className="border-b border-gray-800/50">
                          <td className="py-3 pr-4 text-gray-300 flex items-center gap-2">
                            <span>{cat.icon}</span> {cat.label}
                          </td>
                          {mesesMostrar.map((m) => {
                            const valor = m[cat.key as keyof AuditoriaMensualDemo] as number | null
                            const colorClass = valor === null ? 'text-gray-600' :
                              valor >= 80 ? 'text-green-400' :
                              valor >= 60 ? 'text-yellow-400' :
                              valor >= 40 ? 'text-orange-400' : 'text-red-400'
                            const bgClass = valor === null ? '' :
                              valor >= 80 ? 'bg-green-500/10' :
                              valor >= 60 ? 'bg-yellow-500/10' :
                              valor >= 40 ? 'bg-orange-500/10' : 'bg-red-500/10'
                            return (
                              <td key={m.periodo} className={`text-center py-3 px-3 ${bgClass}`}>
                                <span className={`font-semibold ${colorClass}`}>
                                  {valor !== null ? valor : '-'}
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                      {/* Fila de promedio total */}
                      <tr className="border-t-2 border-indigo-500/30">
                        <td className="py-3 pr-4 text-white font-semibold flex items-center gap-2">
                          <span>🏆</span> Puntaje Total
                        </td>
                        {mesesMostrar.map((m) => {
                          const valor = m.puntaje_total
                          const colorClass = valor === null ? 'text-gray-600' :
                            valor >= 80 ? 'text-green-400' :
                            valor >= 60 ? 'text-yellow-400' :
                            valor >= 40 ? 'text-orange-400' : 'text-red-400'
                          return (
                            <td key={m.periodo} className="text-center py-3 px-3">
                              <span className={`text-lg font-bold ${colorClass}`}>
                                {valor !== null ? valor : '-'}
                              </span>
                            </td>
                          )
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Leyenda de colores */}
                <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-green-500/30 inline-block"></span> 80-100 Excelente
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-yellow-500/30 inline-block"></span> 60-79 Bueno
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-orange-500/30 inline-block"></span> 40-59 Regular
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-red-500/30 inline-block"></span> 0-39 Bajo
                  </span>
                </div>

                {/* Observaciones del mes más reciente */}
                {historicoMensual[0]?.observaciones && (
                  <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                    <p className="text-sm text-indigo-300">
                      <span className="font-medium">Obs. ultimo mes:</span> {historicoMensual[0].observaciones}
                    </p>
                  </div>
                )}
              </div>
              )
            })()}

            {/* Historial de Rendimiento de Tareas */}
            {historialTareas.length > 0 && (
              <div className="glass rounded-2xl p-6 border border-cyan-500/30">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Historial de Tareas</h2>
                    <p className="text-sm text-gray-400">Rendimiento semanal por categoria</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2 px-3 text-gray-400 font-medium">Semana</th>
                        <th className="text-center py-2 px-3 text-gray-400 font-medium">Orden y Limp.</th>
                        <th className="text-center py-2 px-3 text-gray-400 font-medium">Mantenimiento</th>
                        <th className="text-center py-2 px-3 text-gray-400 font-medium">Control Stock</th>
                        <th className="text-center py-2 px-3 text-gray-400 font-medium">Gestion Adm.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historialTareas.map((semana: any) => {
                        const cats = [
                          'ORDEN Y LIMPIEZA',
                          'MANTENIMIENTO SUCURSAL',
                          'CONTROL Y GESTION DE STOCK',
                          'GESTION ADMINISTRATIVA EN SISTEMA',
                        ]
                        return (
                          <tr key={semana.semana_inicio} className="border-b border-gray-800 hover:bg-gray-800/30">
                            <td className="py-2 px-3 text-gray-300">
                              {new Date(semana.semana_inicio + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                              {' - '}
                              {new Date(semana.semana_fin + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                            </td>
                            {cats.map((cat) => {
                              const data = semana.categorias?.[cat]
                              if (!data) return <td key={cat} className="text-center py-2 px-3 text-gray-600">-</td>
                              const puntaje = data.puntaje
                              const color = puntaje >= 80 ? 'text-green-400 bg-green-500/10'
                                : puntaje >= 60 ? 'text-yellow-400 bg-yellow-500/10'
                                : puntaje >= 40 ? 'text-orange-400 bg-orange-500/10'
                                : 'text-red-400 bg-red-500/10'
                              return (
                                <td key={cat} className="text-center py-2 px-3">
                                  <span className={`inline-block px-2 py-0.5 rounded ${color} font-medium`}>
                                    {puntaje}%
                                  </span>
                                  <span className="block text-xs text-gray-500 mt-0.5">
                                    {data.completadas}/{data.total} ({data.vencidas} venc.)
                                  </span>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Reportes Mensuales PDF */}
            {esEncargado && (
              <div className="glass rounded-2xl p-6 border border-purple-500/30">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Reportes Mensuales</h2>
                      <p className="text-sm text-gray-400">PDFs de auditoria</p>
                    </div>
                  </div>
                </div>

                {reportesPdf.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay reportes cargados.</p>
                ) : (
                  <div className="space-y-2">
                    {reportesPdf.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between bg-gray-800/30 rounded-lg p-3">
                        <div>
                          <p className="text-white text-sm">{r.filename}</p>
                          <p className="text-gray-500 text-xs">
                            {r.periodo} - {(r.tamano_bytes / 1024).toFixed(0)} KB
                            {r.notas && ` - ${r.notas}`}
                          </p>
                        </div>
                        <button
                          onClick={() => handleVerPdf(r.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg text-sm hover:bg-indigo-500/30 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Ver
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}


            {loading ? (
              <div className="glass rounded-2xl p-8 text-center">
                <div className="w-8 h-8 border-2 border-mascotera-turquesa border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {CATEGORIAS.map((categoria) => {
                  const Icon = categoria.icon
                  const isExpanded = categoriaActiva === categoria.id

                  return (
                    <div
                      key={categoria.id}
                      className={`glass rounded-2xl overflow-hidden border ${categoria.borderColor} transition-all`}
                    >
                      {/* Header */}
                      <button
                        onClick={() => setCategoriaActiva(isExpanded ? null : categoria.id)}
                        className="w-full p-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl ${categoria.bgColor} flex items-center justify-center`}>
                            <Icon className={`w-6 h-6 ${categoria.color}`} />
                          </div>
                          <div className="text-left">
                            <h2 className="text-lg font-semibold text-white">{categoria.label}</h2>
                            <p className="text-sm text-gray-400">
                              {getResumenCategoria(categoria.id, datos)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getIndicadorCategoria(categoria.id, datos)}
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* Contenido expandido */}
                      {isExpanded && datos && (
                        <div className="border-t border-gray-800 p-6">
                          {renderContenidoCategoria(categoria.id, datos, formatCurrency, getColorByPercentage, {
                            conteosAuditoria,
                            esEncargado,
                            cerrandoConteo,
                            handleCerrarConteo,
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
      </main>
    </div>
  )
}

function getResumenCategoria(categoriaId: string, datos: DatosAuditoria | null): string {
  if (!datos) return 'Cargando...'

  switch (categoriaId) {
    case 'orden_limpieza':
      return `${datos.ordenLimpieza.pendientes} tareas pendientes de ${datos.ordenLimpieza.totalTareas}`
    case 'pedidos':
      return datos.pedidos.sinDatos ? 'Sin conexion a la API' : `${datos.pedidos.rechazados} rechazados de ${datos.pedidos.totalPedidos} pedidos`
    case 'gestion_administrativa':
      return `${datos.gestionAdministrativa.pedidosPendientesFacturar} pedidos y ${datos.gestionAdministrativa.transferenciasPendientes} transferencias pendientes`
    case 'club_mascotera':
      return `${datos.clubMascotera.ticketsConsumidorFinal} tickets consumidor final`
    case 'control_stock_caja':
      return `Diferencia de caja y ajustes de stock`
    default:
      return ''
  }
}

function getIndicadorCategoria(categoriaId: string, datos: DatosAuditoria | null) {
  if (!datos) return null

  switch (categoriaId) {
    case 'orden_limpieza':
      const pctPendientes = datos.ordenLimpieza.porcentajePendientes
      return (
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          pctPendientes <= 20 ? 'bg-green-500/20 text-green-400' :
          pctPendientes <= 50 ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {pctPendientes}% pendientes
        </span>
      )
    case 'pedidos':
      if (datos.pedidos.sinDatos) {
        return (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-500/20 text-gray-400">
            Sin datos
          </span>
        )
      }
      const pctRechazados = datos.pedidos.porcentajeRechazados
      return (
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          pctRechazados <= 5 ? 'bg-green-500/20 text-green-400' :
          pctRechazados <= 15 ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {pctRechazados}% rechazados
        </span>
      )
    case 'gestion_administrativa':
      const pctGastos = datos.gestionAdministrativa.porcentajeGastosSobreVentas
      return (
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          pctGastos <= 10 ? 'bg-green-500/20 text-green-400' :
          pctGastos <= 15 ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {pctGastos}% gastos/ventas
        </span>
      )
    case 'club_mascotera':
      const pctCF = datos.clubMascotera.porcentajeVentasConsumidorFinal
      const metaCF = datos.clubMascotera.metaPorcentaje || 30
      // Menor porcentaje es mejor (meta: máximo 30% a consumidor final)
      return (
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          pctCF <= metaCF ? 'bg-green-500/20 text-green-400' :
          pctCF <= metaCF + 10 ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {pctCF}% consumidor final
        </span>
      )
    case 'control_stock_caja':
      const diferencia = datos.controlStockCaja.diferenciaCaja
      return (
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          diferencia === 0 ? 'bg-green-500/20 text-green-400' :
          Math.abs(diferencia) <= 1000 ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {diferencia >= 0 ? '+' : ''}{diferencia.toLocaleString('es-AR')} caja
        </span>
      )
    default:
      return null
  }
}

function renderContenidoCategoria(
  categoriaId: string,
  datos: DatosAuditoria,
  formatCurrency: (value: number) => string,
  getColorByPercentage: (value: number, inverted?: boolean) => string,
  extras?: {
    conteosAuditoria?: any[]
    esEncargado?: boolean
    cerrandoConteo?: number | null
    handleCerrarConteo?: (conteoId: number) => void
  }
) {
  switch (categoriaId) {
    case 'orden_limpieza':
      return (
        <div className="space-y-6">
          {/* Indicadores */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800/30 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-white">{datos.ordenLimpieza.totalTareas}</p>
              <p className="text-sm text-gray-400">Total tareas</p>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-4 text-center">
              <p className={`text-3xl font-bold ${
                datos.ordenLimpieza.pendientes === 0 ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {datos.ordenLimpieza.pendientes}
              </p>
              <p className="text-sm text-gray-400">Pendientes</p>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-4 text-center">
              <p className={`text-3xl font-bold ${getColorByPercentage(100 - datos.ordenLimpieza.porcentajePendientes)}`}>
                {100 - datos.ordenLimpieza.porcentajePendientes}%
              </p>
              <p className="text-sm text-gray-400">Completado</p>
            </div>
          </div>

          {/* Tareas con más de 5 días */}
          {datos.ordenLimpieza.tareasAtrasadas.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Tareas con más de 5 días sin completar
              </h3>
              <div className="space-y-2">
                {datos.ordenLimpieza.tareasAtrasadas.map((tarea) => (
                  <div key={tarea.id} className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <span className="text-white">{tarea.titulo}</span>
                    <span className="text-red-400 text-sm font-medium">
                      {tarea.dias_sin_completar} días
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )

    case 'pedidos':
      return (
        <div className="text-center py-8">
          <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Sin datos disponibles</p>
          <p className="text-gray-500 text-sm mt-1">La conexion con la API de pedidos aun no esta configurada</p>
        </div>
      )

    case 'gestion_administrativa':
      return (
        <div className="space-y-6">
          {/* Gastos sobre ventas */}
          <div className="bg-gray-800/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Gastos sobre Ventas</h3>
                  <p className="text-xs text-gray-400">Porcentaje del mes actual</p>
                </div>
              </div>
              <span className={`text-3xl font-bold ${getColorByPercentage(datos.gestionAdministrativa.porcentajeGastosSobreVentas, true)}`}>
                {datos.gestionAdministrativa.porcentajeGastosSobreVentas}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Gastos del mes:</span>
                <span className="text-red-400">{formatCurrency(datos.gestionAdministrativa.gastosMes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Ventas del mes:</span>
                <span className="text-green-400">{formatCurrency(datos.gestionAdministrativa.ventasMes)}</span>
              </div>
            </div>
          </div>

          {/* Pendientes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/30 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <Receipt className="w-5 h-5 text-yellow-400" />
                <span className="text-white font-medium">Pedidos Pend. Facturar</span>
              </div>
              <p className={`text-3xl font-bold ${
                datos.gestionAdministrativa.pedidosPendientesFacturar === 0 ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {datos.gestionAdministrativa.pedidosPendientesFacturar}
              </p>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <ArrowLeftRight className="w-5 h-5 text-orange-400" />
                <span className="text-white font-medium">Transferencias Pend.</span>
              </div>
              <p className={`text-3xl font-bold ${
                datos.gestionAdministrativa.transferenciasPendientes === 0 ? 'text-green-400' : 'text-orange-400'
              }`}>
                {datos.gestionAdministrativa.transferenciasPendientes}
              </p>
              {datos.gestionAdministrativa.transferenciasManuales && (
                <p className="text-xs text-gray-500 mt-1">Carga manual</p>
              )}
            </div>
          </div>
        </div>
      )

    case 'club_mascotera':
      const metaClub = datos.clubMascotera.metaPorcentaje || 30
      const cumpleMetaClub = datos.clubMascotera.porcentajeVentasConsumidorFinal <= metaClub
      return (
        <div className="space-y-6">
          {/* Indicador principal */}
          <div className="bg-gray-800/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  cumpleMetaClub ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                  <Users className={`w-5 h-5 ${cumpleMetaClub ? 'text-green-400' : 'text-red-400'}`} />
                </div>
                <div>
                  <h3 className="font-medium text-white">Facturas a Consumidor Final</h3>
                  <p className="text-xs text-gray-400">Meta: máximo {metaClub}% del total</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-3xl font-bold ${cumpleMetaClub ? 'text-green-400' : 'text-red-400'}`}>
                  {datos.clubMascotera.porcentajeVentasConsumidorFinal}%
                </span>
                <p className={`text-xs ${cumpleMetaClub ? 'text-green-400' : 'text-red-400'}`}>
                  {cumpleMetaClub ? '✓ Cumple meta' : '✗ Excede meta'}
                </p>
              </div>
            </div>

            {/* Barra de progreso con indicador de meta */}
            <div className="relative">
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full transition-all ${
                    cumpleMetaClub
                      ? 'bg-gradient-to-r from-green-500 to-green-400'
                      : 'bg-gradient-to-r from-red-500 to-red-400'
                  }`}
                  style={{ width: `${Math.min(datos.clubMascotera.porcentajeVentasConsumidorFinal, 100)}%` }}
                />
              </div>
              {/* Indicador de meta */}
              <div
                className="absolute top-0 h-3 w-0.5 bg-yellow-400"
                style={{ left: `${metaClub}%` }}
                title={`Meta: ${metaClub}%`}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span className="text-yellow-400">Meta {metaClub}%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Detalle de facturas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/30 rounded-xl p-4">
              <h4 className="text-sm text-gray-400 mb-3">
                Facturas del Día
                {datos.clubMascotera.periodo && datos.clubMascotera.periodo !== 'sin_datos' && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({new Date(datos.clubMascotera.periodo + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })})
                  </span>
                )}
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">Consumidor Final:</span>
                  <span className={`font-bold ${cumpleMetaClub ? 'text-green-400' : 'text-red-400'}`}>
                    {datos.clubMascotera.ticketsConsumidorFinal}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Con datos fiscales:</span>
                  <span className="text-blue-400 font-bold">
                    {datos.clubMascotera.ticketsTotal - datos.clubMascotera.ticketsConsumidorFinal}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                  <span className="text-gray-300">Total:</span>
                  <span className="text-white font-bold">{datos.clubMascotera.ticketsTotal}</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-4">
              <h4 className="text-sm text-gray-400 mb-3">Resumen</h4>
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${cumpleMetaClub ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  <p className={`text-sm font-medium ${cumpleMetaClub ? 'text-green-400' : 'text-red-400'}`}>
                    {cumpleMetaClub
                      ? '✓ Dentro del objetivo'
                      : `✗ ${(datos.clubMascotera.porcentajeVentasConsumidorFinal - metaClub).toFixed(1)}% por encima de la meta`
                    }
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  Se recomienda incentivar el registro de datos fiscales de clientes para mejorar este indicador.
                </p>
              </div>
            </div>
          </div>
        </div>
      )

    case 'control_stock_caja':
      const tieneAjustesImportados = (datos.controlStockCaja.totalAjustes || 0) > 0
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Diferencia de Caja */}
            <div className="bg-gray-800/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  datos.controlStockCaja.diferenciaCaja === 0 ? 'bg-green-500/20' :
                  datos.controlStockCaja.diferenciaCaja > 0 ? 'bg-blue-500/20' : 'bg-red-500/20'
                }`}>
                  <Wallet className={`w-6 h-6 ${
                    datos.controlStockCaja.diferenciaCaja === 0 ? 'text-green-400' :
                    datos.controlStockCaja.diferenciaCaja > 0 ? 'text-blue-400' : 'text-red-400'
                  }`} />
                </div>
                <div>
                  <h3 className="font-medium text-white">Diferencia de Caja</h3>
                  <p className="text-xs text-gray-400">Mes actual</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {datos.controlStockCaja.diferenciaCaja < 0 ? (
                  <TrendingDown className="w-6 h-6 text-red-400" />
                ) : datos.controlStockCaja.diferenciaCaja > 0 ? (
                  <TrendingUp className="w-6 h-6 text-blue-400" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-green-400" />
                )}
                <span className={`text-3xl font-bold ${
                  datos.controlStockCaja.diferenciaCaja === 0 ? 'text-green-400' :
                  datos.controlStockCaja.diferenciaCaja > 0 ? 'text-blue-400' : 'text-red-400'
                }`}>
                  {datos.controlStockCaja.diferenciaCaja >= 0 ? '+' : ''}
                  {formatCurrency(datos.controlStockCaja.diferenciaCaja)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {datos.controlStockCaja.diferenciaCaja === 0
                  ? 'Sin diferencias'
                  : datos.controlStockCaja.diferenciaCaja > 0
                    ? 'Sobrante de caja'
                    : 'Faltante de caja'}
              </p>
            </div>

            {/* Valorización Ajuste Stock */}
            <div className="bg-gray-800/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  datos.controlStockCaja.valorizacionAjusteStock === 0 ? 'bg-green-500/20' :
                  datos.controlStockCaja.valorizacionAjusteStock > 0 ? 'bg-blue-500/20' : 'bg-red-500/20'
                }`}>
                  <Package className={`w-6 h-6 ${
                    datos.controlStockCaja.valorizacionAjusteStock === 0 ? 'text-green-400' :
                    datos.controlStockCaja.valorizacionAjusteStock > 0 ? 'text-blue-400' : 'text-red-400'
                  }`} />
                </div>
                <div>
                  <h3 className="font-medium text-white">Ajuste de Stock</h3>
                  <p className="text-xs text-gray-400">
                    {tieneAjustesImportados
                      ? `${datos.controlStockCaja.totalAjustes} movimientos`
                      : 'Cantidad neta mensual'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {datos.controlStockCaja.valorizacionAjusteStock < 0 ? (
                  <TrendingDown className="w-6 h-6 text-red-400" />
                ) : datos.controlStockCaja.valorizacionAjusteStock > 0 ? (
                  <TrendingUp className="w-6 h-6 text-blue-400" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-green-400" />
                )}
                <span className={`text-3xl font-bold ${
                  datos.controlStockCaja.valorizacionAjusteStock === 0 ? 'text-green-400' :
                  datos.controlStockCaja.valorizacionAjusteStock > 0 ? 'text-blue-400' : 'text-red-400'
                }`}>
                  {datos.controlStockCaja.valorizacionAjusteStock >= 0 ? '+' : ''}
                  {datos.controlStockCaja.valorizacionAjusteStock.toLocaleString('es-AR')} unidades
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {datos.controlStockCaja.valorizacionAjusteStock === 0
                  ? 'Sin ajustes'
                  : datos.controlStockCaja.valorizacionAjusteStock > 0
                    ? 'Ajustes positivos (sobrantes)'
                    : 'Ajustes negativos (faltantes)'}
              </p>
            </div>
          </div>

          {/* Detalle de ajustes si hay datos importados */}
          {tieneAjustesImportados && (
            <div className="bg-gray-800/30 rounded-xl p-4">
              <h4 className="text-sm font-medium text-white mb-3">Detalle de Ajustes de Stock</h4>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">{datos.controlStockCaja.ingresos}</p>
                  <p className="text-xs text-gray-400">Ingresos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">{datos.controlStockCaja.egresos}</p>
                  <p className="text-xs text-gray-400">Egresos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{datos.controlStockCaja.totalAjustes}</p>
                  <p className="text-xs text-gray-400">Total</p>
                </div>
              </div>

              {/* Por depósito */}
              {datos.controlStockCaja.porDeposito && datos.controlStockCaja.porDeposito.length > 0 && (
                <div className="border-t border-gray-700 pt-3 mt-3">
                  <h5 className="text-xs text-gray-400 mb-2">Por Depósito</h5>
                  <div className="space-y-2">
                    {datos.controlStockCaja.porDeposito.map((dep, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-gray-300">{dep.deposito}</span>
                        <div className="flex gap-3">
                          <span className="text-blue-400">+{dep.cantidad_ingresos}</span>
                          <span className="text-red-400">-{dep.cantidad_egresos}</span>
                          <span className="text-gray-400">({dep.total_ajustes})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mensaje si no hay datos */}
          {!tieneAjustesImportados && (
            <div className="bg-gray-800/20 rounded-xl p-4 text-center">
              <p className="text-gray-400 text-sm">
                Los ajustes de stock se importan mensualmente desde el sistema.
              </p>
            </div>
          )}

          {/* Seccion de Conteos de Stock */}
          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-green-400" />
              Conteos de Inventario
            </h3>

            {/* Cards de resumen de conteos */}
            <div className="grid grid-cols-5 gap-4 mb-4">
              <div className="bg-gray-800/30 rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${
                  (datos.controlStockCaja.conteosPendientes || 0) > 0 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {datos.controlStockCaja.conteosPendientes || 0}
                </p>
                <p className="text-xs text-gray-400">Pendientes Revision</p>
              </div>
              <div className="bg-gray-800/30 rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${
                  (datos.controlStockCaja.conteosPorCerrar || 0) > 0 ? 'text-orange-400' : 'text-green-400'
                }`}>
                  {datos.controlStockCaja.conteosPorCerrar || 0}
                </p>
                <p className="text-xs text-gray-400">Por Cerrar</p>
              </div>
              <div className="bg-gray-800/30 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-400">
                  {datos.controlStockCaja.conteosRevisadosMes || 0}
                </p>
                <p className="text-xs text-gray-400">Revisados (Mes)</p>
              </div>
              <div className="bg-gray-800/30 rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${
                  (datos.controlStockCaja.diferenciaTotalMes || 0) < 0 ? 'text-red-400' : 'text-green-400'
                }`}>
                  {datos.controlStockCaja.diferenciaTotalMes || 0}
                </p>
                <p className="text-xs text-gray-400">Diferencia (Unid.)</p>
              </div>
              <div className="bg-gray-800/30 rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${
                  (datos.controlStockCaja.valorizacionDiferenciaMes || 0) < 0 ? 'text-red-400' : 'text-green-400'
                }`}>
                  {formatCurrency(datos.controlStockCaja.valorizacionDiferenciaMes || 0)}
                </p>
                <p className="text-xs text-gray-400">Valorizacion</p>
              </div>
            </div>

            {/* Lista de conteos */}
            {extras?.conteosAuditoria && extras.conteosAuditoria.length > 0 && (
              <div className="bg-gray-800/30 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Conteos</h4>
                <div className="space-y-2">
                  {extras.conteosAuditoria.map((conteo: any) => (
                    <div key={conteo.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          conteo.estado === 'cerrado' ? 'bg-blue-400' :
                          conteo.estado === 'aprobado' ? 'bg-orange-400' :
                          conteo.estado === 'rechazado' ? 'bg-red-400' :
                          conteo.estado === 'enviado' ? 'bg-yellow-400' : 'bg-gray-400'
                        }`} />
                        <div>
                          <p className="text-white text-sm">
                            {conteo.fecha_conteo ? new Date(conteo.fecha_conteo).toLocaleDateString('es-AR') : 'Sin fecha'}
                          </p>
                          <p className="text-xs text-gray-400">{conteo.empleado_nombre}</p>
                          <p className="text-xs text-gray-500">
                            {conteo.estado === 'cerrado' ? 'Cerrado' :
                             conteo.estado === 'aprobado' ? 'Aprobado - Pendiente cierre' :
                             conteo.estado === 'rechazado' ? 'Rechazado' :
                             conteo.estado === 'enviado' ? 'Pendiente revision' : conteo.estado}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-sm font-medium ${
                            conteo.valorizacion_diferencia < 0 ? 'text-red-400' : 'text-green-400'
                          }`}>
                            {formatCurrency(conteo.valorizacion_diferencia)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {conteo.productos_con_diferencia} prod. con dif.
                          </p>
                        </div>
                        {conteo.estado === 'aprobado' && extras?.esEncargado && (
                          <button
                            onClick={() => extras?.handleCerrarConteo?.(conteo.id)}
                            disabled={extras?.cerrandoConteo === conteo.id}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-xs rounded-lg transition-colors"
                          >
                            {extras?.cerrandoConteo === conteo.id ? 'Cerrando...' : 'Cerrar'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )

    default:
      return null
  }
}
