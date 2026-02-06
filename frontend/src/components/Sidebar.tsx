'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
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
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ventas-perdidas', label: 'Ventas Perdidas', icon: PackageX },
  { href: '/facturas', label: 'Facturas', icon: FileText },
  { href: '/vencimientos', label: 'Vencimientos', icon: CalendarClock },
  { href: '/recontacto-clientes', label: 'Recontacto Clientes', icon: UserCheck },
  { href: '/sincro-pedidosya', label: 'Sincro Pedidos YA', icon: Bike },
  { href: '/peluqueria', label: 'Peluquería', icon: Scissors },
  { href: '/auditoria', label: 'Auditoría', icon: ClipboardCheck },
  { href: '/cierre-cajas', label: 'Cierre de Cajas', icon: Wallet },
  { href: '/tareas', label: 'Tareas', icon: ListTodo },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
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
          <div>
            <h1 className="font-bold text-white">Mi Sucursal</h1>
            <p className="text-xs text-mascotera-turquesa">{user?.sucursal_nombre || 'Sucursal'}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
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
            <p className="text-xs text-gray-400 truncate">{user?.puesto || 'Vendedor'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all mt-2"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}
