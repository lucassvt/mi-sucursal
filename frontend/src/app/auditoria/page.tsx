'use client'

import { useEffect, useState } from 'react'
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
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'
import { tareasApi, auditoriaApi, ajustesStockApi } from '@/lib/api'
import { getTareasDemo } from '@/lib/demo-data'

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
  }
  gestionAdministrativa: {
    porcentajeGastosSobreVentas: number
    gastosMes: number
    ventasMes: number
    pedidosPendientesFacturar: number
    transferenciasPendientes: number
  }
  clubMascotera: {
    porcentajeVentasConsumidorFinal: number
    ticketsConsumidorFinal: number
    ticketsTotal: number
    montoConsumidorFinal: number
    montoTotal: number
    metaPorcentaje?: number
    cumpleMeta?: boolean
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
  const { token, isAuthenticated, isLoading } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null)
  const [datos, setDatos] = useState<DatosAuditoria | null>(null)

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
      // En modo demo, usar datos de ejemplo
      const isDemo = token?.startsWith('demo-token')

      // Cargar datos reales en paralelo (o vacíos en demo)
      const [tareasData, clubMascoteraData, ajustesStockData] = await Promise.all([
        isDemo ? Promise.resolve(getTareasDemo()) : tareasApi.list(token!).catch(() => []),
        isDemo ? Promise.resolve(null) : auditoriaApi.clubMascotera(token!).catch(() => null),
        isDemo ? Promise.resolve(null) : ajustesStockApi.resumen(token!).catch(() => null),
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
        montoConsumidorFinal: 0, // TODO: Agregar cuando esté disponible en el endpoint
        montoTotal: 0,
        metaPorcentaje: clubMascoteraData.meta_porcentaje,
        cumpleMeta: clubMascoteraData.cumple_meta,
      } : getDatosDemo().clubMascotera

      // Procesar datos de Ajustes de Stock
      // Por ahora solo mostramos la valorización (en el futuro se puede calcular desde los datos importados)
      const controlStockCaja = ajustesStockData ? {
        diferenciaCaja: getDatosDemo().controlStockCaja.diferenciaCaja, // TODO: Integrar con cierres de caja
        valorizacionAjusteStock: ajustesStockData.cantidad_neta || 0,
        totalAjustes: ajustesStockData.total_ajustes || 0,
        ingresos: ajustesStockData.total_ingresos || 0,
        egresos: ajustesStockData.total_egresos || 0,
        mesesDisponibles: ajustesStockData.meses_disponibles || [],
        porDeposito: ajustesStockData.por_deposito || [],
      } : getDatosDemo().controlStockCaja

      setDatos({
        ordenLimpieza: {
          porcentajePendientes: tareasOrdenLimpieza.length > 0
            ? Math.round((pendientesOL.length / tareasOrdenLimpieza.length) * 100)
            : 0,
          totalTareas: tareasOrdenLimpieza.length,
          pendientes: pendientesOL.length,
          tareasAtrasadas,
        },
        ...getDatosDemo(),
        clubMascotera,
        controlStockCaja,
      })
    } catch (error) {
      console.error('Error loading data:', error)
      setDatos(getDatosCompletos())
    } finally {
      setLoading(false)
    }
  }

  const getDatosDemo = () => ({
    pedidos: {
      porcentajeRechazados: 8,
      totalPedidos: 125,
      rechazados: 10,
    },
    gestionAdministrativa: {
      porcentajeGastosSobreVentas: 12.5,
      gastosMes: 450000,
      ventasMes: 3600000,
      pedidosPendientesFacturar: 3,
      transferenciasPendientes: 2,
    },
    clubMascotera: {
      porcentajeVentasConsumidorFinal: 68,
      ticketsConsumidorFinal: 342,
      ticketsTotal: 503,
      montoConsumidorFinal: 2448000,
      montoTotal: 3600000,
    },
    controlStockCaja: {
      diferenciaCaja: -1250,
      valorizacionAjusteStock: -15800,
    },
  })

  const getDatosCompletos = (): DatosAuditoria => ({
    ordenLimpieza: {
      porcentajePendientes: 40,
      totalTareas: 5,
      pendientes: 2,
      tareasAtrasadas: [
        { id: 1, titulo: 'Limpiar vitrinas de exhibición', dias_sin_completar: 7, estado: 'pendiente' },
        { id: 2, titulo: 'Ordenar depósito trasero', dias_sin_completar: 12, estado: 'en_progreso' },
      ],
    },
    ...getDatosDemo(),
  })

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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Auditoría</h1>
          <p className="text-gray-400">Control y seguimiento de indicadores de la sucursal</p>
        </div>

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
                      {renderContenidoCategoria(categoria.id, datos, formatCurrency, getColorByPercentage)}
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
      return `${datos.pedidos.rechazados} rechazados de ${datos.pedidos.totalPedidos} pedidos`
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
  getColorByPercentage: (value: number, inverted?: boolean) => string
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
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800/30 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-white">{datos.pedidos.totalPedidos}</p>
              <p className="text-sm text-gray-400">Total pedidos</p>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-red-400">{datos.pedidos.rechazados}</p>
              <p className="text-sm text-gray-400">Rechazados</p>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-4 text-center">
              <p className={`text-3xl font-bold ${getColorByPercentage(datos.pedidos.porcentajeRechazados, true)}`}>
                {datos.pedidos.porcentajeRechazados}%
              </p>
              <p className="text-sm text-gray-400">Tasa de rechazo</p>
            </div>
          </div>

          {/* Barra de progreso */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Pedidos aceptados vs rechazados</span>
              <span className="text-white">{100 - datos.pedidos.porcentajeRechazados}% aceptados</span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden flex">
              <div
                className="bg-green-500 h-full"
                style={{ width: `${100 - datos.pedidos.porcentajeRechazados}%` }}
              />
              <div
                className="bg-red-500 h-full"
                style={{ width: `${datos.pedidos.porcentajeRechazados}%` }}
              />
            </div>
          </div>
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
              <h4 className="text-sm text-gray-400 mb-3">Facturas del Mes</h4>
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
        </div>
      )

    default:
      return null
  }
}
