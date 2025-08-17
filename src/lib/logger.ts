/**
 * Simple logger service for production-ready logging
 * Replaces direct console.log/error/warn usage
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: string
  context?: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isProduction = process.env.NODE_ENV === 'production'

  private log(level: LogLevel, message: string, data?: any, context?: string) {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      context
    }

    // In development, use console for immediate feedback
    if (this.isDevelopment) {
      switch (level) {
        case 'debug':
        case 'info':
          console.log(`[${context || 'APP'}]`, message, data || '')
          break
        case 'warn':
          console.warn(`[${context || 'APP'}]`, message, data || '')
          break
        case 'error':
          console.error(`[${context || 'APP'}]`, message, data || '')
          break
      }
    }

    // In production, you could send to external service here
    // For now, we'll only log errors and critical info in production
    if (this.isProduction) {
      if (level === 'error') {
        // Still use console.error in production for now
        // Can be replaced with external service later
        console.error(entry)
      }
    }
  }

  debug(message: string, data?: any, context?: string) {
    // Debug logs only in development
    if (this.isDevelopment) {
      this.log('debug', message, data, context)
    }
  }

  info(message: string, data?: any, context?: string) {
    this.log('info', message, data, context)
  }

  warn(message: string, data?: any, context?: string) {
    this.log('warn', message, data, context)
  }

  error(message: string, data?: any, context?: string) {
    this.log('error', message, data, context)
  }

  // Special method for payment/webhook logs that must always be kept
  audit(message: string, data?: any) {
    // Always log audit entries regardless of environment
    const auditEntry = {
      type: 'AUDIT',
      message,
      data,
      timestamp: new Date().toISOString()
    }
    console.log(JSON.stringify(auditEntry))
  }
}

// Export singleton instance
export const logger = new Logger()