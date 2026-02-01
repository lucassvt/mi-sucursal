'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Package,
  Sparkles,
  FileCheck,
  Users,
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'
import { auditoriaApi } from '@/lib/api'

const pilares = [
  {
    key: 'orden_limpieza',
    label: 'Orden y Limpieza',
    icon: Sparkles,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  {
    key: 'cumplimiento_admin',
    label: 'Cumplimiento Administrativo',
    icon: FileCheck,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
  },
  {
    key: 'gestion_clientes',
    label: 'Gestión de Clientes',
    icon: Users,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
  },
]

export default function AuditoriaPage() {
  const router = useRouter()
  const { token, isAuthenticated, isLoading } = useAuthStore()
  const [stockNegativo, setStockNegativo] = useState<any[]>([])
  const [evaluaciones, setEvaluaciones] = useState<any[]>([])
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
      const [stockData, pilaresData] = await Promise.all([
        auditoriaApi.stockNegativo(token!),
        auditoriaApi.pilares(token!),
      ])
      setStockNegativo(stockData)
      setEvaluaciones(pilaresData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEvaluacionByPilar = (pilarKey: string) => {
    return evaluaciones.find((e) => e.pilar === pilarKey)
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
          <p className="text-gray-400">Estado de la sucursal y evaluaciones</p>
        </div>

        {/* Stock Negativo */}
        <div className="glass rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Stock Negativo</h2>
              <p className="text-sm text-gray-400">Productos con stock negativo en tu sucursal</p>
            </div>
            <div className="ml-auto">
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-400">
                {stockNegativo.length} items
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-mascotera-turquesa border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : stockNegativo.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
              <p>No hay productos con stock negativo</p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-900">
                  <tr className="text-left text-sm text-gray-400">
                    <th className="pb-3 font-medium">Código</th>
                    <th className="pb-3 font-medium">Producto</th>
                    <th className="pb-3 font-medium">Marca</th>
                    <th className="pb-3 font-medium text-right">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {stockNegativo.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-800/30">
                      <td className="py-3 text-sm text-gray-300">{item.cod_item}</td>
                      <td className="py-3 text-sm text-white">{item.item}</td>
                      <td className="py-3 text-sm text-gray-400">{item.marca || '-'}</td>
                      <td className="py-3 text-sm text-right font-medium text-red-400">
                        {item.stock}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pilares de Auditoría */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Pilares de Auditoría</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pilares.map((pilar) => {
              const evaluacion = getEvaluacionByPilar(pilar.key)
              const Icon = pilar.icon

              return (
                <div key={pilar.key} className="glass-card rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg ${pilar.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${pilar.color}`} />
                    </div>
                    <h3 className="font-medium text-white">{pilar.label}</h3>
                  </div>

                  {evaluacion ? (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-3xl font-bold text-white">
                          {evaluacion.puntaje}%
                        </span>
                        {evaluacion.aprobado ? (
                          <span className="flex items-center gap-1 text-green-400 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            Aprobado
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-400 text-sm">
                            <XCircle className="w-4 h-4" />
                            No aprobado
                          </span>
                        )}
                      </div>
                      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            evaluacion.aprobado ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${evaluacion.puntaje}%` }}
                        />
                      </div>
                      <p className="mt-3 text-xs text-gray-400">
                        Período: {evaluacion.periodo}
                      </p>
                      {evaluacion.observaciones && (
                        <p className="mt-2 text-sm text-gray-400">
                          {evaluacion.observaciones}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4 text-gray-400">
                      <ClipboardCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Sin evaluación</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Info adicional */}
        <div className="glass-card rounded-xl p-4">
          <p className="text-sm text-gray-400 text-center">
            Las evaluaciones de auditoría son realizadas por el equipo de supervisión.
            Los resultados se actualizan mensualmente.
          </p>
        </div>
      </main>
    </div>
  )
}
