import type { Metadata } from 'next'
import './globals.css'
import SucursalKeyWrapper from '@/components/SucursalKeyWrapper'

export const metadata: Metadata = {
  title: 'Mi Sucursal - La Mascotera',
  description: 'Sistema de gestión de sucursales de La Mascotera',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="antialiased">
        <SucursalKeyWrapper>{children}</SucursalKeyWrapper>
      </body>
    </html>
  )
}
