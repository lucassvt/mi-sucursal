'use client'

import { AlertTriangle, Wallet, X, LogOut } from 'lucide-react'

interface CierreCajaPendienteModalProps {
  diasPendientes: string[]
  mode: 'login' | 'logout'
  onDismiss: () => void
  onGoToCierreCajas: () => void
  onConfirmLogout?: () => void
}

export default function CierreCajaPendienteModal({
  diasPendientes,
  mode,
  onDismiss,
  onGoToCierreCajas,
  onConfirmLogout,
}: CierreCajaPendienteModalProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-AR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="glass rounded-2xl p-6 w-full max-w-md mx-4 border border-yellow-500/30">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              {mode === 'login' ? 'Cierres de caja pendientes' : 'Cierres pendientes'}
            </h3>
          </div>
          {mode === 'login' && (
            <button
              onClick={onDismiss}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="mb-6">
          <p className="text-gray-300 text-sm mb-3">
            {mode === 'login'
              ? `Tenes ${diasPendientes.length} dia(s) sin declarar cierre de caja:`
              : `Antes de irte, tenes ${diasPendientes.length} dia(s) sin declarar cierre de caja:`}
          </p>
          <div className="flex flex-wrap gap-2">
            {diasPendientes.map((dia) => (
              <span
                key={dia}
                className="px-3 py-1 rounded-full text-sm bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
              >
                {formatDate(dia)}
              </span>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onGoToCierreCajas}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-mascotera-turquesa text-black font-semibold hover:bg-mascotera-turquesa/90 transition-colors"
          >
            <Wallet className="w-5 h-5" />
            Ir a Cierre de Cajas
          </button>

          {mode === 'login' ? (
            <button
              onClick={onDismiss}
              className="w-full px-4 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
            >
              Entendido
            </button>
          ) : (
            <button
              onClick={onConfirmLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-600 text-gray-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesion de todas formas
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
