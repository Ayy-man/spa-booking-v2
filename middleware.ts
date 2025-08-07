import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const pathname = request.nextUrl.pathname
  const hostname = request.headers.get('host') || ''

  // Extract subdomain
  const subdomain = hostname.split('.')[0]
  
  // Handle subdomain routing
  if (subdomain === 'admin' && hostname.includes('dermalskinclinicspa.com')) {
    // Admin subdomain - redirect to admin routes if not already there
    if (!pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  } else if (subdomain === 'booking' && hostname.includes('dermalskinclinicspa.com')) {
    // Booking subdomain - redirect to booking routes if on admin pages
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/booking', request.url))
    }
    // Allow booking routes and home page
  }

  // Skip middleware for static files, API routes (except admin API), and public routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api') ||
    pathname === '/' ||
    pathname.startsWith('/booking') ||
    pathname.startsWith('/checkin')
  ) {
    return res
  }

  // Admin route protection
  if (pathname.startsWith('/admin')) {
    // Allow access to login page
    if (pathname === '/admin/login') {
      return res
    }

    // Check for simple auth session in cookies
    try {
      const cookieHeader = request.headers.get('cookie') || ''
      const sessionCookie = cookieHeader
        .split(';')
        .find(cookie => cookie.trim().startsWith('spa-admin-session='))
      
      if (!sessionCookie) {
        return NextResponse.redirect(new URL('/admin/login', request.url))
      }

      // Extract and validate session data
      const sessionData = sessionCookie.split('=')[1]
      if (!sessionData) {
        return NextResponse.redirect(new URL('/admin/login', request.url))
      }

      try {
        const session = JSON.parse(decodeURIComponent(sessionData))
        
        // Check if session is expired
        if (!session.expiresAt || Date.now() > session.expiresAt) {
          return NextResponse.redirect(new URL('/admin/login', request.url))
        }

        // Session is valid, allow access
        return res
      } catch (parseError) {
        // Invalid session data
        return NextResponse.redirect(new URL('/admin/login', request.url))
      }
    } catch (error) {
      console.error('Middleware auth error:', error)
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}