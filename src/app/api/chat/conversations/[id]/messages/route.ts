import { NextRequest, NextResponse } from 'next/server'
import { chatService } from '@/lib/chat/chat-service'
import { logRequest, logError } from '@/lib/logger'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const sendMessageSchema = z.object({
  content: z.string().min(1).max(1000),
  messageType: z.enum(['text', 'file', 'image', 'system']).default('text'),
  fileUrl: z.string().url().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const correlationId = `get-messages-${Date.now()}`
  
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

    const { id: conversationId } = await params

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get conversation messages
    const messages = await chatService.getConversationMessages(
      conversationId,
      user.id,
      limit,
      offset
    )

    logRequest(request, correlationId)

    return NextResponse.json({
      success: true,
      messages,
      metadata: {
        correlationId,
        conversationId,
        userId: user.id,
        messageCount: messages.length,
        limit,
        offset
      }
    })

  } catch (error) {
    logError('Failed to get conversation messages', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const correlationId = `send-message-${Date.now()}`
  
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

    const { id: conversationId } = await params
    const body = await request.json()
    const validatedBody = sendMessageSchema.parse(body)

    // Send message
    const message = await chatService.sendMessage({
      conversationId,
      senderId: user.id,
      content: validatedBody.content,
      messageType: validatedBody.messageType,
      fileUrl: validatedBody.fileUrl,
      fileName: validatedBody.fileName,
      fileSize: validatedBody.fileSize
    })

    logRequest(request, correlationId)

    return NextResponse.json({
      success: true,
      message,
      metadata: {
        correlationId,
        conversationId,
        userId: user.id,
        messageId: message.id
      }
    })

  } catch (error) {
    logError('Failed to send message', {
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
