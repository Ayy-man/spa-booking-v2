/**
 * Security Audit Logger
 * Non-breaking audit trail for security events
 */

export enum AuditEventType {
  // Authentication Events
  LOGIN_ATTEMPT = 'LOGIN_ATTEMPT',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // Authorization Events
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ADMIN_ACCESS = 'ADMIN_ACCESS',
  
  // Data Events
  BOOKING_CREATED = 'BOOKING_CREATED',
  BOOKING_MODIFIED = 'BOOKING_MODIFIED',
  BOOKING_DELETED = 'BOOKING_DELETED',
  CUSTOMER_DATA_ACCESSED = 'CUSTOMER_DATA_ACCESSED',
  SENSITIVE_DATA_EXPORT = 'SENSITIVE_DATA_EXPORT',
  
  // Security Events
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  BRUTE_FORCE_ATTEMPT = 'BRUTE_FORCE_ATTEMPT',
  IP_BLOCKED = 'IP_BLOCKED',
  
  // System Events
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  CONFIGURATION_CHANGED = 'CONFIGURATION_CHANGED',
  SECURITY_FEATURE_ENABLED = 'SECURITY_FEATURE_ENABLED',
  SECURITY_FEATURE_DISABLED = 'SECURITY_FEATURE_DISABLED'
}

export interface AuditEvent {
  id: string
  timestamp: string
  eventType: AuditEventType
  severity: 'low' | 'medium' | 'high' | 'critical'
  userId?: string
  userEmail?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  resource?: string
  action?: string
  details?: Record<string, any>
  result: 'success' | 'failure' | 'blocked'
  metadata?: Record<string, any>
}

// In-memory audit log (consider database for production)
const auditLog: AuditEvent[] = []
const MAX_AUDIT_ENTRIES = 50000 // Keep last 50k entries

/**
 * Log audit event
 */
export function logAuditEvent(
  eventType: AuditEventType,
  severity: AuditEvent['severity'],
  result: AuditEvent['result'],
  context?: {
    userId?: string
    userEmail?: string
    sessionId?: string
    ipAddress?: string
    userAgent?: string
    resource?: string
    action?: string
    details?: Record<string, any>
    metadata?: Record<string, any>
  }
): void {
  const event: AuditEvent = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    eventType,
    severity,
    result,
    ...context
  }
  
  // Add to audit log
  auditLog.push(event)
  
  // Trim if too large
  if (auditLog.length > MAX_AUDIT_ENTRIES) {
    auditLog.shift()
  }
  
  // Console output for development
  if (process.env.NODE_ENV === 'development') {
    const severityColors = {
      low: '\x1b[32m',
      medium: '\x1b[33m',
      high: '\x1b[31m',
      critical: '\x1b[35m'
    }
    
    console.log(
      `${severityColors[severity]}[AUDIT ${severity.toUpperCase()}]\x1b[0m`,
      `${eventType}:`,
      result,
      context?.details ? JSON.stringify(context.details) : ''
    )
  }
  
  // Send critical events to external service
  if (severity === 'critical' || severity === 'high') {
    sendCriticalAuditEvent(event)
  }
  
  // Store in persistent storage (if configured)
  if (process.env.AUDIT_STORAGE_URL) {
    storeAuditEvent(event)
  }
}

/**
 * Send critical audit events to external monitoring
 */
async function sendCriticalAuditEvent(event: AuditEvent): Promise<void> {
  try {
    // In production, integrate with:
    // - Sentry for error tracking
    // - Datadog for security monitoring
    // - Splunk for log analysis
    // - AWS CloudTrail for audit trails
    
    if (process.env.NODE_ENV === 'production') {
      console.error('CRITICAL AUDIT EVENT:', event)
    }
    
    // Example webhook notification
    if (process.env.AUDIT_WEBHOOK_URL) {
      await fetch(process.env.AUDIT_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.AUDIT_WEBHOOK_TOKEN}`
        },
        body: JSON.stringify(event)
      })
    }
  } catch (error) {
    console.error('Failed to send critical audit event:', error)
  }
}

/**
 * Store audit event in persistent storage
 */
async function storeAuditEvent(event: AuditEvent): Promise<void> {
  try {
    // In production, store in:
    // - Database table
    // - S3 bucket
    // - CloudWatch logs
    // - External SIEM system
    
    if (process.env.AUDIT_STORAGE_URL) {
      await fetch(process.env.AUDIT_STORAGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.AUDIT_STORAGE_TOKEN}`
        },
        body: JSON.stringify(event)
      })
    }
  } catch (error) {
    console.error('Failed to store audit event:', error)
  }
}

/**
 * Get audit events with filtering
 */
export function getAuditEvents(filters?: {
  eventType?: AuditEventType
  severity?: AuditEvent['severity']
  userId?: string
  ipAddress?: string
  startDate?: Date
  endDate?: Date
  limit?: number
}): AuditEvent[] {
  let filtered = [...auditLog].reverse() // Most recent first
  
  if (filters) {
    if (filters.eventType) {
      filtered = filtered.filter(event => event.eventType === filters.eventType)
    }
    
    if (filters.severity) {
      filtered = filtered.filter(event => event.severity === filters.severity)
    }
    
    if (filters.userId) {
      filtered = filtered.filter(event => event.userId === filters.userId)
    }
    
    if (filters.ipAddress) {
      filtered = filtered.filter(event => event.ipAddress === filters.ipAddress)
    }
    
    if (filters.startDate) {
      filtered = filtered.filter(event => 
        new Date(event.timestamp) >= filters.startDate!
      )
    }
    
    if (filters.endDate) {
      filtered = filtered.filter(event => 
        new Date(event.timestamp) <= filters.endDate!
      )
    }
  }
  
  const limit = filters?.limit || 1000
  return filtered.slice(0, limit)
}

/**
 * Get audit statistics
 */
export function getAuditStatistics(timeframe?: '1h' | '24h' | '7d' | '30d') {
  const now = new Date()
  let startDate: Date
  
  switch (timeframe) {
    case '1h':
      startDate = new Date(now.getTime() - 60 * 60 * 1000)
      break
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      break
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    default:
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000) // Default 24h
  }
  
  const filteredEvents = auditLog.filter(event => 
    new Date(event.timestamp) >= startDate
  )
  
  const stats = {
    totalEvents: filteredEvents.length,
    criticalEvents: filteredEvents.filter(e => e.severity === 'critical').length,
    highSeverityEvents: filteredEvents.filter(e => e.severity === 'high').length,
    securityEvents: filteredEvents.filter(e => 
      e.eventType.includes('INJECTION') || 
      e.eventType.includes('XSS') || 
      e.eventType.includes('BRUTE_FORCE')
    ).length,
    failedLogins: filteredEvents.filter(e => 
      e.eventType === AuditEventType.LOGIN_FAILURE
    ).length,
    uniqueUsers: new Set(filteredEvents.map(e => e.userId).filter(Boolean)).size,
    uniqueIPs: new Set(filteredEvents.map(e => e.ipAddress).filter(Boolean)).size,
    eventTypes: filteredEvents.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }
  
  return stats
}

/**
 * Export audit log for analysis
 */
export function exportAuditLog(format: 'json' | 'csv' = 'json'): string {
  if (format === 'csv') {
    const headers = [
      'timestamp', 'eventType', 'severity', 'result',
      'userId', 'userEmail', 'ipAddress', 'resource', 'action'
    ]
    
    const rows = auditLog.map(event => [
      event.timestamp,
      event.eventType,
      event.severity,
      event.result,
      event.userId || '',
      event.userEmail || '',
      event.ipAddress || '',
      event.resource || '',
      event.action || ''
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }
  
  return JSON.stringify(auditLog, null, 2)
}

/**
 * Clear audit log (for testing/maintenance)
 */
export function clearAuditLog(): void {
  auditLog.length = 0
}

/**
 * Convenience functions for common audit events
 */
export const AuditLogger = {
  // Authentication
  loginAttempt: (email: string, ip: string, userAgent: string, success: boolean) => {
    logAuditEvent(
      success ? AuditEventType.LOGIN_SUCCESS : AuditEventType.LOGIN_FAILURE,
      success ? 'low' : 'medium',
      success ? 'success' : 'failure',
      {
        userEmail: email,
        ipAddress: ip,
        userAgent,
        details: { loginAttempt: true }
      }
    )
  },
  
  // Data access
  bookingCreated: (userId: string, bookingId: string, customerEmail: string) => {
    logAuditEvent(
      AuditEventType.BOOKING_CREATED,
      'low',
      'success',
      {
        userId,
        resource: 'booking',
        action: 'create',
        details: { bookingId, customerEmail }
      }
    )
  },
  
  // Security events
  suspiciousActivity: (ip: string, pattern: string, userAgent?: string) => {
    logAuditEvent(
      AuditEventType.SUSPICIOUS_ACTIVITY,
      'high',
      'blocked',
      {
        ipAddress: ip,
        userAgent,
        details: { pattern, blocked: true }
      }
    )
  },
  
  // Rate limiting
  rateLimitExceeded: (ip: string, endpoint: string, userAgent?: string) => {
    logAuditEvent(
      AuditEventType.RATE_LIMIT_EXCEEDED,
      'medium',
      'blocked',
      {
        ipAddress: ip,
        userAgent,
        resource: endpoint,
        action: 'request'
      }
    )
  }
}