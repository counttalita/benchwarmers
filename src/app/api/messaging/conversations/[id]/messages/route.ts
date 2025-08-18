import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { messagingService } from '@/lib/messaging/messaging-service'
import { logError, logInfo, createError, parseError } from '@/lib/errors'
import { v4 as uuidv4 } from 'uuid'

// Validation schemas
const sendMessageSchema = z.object({
  senderId: z.string().min(1, 'Sender ID is required'),
  recipientId: z.string().min(1, 'Recipient ID is required'),
  content: z.string().min(1, 'Message content is required').max(2000, 'Message too long'),
  messageType: z.enum(['text', 'file', 'system', 'offer', 'contract']).default('text'),
  metadata: z.record(z.any()).optional()
})

const messageFilterSchema = z.object({
  senderId: z.string().optional(),
  recipientId: z.string().optional(),
  messageType: z.string().optional(),
  unreadOnly: z.boolean().optional(),
  startDate: z.string().optional().transform(str => str ? new Date(str) : undefined),
  endDate: z.string().optional().transform(str => str ? new Date(str) : undefined),
  page: z.number().optional(),
  limit: z.number().optional()
})

// GET /api/messaging/conversations/[id]/messages - Get conversation messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const correlationId = uuidv4()

  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const filterData = {
      conversationId: resolvedParams.id,
      senderId: searchParams.get('senderId') || undefined,
      recipientId: searchParams.get('recipientId') || undefined,
      messageType: searchParams.get('messageType') || undefined,
      unreadOnly: searchParams.get('unreadOnly') === 'true',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    }

    const validatedFilter = messageFilterSchema.parse(filterData)

    logInfo('Retrieving conversation messages', {
      correlationId,
      conversationId: resolvedParams.id,
      filter: validatedFilter
    })

    const result = await messagingService.getMessages({
      conversationId: resolvedParams.id,
      ...validatedFilter
    }, correlationId)

    return NextResponse.json({
      success: true,
      data: result,
      correlationId
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = createError.validation(
        'MESSAGE_FILTER_VALIDATION_ERROR',
        'Validation error in message filter',
        { zodErrors: error.errors, correlationId }
      )
      logError(validationError)
      
      return NextResponse.json({
        success: false,
        error: 'Invalid filter parameters',
        details: error.errors,
        correlationId
      }, { status: 400 })
    }

    const appError = parseError(error)
    logError(appError, { correlationId, operation: 'get_messages' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve messages',
      correlationId
    }, { status: 500 })
  }
}

// POST /api/messaging/conversations/[id]/messages - Send message to conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const correlationId = uuidv4()

  try {
    const body = await request.json()
    
    logInfo('Sending message to conversation', {
      correlationId,
      conversationId: resolvedParams.id,
      senderId: body.senderId,
      messageType: body.messageType
    })

    // Validate request data
    const validatedData = sendMessageSchema.parse(body)

    const message = await messagingService.sendMessage({
      conversationId: resolvedParams.id,
      senderId: validatedData.senderId,
      senderType: 'user',
      recipientId: validatedData.recipientId,
      recipientType: 'user',
      content: validatedData.content,
      messageType: validatedData.messageType,
      metadata: validatedData.metadata
    }, correlationId)

    return NextResponse.json({
      success: true,
      data: message,
      message: 'Message sent successfully',
      correlationId
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = createError.validation(
        'MESSAGE_SEND_VALIDATION_ERROR',
        'Validation error sending message',
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
    logError(appError, { correlationId, operation: 'send_message' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to send message',
      correlationId
    }, { status: 500 })
  }
}
