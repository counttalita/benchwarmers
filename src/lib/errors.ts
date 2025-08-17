import { ApiError } from '@/lib/api-error'

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ErrorCategory = 'validation' | 'authentication' | 'authorization' | 'not_found' | 'conflict' | 'rate_limit' | 'internal' | 'external'

export interface AppError extends Error {
  code: string
  category: ErrorCategory
  severity: ErrorSeverity
  context?: Record<string, any>
  correlationId?: string
}

export class AppErrorImpl extends Error implements AppError {
  constructor(
    public code: string,
    message: string,
    public category: ErrorCategory,
    public severity: ErrorSeverity = 'medium',
    public context?: Record<string, any>,
    public correlationId?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// Error creation utilities interface
interface CreateErrorMethods {
  validation: (code?: string, message?: string, context?: Record<string, any>) => AppError
  authentication: (code?: string, message?: string, context?: Record<string, any>) => AppError
  authorization: (code?: string, message?: string, context?: Record<string, any>) => AppError
  notFound: (code?: string, message?: string, context?: Record<string, any>) => AppError
  conflict: (code?: string, message?: string, context?: Record<string, any>) => AppError
  tooManyRequests: (code?: string, message?: string, context?: Record<string, any>) => AppError
  internal: (code?: string, message?: string, context?: Record<string, any>) => AppError
  external: (code?: string, message?: string, context?: Record<string, any>) => AppError
  custom: (code: string, message: string, category: ErrorCategory, severity?: ErrorSeverity, context?: Record<string, any>) => AppError
}

export const createError: CreateErrorMethods = {
  validation: (code = 'VALIDATION_ERROR', message = 'Validation failed', context?: Record<string, any>): AppError => 
    new AppErrorImpl(code, message, 'validation', 'medium', context),

  authentication: (code = 'AUTHENTICATION_ERROR', message = 'Authentication failed', context?: Record<string, any>): AppError => 
    new AppErrorImpl(code, message, 'authentication', 'high', context),

  authorization: (code = 'AUTHORIZATION_ERROR', message = 'Access denied', context?: Record<string, any>): AppError => 
    new AppErrorImpl(code, message, 'authorization', 'high', context),

  notFound: (code = 'NOT_FOUND', message = 'Resource not found', context?: Record<string, any>): AppError => 
    new AppErrorImpl(code, message, 'not_found', 'medium', context),

  conflict: (code = 'CONFLICT', message = 'Resource conflict', context?: Record<string, any>): AppError => 
    new AppErrorImpl(code, message, 'conflict', 'medium', context),

  tooManyRequests: (code = 'RATE_LIMIT_EXCEEDED', message = 'Too many requests', context?: Record<string, any>): AppError => 
    new AppErrorImpl(code, message, 'rate_limit', 'medium', context),

  internal: (code = 'INTERNAL_ERROR', message = 'Internal server error', context?: Record<string, any>): AppError => 
    new AppErrorImpl(code, message, 'internal', 'high', context),

  external: (code = 'EXTERNAL_ERROR', message = 'External service error', context?: Record<string, any>): AppError => 
    new AppErrorImpl(code, message, 'external', 'medium', context),

  custom: (code: string, message: string, category: ErrorCategory, severity: ErrorSeverity = 'medium', context?: Record<string, any>): AppError => 
    new AppErrorImpl(code, message, category, severity, context)
}

// Export AppError type for external use
export type { AppError }

// Parse unknown error into AppError
export function parseError(error: unknown, correlationId?: string): AppError {
  if (error instanceof AppErrorImpl) {
    if (correlationId) error.correlationId = correlationId
    return error
  }

  if (error instanceof ApiError) {
    return new AppErrorImpl(
      error.code,
      error.message,
      'internal',
      'medium',
      error.details,
      correlationId
    )
  }

  if (error instanceof Error) {
    return new AppErrorImpl(
      'UNKNOWN_ERROR',
      error.message,
      'internal',
      'medium',
      { originalError: error.name, stack: error.stack },
      correlationId
    )
  }

  return new AppErrorImpl(
    'UNKNOWN_ERROR',
    String(error),
    'internal',
    'medium',
    { originalError: error },
    correlationId
  )
}

// Logging utilities
export function logInfo(message: string, context?: Record<string, any>): void {
  console.log(`[INFO] ${message}`, context ? JSON.stringify(context, null, 2) : '')
}

export function logError(error: AppError | string, context?: Record<string, any>): void {
  if (typeof error === 'string') {
    console.error(`[ERROR] ${error}`, context ? JSON.stringify(context, null, 2) : '')
  } else {
    console.error(`[ERROR] ${error.code}: ${error.message}`, {
      category: error.category,
      severity: error.severity,
      correlationId: error.correlationId,
      context: error.context,
      additionalContext: context
    })
  }
}

export function logWarning(message: string, context?: Record<string, any>): void {
  console.warn(`[WARN] ${message}`, context ? JSON.stringify(context, null, 2) : '')
}

export function logDebug(message: string, context?: Record<string, any>): void {
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[DEBUG] ${message}`, context ? JSON.stringify(context, null, 2) : '')
  }
}
