import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { getCurrentUser } from '@/lib/auth'

const inputValidationSchema = z.object({
  input: z.string().min(1, 'Input is required'),
  type: z.enum(['email', 'phone', 'url', 'text', 'sql']).optional().default('text')
})

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = inputValidationSchema.parse(body)

    const { input, type } = validatedData

    // Check for SQL injection attempts
    const sqlInjectionPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/i,
      /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
      /(\b(OR|AND)\b\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)/i,
      /(--|\/\*|\*\/|;)/,
      /(\b(WAITFOR|DELAY)\b)/i,
      /(\b(BENCHMARK|SLEEP)\b)/i
    ]

    const hasSqlInjection = sqlInjectionPatterns.some(pattern => pattern.test(input))
    if (hasSqlInjection) {
      logger.warn('SQL injection attempt detected', { 
        userId: user.id, 
        input: input.substring(0, 100) // Log first 100 chars only
      })
      return NextResponse.json({ 
        error: 'Potential SQL injection detected' 
      }, { status: 400 })
    }

    // Check for XSS attempts
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi
    ]

    const hasXss = xssPatterns.some(pattern => pattern.test(input))
    if (hasXss) {
      logger.warn('XSS attempt detected', { 
        userId: user.id, 
        input: input.substring(0, 100)
      })
      return NextResponse.json({ 
        error: 'Potential XSS attack detected' 
      }, { status: 400 })
    }

    let isValid = true
    let sanitizedInput = input
    let validationError = null

    // Type-specific validation
    switch (type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(input)) {
          isValid = false
          validationError = 'Invalid email format'
        }
        sanitizedInput = input.toLowerCase().trim()
        break

      case 'phone':
        const phoneRegex = /^\+?[1-9]\d{1,14}$/
        if (!phoneRegex.test(input.replace(/\s/g, ''))) {
          isValid = false
          validationError = 'Invalid phone number format'
        }
        sanitizedInput = input.replace(/\s/g, '').replace(/[^\d+]/g, '')
        break

      case 'url':
        try {
          const url = new URL(input.startsWith('http') ? input : `https://${input}`)
          sanitizedInput = url.toString()
        } catch {
          isValid = false
          validationError = 'Invalid URL format'
        }
        break

      case 'text':
      default:
        // Basic text sanitization
        sanitizedInput = input
          .trim()
          .replace(/[<>]/g, '') // Remove angle brackets
          .replace(/\s+/g, ' ') // Normalize whitespace
        break
    }

    // Additional security checks
    if (input.length > 10000) {
      return NextResponse.json({ 
        error: 'Input too long (maximum 10,000 characters)' 
      }, { status: 400 })
    }

    logger.info('Input validated', { 
      userId: user.id, 
      type, 
      inputLength: input.length,
      isValid 
    })

    return NextResponse.json({
      success: true,
      isValid,
      sanitizedInput,
      validationError,
      type,
      originalLength: input.length,
      sanitizedLength: sanitizedInput.length
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }

    logger.error(error as Error, 'Failed to validate input')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
