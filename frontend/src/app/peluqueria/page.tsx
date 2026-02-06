'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Scissors,
  Search,
  Dog,
  Droplets,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/auth-store'

interface ServicioPelu {
  raza: string
  categoria: 'pequena' | 'mediana' | 'grande'
  corte_comercial: number | null
  corte_tijera: number | null
  bano_deslanado: number | null
  nota_bano?: string
}

interface Agregado {
  nombre: string
  precio: number
  nota?: string
}

const SERVICIOS: ServicioPelu[] = [
  // RAZAS PEQUEÑAS
  { raza: 'Caniche Mini -5kg', categoria: 'pequena', corte_comercial: 16000, corte_tijera: 20000, bano_deslanado: 14000 },
  { raza: 'Caniche Toy 5-10kg', categoria: 'pequena', corte_comercial: 18000, corte_tijera: 22000, bano_deslanado: 16000 },
  { raza: 'Pekines', categoria: 'pequena', corte_comercial: 16000, corte_tijera: 20000, bano_deslanado: 12000 },
  { raza: 'Pinscher', categoria: 'pequena', corte_comercial: null, corte_tijera: null, bano_deslanado: 10000 },
  { raza: 'Salchicha', categoria: 'pequena', corte_comercial: null, corte_tijera: null, bano_deslanado: 10000 },
  { raza: 'Schnauzer', categoria: 'pequena', corte_comercial: 18000, corte_tijera: 22000, bano_deslanado: 16000 },
  { raza: 'Shih Tzu', categoria: 'pequena', corte_comercial: 18000, corte_tijera: 22000, bano_deslanado: 16000 },
  { raza: 'Yorkshire', categoria: 'pequena', corte_comercial: 16000, corte_tijera: 20000, bano_deslanado: 14000 },
  // RAZAS MEDIANAS
  { raza: 'Batata', categoria: 'mediana', corte_comercial: null, corte_tijera: null, bano_deslanado: 18000 },
  { raza: 'Beagle', categoria: 'mediana', corte_comercial: null, corte_tijera: null, bano_deslanado: 15000 },
  { raza: 'Bichon Frise / Maltes', categoria: 'mediana', corte_comercial: 18000, corte_tijera: 24000, bano_deslanado: 16000 },
  { raza: 'Bull Dog Frances', categoria: 'mediana', corte_comercial: null, corte_tijera: null, bano_deslanado: 12000 },
  { raza: 'Bull Dog Ingles', categoria: 'mediana', corte_comercial: null, corte_tijera: null, bano_deslanado: 15000 },
  { raza: 'Bull Terrier', categoria: 'mediana', corte_comercial: null, corte_tijera: null, bano_deslanado: 20000 },
  { raza: 'Caniche Med 10-20kg', categoria: 'mediana', corte_comercial: 22000, corte_tijera: 26000, bano_deslanado: 18000 },
  { raza: 'Cocker', categoria: 'mediana', corte_comercial: 22000, corte_tijera: 25000, bano_deslanado: 18000 },
  { raza: 'Shar Pei', categoria: 'mediana', corte_comercial: null, corte_tijera: null, bano_deslanado: 20000 },
  { raza: 'Fox Terrier', categoria: 'mediana', corte_comercial: 18000, corte_tijera: 22000, bano_deslanado: 16000 },
  // RAZAS GRANDES
  { raza: 'Caniche Estandar +20kg', categoria: 'grande', corte_comercial: 25000, corte_tijera: 30000, bano_deslanado: 20000 },
  { raza: 'Border Collie', categoria: 'grande', corte_comercial: null, corte_tijera: null, bano_deslanado: null, nota_bano: 'A partir de $30.000' },
  { raza: 'Boxer', categoria: 'grande', corte_comercial: null, corte_tijera: null, bano_deslanado: 25000 },
  { raza: 'Braco Aleman', categoria: 'grande', corte_comercial: null, corte_tijera: null, bano_deslanado: 25000 },
  { raza: 'Chow Chow', categoria: 'grande', corte_comercial: null, corte_tijera: null, bano_deslanado: null, nota_bano: 'A partir de $30.000' },
  { raza: 'Doberman', categoria: 'grande', corte_comercial: null, corte_tijera: null, bano_deslanado: 23000 },
  { raza: 'Golden Retriever', categoria: 'grande', corte_comercial: null, corte_tijera: null, bano_deslanado: null, nota_bano: 'A partir de $30.000' },
  { raza: 'Labrador', categoria: 'grande', corte_comercial: null, corte_tijera: null, bano_deslanado: 25000 },
  { raza: 'Ovejero Aleman', categoria: 'grande', corte_comercial: null, corte_tijera: null, bano_deslanado: null, nota_bano: 'A partir de $30.000' },
  { raza: 'Ovejero Belga', categoria: 'grande', corte_comercial: null, corte_tijera: null, bano_deslanado: null, nota_bano: 'A partir de $30.000' },
  { raza: 'Pitbull', categoria: 'grande', corte_comercial: null, corte_tijera: null, bano_deslanado: 23000 },
  { raza: 'Pointer', categoria: 'grande', corte_comercial: null, corte_tijera: 25000, bano_deslanado: 23000 },
  { raza: 'Schnauzer Estandar +20kg', categoria: 'grande', corte_comercial: 26000, corte_tijera: 30000, bano_deslanado: 22000 },
  { raza: 'Schnauzer Gigante', categoria: 'grande', corte_comercial: 40000, corte_tijera: null, bano_deslanado: 30000 },
  { raza: 'Weimaraner', categoria: 'grande', corte_comercial: null, corte_tijera: null, bano_deslanado: 20000 },
]

const AGREGADOS: Agregado[] = [
  { nombre: 'Ecthol / Antinsecto', precio: 3000, nota: 'En perros +20kg hasta $5.000' },
  { nombre: 'Shampoo medicado', precio: 3000, nota: 'En perros grandes entre $3.500 y $5.000' },
  { nombre: 'Corte de unas perros peq. -10kg', precio: 6000 },
  { nombre: 'Corte de unas perros med. 10-25kg', precio: 7000 },
  { nombre: 'LOS', precio: 8000 },
]

const NOTAS = [
  'Los precios son para mascotas en buen estado. El precio final lo pone el peluquero al momento de ver al perro.',
  'Los recargos van entre $2.000 a $4.000 (depende del tamano y estado).',
  'Los recargos deben ser explicados por el peluquero antes del servicio, sino se cobra el precio base.',
  'Los turnos tienen tolerancia de 15 minutos.',
]

const formatPrecio = (precio: number | null) => {
  if (precio === null || precio === 0) return '-'
  return `$${precio.toLocaleString('es-AR')}`
}

export default function PeluqueriaPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  const serviciosFiltrados = useMemo(() => {
    let resultado = SERVICIOS

    if (filtroCategoria) {
      resultado = resultado.filter(s => s.categoria === filtroCategoria)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      resultado = resultado.filter(s => s.raza.toLowerCase().includes(q))
    }

    return resultado
  }, [searchQuery, filtroCategoria])

  const pequeñas = serviciosFiltrados.filter(s => s.categoria === 'pequena')
  const medianas = serviciosFiltrados.filter(s => s.categoria === 'mediana')
  const grandes = serviciosFiltrados.filter(s => s.categoria === 'grande')

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-mascotera-turquesa border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const renderTabla = (servicios: ServicioPelu[], titulo: string, color: string) => {
    if (servicios.length === 0) return null

    return (
      <div className="mb-6">
        <div className={`px-4 py-2 ${color} rounded-t-lg`}>
          <h3 className="font-semibold text-white text-sm uppercase tracking-wider">{titulo}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">Raza</th>
                <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">
                  <span className="flex items-center justify-end gap-1">
                    <Scissors className="w-3 h-3" /> Corte Comercial
                  </span>
                </th>
                <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">
                  <span className="flex items-center justify-end gap-1">
                    <Sparkles className="w-3 h-3" /> Corte Tijera / Raza
                  </span>
                </th>
                <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wider">
                  <span className="flex items-center justify-end gap-1">
                    <Droplets className="w-3 h-3" /> Bano / Deslanado
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {servicios.map((s) => (
                <tr key={s.raza} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-white font-medium">{s.raza}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={s.corte_comercial ? 'text-green-400 font-medium' : 'text-gray-600'}>
                      {formatPrecio(s.corte_comercial)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={s.corte_tijera ? 'text-purple-400 font-medium' : 'text-gray-600'}>
                      {formatPrecio(s.corte_tijera)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.nota_bano ? (
                      <span className="text-yellow-400 text-sm">{s.nota_bano}</span>
                    ) : (
                      <span className={s.bano_deslanado ? 'text-blue-400 font-medium' : 'text-gray-600'}>
                        {formatPrecio(s.bano_deslanado)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Sidebar />

      <main className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Scissors className="w-7 h-7 text-mascotera-turquesa" />
            Peluqueria - Catalogo de Precios
          </h1>
          <p className="text-gray-400 mt-1">Precios Febrero 2026</p>
        </div>

        {/* Buscador + Filtros */}
        <div className="glass rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-4">
            {/* Buscador */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar raza..."
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-mascotera-turquesa"
              />
            </div>

            {/* Filtros por tamano */}
            <div className="flex gap-2">
              <button
                onClick={() => setFiltroCategoria('')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !filtroCategoria ? 'bg-mascotera-turquesa text-black' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFiltroCategoria('pequena')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtroCategoria === 'pequena' ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                Pequenas
              </button>
              <button
                onClick={() => setFiltroCategoria('mediana')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtroCategoria === 'mediana' ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                Medianas
              </button>
              <button
                onClick={() => setFiltroCategoria('grande')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtroCategoria === 'grande' ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                Grandes
              </button>
            </div>
          </div>
        </div>

        {/* Catalogo */}
        <div className="glass rounded-2xl overflow-hidden mb-6">
          {serviciosFiltrados.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Dog className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No se encontraron razas con "{searchQuery}"</p>
            </div>
          ) : (
            <>
              {renderTabla(pequeñas, 'Razas Pequenas', 'bg-emerald-600/80')}
              {renderTabla(medianas, 'Razas Medianas', 'bg-amber-600/80')}
              {renderTabla(grandes, 'Razas Grandes', 'bg-red-600/80')}
            </>
          )}
        </div>

        {/* Agregados */}
        <div className="glass rounded-2xl overflow-hidden mb-6">
          <div className="px-4 py-2 bg-mascotera-turquesa/80 rounded-t-lg">
            <h3 className="font-semibold text-black text-sm uppercase tracking-wider">Agregados</h3>
          </div>
          <div className="divide-y divide-gray-800">
            {AGREGADOS.map((a) => (
              <div key={a.nombre} className="px-4 py-3 flex items-center justify-between hover:bg-gray-800/30 transition-colors">
                <div>
                  <span className="text-white font-medium">{a.nombre}</span>
                  {a.nota && <p className="text-xs text-yellow-400 mt-0.5">{a.nota}</p>}
                </div>
                <span className="text-mascotera-turquesa font-bold">{formatPrecio(a.precio)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notas */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              {NOTAS.map((nota, i) => (
                <p key={i} className="text-sm text-gray-400">{nota}</p>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
