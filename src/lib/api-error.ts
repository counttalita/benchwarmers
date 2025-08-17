import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

// API Error types
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Common API errors
export const ApiErrors = {
  // Validation errors (400)
  VALIDATION_ERROR: (details?: any) => new ApiError(400, 'VALIDATION_ERROR', 'Invalid input data', details),
  INVALID_PHONE: () => new ApiError(400, 'INVALID_PHONE', 'Invalid phone number format. Please use international format (+1234567890)'),
  INVALID_EMAIL: () => new ApiError(400, 'INVALID_EMAIL', 'Invalid email format'),
  
  // Authentication errors (401)
  INVALID_OTP: () => new ApiError(401, 'INVALID_OTP', 'Invalid OTP. Please try again.'),
  OTP_EXPIRED: () => new ApiError(401, 'OTP_EXPIRED', 'OTP has expired. Please request a new one.'),
  TOO_MANY_ATTEMPTS: () => new ApiError(401, 'TOO_MANY_ATTEMPTS', 'Too many failed attempts. Please request a new OTP.'),
  
  // Conflict errors (409)
  DOMAIN_EXISTS: (domain: string) => new ApiError(409, 'DOMAIN_EXISTS', `A company with domain "${domain}" is already registered`),
  EMAIL_EXISTS: () => new ApiError(409, 'EMAIL_EXISTS', 'This email is already registered'),
  PHONE_EXISTS: () => new ApiError(409, 'PHONE_EXISTS', 'This phone number is already registered'),
  
  // Not found errors (404)
  USER_NOT_FOUND: () => new ApiError(404, 'USER_NOT_FOUND', 'User not found'),
  OTP_NOT_FOUND: () => new ApiError(404, 'OTP_NOT_FOUND', 'No valid OTP found. Please request a new one.'),
  
  // Service errors (503)
  SMS_SERVICE_ERROR: () => new ApiError(503, 'SMS_SERVICE_ERROR', 'Failed to send SMS. Please try again.'),
  TWILIO_NOT_CONFIGURED: () => new ApiError(503, 'TWILIO_NOT_CONFIGURED', 'SMS service is not configured'),
  
  // Database errors (500)
  DATABASE_ERROR: (operation: string) => new ApiError(500, 'DATABASE_ERROR', `Database ${operation} failed`),
  
  // Generic server error (500)
  INTERNAL_ERROR: (message?: string) => new ApiError(500, 'INTERNAL_ERROR', message || 'An unexpected error occurred'),
}

// Error response format
interface ApiErrorResponse {
  error: {
    code: string
    message: string
    details?: any
    timestamp: string
    requestId: string
  }
}

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Enhanced error handler
export function handleApiError(error: unknown, context?: string): NextResponse<ApiErrorResponse> {
  const requestId = generateRequestId()
  const timestamp = new Date().toISOString()
  
  // Log the error with context
  console.error(`[${requestId}] API Error in ${context || 'unknown'}:`, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp,
  })

  // Handle different error types
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          timestamp,
          requestId,
        }
      },
      { status: error.statusCode }
    )
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
          timestamp,
          requestId,
        }
      },
      { status: 400 }
    )
  }

  // Handle Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as any
    
    switch (prismaError.code) {
      case 'P2002': // Unique constraint violation
        const field = prismaError.meta?.target?.[0] || 'field'
        return NextResponse.json(
          {
            error: {
              code: 'DUPLICATE_ENTRY',
              message: `This ${field} is already registered`,
              details: { field, constraint: prismaError.meta?.target },
              timestamp,
              requestId,
            }
          },
          { status: 409 }
        )
      
      case 'P2025': // Record not found
        return NextResponse.json(
          {
            error: {
              code: 'RECORD_NOT_FOUND',
              message: 'The requested record was not found',
              timestamp,
              requestId,
            }
          },
          { status: 404 }
        )
      
      default:
        console.error(`[${requestId}] Prisma error:`, prismaError)
        return NextResponse.json(
          {
            error: {
              code: 'DATABASE_ERROR',
              message: 'Database operation failed',
              timestamp,
              requestId,
            }
          },
          { status: 500 }
        )
    }
  }

  // Generic error fallback
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        timestamp,
        requestId,
      }
    },
    { status: 500 }
  )
}

// Success response helper
export function apiSuccess<T>(data: T, message?: string, status: number = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      message: message || 'Operation completed successfully',
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  )
}

// Async error wrapper for API routes
export function withErrorHandling(
  handler: (request: Request) => Promise<NextResponse>,
  context?: string
) {
  return async (request: Request): Promise<NextResponse> => {
    try {
      return await handler(request)
    } catch (error) {
      return handleApiError(error, context)
    }
  }
}