'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Target, Scissors, Stethoscope, Syringe, Building2, Store, ChevronRight, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useScopeGerencia } from '@/hooks/useScopeGerencia'

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/misucursal-api'

interface ObjetivoResumen {
  sucursal_id: number
  codigo: string
  nombre: string
  schema: string
  tipo: 'central' | 'franquicia'
  existe: boolean
  objetivo_venta_general: number
  objetivo_turnos_peluqueria: number
  objetivo_consultas_veterinaria: number
  objetivo_vacunas: number
}

function currentPeriodo(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)
}

export default function GerenciaHomePage() {
  const { token } = useAuthStore()
  const { scope } = useScopeGerencia()
  const [periodo, setPeriodo] = useState(currentPeriodo())
  const [items, setItems] = useState<ObjetivoResumen[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API_URL}/api/gerencia/objetivos/resumen?periodo=${periodo}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        setItems(data.items || [])
      } catch {
        setItems([])
      } finally {
        setLoading(false)
      }
    })()
  }, [token, periodo])

  const totales = items.reduce(
    (acc, it) => ({
      venta: acc.venta + (it.objetivo_venta_general || 0),
      pelu: acc.pelu + (it.objetivo_turnos_peluqueria || 0),
      vet: acc.vet + (it.objetivo_consultas_veterinaria || 0),
      vac: acc.vac + (it.objetivo_vacunas || 0),
      con_obj: acc.con_obj + (it.existe ? 1 : 0),
    }),
    { venta: 0, pelu: 0, vet: 0, vac: 0, con_obj: 0 }
  )

  const isFranquiciado = scope?.sucursales.every((s) => s.tipo === 'franquicia')

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Resumen de gerencia</h2>
          <p className="text-sm text-gray-500 mt-1">
            {isFranquiciado ? 'Tu franquicia' : 'Casa Central'} · Período {periodo}
            · {totales.con_obj}/{items.length} sucursales con objetivos cargados
          </p>
        </div>
        <input
          type="month"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
        />
      </div>

      {!loading && items.length > 1 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
              <Target className="w-4 h-4" /> Venta objetivo (total)
            </div>
            <div className="text-xl font-bold text-gray-900">{formatMoney(totales.venta)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
              <Scissors className="w-4 h-4" /> Turnos peluquería
            </div>
            <div className="text-xl font-bold text-gray-900">{totales.pelu}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
              <Stethoscope className="w-4 h-4" /> Consultas vet
            </div>
            <div className="text-xl font-bold text-gray-900">{totales.vet}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
              <Syringe className="w-4 h-4" /> Vacunas
            </div>
            <div className="text-xl font-bold text-gray-900">{totales.vac}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          Sin sucursales en tu scope.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <Link
              key={it.sucursal_id}
              href={`/gerencia/sucursales/${it.sucursal_id}/objetivos`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {it.tipo === 'franquicia' ? (
                    <Store className="w-5 h-5 text-purple-600" />
                  ) : (
                    <Building2 className="w-5 h-5 text-blue-600" />
                  )}
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{it.nombre}</div>
                    <div className="text-xs text-gray-500">{it.codigo}</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>

              {it.existe ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Venta</span>
                    <span className="font-medium text-gray-900">{formatMoney(it.objetivo_venta_general)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Peluquería</span>
                    <span className="font-medium text-gray-900">{it.objetivo_turnos_peluqueria} turnos</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Veterinaria</span>
                    <span className="font-medium text-gray-900">{it.objetivo_consultas_veterinaria} consultas</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vacunas</span>
                    <span className="font-medium text-gray-900">{it.objetivo_vacunas}</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                  Sin objetivos cargados para este período. Click para cargar.
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
