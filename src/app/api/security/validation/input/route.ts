import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'

const validateInputSchema = z.object({
  type: z.enum(['email', 'phone', 'url', 'text']),
  value: z.string().min(1)
})

// POST /api/security/validation/input - Validate and sanitize user input
export async function POST(request: NextRequest) {
  const requestLogger = logger

  try {
    // Check authentication
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedBody = validateInputSchema.parse(body)

    // Check for SQL injection patterns
    const sqlInjectionPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter)\b)/i,
      /(\b(or|and)\b\s+\d+\s*=\s*\d+)/i,
      /(\b(union|select|insert|update|delete|drop|create|alter)\b.*\b(union|select|insert|update|delete|drop|create|alter)\b)/i
    ]

    const hasSqlInjection = sqlInjectionPatterns.some(pattern => 
      pattern.test(validatedBody.value)
    )

    if (hasSqlInjection) {
      return NextResponse.json(
        { error: 'Potentially malicious input detected' },
        { status: 400 }
      )
    }

    let isValid = true
    let sanitizedValue = validatedBody.value

    // Validate based on type
    switch (validatedBody.type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        isValid = emailRegex.test(validatedBody.value)
        if (!isValid) {
          return NextResponse.json(
            { error: 'Invalid email format' },
            { status: 400 }
          )
        }
        sanitizedValue = validatedBody.value.toLowerCase().trim()
        break

      case 'phone':
        const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/
        isValid = phoneRegex.test(validatedBody.value)
        if (!isValid) {
          return NextResponse.json(
            { error: 'Invalid phone number format' },
            { status: 400 }
          )
        }
        sanitizedValue = validatedBody.value.replace(/[\s\-\(\)]/g, '')
        break

      case 'url':
        try {
          new URL(validatedBody.value)
          sanitizedValue = validatedBody.value.trim()
        } catch {
          return NextResponse.json(
            { error: 'Invalid URL format' },
            { status: 400 }
          )
        }
        break

      case 'text':
        // Basic text sanitization
        sanitizedValue = validatedBody.value
          .trim()
          .replace(/[<>]/g, '') // Remove potential HTML tags
        break
    }

    logger.info('Input validated successfully', {
      userId: user.id,
      inputType: validatedBody.type,
      originalLength: validatedBody.value.length
    })

    return NextResponse.json({
      success: true,
      isValid,
      sanitizedValue,
      originalValue: validatedBody.value
    })

  } catch (error) {
    logger.error('Failed to validate input', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
