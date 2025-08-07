/**
 * Input Sanitization Utilities
 * Clean and safe data handling without breaking functionality
 */

/**
 * Sanitize string input - removes dangerous characters
 */
export function sanitizeString(input: string, options?: {
  maxLength?: number
  allowedChars?: RegExp
  removeHtml?: boolean
}): string {
  if (!input || typeof input !== 'string') return ''
  
  let sanitized = input.trim()
  
  // Limit length
  if (options?.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength)
  }
  
  // Remove HTML tags if requested
  if (options?.removeHtml !== false) {
    sanitized = sanitized.replace(/<[^>]*>/g, '')
  }
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')
  
  // Remove control characters except newline and tab
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  
  // Apply allowed characters filter if provided
  if (options?.allowedChars) {
    sanitized = sanitized.replace(new RegExp(`[^${options.allowedChars.source}]`, 'g'), '')
  }
  
  return sanitized
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return ''
  
  // Convert to lowercase and trim
  let sanitized = email.toLowerCase().trim()
  
  // Remove any characters that aren't valid in email
  sanitized = sanitized.replace(/[^a-z0-9@._+-]/g, '')
  
  // Ensure only one @ symbol
  const parts = sanitized.split('@')
  if (parts.length > 2) {
    sanitized = parts[0] + '@' + parts.slice(1).join('')
  }
  
  // Limit length
  return sanitized.substring(0, 255)
}

/**
 * Sanitize phone number
 */
export function sanitizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return ''
  
  // Remove all non-numeric characters except + (for international)
  let sanitized = phone.replace(/[^0-9+\-\(\)\s]/g, '')
  
  // Limit length
  return sanitized.substring(0, 20)
}

/**
 * Sanitize URL
 */
export function sanitizeURL(url: string): string | null {
  if (!url || typeof url !== 'string') return null
  
  try {
    const parsed = new URL(url)
    
    // Only allow http(s) protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null
    }
    
    // Remove any auth information
    parsed.username = ''
    parsed.password = ''
    
    return parsed.toString()
  } catch {
    return null
  }
}

/**
 * Sanitize file name
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') return 'file'
  
  // Remove path components
  const baseName = fileName.split(/[/\\]/).pop() || 'file'
  
  // Remove dangerous characters
  let sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, '_')
  
  // Ensure it doesn't start with a dot (hidden file)
  if (sanitized.startsWith('.')) {
    sanitized = '_' + sanitized.substring(1)
  }
  
  // Limit length
  return sanitized.substring(0, 255)
}

/**
 * Sanitize JSON object - removes dangerous content
 */
export function sanitizeJSON<T extends object>(obj: T, maxDepth: number = 10): T {
  if (maxDepth <= 0) {
    throw new Error('Maximum depth reached')
  }
  
  const sanitized: any = Array.isArray(obj) ? [] : {}
  
  for (const [key, value] of Object.entries(obj)) {
    // Sanitize key
    const safeKey = sanitizeString(key, { maxLength: 100 })
    
    // Sanitize value based on type
    if (value === null || value === undefined) {
      sanitized[safeKey] = value
    } else if (typeof value === 'string') {
      sanitized[safeKey] = sanitizeString(value)
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[safeKey] = value
    } else if (typeof value === 'object') {
      sanitized[safeKey] = sanitizeJSON(value, maxDepth - 1)
    }
    // Skip functions and symbols
  }
  
  return sanitized as T
}

/**
 * Escape HTML special characters
 */
export function escapeHTML(str: string): string {
  if (!str || typeof str !== 'string') return ''
  
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  }
  
  return str.replace(/[&<>"'/]/g, char => htmlEscapes[char])
}

/**
 * Validate and sanitize MongoDB ObjectId
 */
export function sanitizeObjectId(id: string): string | null {
  if (!id || typeof id !== 'string') return null
  
  // MongoDB ObjectId pattern
  const objectIdPattern = /^[0-9a-fA-F]{24}$/
  
  if (objectIdPattern.test(id)) {
    return id.toLowerCase()
  }
  
  return null
}

/**
 * Validate and sanitize UUID
 */
export function sanitizeUUID(uuid: string): string | null {
  if (!uuid || typeof uuid !== 'string') return null
  
  // UUID v4 pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  
  if (uuidPattern.test(uuid)) {
    return uuid.toLowerCase()
  }
  
  return null
}

/**
 * Sanitize SQL identifier (table/column name)
 */
export function sanitizeSQLIdentifier(identifier: string): string {
  if (!identifier || typeof identifier !== 'string') return ''
  
  // Only allow alphanumeric and underscore
  return identifier.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 64)
}

/**
 * Create safe error message (no sensitive data)
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (!error) return 'An error occurred'
  
  if (error instanceof Error) {
    const message = error.message
    
    // Remove sensitive patterns
    const sensitivePatterns = [
      /api[_-]?key[_-]?=?['\"]?[\w-]+/gi,
      /token[_-]?=?['\"]?[\w-]+/gi,
      /password[_-]?=?['\"]?[\w-]+/gi,
      /secret[_-]?=?['\"]?[\w-]+/gi,
      /\/\/[^:]+:[^@]+@/g, // URLs with credentials
      /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi // Email addresses
    ]
    
    let sanitized = message
    for (const pattern of sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]')
    }
    
    return sanitized
  }
  
  return 'An error occurred'
}

/**
 * Batch sanitization for request body
 */
export function sanitizeRequestBody(body: any): any {
  if (!body) return {}
  
  try {
    return sanitizeJSON(body)
  } catch {
    return {}
  }
}

/**
 * Check if string contains SQL injection patterns (non-blocking)
 */
export function detectSQLInjection(input: string): boolean {
  if (!input || typeof input !== 'string') return false
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/i,
    /(--|\*|\/\*|\*\/|xp_|sp_)/,
    /(\bOR\b.*=|\bAND\b.*=)/i,
    /(';|";|\);|";)/
  ]
  
  return sqlPatterns.some(pattern => pattern.test(input))
}

/**
 * Check if string contains XSS patterns (non-blocking)
 */
export function detectXSS(input: string): boolean {
  if (!input || typeof input !== 'string') return false
  
  const xssPatterns = [
    /<script[^>]*>.*?/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /document\./gi,
    /window\./gi,
    /eval\(/gi,
    /alert\(/gi
  ]
  
  return xssPatterns.some(pattern => pattern.test(input))
}

/**
 * Safe JSON parse with error handling
 */
export function safeJSONParse<T = any>(json: string, fallback: T): T {
  try {
    return JSON.parse(json)
  } catch {
    return fallback
  }
}

/**
 * Safe JSON stringify with error handling
 */
export function safeJSONStringify(obj: any, fallback: string = '{}'): string {
  try {
    return JSON.stringify(obj)
  } catch {
    return fallback
  }
}