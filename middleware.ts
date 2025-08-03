import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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

    // Allow admin access in development mode
    if (process.env.NODE_ENV === 'development') {
      return res
    }

    try {
      // Check for authentication token in cookies
      const token = request.cookies.get('sb-access-token')?.value || 
                    request.cookies.get('supabase-auth-token')?.value ||
                    request.headers.get('authorization')?.replace('Bearer ', '')

      if (!token) {
        return NextResponse.redirect(new URL('/admin/login', request.url))
      }

      // Create Supabase client for token verification
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      
      // Verify the token and get user
      const { data: { user }, error: userError } = await supabase.auth.getUser(token)
      
      if (userError || !user) {
        return NextResponse.redirect(new URL('/admin/login', request.url))
      }

      // Check if user has admin privileges
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (adminError || !adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'staff')) {
        return NextResponse.redirect(new URL('/admin/login', request.url))
      }

      // User is authenticated and authorized
      return res
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