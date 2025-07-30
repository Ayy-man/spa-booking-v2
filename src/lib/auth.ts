import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client for authentication
export const supabaseAuth = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Types for authentication
export interface AdminUser {
  id: string
  email: string
  role: 'admin' | 'staff'
  created_at: string
}

export interface AuthSession {
  user: AdminUser | null
  loading: boolean
}

// Authentication utilities
export const auth = {
  // Sign in with email/password
  async signIn(email: string, password: string) {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw new Error(error.message)
    }

    // Check if user has admin privileges
    const isAdmin = await auth.isAdminUser(data.user.id)
    if (!isAdmin) {
      await supabaseAuth.auth.signOut()
      throw new Error('Access denied. Admin privileges required.')
    }

    return data
  },

  // Sign up with email/password
  async signUp(email: string, password: string) {
    const { data, error } = await supabaseAuth.auth.signUp({
      email,
      password,
    })

    if (error) {
      throw new Error(error.message)
    }

    return data
  },

  // Sign out
  async signOut() {
    const { error } = await supabaseAuth.auth.signOut()
    if (error) {
      throw new Error(error.message)
    }
  },

  // Get current session
  async getSession() {
    const { data: { session }, error } = await supabaseAuth.auth.getSession()
    if (error) {
      throw new Error(error.message)
    }
    return session
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await supabaseAuth.auth.getUser()
    if (error) {
      throw new Error(error.message)
    }
    return user
  },

  // Check if user has admin privileges
  async isAdminUser(userId: string): Promise<boolean> {
    try {
      // Check if user exists in admin_users table or has admin role
      const { data, error } = await supabaseAuth
        .from('admin_users')
        .select('id, role')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (error) {
        // If admin_users table doesn't exist, fall back to checking user metadata
        const { data: { user } } = await supabaseAuth.auth.getUser()
        if (user && user.user_metadata?.role === 'admin') {
          return true
        }
        return false
      }

      return data && (data.role === 'admin' || data.role === 'staff')
    } catch (error) {
      console.error('Error checking admin status:', error)
      return false
    }
  },

  // Listen to auth changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabaseAuth.auth.onAuthStateChange(callback)
  },

  // Refresh session
  async refreshSession() {
    const { data, error } = await supabaseAuth.auth.refreshSession()
    if (error) {
      throw new Error(error.message)
    }
    return data
  },

  // Check if current session is valid and user is admin
  async validateAdminSession(): Promise<boolean> {
    try {
      const session = await auth.getSession()
      if (!session) return false

      const isAdmin = await auth.isAdminUser(session.user.id)
      return isAdmin
    } catch (error) {
      console.error('Error validating admin session:', error)
      return false
    }
  }
}

// Server-side authentication utilities for API routes and middleware
export const serverAuth = {
  // Create server client for API routes
  createServerClient() {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    if (!serviceRoleKey) {
      throw new Error('Missing Supabase service role key')
    }
    return createClient<Database>(supabaseUrl, serviceRoleKey)
  },

  // Validate request authentication
  async validateRequest(request: Request): Promise<{ user: any; isAdmin: boolean }> {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = serverAuth.createServerClient()

    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      throw new Error('Invalid token')
    }

    const isAdmin = await auth.isAdminUser(user.id)
    return { user, isAdmin }
  }
}

// Hook for client-side authentication state
export function useAuth() {
  if (typeof window === 'undefined') {
    return { user: null, loading: true, signIn: auth.signIn, signOut: auth.signOut }
  }

  // This will be used in components
  return {
    signIn: auth.signIn,
    signUp: auth.signUp,
    signOut: auth.signOut,
    getCurrentUser: auth.getCurrentUser,
    getSession: auth.getSession,
    validateAdminSession: auth.validateAdminSession
  }
}

// Utility to check if we're on an admin route
export function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin')
}

// Utility to check if route should be protected
export function shouldProtectRoute(pathname: string): boolean {
  const publicAdminRoutes = ['/admin/login']
  return isAdminRoute(pathname) && !publicAdminRoutes.includes(pathname)
}