import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
}

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string, user: User) => void
  logout: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: (token, user) => set({
        token,
        user,
        isAuthenticated: true,
        isLoading: false,
      }),
      logout: () => set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      }),
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
