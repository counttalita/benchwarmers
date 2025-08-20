import { ApiError } from '@/lib/api-error'

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ErrorCategory = 'validation' | 'authentication' | 'authorization' | 'not_found' | 'conflict' | 'rate_limit' | 'internal' | 'external'

export interface AppErrorInterface extends Error {
  code: string
  category: ErrorCategory
  severity: ErrorSeverity
  context?: Record<string, any>
  correlationId?: string
  retryable?: boolean
}

export class AppError extends Error implements AppErrorInterface {
  constructor(
    public code: string,
    message: string,
    public category: ErrorCategory,
    public severity: ErrorSeverity = 'medium',
    public context?: Record<string, any>,
    public correlationId?: string,
    public retryable?: boolean
  ) {
    super(message)
    this.name = 'AppError'
    
    // Set default retryable behavior based on category if not explicitly provided
    if (retryable === undefined) {
      this.retryable = this.getDefaultRetryBehavior()
    }
  }

  private getDefaultRetryBehavior(): boolean {
    switch (this.category) {
      case 'validation':
      case 'authentication':
      case 'authorization':
      case 'not_found':
      case 'conflict':
        return false // Client errors - don't retry
      case 'rate_limit':
      case 'internal':
      case 'external':
        return true // Server errors and rate limits - retry
      default:
        return false
    }
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
    new AppError(code, message, 'validation', 'medium', context),

  authentication: (code = 'AUTHENTICATION_ERROR', message = 'Authentication failed', context?: Record<string, any>): AppError => 
    new AppError(code, message, 'authentication', 'high', context),

  authorization: (code = 'AUTHORIZATION_ERROR', message = 'Access denied', context?: Record<string, any>): AppError => 
    new AppError(code, message, 'authorization', 'high', context),

  notFound: (code = 'NOT_FOUND', message = 'Resource not found', context?: Record<string, any>): AppError => 
    new AppError(code, message, 'not_found', 'medium', context),

  conflict: (code = 'CONFLICT', message = 'Resource conflict', context?: Record<string, any>): AppError => 
    new AppError(code, message, 'conflict', 'medium', context),

  tooManyRequests: (code = 'RATE_LIMIT_EXCEEDED', message = 'Too many requests', context?: Record<string, any>): AppError => 
    new AppError(code, message, 'rate_limit', 'medium', context),

  internal: (code = 'INTERNAL_ERROR', message = 'Internal server error', context?: Record<string, any>): AppError => 
    new AppError(code, message, 'internal', 'high', context),

  external: (code = 'EXTERNAL_ERROR', message = 'External service error', context?: Record<string, any>): AppError => 
    new AppError(code, message, 'external', 'medium', context),

  custom: (code: string, message: string, category: ErrorCategory, severity: ErrorSeverity = 'medium', context?: Record<string, any>): AppError => 
    new AppError(code, message, category, severity, context)
}

// Parse unknown error into AppError
export function parseError(error: unknown, correlationId?: string): AppError {
  if (error instanceof AppError) {
    if (correlationId) error.correlationId = correlationId
    return error
  }

  if (error instanceof ApiError) {
    return new AppError(
      error.code,
      error.message,
      'internal',
      'medium',
      error.details,
      correlationId
    )
  }

  if (error instanceof Error) {
    return new AppError(
      'UNKNOWN_ERROR',
      error.message,
      'internal',
      'medium',
      { originalError: error.name, stack: error.stack },
      correlationId
    )
  }

  return new AppError(
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

// User-friendly error message utilities
export function getUserMessage(error: AppError | Error | unknown): string {
  if (error instanceof AppError) {
    switch (error.category) {
      case 'validation':
        return 'Please check your input and try again.'
      case 'authentication':
        return 'Please log in to continue.'
      case 'authorization':
        return 'You do not have permission to perform this action.'
      case 'not_found':
        return 'The requested resource was not found.'
      case 'conflict':
        return 'This action conflicts with existing data.'
      case 'rate_limit':
        return 'Too many requests. Please try again later.'
      case 'external':
        return 'External service is temporarily unavailable.'
      default:
        return 'An unexpected error occurred. Please try again.'
    }
  }
  
  if (error instanceof Error) {
    return 'An error occurred. Please try again.'
  }
  
  return 'Something went wrong. Please try again.'
}

// Fetch error handler
export async function handleFetchError(response: Response): Promise<AppError> {
  let errorData: any = {}
  
  try {
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      errorData = await response.json()
    } else {
      errorData = { message: await response.text() }
    }
  } catch {
    // Ignore parsing errors
  }

  const code = errorData.code || `HTTP_${response.status}`
  const message = errorData.message || response.statusText || 'Request failed'
  
  // Determine category and retryable based on status code
  let category: ErrorCategory
  let retryable: boolean
  
  if (response.status >= 400 && response.status < 500) {
    // Client errors
    if (response.status === 401) {
      category = 'authentication'
    } else if (response.status === 403) {
      category = 'authorization'  
    } else if (response.status === 404) {
      category = 'not_found'
    } else if (response.status === 409) {
      category = 'conflict'
    } else if (response.status === 429) {
      category = 'rate_limit'
    } else {
      category = 'validation'
    }
    retryable = response.status === 429 // Only retry rate limits
  } else {
    // Server errors
    category = 'internal'
    retryable = true
  }

  return new AppError(
    code,
    message,
    category,
    'medium',
    { 
      status: response.status,
      statusText: response.statusText,
      ...errorData 
    },
    undefined,
    retryable
  )
}

// API call logging
export function logApiCall(
  method: string, 
  url: string, 
  status: number, 
  duration: number, 
  error?: AppError
): void {
  const logData = {
    method,
    url,
    status,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  }

  if (error) {
    logError(`API call failed: ${method} ${url}`, {
      ...logData,
      error: {
        code: error.code,
        message: error.message,
        category: error.category
      }
    })
  } else {
    logInfo(`API call: ${method} ${url} - ${status}`, logData)
  }
}

// User action logging
export function logUserAction(action: string, userId?: string, context?: Record<string, any>): void {
  logInfo(`User action: ${action}`, {
    userId,
    action,
    timestamp: new Date().toISOString(),
    ...context
  })
}
