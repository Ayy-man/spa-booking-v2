/**
 * Simple Authentication System for Admin Panel
 * Uses hardcoded credentials and localStorage for session management
 */

// Admin credentials from environment variables (secure)
const ADMIN_CREDENTIALS = {
  email: process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@demo-spa.com',
  password: process.env.ADMIN_PASSWORD || 'DEMO123'
}

// Session configuration
const SESSION_KEY = 'spa-admin-session'
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

export interface AdminSession {
  token: string
  email: string
  loginTime: number
  expiresAt: number
}

export const simpleAuth = {
  /**
   * Validate login credentials
   */
  validateCredentials(email: string, password: string): boolean {
    return email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password
  },

  /**
   * Create a new admin session
   */
  createSession(email: string): AdminSession {
    const now = Date.now()
    const session: AdminSession = {
      token: crypto.randomUUID(),
      email,
      loginTime: now,
      expiresAt: now + SESSION_DURATION
    }
    
    // Store in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    }
    
    return session
  },

  /**
   * Get current admin session
   */
  getCurrentSession(): AdminSession | null {
    if (typeof window === 'undefined') {
      return null
    }

    try {
      const sessionData = localStorage.getItem(SESSION_KEY)
      if (!sessionData) {
        return null
      }

      const session: AdminSession = JSON.parse(sessionData)
      
      // Check if session is expired
      if (Date.now() > session.expiresAt) {
        this.clearSession()
        return null
      }

      return session
    } catch (error) {
      // Invalid session data, clear it
      this.clearSession()
      return null
    }
  },

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    const session = this.getCurrentSession()
    return session !== null
  },

  /**
   * Clear current session (logout)
   */
  clearSession(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY)
    }
  },

  /**
   * Login with email and password
   */
  login(email: string, password: string): { success: boolean; error?: string; session?: AdminSession } {
    if (!this.validateCredentials(email, password)) {
      return {
        success: false,
        error: 'Invalid email or password. Please check your credentials.'
      }
    }

    const session = this.createSession(email)
    return {
      success: true,
      session
    }
  },

  /**
   * Logout current user
   */
  logout(): void {
    this.clearSession()
    
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login'
    }
  },

  /**
   * Extend current session (refresh expiration)
   */
  extendSession(): boolean {
    const session = this.getCurrentSession()
    if (!session) {
      return false
    }

    // Extend session by another 24 hours
    session.expiresAt = Date.now() + SESSION_DURATION
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    }
    
    return true
  },

  /**
   * Get session info for display
   */
  getSessionInfo(): { email: string; loginTime: Date; expiresAt: Date } | null {
    const session = this.getCurrentSession()
    if (!session) {
      return null
    }

    return {
      email: session.email,
      loginTime: new Date(session.loginTime),
      expiresAt: new Date(session.expiresAt)
    }
  }
}

/**
 * Client-side hook for authentication state
 */
export function useSimpleAuth() {
  if (typeof window === 'undefined') {
    return {
      isAuthenticated: false,
      login: simpleAuth.login,
      logout: simpleAuth.logout,
      sessionInfo: null
    }
  }

  return {
    isAuthenticated: simpleAuth.isAuthenticated(),
    login: simpleAuth.login,
    logout: simpleAuth.logout,
    sessionInfo: simpleAuth.getSessionInfo()
  }
}

/**
 * Server-side session validation for middleware
 * Since we can't access localStorage in middleware, we'll use a different approach
 */
export function validateSessionFromCookies(cookies: string): boolean {
  try {
    // For now, we'll use a simple approach where the session token is passed as a cookie
    // In production, you might want to use HTTP-only cookies for better security
    const sessionCookie = cookies.split(';')
      .find(cookie => cookie.trim().startsWith(`${SESSION_KEY}=`))
    
    if (!sessionCookie) {
      return false
    }

    const sessionData = sessionCookie.split('=')[1]
    const session: AdminSession = JSON.parse(decodeURIComponent(sessionData))
    
    // Check if session is expired
    return Date.now() <= session.expiresAt
  } catch (error) {
    return false
  }
}