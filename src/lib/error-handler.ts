/**
 * Centralized Error Handling System
 * Provides consistent error responses and logging
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

// Error types
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT_EXCEEDED',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL = 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST = 'BAD_REQUEST'
}

// Custom error class
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    public message: string,
    public statusCode: number = 500,
    public details?: any,
    public isOperational: boolean = true
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

// Error response structure
interface ErrorResponse {
  error: {
    type: string
    message: string
    details?: any
    timestamp: string
    requestId: string
    path?: string
  }
}

/**
 * Create standardized error response
 */
function createErrorResponse(
  type: ErrorType,
  message: string,
  statusCode: number,
  details?: any,
  path?: string
): NextResponse {
  const errorResponse: ErrorResponse = {
    error: {
      type,
      message: sanitizeErrorMessage(message),
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      path
    }
  }
  
  // Include details only in development
  if (process.env.NODE_ENV === 'development' && details) {
    errorResponse.error.details = details
  }
  
  return NextResponse.json(errorResponse, { status: statusCode })
}

/**
 * Sanitize error messages for production
 */
function sanitizeErrorMessage(message: string): string {
  if (process.env.NODE_ENV === 'production') {
    // Hide sensitive information in production
    if (message.toLowerCase().includes('database')) {
      return 'A database error occurred'
    }
    if (message.toLowerCase().includes('supabase')) {
      return 'A service error occurred'
    }
    if (message.toLowerCase().includes('key') || message.toLowerCase().includes('token')) {
      return 'An authentication error occurred'
    }
  }
  return message
}

/**
 * Main error handler
 */
export function handleError(error: unknown, path?: string): NextResponse {
  // Log error for monitoring
  console.error('Error occurred:', {
    error,
    path,
    timestamp: new Date().toISOString()
  })
  
  // Handle known error types
  if (error instanceof AppError) {
    return createErrorResponse(
      error.type,
      error.message,
      error.statusCode,
      error.details,
      path
    )
  }
  
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const formattedErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }))
    
    return createErrorResponse(
      ErrorType.VALIDATION,
      'Validation failed',
      400,
      { errors: formattedErrors },
      path
    )
  }
  
  // Handle Supabase errors
  if (error && typeof error === 'object' && 'code' in error) {
    const supabaseError = error as any
    
    // Map Supabase error codes to our error types
    switch (supabaseError.code) {
      case '23505': // Unique violation
        return createErrorResponse(
          ErrorType.CONFLICT,
          'A record with this information already exists',
          409,
          undefined,
          path
        )
      case '23503': // Foreign key violation
        return createErrorResponse(
          ErrorType.BAD_REQUEST,
          'Referenced record does not exist',
          400,
          undefined,
          path
        )
      case '42P01': // Undefined table
      case '42703': // Undefined column
        return createErrorResponse(
          ErrorType.DATABASE,
          'Database schema error',
          500,
          undefined,
          path
        )
      case 'PGRST301': // Not found
        return createErrorResponse(
          ErrorType.NOT_FOUND,
          'Record not found',
          404,
          undefined,
          path
        )
      default:
        return createErrorResponse(
          ErrorType.DATABASE,
          supabaseError.message || 'Database error occurred',
          500,
          undefined,
          path
        )
    }
  }
  
  // Handle standard JavaScript errors
  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('fetch failed')) {
      return createErrorResponse(
        ErrorType.EXTERNAL_SERVICE,
        'External service is unavailable',
        503,
        undefined,
        path
      )
    }
    
    if (error.message.includes('timeout')) {
      return createErrorResponse(
        ErrorType.EXTERNAL_SERVICE,
        'Request timeout',
        504,
        undefined,
        path
      )
    }
    
    return createErrorResponse(
      ErrorType.INTERNAL,
      error.message,
      500,
      undefined,
      path
    )
  }
  
  // Unknown error type
  return createErrorResponse(
    ErrorType.INTERNAL,
    'An unexpected error occurred',
    500,
    undefined,
    path
  )
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await fn(...args)
    } catch (error) {
      return handleError(error)
    }
  }
}

/**
 * Common error factories
 */
export const Errors = {
  validation: (message: string, details?: any) =>
    new AppError(ErrorType.VALIDATION, message, 400, details),
    
  unauthorized: (message: string = 'Authentication required') =>
    new AppError(ErrorType.AUTHENTICATION, message, 401),
    
  forbidden: (message: string = 'Access denied') =>
    new AppError(ErrorType.AUTHORIZATION, message, 403),
    
  notFound: (resource: string = 'Resource') =>
    new AppError(ErrorType.NOT_FOUND, `${resource} not found`, 404),
    
  conflict: (message: string) =>
    new AppError(ErrorType.CONFLICT, message, 409),
    
  rateLimit: (retryAfter?: number) =>
    new AppError(
      ErrorType.RATE_LIMIT,
      'Too many requests',
      429,
      { retryAfter }
    ),
    
  badRequest: (message: string, details?: any) =>
    new AppError(ErrorType.BAD_REQUEST, message, 400, details),
    
  internal: (message: string = 'Internal server error') =>
    new AppError(ErrorType.INTERNAL, message, 500)
}

/**
 * Error boundary for React components
 */
export class ErrorBoundary {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  
  static componentDidCatch(error: Error, errorInfo: any) {
    console.error('Component error:', {
      error,
      errorInfo,
      timestamp: new Date().toISOString()
    })
    
    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // Integrate with Sentry, LogRocket, etc.
    }
  }
}

/**
 * Validate environment variables on startup
 */
export function validateEnvironment() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new AppError(
      ErrorType.INTERNAL,
      `Missing required environment variables: ${missing.join(', ')}`,
      500,
      { missing }
    )
  }
}