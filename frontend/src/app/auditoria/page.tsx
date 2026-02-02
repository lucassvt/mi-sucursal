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
import { tareasApi } from '@/lib/api'

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
  }
  controlStockCaja: {
    diferenciaCaja: number
    valorizacionAjusteStock: number
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
      // Intentar cargar datos reales
      const [tareasData] = await Promise.all([
        tareasApi.list(token!).catch(() => []),
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
      return (
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          pctCF >= 70 ? 'bg-green-500/20 text-green-400' :
          pctCF >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
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
      return (
        <div className="space-y-6">
          {/* Indicador principal */}
          <div className="bg-gray-800/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Ventas a Consumidor Final</h3>
                  <p className="text-xs text-gray-400">Porcentaje sobre total de ventas</p>
                </div>
              </div>
              <span className={`text-3xl font-bold ${getColorByPercentage(datos.clubMascotera.porcentajeVentasConsumidorFinal)}`}>
                {datos.clubMascotera.porcentajeVentasConsumidorFinal}%
              </span>
            </div>

            {/* Barra de progreso */}
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden mb-4">
              <div
                className="bg-gradient-to-r from-green-500 to-mascotera-turquesa h-full"
                style={{ width: `${datos.clubMascotera.porcentajeVentasConsumidorFinal}%` }}
              />
            </div>
          </div>

          {/* Detalle tickets y monetario */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/30 rounded-xl p-4">
              <h4 className="text-sm text-gray-400 mb-3">Cantidad de Tickets</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">Consumidor Final:</span>
                  <span className="text-green-400 font-bold">{datos.clubMascotera.ticketsConsumidorFinal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Total:</span>
                  <span className="text-white font-bold">{datos.clubMascotera.ticketsTotal}</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-4">
              <h4 className="text-sm text-gray-400 mb-3">Monto Monetario</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">Consumidor Final:</span>
                  <span className="text-green-400 font-bold">{formatCurrency(datos.clubMascotera.montoConsumidorFinal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Total:</span>
                  <span className="text-white font-bold">{formatCurrency(datos.clubMascotera.montoTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )

    case 'control_stock_caja':
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
                  <p className="text-xs text-gray-400">Valorización neta mensual</p>
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
                  {formatCurrency(datos.controlStockCaja.valorizacionAjusteStock)}
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
        </div>
      )

    default:
      return null
  }
}
