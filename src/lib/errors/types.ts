// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories for better organization
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  SERVER = 'server',
  CLIENT = 'client',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  UNKNOWN = 'unknown'
}

// Base error interface
export interface BaseError {
  code: string
  message: string
  category: ErrorCategory
  severity: ErrorSeverity
  timestamp: Date
  context?: Record<string, any>
  stack?: string
  userMessage?: string // User-friendly message
  retryable?: boolean
  statusCode?: number
}

// Application-specific error class
export class AppError extends Error implements BaseError {
  public readonly code: string
  public readonly category: ErrorCategory
  public readonly severity: ErrorSeverity
  public readonly timestamp: Date
  public readonly context?: Record<string, any>
  public readonly userMessage?: string
  public readonly retryable: boolean
  public readonly statusCode?: number

  constructor(
    code: string,
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    options: {
      context?: Record<string, any>
      userMessage?: string
      retryable?: boolean
      statusCode?: number
      cause?: Error
    } = {}
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.category = category
    this.severity = severity
    this.timestamp = new Date()
    this.context = options.context
    this.userMessage = options.userMessage
    this.retryable = options.retryable ?? false
    this.statusCode = options.statusCode

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }

    // Chain the cause if provided
    if (options.cause) {
      this.cause = options.cause
    }
  }

  toJSON(): BaseError {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
      userMessage: this.userMessage,
      retryable: this.retryable,
      statusCode: this.statusCode
    }
  }
}

// Specific error types for common scenarios
export class ValidationError extends AppError {
  constructor(
    message: string,
    field?: string,
    value?: any,
    userMessage?: string
  ) {
    super(
      'VALIDATION_ERROR',
      message,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      {
        context: { field, value },
        userMessage: userMessage || 'Please check your input and try again.',
        statusCode: 400
      }
    )
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, userMessage?: string) {
    super(
      'AUTHENTICATION_ERROR',
      message,
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.HIGH,
      {
        userMessage: userMessage || 'Please sign in to continue.',
        statusCode: 401
      }
    )
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string, userMessage?: string) {
    super(
      'AUTHORIZATION_ERROR',
      message,
      ErrorCategory.AUTHORIZATION,
      ErrorSeverity.HIGH,
      {
        userMessage: userMessage || 'You do not have permission to perform this action.',
        statusCode: 403
      }
    )
  }
}

export class NetworkError extends AppError {
  constructor(message: string, userMessage?: string) {
    super(
      'NETWORK_ERROR',
      message,
      ErrorCategory.NETWORK,
      ErrorSeverity.MEDIUM,
      {
        userMessage: userMessage || 'Network connection failed. Please check your internet connection.',
        retryable: true,
        statusCode: 0
      }
    )
  }
}

export class ServerError extends AppError {
  constructor(message: string, statusCode: number = 500, userMessage?: string) {
    super(
      'SERVER_ERROR',
      message,
      ErrorCategory.SERVER,
      ErrorSeverity.HIGH,
      {
        userMessage: userMessage || 'Something went wrong on our end. Please try again later.',
        retryable: statusCode >= 500,
        statusCode
      }
    )
  }
}

export class BusinessLogicError extends AppError {
  constructor(code: string, message: string, userMessage?: string) {
    super(
      code,
      message,
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.MEDIUM,
      {
        userMessage: userMessage || message,
        statusCode: 422
      }
    )
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, userMessage?: string) {
    super(
      'EXTERNAL_SERVICE_ERROR',
      message,
      ErrorCategory.EXTERNAL_SERVICE,
      ErrorSeverity.HIGH,
      {
        context: { service },
        userMessage: userMessage || 'An external service is currently unavailable. Please try again later.',
        retryable: true,
        statusCode: 503
      }
    )
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, operation?: string, userMessage?: string) {
    super(
      'DATABASE_ERROR',
      message,
      ErrorCategory.DATABASE,
      ErrorSeverity.CRITICAL,
      {
        context: { operation },
        userMessage: userMessage || 'A database error occurred. Please try again later.',
        retryable: true,
        statusCode: 500
      }
    )
  }
}
