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
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'
import { dashboardApi, ventasPerdidasApi, tareasApi } from '@/lib/api'

export default function DashboardPage() {
  const router = useRouter()
  const { token, user, isAuthenticated, isLoading } = useAuthStore()
  const [ventas, setVentas] = useState<any>(null)
  const [ventasPerdidas, setVentasPerdidas] = useState<any>(null)
  const [tareasResumen, setTareasResumen] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
      const [ventasData, vpData, tareasData] = await Promise.all([
        dashboardApi.getVentas(token!).catch(() => null),
        ventasPerdidasApi.resumen(token!).catch(() => null),
        tareasApi.resumen(token!).catch(() => null),
      ])
      setVentas(ventasData)
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="min-h-screen">
      <Sidebar />

      <main className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400">Bienvenido, {user?.nombre}</p>
        </div>

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
                  <p className="text-xs text-mascotera-turquesa">{user?.sucursal_nombre}</p>
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
          {user?.tiene_peluqueria && (
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                  <Scissors className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Peluquería Canina</h3>
                  <p className="text-xs text-gray-400">Servicio de la sucursal</p>
                </div>
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
                  <span className="text-white">{ventas?.peluqueria?.turnos_realizados || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Objetivo turnos:</span>
                  <span className="text-gray-300">{ventas?.peluqueria?.objetivo_turnos || 0}</span>
                </div>
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
          {user?.tiene_veterinaria && (
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

                <div className="grid grid-cols-3 gap-2 py-2">
                  <div className="text-center p-2 rounded-lg bg-gray-800/50">
                    <p className="text-lg font-bold text-white">{ventas?.veterinaria?.consultas || 0}</p>
                    <p className="text-xs text-gray-400">Consultas</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-gray-800/50">
                    <p className="text-lg font-bold text-white">{ventas?.veterinaria?.medicacion || 0}</p>
                    <p className="text-xs text-gray-400">Medicación</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-gray-800/50">
                    <p className="text-lg font-bold text-white">{ventas?.veterinaria?.cirugias || 0}</p>
                    <p className="text-xs text-gray-400">Cirugías</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">Vacunaciones</p>
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
    </div>
  )
}
