import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { smsService } from '@/lib/notifications/sms-service'
import { logError, logInfo, createError, parseError } from '@/lib/errors'
import { applyRateLimit } from '@/lib/security/rate-limiter'
import { v4 as uuidv4 } from 'uuid'

// Validation schemas
const sendSMSSchema = z.object({
  to: z.string().min(1, 'Phone number is required'),
  message: z.string().min(1, 'Message is required').max(160, 'Message too long'),
  type: z.enum(['verification', 'alert', 'notification', 'marketing']),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  metadata: z.record(z.any()).optional()
})

const bulkSMSSchema = z.object({
  messages: z.array(sendSMSSchema).min(1).max(100, 'Maximum 100 messages per batch')
})

const templateSMSSchema = z.object({
  templateId: z.string(),
  to: z.string().min(1, 'Phone number is required'),
  variables: z.record(z.string()),
  type: z.enum(['verification', 'alert', 'notification', 'marketing']),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium')
})

// POST /api/admin/notifications/sms - Send SMS message
export async function POST(request: NextRequest) {
  const correlationId = uuidv4()

  try {
    // Apply rate limiting
    await applyRateLimit(request, 'sms')

    const body = await request.json()
    
    logInfo('SMS send request received', {
      correlationId,
      requestType: Array.isArray(body.messages) ? 'bulk' : 'single'
    })

    // Handle bulk SMS
    if (body.messages) {
      const validatedData = bulkSMSSchema.parse(body)
      
      const results = await smsService.sendBulkSMS(
        validatedData.messages,
        correlationId
      )

      const successCount = results.filter(r => r.success).length
      const failureCount = results.length - successCount

      logInfo('Bulk SMS completed', {
        correlationId,
        total: results.length,
        successful: successCount,
        failed: failureCount
      })

      return NextResponse.json({
        success: true,
        data: {
          results,
          summary: {
            total: results.length,
            successful: successCount,
            failed: failureCount
          }
        },
        correlationId
      })
    }

    // Handle template SMS
    if (body.templateId) {
      const validatedData = templateSMSSchema.parse(body)
      
      const message = smsService.renderTemplate(
        validatedData.templateId,
        validatedData.variables
      )

      const result = await smsService.sendSMS({
        to: validatedData.to,
        message,
        type: validatedData.type,
        priority: validatedData.priority
      }, correlationId)

      return NextResponse.json({
        success: true,
        data: result,
        correlationId
      })
    }

    // Handle single SMS
    const validatedData = sendSMSSchema.parse(body)
    
    const result = await smsService.sendSMS(validatedData, correlationId)

    return NextResponse.json({
      success: true,
      data: result,
      correlationId
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = createError.validation(
        'SMS_VALIDATION_ERROR',
        'Validation error sending SMS',
        { zodErrors: error.errors, correlationId }
      )
      logError(validationError)
      
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
        correlationId
      }, { status: 400 })
    }

    const appError = parseError(error)
    logError(appError, { correlationId, operation: 'send_sms' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to send SMS',
      correlationId
    }, { status: 500 })
  }
}

// GET /api/admin/notifications/sms - Get SMS templates and stats
export async function GET(request: NextRequest) {
  const correlationId = uuidv4()

  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'templates'

    if (action === 'templates') {
      const templates = smsService.getTemplates()
      
      return NextResponse.json({
        success: true,
        data: { templates },
        correlationId
      })
    }

    if (action === 'stats') {
      const startDate = searchParams.get('startDate') 
        ? new Date(searchParams.get('startDate')!) 
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      
      const endDate = searchParams.get('endDate') 
        ? new Date(searchParams.get('endDate')!) 
        : new Date()

      const stats = await smsService.getUsageStats(startDate, endDate)
      
      return NextResponse.json({
        success: true,
        data: { stats, period: { startDate, endDate } },
        correlationId
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action parameter',
      correlationId
    }, { status: 400 })

  } catch (error) {
    const appError = parseError(error)
    logError(appError, { correlationId, operation: 'get_sms_data' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve SMS data',
      correlationId
    }, { status: 500 })
  }
}
