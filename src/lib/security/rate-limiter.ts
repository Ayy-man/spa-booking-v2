/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting requests per IP/user
 */

import { NextRequest } from 'next/server'

interface RateLimitConfig {
  windowMs: number  // Time window in milliseconds
  maxRequests: number  // Max requests per window
  message?: string  // Custom error message
  skipSuccessfulRequests?: boolean  // Don't count successful requests
  keyGenerator?: (req: NextRequest) => string  // Custom key generation
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// In-memory store (consider Redis for production)
const store: RateLimitStore = {}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}, 60000) // Clean every minute

/**
 * Default key generator using IP address
 */
function defaultKeyGenerator(req: NextRequest): string {
  // Try to get real IP from various headers
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const cfIp = req.headers.get('cf-connecting-ip')
  
  const ip = forwarded?.split(',')[0] || realIp || cfIp || 'unknown'
  const path = new URL(req.url).pathname
  
  return `${ip}:${path}`
}

/**
 * Create rate limiter with specific configuration
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later',
    skipSuccessfulRequests = false,
    keyGenerator = defaultKeyGenerator
  } = config

  return async function rateLimiter(req: NextRequest): Promise<{
    allowed: boolean
    remaining: number
    resetTime: number
    retryAfter?: number
  }> {
    const key = keyGenerator(req)
    const now = Date.now()
    
    // Get or initialize the record for this key
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs
      }
    }
    
    const record = store[key]
    const remaining = Math.max(0, maxRequests - record.count)
    
    // Check if limit exceeded
    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000)
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
        retryAfter
      }
    }
    
    // Increment counter
    record.count++
    
    return {
      allowed: true,
      remaining: remaining - 1,
      resetTime: record.resetTime
    }
  }
}

/**
 * Pre-configured rate limiters for different endpoints
 */

// Strict rate limit for authentication endpoints
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  message: 'Too many login attempts. Please try again in 15 minutes.'
})

// Standard API rate limit
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  message: 'API rate limit exceeded. Please slow down your requests.'
})

// Booking creation rate limit
export const bookingRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 bookings per hour per IP
  message: 'Too many booking attempts. Please try again later.'
})

// Walk-in submission rate limit
export const walkInRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 3, // 3 walk-ins per 5 minutes
  message: 'Too many walk-in submissions. Please wait a few minutes.'
})

// Webhook rate limit (more lenient for external services)
export const webhookRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  message: 'Webhook rate limit exceeded.'
})

/**
 * Helper function to apply rate limiting in API routes
 */
export async function withRateLimit(
  req: NextRequest,
  rateLimiter: ReturnType<typeof createRateLimiter>
) {
  const result = await rateLimiter(req)
  
  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded',
        retryAfter: result.retryAfter
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(100), // You'd pass this from config
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
          'Retry-After': String(result.retryAfter)
        }
      }
    )
  }
  
  return null // Continue with request
}

/**
 * IP-based blocking for security
 */
const blockedIPs = new Set<string>()
const suspiciousActivity = new Map<string, number>()

export function blockIP(ip: string, duration?: number) {
  blockedIPs.add(ip)
  
  if (duration) {
    setTimeout(() => {
      blockedIPs.delete(ip)
    }, duration)
  }
}

export function isIPBlocked(ip: string): boolean {
  return blockedIPs.has(ip)
}

export function recordSuspiciousActivity(ip: string) {
  const count = (suspiciousActivity.get(ip) || 0) + 1
  suspiciousActivity.set(ip, count)
  
  // Auto-block after 10 suspicious activities
  if (count >= 10) {
    blockIP(ip, 24 * 60 * 60 * 1000) // Block for 24 hours
    suspiciousActivity.delete(ip)
  }
  
  // Clear counter after 1 hour
  setTimeout(() => {
    suspiciousActivity.delete(ip)
  }, 60 * 60 * 1000)
}

/**
 * Extract IP address from request
 */
export function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const cfIp = req.headers.get('cf-connecting-ip')
  
  return forwarded?.split(',')[0] || realIp || cfIp || 'unknown'
}