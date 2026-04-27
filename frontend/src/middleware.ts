// QA-0183 2026-04-19: middleware Next.js server-side para mi-sucursal.
// Rechaza requests sin cookie de sesion o con JWT expirado antes de servir HTML sensible.
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE = 'misucursal_session'
const PUBLIC_PREFIXES = ['/_next', '/favicon', '/misucursal/login', '/login', '/landigia']

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString('utf-8')
    )
    if (payload.exp && payload.exp * 1000 < Date.now()) return true
    return false
  } catch {
    return true
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (isPublic(pathname)) return NextResponse.next()

  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token || isTokenExpired(token)) {
    const url = request.nextUrl.clone()
    url.pathname = '/misucursal/login'
    url.search = ''
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
