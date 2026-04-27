import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// QA-0183 2026-04-19: cookie para middleware server-side
const SESSION_COOKIE = 'misucursal_session'
function setSessionCookie(token: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${SESSION_COOKIE}=${token}; path=/; max-age=${60 * 60 * 24}; samesite=lax`
}
function clearSessionCookie() {
  if (typeof document === 'undefined') return
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`
}

interface User {
  id: number
  usuario: string
  nombre: string
  apellido?: string
  email?: string
  sucursal_id?: number
  sucursal_nombre?: string
  rol?: string
  puesto?: string
  foto_perfil_url?: string
  tiene_veterinaria?: boolean
  tiene_peluqueria?: boolean
  esGerencia?: boolean
  sucursalesPermitidas?: number[] | null
  sucursalesAsignadas?: {id: number; nombre: string}[]
}


interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  sucursalActiva: {id: number; nombre: string} | null
  isLoading: boolean
  login: (token: string, user: User) => void
  logout: () => void
  setSucursalActiva: (suc: {id: number; nombre: string} | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      sucursalActiva: null,
      isLoading: true,
      login: (token, user) => {
        setSessionCookie(token)
        set({
          token,
          user,
          isAuthenticated: true,
          isLoading: false,
        })
      },
      logout: () => {
        clearSessionCookie()
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        })
      },
      setSucursalActiva: (suc) => set({ sucursalActiva: suc }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'mi-sucursal-auth',
      onRehydrateStorage: () => (state) => {
        state?.setLoading(false)
      },
    }
  )
)

// QA-0086 2026-04-19: cross-tab logout detection
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'mi-sucursal-auth' && !e.newValue) {
      // Storage cleared in another tab -> logout here too
      const store = useAuthStore.getState()
      if (store.isAuthenticated) {
        clearSessionCookie()
        store.logout()
        window.location.href = '/misucursal/login'
      }
    }
  })
}
