'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Truck,
  MapPin,
  Clock,
  DollarSign,
  AlertTriangle,
  Search,
  Zap,
  Calendar,
  Building2,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'

interface ZonaReparto {
  nombre: string
  dias: string
  horario: string
  notas?: string
  destacado?: boolean
}

const ZONAS_REPARTO: ZonaReparto[] = [
  {
    nombre: 'San Miguel de Tucuman',
    dias: 'Lunes a sabado (manana) / Lunes a viernes (tarde)',
    horario: 'Manana y tarde',
  },
  {
    nombre: 'Centro / Microcentro',
    dias: 'Lunes a viernes',
    horario: 'Manana o tarde',
    notas: 'Se derivan a sucursal Laprida. Area: entre Salta, Marcos Paz, Balcarce y Crisostomo Alvarez. Se factura con el usuario del vendedor.',
    destacado: true,
  },
  {
    nombre: 'Yerba Buena',
    dias: 'Lunes a viernes',
    horario: '17:00 a 21:00',
  },
  {
    nombre: 'El Manantial',
    dias: 'Lunes a viernes',
    horario: '17:00 a 21:00',
  },
  {
    nombre: 'Banda del Rio Sali',
    dias: 'Lunes a viernes',
    horario: '13:00 a 17:00',
  },
  {
    nombre: 'San Pablo',
    dias: 'Jueves',
    horario: '08:30 a 10:00 / 12:00 a 14:00',
    notas: 'Mismos costos generales. Entregas junto con reparto a Concepcion.',
    destacado: true,
  },
  {
    nombre: 'Lules',
    dias: 'Jueves',
    horario: '08:30 a 10:00 / 12:00 a 14:00',
    notas: 'Mismos costos generales. Entregas junto con reparto a Concepcion.',
    destacado: true,
  },
  {
    nombre: 'Famailla',
    dias: 'Jueves',
    horario: '08:30 a 10:00 / 12:00 a 14:00',
    notas: 'Mismos costos generales. Entregas junto con reparto a Concepcion.',
    destacado: true,
  },
]

const COSTOS_ENVIO = [
  { zona: 'Zonas cercanas', precio: '$2.000' },
  { zona: 'Zonas intermedias', precio: '$4.000' },
  { zona: 'Zonas alejadas', precio: '$7.000' },
  { zona: 'Los Gutierrez', precio: '$5.000' },
  { zona: 'El Manantial', precio: '$5.000' },
]

export default function RepartoPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuthStore()
  const [busqueda, setBusqueda] = useState('')
  const [seccionAbierta, setSeccionAbierta] = useState<string | null>(null)

  if (isLoading || !isAuthenticated) {
    if (!isLoading && !isAuthenticated) router.push('/login')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-mascotera-turquesa border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const zonasFiltradas = busqueda.trim()
    ? ZONAS_REPARTO.filter(z => {
        const q = busqueda.toLowerCase()
        return z.nombre.toLowerCase().includes(q)
          || z.dias.toLowerCase().includes(q)
          || (z.notas || '').toLowerCase().includes(q)
      })
    : ZONAS_REPARTO

  const toggleSeccion = (id: string) => {
    setSeccionAbierta(seccionAbierta === id ? null : id)
  }

  return (
    <div className="min-h-screen">
      <Sidebar />

      <main className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Truck className="w-8 h-8 text-mascotera-turquesa" />
            Reparto y Envios
          </h1>
          <p className="text-gray-400 mt-2">Politica de envios, zonas y costos de reparto</p>
        </div>

        {/* Cards resumen politica */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Express */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Envios EXPRESS</h3>
                <p className="text-xs text-gray-400">En el dia</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs font-medium">GRATIS</span>
                <span className="text-gray-300">Pedidos mayores a <span className="text-white font-semibold">$60.000</span></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-xs font-medium">CON CARGO</span>
                <span className="text-gray-300">Pedidos menores a $60.000</span>
              </div>
              <p className="text-gray-500 text-xs mt-1">El costo depende de la distancia</p>
            </div>
          </div>

          {/* Programado */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Envios PROGRAMADOS</h3>
                <p className="text-xs text-gray-400">Segun dia y zona</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs font-medium">GRATIS</span>
                <span className="text-gray-300">Pedidos mayores a <span className="text-white font-semibold">$30.000</span></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-xs font-medium">CON CARGO</span>
                <span className="text-gray-300">Pedidos menores a $30.000</span>
              </div>
              <p className="text-gray-500 text-xs mt-1">El costo varia segun zona y distancia</p>
            </div>
          </div>
        </div>

        {/* Costos de envio */}
        <div className="glass rounded-2xl overflow-hidden mb-8">
          <button
            onClick={() => toggleSeccion('costos')}
            className="w-full p-4 border-b border-gray-800 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
          >
            <h2 className="font-semibold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-mascotera-turquesa" />
              Escala de Costos de Envio
            </h2>
            {seccionAbierta === 'costos' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          {seccionAbierta === 'costos' && (
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {COSTOS_ENVIO.map((c) => (
                  <div key={c.zona} className="bg-gray-800/50 rounded-lg p-4 text-center">
                    <p className="text-gray-400 text-xs mb-1">{c.zona}</p>
                    <p className="text-white text-xl font-bold">{c.precio}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-yellow-300/80 text-sm">
                  Las zonas mas alejadas de San Miguel de Tucuman y Banda del Rio Sali tienen costo superior por mayor kilometraje, tiempo operativo y menor densidad de entregas.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Buscador de zonas */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar zona de reparto..."
            className="w-full md:w-96 pl-10 pr-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white text-sm focus:outline-none focus:border-mascotera-turquesa placeholder-gray-500"
          />
        </div>

        {/* Zonas de reparto */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-mascotera-turquesa" />
              Zonas de Reparto ({zonasFiltradas.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-800">
            {zonasFiltradas.map((zona) => (
              <div key={zona.nombre} className="p-4 hover:bg-gray-800/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-lg">{zona.nombre}</span>
                      {zona.destacado && (
                        <span className="px-2 py-0.5 rounded bg-mascotera-turquesa/20 text-mascotera-turquesa text-xs font-medium">NOVEDAD</span>
                      )}
                    </div>
                    <div className="flex items-center gap-6 mt-2 text-sm">
                      <span className="flex items-center gap-1.5 text-gray-400">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        {zona.dias}
                      </span>
                      <span className="flex items-center gap-1.5 text-gray-400">
                        <Clock className="w-3.5 h-3.5 text-green-400" />
                        {zona.horario}
                      </span>
                    </div>
                    {zona.notas && (
                      <div className="mt-2 flex items-start gap-2 bg-gray-800/60 rounded px-3 py-2">
                        <Info className="w-3.5 h-3.5 text-mascotera-turquesa mt-0.5 flex-shrink-0" />
                        <span className="text-gray-300 text-sm">{zona.notas}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {zonasFiltradas.length === 0 && (
              <div className="p-8 text-center text-gray-400">
                <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No se encontraron zonas con &quot;{busqueda}&quot;</p>
              </div>
            )}
          </div>
        </div>

        {/* Info Centro/Microcentro destacada */}
        <div className="mt-6 glass-card rounded-xl p-5 border border-blue-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Zona Centro / Microcentro</h3>
              <p className="text-xs text-blue-400">Derivacion a Sucursal Laprida</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-gray-300">
            <p><span className="text-gray-500">Area:</span> Entre calles Salta, Marcos Paz, Balcarce y Crisostomo Alvarez</p>
            <p><span className="text-gray-500">Operativa:</span> Los pedidos se derivan a sucursal Laprida, se entregan y facturan ahi</p>
            <p><span className="text-gray-500">Facturacion:</span> Con el usuario del vendedor que realizo la venta</p>
            <p><span className="text-gray-500">Dias:</span> Lunes a viernes, entregas manana o tarde</p>
          </div>
        </div>
      </main>
    </div>
  )
}
