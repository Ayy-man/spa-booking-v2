import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Import our new security utilities (non-breaking)
import { applySecurityHeaders, logSecurityIssues } from '@/lib/security/security-headers'
import { getClientIP } from '@/lib/security/rate-limiter'
import { AuditLogger, AuditEventType } from '@/lib/security/audit-logger'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const pathname = request.nextUrl.pathname
  const hostname = request.headers.get('host') || ''
  const clientIP = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || 'unknown'

  // Add security logging (non-breaking)
  logSecurityIssues(request)

  // Extract subdomain
  const subdomain = hostname.split('.')[0]
  
  // Handle subdomain routing (existing functionality)
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
    // Apply security headers even for skipped routes
    return applySecurityHeaders(res)
  }

  // Admin route protection (existing functionality with enhanced logging)
  if (pathname.startsWith('/admin')) {
    // Allow access to login page
    if (pathname === '/admin/login') {
      return applySecurityHeaders(res)
    }

    // Check for simple auth session in cookies
    try {
      const cookieHeader = request.headers.get('cookie') || ''
      const sessionCookie = cookieHeader
        .split(';')
        .find(cookie => cookie.trim().startsWith('spa-admin-session='))
      
      if (!sessionCookie) {
        // Log unauthorized access attempt (non-breaking)
        AuditLogger.suspiciousActivity(
          clientIP,
          'Admin access without session',
          userAgent
        )
        
        return NextResponse.redirect(new URL('/admin/login', request.url))
      }

      // Extract and validate session data
      const sessionData = sessionCookie.split('=')[1]
      if (!sessionData) {
        AuditLogger.suspiciousActivity(
          clientIP,
          'Invalid session cookie',
          userAgent
        )
        
        return NextResponse.redirect(new URL('/admin/login', request.url))
      }

      try {
        const session = JSON.parse(decodeURIComponent(sessionData))
        
        // Check if session is expired
        if (!session.expiresAt || Date.now() > session.expiresAt) {
          // Log session expiry (non-breaking)
          AuditLogger.loginAttempt(
            session.email || 'unknown',
            clientIP,
            userAgent,
            false
          )
          
          return NextResponse.redirect(new URL('/admin/login', request.url))
        }

        // Session is valid, log successful admin access
        if (pathname !== '/admin/login') {
          // Only log actual admin page access, not login page
          console.log(`[AUDIT] Admin access: ${session.email} from ${clientIP} to ${pathname}`)
        }

        // Session is valid, allow access
        return applySecurityHeaders(res)
      } catch (parseError) {
        // Invalid session data
        AuditLogger.suspiciousActivity(
          clientIP,
          'Malformed session data',
          userAgent
        )
        
        return NextResponse.redirect(new URL('/admin/login', request.url))
      }
    } catch (error) {
      console.error('Middleware auth error:', error)
      
      // Log the error (non-breaking)
      AuditLogger.suspiciousActivity(
        clientIP,
        'Middleware authentication error',
        userAgent
      )
      
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // Apply security headers to all responses
  return applySecurityHeaders(res)
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