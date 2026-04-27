'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  Target,
  Scissors,
  Stethoscope,
  Syringe,
  AlertTriangle,
  Package,
  ShoppingBag,
  Building2,
  ChevronDown,
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'
import { dashboardApi, ventasPerdidasApi, tareasApi, cierresApi } from '@/lib/api'
import CierreCajaPendienteModal from '@/components/CierreCajaPendienteModal'

interface Sucursal {
  id: number
  nombre: string
  tiene_veterinaria: boolean
  tiene_peluqueria: boolean
}

interface Objetivos {
  existe: boolean
  sucursal_id: number
  sucursal_nombre: string
  periodo: string
  objetivo_venta_general: number
  objetivo_turnos_peluqueria: number
  objetivo_consultas_veterinaria: number
  objetivo_vacunas: number
  tiene_veterinaria: boolean
  tiene_peluqueria: boolean
  mensaje?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { token, user, isAuthenticated, isLoading, sucursalActiva, setSucursalActiva } = useAuthStore()
  const [ventas, setVentas] = useState<any>(null)
  const [ventasPorTipo, setVentasPorTipo] = useState<any>(null)
  const [ventasPerdidas, setVentasPerdidas] = useState<any>(null)
  const [tareasResumen, setTareasResumen] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<Sucursal | null>(null)
  const [objetivos, setObjetivos] = useState<Objetivos | null>(null)
  const [showCierrePendienteModal, setShowCierrePendienteModal] = useState(false)
  const [diasPendientesCierre, setDiasPendientesCierre] = useState<string[]>([])

  // Verificar si el usuario es encargado
  const esEncargado = user?.esGerencia === true

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  // 2026-04-25: si el empleado tiene 1 sola sucursal asignada, seteala como activa
  // automaticamente. Asi el interceptor (api.ts) puede inyectar ?sucursal_id=
  // para empleados mono-sede sin obligarlos al modal de seleccion.
  useEffect(() => {
    const asig = user?.sucursalesAsignadas || []
    if (asig.length === 1 && !sucursalActiva) {
      setSucursalActiva(asig[0])
    }
  }, [user?.sucursalesAsignadas, sucursalActiva, setSucursalActiva])

  useEffect(() => {
    if (token) {
      // Cargar sucursales si es encargado
      const esEncargadoReal = user?.esGerencia === true;
      if (esEncargadoReal) {
        tareasApi.sucursales(token!).then((data) => {
          const mapped = data.map(s => ({
            id: s.id,
            nombre: s.nombre,
            tiene_veterinaria: (s as any).tiene_veterinaria ?? false,
            tiene_peluqueria: (s as any).tiene_peluqueria ?? false,
          }))
          const permitidas = user?.sucursalesPermitidas;
          if (permitidas && permitidas.length > 0) {
            setSucursales(mapped.filter(s => permitidas.includes(s.id)));
          } else {
            setSucursales(mapped);
          }
          // Si el usuario no tiene sucursal asignada, auto-seleccionar la primera
          if (!user?.sucursal_id && mapped.length > 0) {
            setSucursalSeleccionada(mapped[0])
          }
        }).catch(() => {})
      }
      // 2026-04-26: cargar datos usando la sucursal activa del store (modal multi-sede o
      // mono-sede auto-seteada). Antes dependia de user.sucursal_id legacy y no respetaba
      // la sucursal elegida en el modal.
      const targetId = sucursalActiva?.id ?? user?.sucursal_id
      if (targetId) {
        loadData(targetId)
      }
    }
  }, [token, sucursalActiva?.id])

  // Verificar cierres de caja pendientes al iniciar sesion (solo vendedores)
  useEffect(() => {
    if (!token || esEncargado) return

    const alreadyShown = sessionStorage.getItem('cierre-caja-alert-shown')
    if (alreadyShown) return

    cierresApi.pendientes(token).then((data) => {
      if (data.dias_pendientes && data.dias_pendientes.length > 0) {
        setDiasPendientesCierre(data.dias_pendientes)
        setShowCierrePendienteModal(true)
      }
      sessionStorage.setItem('cierre-caja-alert-shown', 'true')
    }).catch(() => {})
  }, [token, esEncargado])

  // Recargar datos cuando cambie la sucursal seleccionada
  useEffect(() => {
    if (token && sucursalSeleccionada) {
      loadData(sucursalSeleccionada.id)
    }
  }, [sucursalSeleccionada])

  const loadData = async (sucursalId?: number) => {
    try {
      const [ventasData, ventasTipoData, objetivosData, vpData, tareasData] = await Promise.all([
        dashboardApi.getVentas(token!, sucursalId).catch(() => null),
        dashboardApi.getVentasPorTipo(token!, 'ayer', sucursalId).catch(() => null),
        dashboardApi.getObjetivos(token!, sucursalId).catch(() => null),
        ventasPerdidasApi.resumen(token!).catch(() => null),
        tareasApi.resumen(token!).catch(() => null),
      ])
      setVentas(ventasData)
      setVentasPorTipo(ventasTipoData)
      setObjetivos(objetivosData)
      setVentasPerdidas(vpData)
      setTareasResumen(tareasData)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-mascotera-turquesa border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // Mostrar panel si la sucursal lo tiene marcado O si hay objetivo cargado (flag DB puede estar desactualizado)
  const flagPelu = sucursalSeleccionada?.tiene_peluqueria ?? objetivos?.tiene_peluqueria ?? user?.tiene_peluqueria
  const flagVet = sucursalSeleccionada?.tiene_veterinaria ?? objetivos?.tiene_veterinaria ?? user?.tiene_veterinaria
  const tienePeluqueria = flagPelu || ((objetivos?.objetivo_turnos_peluqueria || ventas?.peluqueria?.objetivo_turnos || 0) > 0)
  const tieneVeterinaria = flagVet || ((objetivos?.objetivo_consultas_veterinaria || ventas?.veterinaria?.objetivo_consultas || 0) > 0)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(value)
  }

  // Show sucursal selector if user has multiple sucursales and hasn't chosen
  const sucursalesAsig = user?.sucursalesAsignadas || [];
  if (sucursalesAsig.length > 1 && !sucursalActiva) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-mascotera-turquesa/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-mascotera-turquesa" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">A que sucursal estas ingresando?</h2>
            <p className="text-sm text-gray-500 mt-1">Selecciona la sucursal donde trabajas hoy</p>
          </div>
          <div className="space-y-2">
            {sucursalesAsig.map((s: any) => (
              <button key={s.id} onClick={() => setSucursalActiva(s)}
                className="w-full p-4 text-left bg-white rounded-xl border-2 border-gray-200 hover:border-mascotera-turquesa hover:bg-mascotera-turquesa/5 transition-all">
                <span className="font-semibold text-gray-900">{s.nombre}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar />

      <main className="ml-64 p-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400">Bienvenido, {user?.nombre}</p>
          </div>

          {/* Selector de Sucursal - Solo para Encargados */}
          {esEncargado && sucursales.length > 0 && (
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-mascotera-turquesa" />
              <div className="relative">
                <select
                  value={sucursalSeleccionada?.id || ''}
                  onChange={(e) => {
                    const id = parseInt(e.target.value)
                    const sucursal = sucursales.find(s => s.id === id)
                    setSucursalSeleccionada(sucursal || null)
                    // 2026-04-26: tambien actualizar sucursalActiva del store para que
                    // el SucursalKeyWrapper remountee y el interceptor inyecte el sucursal_id correcto
                    if (sucursal) {
                      setSucursalActiva({ id: sucursal.id, nombre: sucursal.nombre })
                    } else {
                      setSucursalActiva(null)
                    }
                  }}
                  className="appearance-none bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-mascotera-turquesa focus:border-transparent min-w-[200px]"
                >
                    <option value="">{user?.sucursal_nombre ? `Mi sucursal (${user.sucursal_nombre})` : 'Seleccionar sucursal'}</option>
                  {sucursales.map(suc => (
                    <option key={suc.id} value={suc.id}>
                      {suc.nombre}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Indicador de sucursal seleccionada */}
        {sucursalSeleccionada && (
          <div className="mb-4 glass-card rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-mascotera-amarillo" />
              <span className="text-sm text-gray-300">
                Viendo datos de: <span className="text-mascotera-amarillo font-semibold">{sucursalSeleccionada.nombre}</span>
              </span>
              {sucursalSeleccionada.tiene_veterinaria && (
                <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">Veterinaria</span>
              )}
              {sucursalSeleccionada.tiene_peluqueria && (
                <span className="text-xs bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded">Peluquería</span>
              )}
            </div>
            {user?.sucursal_id && (
              <button
                onClick={() => {
                  setSucursalSeleccionada(null)
                  loadData()
                }}
                className="text-xs text-gray-400 hover:text-white"
              >
                Volver a mi sucursal
              </button>
            )}
          </div>
        )}

        {/* Alerta de objetivos no cargados */}
        {objetivos && !objetivos.existe && (
          <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-amber-300 font-medium">
                Objetivos no cargados para {objetivos.periodo}
              </p>
              <p className="text-xs text-amber-400/70">
                {objetivos.mensaje || 'Los objetivos de este período aún no han sido definidos por Gerencia.'}
              </p>
            </div>
          </div>
        )}

        {/* Paneles de Ventas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Panel Venta Sucursal */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-mascotera-turquesa/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-mascotera-turquesa" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Venta Sucursal</h3>
                  <p className="text-xs text-mascotera-turquesa">{sucursalSeleccionada?.nombre || user?.sucursal_nombre}</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-mascotera-turquesa">
                {ventas?.ventas?.porcentaje || 0}%
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Venta actual:</span>
                <span className="text-white font-semibold">
                  {formatCurrency(ventas?.ventas?.venta_actual || 0)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-mascotera-turquesa to-mascotera-amarillo transition-all"
                  style={{ width: `${Math.min(ventas?.ventas?.porcentaje || 0, 100)}%` }}
                />
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Objetivo:</span>
                <span className="text-gray-300">
                  {formatCurrency(ventas?.ventas?.objetivo || 0)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-mascotera-turquesa">Proyectado:</span>
                <span className="text-mascotera-turquesa font-semibold">
                  {formatCurrency(ventas?.ventas?.proyectado || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Panel Peluquería */}
          {tienePeluqueria && (
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                    <Scissors className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Peluquería Canina</h3>
                    <p className="text-xs text-gray-400">Objetivo: {objetivos?.objetivo_turnos_peluqueria || ventas?.peluqueria?.objetivo_turnos || 0} turnos</p>
                  </div>
                </div>
                {(objetivos?.objetivo_turnos_peluqueria || ventas?.peluqueria?.objetivo_turnos) ? (
                  <span className="text-2xl font-bold text-pink-400">
                    {Math.round(((ventas?.peluqueria?.turnos_realizados || 0) / (objetivos?.objetivo_turnos_peluqueria || ventas?.peluqueria?.objetivo_turnos || 1)) * 100)}%
                  </span>
                ) : null}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Venta total:</span>
                  <span className="text-pink-400 font-semibold">
                    {formatCurrency(ventas?.peluqueria?.venta_total || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Turnos realizados:</span>
                  <span className="text-white font-semibold">{ventas?.peluqueria?.turnos_realizados || 0}</span>
                </div>

                {/* Progress bar de turnos */}
                {(objetivos?.objetivo_turnos_peluqueria || ventas?.peluqueria?.objetivo_turnos) > 0 && (
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-pink-400 transition-all"
                      style={{ width: `${Math.min(((ventas?.peluqueria?.turnos_realizados || 0) / (objetivos?.objetivo_turnos_peluqueria || ventas?.peluqueria?.objetivo_turnos || 1)) * 100, 100)}%` }}
                    />
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-pink-400">Proyectado mes:</span>
                  <span className="text-pink-400 font-semibold">
                    {ventas?.peluqueria?.proyectado || 0} turnos
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Panel Veterinaria */}
          {tieneVeterinaria && (
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Veterinaria</h3>
                  <p className="text-xs text-gray-400">Servicios de la sucursal</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Venta total:</span>
                  <span className="text-cyan-400 font-semibold">
                    {formatCurrency(ventas?.veterinaria?.venta_total || 0)}
                  </span>
                </div>

                {/* Consultas con objetivo */}
                <div className="p-3 rounded-lg bg-gray-800/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Consultas</span>
                    <span className="text-white font-bold">
                      {ventas?.veterinaria?.consultas || 0}
                      <span className="text-gray-500 font-normal">/{objetivos?.objetivo_consultas_veterinaria || ventas?.veterinaria?.objetivo_consultas || 30}</span>
                    </span>
                  </div>
                  {(objetivos?.objetivo_consultas_veterinaria || ventas?.veterinaria?.objetivo_consultas) > 0 && (
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 transition-all"
                        style={{ width: `${Math.min(((ventas?.veterinaria?.consultas || 0) / (objetivos?.objetivo_consultas_veterinaria || ventas?.veterinaria?.objetivo_consultas || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Vacunas con objetivo */}
                <div className="p-3 rounded-lg bg-gray-800/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Vacunas totales</span>
                    <span className="text-white font-bold">
                      {(ventas?.veterinaria?.vacunaciones?.quintuple || 0) +
                       (ventas?.veterinaria?.vacunaciones?.sextuple || 0) +
                       (ventas?.veterinaria?.vacunaciones?.antirrabica || 0) +
                       (ventas?.veterinaria?.vacunaciones?.triple_felina || 0)}
                      <span className="text-gray-500 font-normal">/{objetivos?.objetivo_vacunas || ventas?.veterinaria?.objetivo_vacunas || 20}</span>
                    </span>
                  </div>
                  {(objetivos?.objetivo_vacunas || ventas?.veterinaria?.objetivo_vacunas) > 0 && (
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${Math.min((((ventas?.veterinaria?.vacunaciones?.quintuple || 0) + (ventas?.veterinaria?.vacunaciones?.sextuple || 0) + (ventas?.veterinaria?.vacunaciones?.antirrabica || 0) + (ventas?.veterinaria?.vacunaciones?.triple_felina || 0)) / (objetivos?.objetivo_vacunas || ventas?.veterinaria?.objetivo_vacunas || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Detalle vacunas */}
                <div className="pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">Detalle vacunaciones</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Quíntuple:</span>
                      <span className="text-mascotera-turquesa">{ventas?.veterinaria?.vacunaciones?.quintuple || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Séxtuple:</span>
                      <span className="text-white">{ventas?.veterinaria?.vacunaciones?.sextuple || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Antirrábica:</span>
                      <span className="text-mascotera-turquesa">{ventas?.veterinaria?.vacunaciones?.antirrabica || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Triple Felina:</span>
                      <span className="text-white">{ventas?.veterinaria?.vacunaciones?.triple_felina || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Resumen rápido */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{ventasPerdidas?.total_registros || 0}</p>
                <p className="text-sm text-gray-400">Ventas perdidas (mes)</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-mascotera-amarillo/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-mascotera-amarillo" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{tareasResumen?.pendientes || 0}</p>
                <p className="text-sm text-gray-400">Tareas pendientes</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{tareasResumen?.vencidas || 0}</p>
                <p className="text-sm text-gray-400">Tareas vencidas</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Syringe className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{tareasResumen?.completadas || 0}</p>
                <p className="text-sm text-gray-400">Tareas completadas</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Cierre de Caja Pendiente (login) */}
      {showCierrePendienteModal && (
        <CierreCajaPendienteModal
          diasPendientes={diasPendientesCierre}
          mode="login"
          onDismiss={() => setShowCierrePendienteModal(false)}
          onGoToCierreCajas={() => {
            setShowCierrePendienteModal(false)
            router.push('/cierre-cajas')
          }}
        />
      )}
    </div>
  )
}
