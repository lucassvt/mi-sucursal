'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Copy, Loader2, Target, Scissors, Stethoscope, Syringe } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/misucursal-api'

interface Objetivo {
  existe: boolean
  sucursal_id: number
  sucursal_nombre?: string
  sucursal_codigo?: string
  periodo: string
  schema?: string
  objetivo_venta_general: number
  piso_senda: number
  techo_senda: number
  piso_jaspe_liwue: number
  techo_jaspe_liwue: number
  piso_productos_estrella: number
  techo_productos_estrella: number
  objetivo_turnos_peluqueria: number
  objetivo_consultas_veterinaria: number
  objetivo_vacunas: number
}

function currentPeriodo() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function ObjetivosSucursalPage() {
  const params = useParams()
  const router = useRouter()
  const sucursalId = Number(params.id)
  const { token } = useAuthStore()
  const [periodo, setPeriodo] = useState(currentPeriodo())
  const [obj, setObj] = useState<Objetivo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copying, setCopying] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const fetchObjetivo = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(
        `${API_URL}/api/gerencia/objetivos/sucursal/${sucursalId}?periodo=${periodo}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.status === 403) {
        setMsg({ type: 'err', text: 'Sin permiso sobre esta sucursal' })
        setObj(null)
        return
      }
      const data = await res.json()
      setObj(data)
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || 'Error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchObjetivo()
  }, [token, sucursalId, periodo])

  const guardar = async () => {
    if (!obj || !token) return
    setSaving(true)
    setMsg(null)
    try {
      const payload = {
        objetivo_venta_general: obj.objetivo_venta_general,
        piso_senda: obj.piso_senda,
        techo_senda: obj.techo_senda,
        piso_jaspe_liwue: obj.piso_jaspe_liwue,
        techo_jaspe_liwue: obj.techo_jaspe_liwue,
        piso_productos_estrella: obj.piso_productos_estrella,
        techo_productos_estrella: obj.techo_productos_estrella,
        objetivo_turnos_peluqueria: obj.objetivo_turnos_peluqueria,
        objetivo_consultas_veterinaria: obj.objetivo_consultas_veterinaria,
        objetivo_vacunas: obj.objetivo_vacunas,
      }
      const res = await fetch(
        `${API_URL}/api/gerencia/objetivos/sucursal/${sucursalId}/${periodo}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Error al guardar')
      setMsg({ type: 'ok', text: 'Objetivos guardados' })
      fetchObjetivo()
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || 'Error' })
    } finally {
      setSaving(false)
    }
  }

  const copiarMesAnterior = async () => {
    if (!token) return
    setCopying(true)
    setMsg(null)
    try {
      const res = await fetch(
        `${API_URL}/api/gerencia/objetivos/sucursal/${sucursalId}/copiar-mes-anterior?periodo=${periodo}`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Error al copiar')
      setMsg({ type: 'ok', text: 'Copiado desde mes anterior' })
      fetchObjetivo()
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || 'Error' })
    } finally {
      setCopying(false)
    }
  }

  const setField = (k: keyof Objetivo, v: number) => {
    if (!obj) return
    setObj({ ...obj, [k]: v })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (!obj) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Link href="/gerencia" className="inline-flex items-center gap-2 text-blue-600 mb-4">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-4">
          {msg?.text || 'Sin acceso'}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href="/gerencia" className="inline-flex items-center gap-2 text-blue-600 mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> Volver al resumen
      </Link>

      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-700">
              {obj.sucursal_codigo}
            </span>
            <h2 className="text-2xl font-bold text-gray-900">{obj.sucursal_nombre}</h2>
          </div>
          <p className="text-sm text-gray-500">
            Objetivos {obj.existe ? 'configurados' : 'sin configurar'} · schema: {obj.schema}
          </p>
        </div>
        <input
          type="month"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
        />
      </div>

      {msg && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            msg.type === 'ok'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {msg.text}
        </div>
      )}

      {!obj.existe && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between gap-3">
          <span className="text-sm text-amber-800">Aún no hay objetivos para este período.</span>
          <button
            onClick={copiarMesAnterior}
            disabled={copying}
            className="px-3 py-1.5 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {copying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
            Copiar mes anterior
          </button>
        </div>
      )}

      <div className="space-y-4">
        {/* Venta general */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" /> Objetivo de venta general
          </h3>
          <label className="block text-xs text-gray-500 mb-1">Monto mensual ($)</label>
          <input
            type="number"
            value={obj.objetivo_venta_general || 0}
            onChange={(e) => setField('objetivo_venta_general', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </section>

        {/* Servicios */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Servicios</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Scissors className="w-3 h-3" /> Turnos peluquería
              </label>
              <input
                type="number"
                value={obj.objetivo_turnos_peluqueria || 0}
                onChange={(e) => setField('objetivo_turnos_peluqueria', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Stethoscope className="w-3 h-3" /> Consultas veterinarias
              </label>
              <input
                type="number"
                value={obj.objetivo_consultas_veterinaria || 0}
                onChange={(e) => setField('objetivo_consultas_veterinaria', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Syringe className="w-3 h-3" /> Vacunas
              </label>
              <input
                type="number"
                value={obj.objetivo_vacunas || 0}
                onChange={(e) => setField('objetivo_vacunas', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Productos (piso/techo por categoría) */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Objetivos de productos (piso / techo)</h3>
          <p className="text-xs text-gray-500 mb-4">
            Piso = mínimo esperado. Techo = objetivo óptimo. Usado por Portal Vendedores para calcular progreso.
          </p>

          {[
            { key: 'senda', label: 'SENDA (unidades)' },
            { key: 'jaspe_liwue', label: 'JASPE / LIWUE (unidades)' },
            { key: 'productos_estrella', label: 'Productos Estrella ($)' },
          ].map(({ key, label }) => (
            <div key={key} className="grid grid-cols-2 gap-4 mb-4 last:mb-0">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{label} - piso</label>
                <input
                  type="number"
                  value={(obj as any)[`piso_${key}`] || 0}
                  onChange={(e) => setField(`piso_${key}` as keyof Objetivo, Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{label} - techo</label>
                <input
                  type="number"
                  value={(obj as any)[`techo_${key}`] || 0}
                  onChange={(e) => setField(`techo_${key}` as keyof Objetivo, Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ))}
        </section>

        <div className="flex justify-end">
          <button
            onClick={guardar}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar objetivos
          </button>
        </div>
      </div>
    </div>
  )
}
