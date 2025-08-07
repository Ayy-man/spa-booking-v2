/**
 * Security Headers Middleware
 * Adds security headers to all responses without breaking functionality
 */

import { NextRequest, NextResponse } from 'next/server'

/**
 * Security headers that don't break existing functionality
 */
export const SAFE_SECURITY_HEADERS = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // XSS Protection for older browsers
  'X-XSS-Protection': '1; mode=block',
  
  // Prevent clickjacking
  'X-Frame-Options': 'SAMEORIGIN',
  
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // DNS prefetch control
  'X-DNS-Prefetch-Control': 'on',
  
  // Powered by header removal (security through obscurity)
  'X-Powered-By': '',
  
  // Download options for IE
  'X-Download-Options': 'noopen',
  
  // Permitted cross-domain policies
  'X-Permitted-Cross-Domain-Policies': 'none'
}

/**
 * Content Security Policy - Permissive to avoid breaking existing functionality
 * This CSP allows most content but still provides some protection
 */
export const PERMISSIVE_CSP = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 
    'https://www.googletagmanager.com', 
    'https://www.google-analytics.com',
    'https://vercel.live'],
  'style-src': ["'self'", "'unsafe-inline'", 
    'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'data:', 
    'https://fonts.gstatic.com'],
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'connect-src': ["'self'", 
    'https://*.supabase.co', 
    'https://*.supabase.in',
    'https://link.fastpaydirect.com',
    'https://vercel.live',
    'wss://*.supabase.co'],
  'frame-src': ["'self'", 
    'https://link.fastpaydirect.com'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'", 
    'https://link.fastpaydirect.com'],
  'frame-ancestors': ["'self'"],
  'upgrade-insecure-requests': []
}

/**
 * Convert CSP object to string
 */
function buildCSPString(csp: Record<string, string[]>): string {
  return Object.entries(csp)
    .map(([key, values]) => {
      if (values.length === 0) return key
      return `${key} ${values.join(' ')}`
    })
    .join('; ')
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  // Apply safe headers
  Object.entries(SAFE_SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  // Apply permissive CSP (won't break existing functionality)
  const cspString = buildCSPString(PERMISSIVE_CSP)
  response.headers.set('Content-Security-Policy-Report-Only', cspString)
  
  // Permissions Policy (permissive)
  response.headers.set('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )
  
  return response
}

/**
 * Middleware function to add security headers
 */
export function withSecurityHeaders(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const response = await handler(req)
    return applySecurityHeaders(response)
  }
}

/**
 * Check for security issues in request (logging only, non-breaking)
 */
export function detectSecurityIssues(req: NextRequest): {
  issues: string[]
  severity: 'low' | 'medium' | 'high'
} {
  const issues: string[] = []
  let severity: 'low' | 'medium' | 'high' = 'low'
  
  const url = new URL(req.url)
  const params = url.searchParams.toString()
  const path = url.pathname
  
  // Check for potential SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/i,
    /(--|\/\*|\*\/|xp_|sp_|0x)/i,
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i
  ]
  
  for (const pattern of sqlPatterns) {
    if (pattern.test(params) || pattern.test(path)) {
      issues.push(`Potential SQL injection pattern detected: ${pattern}`)
      severity = 'high'
    }
  }
  
  // Check for XSS patterns
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi
  ]
  
  for (const pattern of xssPatterns) {
    if (pattern.test(params) || pattern.test(path)) {
      issues.push(`Potential XSS pattern detected: ${pattern}`)
      severity = severity === 'high' ? 'high' : 'medium'
    }
  }
  
  // Check for path traversal
  if (path.includes('../') || path.includes('..\\')) {
    issues.push('Potential path traversal attempt')
    severity = 'high'
  }
  
  // Check for suspicious user agents
  const userAgent = req.headers.get('user-agent') || ''
  const suspiciousAgents = [
    'sqlmap',
    'nikto',
    'nmap',
    'masscan',
    'metasploit'
  ]
  
  for (const agent of suspiciousAgents) {
    if (userAgent.toLowerCase().includes(agent)) {
      issues.push(`Suspicious user agent detected: ${agent}`)
      severity = severity === 'low' ? 'medium' : severity
    }
  }
  
  return { issues, severity }
}

/**
 * Log security issues (non-breaking)
 */
export function logSecurityIssues(req: NextRequest): void {
  const { issues, severity } = detectSecurityIssues(req)
  
  if (issues.length > 0) {
    console.warn(`[SECURITY ${severity.toUpperCase()}]`, {
      timestamp: new Date().toISOString(),
      url: req.url,
      method: req.method,
      issues,
      ip: req.headers.get('x-forwarded-for') || 
          req.headers.get('x-real-ip') || 
          'unknown',
      userAgent: req.headers.get('user-agent')
    })
  }
}

/**
 * CORS configuration (permissive for development)
 */
export function applyCORSHeaders(response: NextResponse, origin?: string): NextResponse {
  // Allow specific origins or all in development
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://dermalskinclinicspa.com',
    'https://booking.dermalskinclinicspa.com',
    'https://admin.dermalskinclinicspa.com'
  ]
  
  if (origin && (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development')) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 
      'Content-Type, Authorization, X-Requested-With, X-CSRF-Token')
    response.headers.set('Access-Control-Max-Age', '86400')
  }
  
  return response
}