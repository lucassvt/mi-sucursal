'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Store, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { authApi } from '@/lib/api'

function LoginPageContent() {
  const router = useRouter()
  const { login } = useAuthStore()
  const searchParams = useSearchParams()

  // SSO: auto-login if sso_token is present
  useEffect(() => {
    const ssoToken = searchParams.get('sso_token')
    if (ssoToken) {
      setLoading(true)
      fetch((process.env.NEXT_PUBLIC_API_URL || '/misucursal-api') + '/api/auth/sso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: ssoToken }),
      })
        .then(res => {
          if (!res.ok) throw new Error('SSO failed')
          return res.json()
        })
        .then(data => {
          login(data.access_token, data.user)
          router.push('/dashboard')
        })
        .catch(() => {
          setError('Error de autenticación SSO. Ingresa manualmente.')
          setLoading(false)
        })
    }
  }, [searchParams, router, login])
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authApi.login(usuario, password)
      login(response.access_token, response.user)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-mascotera-turquesa/20 mb-4">
            <Store className="w-10 h-10 text-mascotera-turquesa" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">Mi Sucursal</h1>
          <p className="text-gray-400 mt-2">Ingresá con tu usuario del portal</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Usuario
            </label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-mascotera-turquesa transition-colors"
              placeholder="Tu usuario"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-mascotera-turquesa transition-colors pr-12"
                placeholder="Tu contraseña"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-mascotera-turquesa text-black font-semibold hover:bg-mascotera-turquesa/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                Ingresando...
              </span>
            ) : (
              'Ingresar'
            )}
          </button>

        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          La Mascotera © 2026
        </p>
      </div>
    </div>
  )
}


export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-mascotera-turquesa border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  )
}
