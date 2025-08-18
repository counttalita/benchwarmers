import { NextRequest, NextResponse } from 'next/server'
import { chatService } from '@/lib/chat/chat-service'
import { logRequest, logError } from '@/lib/logger'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const createConversationSchema = z.object({
  participantIds: z.array(z.string()).min(2),
  context: z.object({
    engagementId: z.string().optional(),
    requestId: z.string().optional(),
    type: z.enum(['engagement', 'support', 'general'])
  }).optional()
})

export async function GET(request: NextRequest) {
  const correlationId = `get-conversations-${Date.now()}`
  
  try {
    logRequest(request, correlationId)

    // Get current user
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user conversations
    const conversations = await chatService.getUserConversations(user.id)

    logRequest(request, correlationId)

    return NextResponse.json({
      success: true,
      conversations,
      metadata: {
        correlationId,
        userId: user.id,
        conversationCount: conversations.length
      }
    })

  } catch (error) {
    logError('Failed to get user conversations', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const correlationId = `create-conversation-${Date.now()}`
  
  try {
    logRequest(request, correlationId)

    // Get current user
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedBody = createConversationSchema.parse(body)

    // Ensure current user is included in participants
    const participantIds = [...new Set([...validatedBody.participantIds, user.id])]

    // Create or get conversation
    const conversation = await chatService.getOrCreateConversation(
      participantIds,
      validatedBody.context
    )

    logRequest(request, correlationId)

    return NextResponse.json({
      success: true,
      conversation,
      metadata: {
        correlationId,
        userId: user.id,
        participantCount: participantIds.length
      }
    })

  } catch (error) {
    logError('Failed to create conversation', {
      correlationId,
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
