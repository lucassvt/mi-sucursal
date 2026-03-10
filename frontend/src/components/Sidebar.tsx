'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  PackageX,
  ClipboardCheck,
  Wallet,
  ListTodo,
  LogOut,
  Store,
  ChevronRight,
  CalendarClock,
  UserCheck,
  Bike,
  Scissors,
  FileText,
  Star,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { cierresApi, astraApi } from '@/lib/api'
import CierreCajaPendienteModal from '@/components/CierreCajaPendienteModal'
import AstraPanel from '@/components/AstraPanel'

const SUCURSALES_ASTRA = [7, 13] // ALEM y CONCEPCION

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ventas-perdidas', label: 'Ventas Perdidas', icon: PackageX },
  { href: '/encargos', label: 'Encargos', icon: Package },
  { href: '/facturas', label: 'Facturas', icon: FileText },
  { href: '/vencimientos', label: 'Vencimientos', icon: CalendarClock },
  { href: '/recontacto-clientes', label: 'Recontacto Clientes', icon: UserCheck },
  { href: '/sincro-pedidosya', label: 'Sincro Pedidos YA', icon: Bike },
  { href: '/peluqueria', label: 'Peluquería', icon: Scissors, hideForEncargado: true },
  { href: '/auditoria', label: 'Auditoría', icon: ClipboardCheck },
  { href: '/cierre-cajas', label: 'Cierre de Cajas', icon: Wallet },
  { href: '/tareas', label: 'Tareas', icon: ListTodo },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, token, logout } = useAuthStore()

  const esEncargado = (() => {
    const rolesEncargado = ['admin', 'gerente', 'gerencia', 'auditor', 'supervisor', 'jefe']
    const excluir = ['encargado superior', 'encargado de local', 'encargado de ventas', 'encargado de sucursal']
    const userRol = (user?.rol || '').toLowerCase()
    const userPuesto = (user?.puesto || '').toLowerCase()
    if (excluir.some(e => userRol.includes(e) || userPuesto.includes(e))) return false
    return rolesEncargado.some(r => userRol.includes(r) || userPuesto.includes(r))
  })()

  const filteredMenuItems = menuItems.filter(item => !(item.hideForEncargado && esEncargado))

  const [showCierrePendienteModal, setShowCierrePendienteModal] = useState(false)
  const [diasPendientes, setDiasPendientes] = useState<string[]>([])
  const [checkingPendientes, setCheckingPendientes] = useState(false)

  // Astra
  const tieneAstra = SUCURSALES_ASTRA.includes(user?.sucursal_id || 0)
  const [astraPendientes, setAstraPendientes] = useState(0)
  const [astraPanelOpen, setAstraPanelOpen] = useState(false)

  const fetchAstraResumen = useCallback(async () => {
    if (!tieneAstra || !token) return
    try {
      const data = await astraApi.resumen(token)
      setAstraPendientes(data.resumen.pendientes)
    } catch {
      // silently ignore
    }
  }, [tieneAstra, token])

  useEffect(() => {
    fetchAstraResumen()
    if (!tieneAstra) return
    const interval = setInterval(fetchAstraResumen, 60000) // cada 60s
    return () => clearInterval(interval)
  }, [fetchAstraResumen, tieneAstra])

  const handleLogout = async () => {
    if (esEncargado || !token) {
      logout()
      sessionStorage.removeItem('cierre-caja-alert-shown')
      router.push('/login')
      return
    }

    setCheckingPendientes(true)
    try {
      const data = await cierresApi.pendientes(token)
      if (data.dias_pendientes && data.dias_pendientes.length > 0) {
        setDiasPendientes(data.dias_pendientes)
        setShowCierrePendienteModal(true)
      } else {
        logout()
        sessionStorage.removeItem('cierre-caja-alert-shown')
        router.push('/login')
      }
    } catch {
      logout()
      sessionStorage.removeItem('cierre-caja-alert-shown')
      router.push('/login')
    } finally {
      setCheckingPendientes(false)
    }
  }

  const confirmLogout = () => {
    setShowCierrePendienteModal(false)
    logout()
    sessionStorage.removeItem('cierre-caja-alert-shown')
    router.push('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 glass border-r border-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-mascotera-turquesa/20 flex items-center justify-center">
            <Store className="w-5 h-5 text-mascotera-turquesa" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-white">Mi Sucursal</h1>
            <p className="text-xs text-mascotera-turquesa">{user?.sucursal_nombre || 'Sucursal'}</p>
          </div>
          {tieneAstra && (
            <button
              onClick={() => { setAstraPanelOpen(true); fetchAstraResumen() }}
              className="relative p-2 rounded-lg hover:bg-purple-500/10 transition-colors group"
              title="Pedidos Astra"
            >
              <Star className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
              {astraPendientes > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-purple-500 text-white text-[10px] font-bold px-1 animate-pulse">
                  {astraPendientes}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredMenuItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-mascotera-turquesa/20 text-mascotera-turquesa'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-mascotera-amarillo/20 flex items-center justify-center">
            <span className="text-mascotera-amarillo font-bold">
              {user?.nombre?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.nombre}</p>
            <p className="text-xs text-gray-400 truncate">{user?.rol || user?.puesto || 'Vendedor'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={checkingPendientes}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all mt-2 disabled:opacity-50"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">{checkingPendientes ? 'Verificando...' : 'Cerrar sesión'}</span>
        </button>
      </div>

      {/* Modal Cierre de Caja Pendiente (logout) */}
      {showCierrePendienteModal && (
        <CierreCajaPendienteModal
          diasPendientes={diasPendientes}
          mode="logout"
          onDismiss={() => setShowCierrePendienteModal(false)}
          onGoToCierreCajas={() => {
            setShowCierrePendienteModal(false)
            router.push('/cierre-cajas')
          }}
          onConfirmLogout={confirmLogout}
        />
      )}

      {/* Panel Astra */}
      {tieneAstra && (
        <AstraPanel
          open={astraPanelOpen}
          onClose={() => { setAstraPanelOpen(false); fetchAstraResumen() }}
        />
      )}
    </aside>
  )
}
