/**
 * API Logging and Monitoring System
 * Tracks API usage, errors, and security events
 */

import { NextRequest, NextResponse } from 'next/server'

// Log levels
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SECURITY = 'SECURITY'
}

// Log entry structure
interface LogEntry {
  timestamp: string
  level: LogLevel
  method: string
  path: string
  ip: string
  userAgent: string
  statusCode?: number
  duration?: number
  error?: string
  metadata?: Record<string, any>
  securityEvent?: string
}

// Security event types
export enum SecurityEvent {
  FAILED_AUTH = 'FAILED_AUTH',
  INVALID_TOKEN = 'INVALID_TOKEN',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_PATTERN = 'SUSPICIOUS_PATTERN',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  BRUTE_FORCE_ATTEMPT = 'BRUTE_FORCE_ATTEMPT'
}

// In-memory log buffer (consider external service for production)
const logBuffer: LogEntry[] = []
const MAX_BUFFER_SIZE = 10000

// Performance metrics
const performanceMetrics = {
  totalRequests: 0,
  totalErrors: 0,
  averageResponseTime: 0,
  endpointMetrics: new Map<string, {
    count: number
    totalTime: number
    errors: number
  }>()
}

/**
 * Extract client IP from request
 */
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const cfIp = req.headers.get('cf-connecting-ip')
  
  return forwarded?.split(',')[0] || realIp || cfIp || 'unknown'
}

/**
 * Core logging function
 */
export function logAPI(
  req: NextRequest,
  level: LogLevel,
  statusCode?: number,
  duration?: number,
  error?: string,
  metadata?: Record<string, any>,
  securityEvent?: SecurityEvent
) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    method: req.method,
    path: new URL(req.url).pathname,
    ip: getClientIP(req),
    userAgent: req.headers.get('user-agent') || 'unknown',
    statusCode,
    duration,
    error,
    metadata,
    securityEvent
  }
  
  // Add to buffer
  logBuffer.push(entry)
  
  // Trim buffer if too large
  if (logBuffer.length > MAX_BUFFER_SIZE) {
    logBuffer.shift()
  }
  
  // Update metrics
  updateMetrics(entry)
  
  // Console output for development
  if (process.env.NODE_ENV === 'development') {
    const logColor = {
      [LogLevel.DEBUG]: '\x1b[36m',
      [LogLevel.INFO]: '\x1b[32m',
      [LogLevel.WARN]: '\x1b[33m',
      [LogLevel.ERROR]: '\x1b[31m',
      [LogLevel.SECURITY]: '\x1b[35m'
    }
    
  }
  
  // Send critical logs to external service (if configured)
  if (level === LogLevel.ERROR || level === LogLevel.SECURITY) {
    sendToExternalService(entry)
  }
}

/**
 * Update performance metrics
 */
function updateMetrics(entry: LogEntry) {
  performanceMetrics.totalRequests++
  
  if (entry.error || (entry.statusCode && entry.statusCode >= 400)) {
    performanceMetrics.totalErrors++
  }
  
  if (entry.duration) {
    const currentAvg = performanceMetrics.averageResponseTime
    const newAvg = (currentAvg * (performanceMetrics.totalRequests - 1) + entry.duration) / performanceMetrics.totalRequests
    performanceMetrics.averageResponseTime = Math.round(newAvg)
  }
  
  // Update endpoint-specific metrics
  const endpoint = `${entry.method} ${entry.path}`
  const endpointMetric = performanceMetrics.endpointMetrics.get(endpoint) || {
    count: 0,
    totalTime: 0,
    errors: 0
  }
  
  endpointMetric.count++
  if (entry.duration) {
    endpointMetric.totalTime += entry.duration
  }
  if (entry.error) {
    endpointMetric.errors++
  }
  
  performanceMetrics.endpointMetrics.set(endpoint, endpointMetric)
}

/**
 * Send critical logs to external monitoring service
 */
async function sendToExternalService(entry: LogEntry) {
  // In production, integrate with services like:
  // - Sentry for error tracking
  // - Datadog for monitoring
  // - CloudWatch for AWS
  // - LogRocket for session replay
  
  // For now, just log to console in production
  if (process.env.NODE_ENV === 'production') {
    console.error('CRITICAL LOG:', entry)
  }
}

/**
 * Middleware wrapper for automatic API logging
 */
export function withAPILogging(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now()
    
    try {
      // Log incoming request
      logAPI(req, LogLevel.INFO)
      
      // Execute handler
      const response = await handler(req)
      
      // Log successful response
      const duration = Date.now() - startTime
      logAPI(req, LogLevel.INFO, response.status, duration)
      
      // Add monitoring headers
      response.headers.set('X-Response-Time', `${duration}ms`)
      response.headers.set('X-Request-ID', crypto.randomUUID())
      
      return response
    } catch (error) {
      // Log error
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      logAPI(req, LogLevel.ERROR, 500, duration, errorMessage)
      
      // Return error response
      return new NextResponse(
        JSON.stringify({
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development' ? errorMessage : 'An error occurred',
          requestId: crypto.randomUUID()
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'X-Response-Time': `${duration}ms`
          }
        }
      )
    }
  }
}

/**
 * Log security events
 */
export function logSecurityEvent(
  req: NextRequest,
  event: SecurityEvent,
  details?: Record<string, any>
) {
  logAPI(
    req,
    LogLevel.SECURITY,
    undefined,
    undefined,
    undefined,
    details,
    event
  )
  
  // Additional security event handling
  handleSecurityEvent(req, event, details)
}

/**
 * Handle security events with appropriate actions
 */
function handleSecurityEvent(
  req: NextRequest,
  event: SecurityEvent,
  details?: Record<string, any>
) {
  const ip = getClientIP(req)
  
  switch (event) {
    case SecurityEvent.BRUTE_FORCE_ATTEMPT:
    case SecurityEvent.SQL_INJECTION_ATTEMPT:
    case SecurityEvent.XSS_ATTEMPT:
      // These are serious - consider blocking IP
      console.error(`SECURITY ALERT: ${event} from IP ${ip}`, details)
      break
      
    case SecurityEvent.FAILED_AUTH:
      // Track failed auth attempts
      console.warn(`Failed authentication from IP ${ip}`)
      break
      
    case SecurityEvent.RATE_LIMIT_EXCEEDED:
      // Already handled by rate limiter
      break
      
    default:
      console.warn(`Security event: ${event} from IP ${ip}`, details)
  }
}

/**
 * Get current metrics
 */
export function getMetrics() {
  const topEndpoints = Array.from(performanceMetrics.endpointMetrics.entries())
    .map(([endpoint, metrics]) => ({
      endpoint,
      count: metrics.count,
      averageTime: metrics.totalTime / metrics.count,
      errorRate: (metrics.errors / metrics.count) * 100
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
  
  return {
    totalRequests: performanceMetrics.totalRequests,
    totalErrors: performanceMetrics.totalErrors,
    errorRate: (performanceMetrics.totalErrors / performanceMetrics.totalRequests) * 100,
    averageResponseTime: performanceMetrics.averageResponseTime,
    topEndpoints
  }
}

/**
 * Get recent logs
 */
export function getRecentLogs(
  limit: number = 100,
  level?: LogLevel,
  securityOnly?: boolean
): LogEntry[] {
  let logs = [...logBuffer].reverse()
  
  if (level) {
    logs = logs.filter(log => log.level === level)
  }
  
  if (securityOnly) {
    logs = logs.filter(log => log.securityEvent)
  }
  
  return logs.slice(0, limit)
}

/**
 * Clear logs (for testing)
 */
export function clearLogs() {
  logBuffer.length = 0
}

/**
 * Export logs for analysis
 */
export function exportLogs(): string {
  return JSON.stringify(logBuffer, null, 2)
}