import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { messagingService } from '@/lib/messaging/messaging-service'
import { logError, logInfo, createError, parseError } from '@/lib/errors'
import { v4 as uuidv4 } from 'uuid'

// Validation schemas
const createConversationSchema = z.object({
  participants: z.array(z.string()).min(2, 'At least 2 participants required'),
  type: z.enum(['direct', 'group', 'support']),
  subject: z.string().optional(),
  engagementId: z.string().optional(),
  contractId: z.string().optional(),
  offerId: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

// GET /api/messaging/conversations - Get user conversations
export async function GET(request: NextRequest) {
  const correlationId = uuidv4()

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status') || undefined

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required',
        correlationId
      }, { status: 400 })
    }

    logInfo('Retrieving user conversations', {
      correlationId,
      userId,
      status
    })

    const conversations = await messagingService.getUserConversations(
      userId,
      status,
      correlationId
    )

    return NextResponse.json({
      success: true,
      data: conversations,
      correlationId
    })

  } catch (error) {
    const appError = parseError(error)
    logError(appError, { correlationId, operation: 'get_conversations' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve conversations',
      correlationId
    }, { status: 500 })
  }
}

// POST /api/messaging/conversations - Create new conversation
export async function POST(request: NextRequest) {
  const correlationId = uuidv4()

  try {
    const body = await request.json()
    
    logInfo('Creating new conversation', {
      correlationId,
      participants: body.participants,
      type: body.type
    })

    // Validate request data
    const validatedData = createConversationSchema.parse(body)

    const conversation = await messagingService.createConversation({
      ...validatedData,
      status: 'active'
    }, correlationId)

    return NextResponse.json({
      success: true,
      data: conversation,
      message: 'Conversation created successfully',
      correlationId
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = createError.validation(
        'CONVERSATION_VALIDATION_ERROR',
        'Validation error creating conversation',
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
    logError(appError, { correlationId, operation: 'create_conversation' })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create conversation',
      correlationId
    }, { status: 500 })
  }
}
