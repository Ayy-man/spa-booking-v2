import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const pathname = request.nextUrl.pathname

  // Skip middleware for static files, API routes (except admin API), and public routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api') ||
    pathname === '/' ||
    pathname.startsWith('/booking')
  ) {
    return res
  }

  // Only protect admin routes
  if (pathname.startsWith('/admin')) {
    // Allow access to login page
    if (pathname === '/admin/login') {
      return res
    }

    try {
      // Get the authorization token from cookies or headers
      const token = request.cookies.get('supabase-auth-token')?.value || 
                    request.headers.get('authorization')?.replace('Bearer ', '')

      if (!token) {
        const redirectUrl = new URL('/admin/login', request.url)
        redirectUrl.searchParams.set('redirectTo', pathname)
        return NextResponse.redirect(redirectUrl)
      }

      // Create Supabase client for server-side validation
      const supabase = createClient(supabaseUrl, supabaseAnonKey)

      // Validate the token
      const { data: { user }, error: userError } = await supabase.auth.getUser(token)

      if (userError || !user) {
        const redirectUrl = new URL('/admin/login', request.url)
        redirectUrl.searchParams.set('redirectTo', pathname)
        return NextResponse.redirect(redirectUrl)
      }

      // Check if user has admin privileges
      try {
        const { data: adminUser, error: adminError } = await supabase
          .from('admin_users')
          .select('id, role, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single()

        // If no admin record found, check user metadata as fallback
        if (adminError || !adminUser) {
          const userRole = user.user_metadata?.role
          if (userRole !== 'admin' && userRole !== 'staff') {
            const redirectUrl = new URL('/admin/login', request.url)
            redirectUrl.searchParams.set('error', 'unauthorized')
            return NextResponse.redirect(redirectUrl)
          }
        }

        // User is authenticated and authorized, continue
        return res
      } catch (error) {
        console.error('Error checking admin privileges:', error)
        const redirectUrl = new URL('/admin/login', request.url)
        redirectUrl.searchParams.set('error', 'server_error')
        return NextResponse.redirect(redirectUrl)
      }
    } catch (error) {
      console.error('Middleware error:', error)
      const redirectUrl = new URL('/admin/login', request.url)
      redirectUrl.searchParams.set('error', 'server_error')
      return NextResponse.redirect(redirectUrl)
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