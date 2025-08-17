import { logInfo, logError, createError } from '@/lib/errors'
import { prisma } from '@/lib/prisma'
import { auditLogger } from '@/lib/audit/audit-logger'

export interface Message {
  id?: string
  conversationId: string
  senderId: string
  senderType: 'user' | 'system'
  recipientId: string
  recipientType: 'user' | 'system'
  content: string
  messageType: 'text' | 'file' | 'system' | 'offer' | 'contract'
  metadata?: Record<string, any>
  readAt?: Date
  createdAt?: Date
}

export interface Conversation {
  id?: string
  participants: string[]
  type: 'direct' | 'group' | 'support'
  subject?: string
  engagementId?: string
  contractId?: string
  offerId?: string
  status: 'active' | 'archived' | 'closed'
  metadata?: Record<string, any>
  createdAt?: Date
  updatedAt?: Date
}

export interface MessageFilter {
  conversationId?: string
  senderId?: string
  recipientId?: string
  messageType?: string
  unreadOnly?: boolean
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}

export class MessagingService {

  /**
   * Create a new conversation
   */
  async createConversation(
    conversation: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>,
    correlationId?: string
  ): Promise<Conversation> {
    try {
      logInfo('Creating new conversation', {
        correlationId,
        participants: conversation.participants,
        type: conversation.type
      })

      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // In production, store in database
      // const newConversation = await prisma.conversation.create({
      //   data: {
      //     id: conversationId,
      //     participants: conversation.participants,
      //     type: conversation.type,
      //     subject: conversation.subject,
      //     engagementId: conversation.engagementId,
      //     contractId: conversation.contractId,
      //     offerId: conversation.offerId,
      //     status: conversation.status,
      //     metadata: conversation.metadata ? JSON.stringify(conversation.metadata) : null,
      //     createdAt: new Date(),
      //     updatedAt: new Date()
      //   }
      // })

      const newConversation: Conversation = {
        id: conversationId,
        ...conversation,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Log audit event
      await auditLogger.log({
        action: 'CONVERSATION_CREATED',
        resource: 'Conversation',
        resourceId: conversationId,
        newValues: {
          participants: conversation.participants,
          type: conversation.type,
          subject: conversation.subject
        },
        correlationId
      })

      logInfo('Conversation created successfully', {
        correlationId,
        conversationId
      })

      return newConversation

    } catch (error) {
      logError(createError.internal('CONVERSATION_CREATE_ERROR', 'Failed to create conversation', {
        error,
        correlationId,
        conversation
      }))
      throw error
    }
  }

  /**
   * Send a message
   */
  async sendMessage(
    message: Omit<Message, 'id' | 'createdAt'>,
    correlationId?: string
  ): Promise<Message> {
    try {
      logInfo('Sending message', {
        correlationId,
        conversationId: message.conversationId,
        senderId: message.senderId,
        messageType: message.messageType
      })

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Validate conversation exists
      // const conversation = await prisma.conversation.findUnique({
      //   where: { id: message.conversationId }
      // })
      // 
      // if (!conversation) {
      //   throw createError.notFound('CONVERSATION_NOT_FOUND', 'Conversation not found')
      // }

      // In production, store in database
      // const newMessage = await prisma.message.create({
      //   data: {
      //     id: messageId,
      //     conversationId: message.conversationId,
      //     senderId: message.senderId,
      //     senderType: message.senderType,
      //     recipientId: message.recipientId,
      //     recipientType: message.recipientType,
      //     content: message.content,
      //     messageType: message.messageType,
      //     metadata: message.metadata ? JSON.stringify(message.metadata) : null,
      //     createdAt: new Date()
      //   }
      // })

      const newMessage: Message = {
        id: messageId,
        ...message,
        createdAt: new Date()
      }

      // Update conversation last activity
      // await prisma.conversation.update({
      //   where: { id: message.conversationId },
      //   data: { updatedAt: new Date() }
      // })

      // Log audit event
      await auditLogger.log({
        userId: message.senderId,
        action: 'MESSAGE_SENT',
        resource: 'Message',
        resourceId: messageId,
        newValues: {
          conversationId: message.conversationId,
          recipientId: message.recipientId,
          messageType: message.messageType
        },
        correlationId
      })

      // TODO: Send real-time notification to recipient
      // await this.notifyRecipient(newMessage)

      logInfo('Message sent successfully', {
        correlationId,
        messageId,
        conversationId: message.conversationId
      })

      return newMessage

    } catch (error) {
      logError(createError.internal('MESSAGE_SEND_ERROR', 'Failed to send message', {
        error,
        correlationId,
        message
      }))
      throw error
    }
  }

  /**
   * Get conversation messages
   */
  async getMessages(
    filter: MessageFilter,
    correlationId?: string
  ): Promise<{
    messages: Message[]
    total: number
    page: number
    totalPages: number
  }> {
    try {
      const page = filter.page || 1
      const limit = filter.limit || 50
      const offset = (page - 1) * limit

      logInfo('Retrieving messages', {
        correlationId,
        filter: { ...filter, page, limit }
      })

      // Build where clause
      const where: any = {}
      
      if (filter.conversationId) where.conversationId = filter.conversationId
      if (filter.senderId) where.senderId = filter.senderId
      if (filter.recipientId) where.recipientId = filter.recipientId
      if (filter.messageType) where.messageType = filter.messageType
      if (filter.unreadOnly) where.readAt = null
      
      if (filter.startDate || filter.endDate) {
        where.createdAt = {}
        if (filter.startDate) where.createdAt.gte = filter.startDate
        if (filter.endDate) where.createdAt.lte = filter.endDate
      }

      // In production, query from database
      // const [messages, total] = await Promise.all([
      //   prisma.message.findMany({
      //     where,
      //     orderBy: { createdAt: 'desc' },
      //     skip: offset,
      //     take: limit,
      //     include: {
      //       sender: {
      //         select: { id: true, name: true, email: true }
      //       },
      //       recipient: {
      //         select: { id: true, name: true, email: true }
      //       }
      //     }
      //   }),
      //   prisma.message.count({ where })
      // ])

      // Mock data for now
      const messages: Message[] = []
      const total = 0

      return {
        messages,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      }

    } catch (error) {
      logError(createError.internal('MESSAGES_RETRIEVE_ERROR', 'Failed to retrieve messages', {
        error,
        correlationId,
        filter
      }))
      throw error
    }
  }

  /**
   * Get user conversations
   */
  async getUserConversations(
    userId: string,
    status?: string,
    correlationId?: string
  ): Promise<Conversation[]> {
    try {
      logInfo('Retrieving user conversations', {
        correlationId,
        userId,
        status
      })

      // In production, query from database
      // const conversations = await prisma.conversation.findMany({
      //   where: {
      //     participants: { has: userId },
      //     ...(status && { status })
      //   },
      //   orderBy: { updatedAt: 'desc' },
      //   include: {
      //     messages: {
      //       orderBy: { createdAt: 'desc' },
      //       take: 1
      //     },
      //     _count: {
      //       select: {
      //         messages: {
      //           where: {
      //             recipientId: userId,
      //             readAt: null
      //           }
      //         }
      //       }
      //     }
      //   }
      // })

      // Mock data for now
      const conversations: Conversation[] = []

      return conversations

    } catch (error) {
      logError(createError.internal('CONVERSATIONS_RETRIEVE_ERROR', 'Failed to retrieve conversations', {
        error,
        correlationId,
        userId
      }))
      throw error
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(
    messageId: string,
    userId: string,
    correlationId?: string
  ): Promise<void> {
    try {
      logInfo('Marking message as read', {
        correlationId,
        messageId,
        userId
      })

      // In production, update in database
      // await prisma.message.update({
      //   where: {
      //     id: messageId,
      //     recipientId: userId
      //   },
      //   data: {
      //     readAt: new Date()
      //   }
      // })

      // Log audit event
      await auditLogger.log({
        userId,
        action: 'MESSAGE_READ',
        resource: 'Message',
        resourceId: messageId,
        correlationId
      })

    } catch (error) {
      logError(createError.internal('MESSAGE_READ_ERROR', 'Failed to mark message as read', {
        error,
        correlationId,
        messageId,
        userId
      }))
      throw error
    }
  }

  /**
   * Mark all messages in conversation as read
   */
  async markConversationAsRead(
    conversationId: string,
    userId: string,
    correlationId?: string
  ): Promise<void> {
    try {
      logInfo('Marking conversation as read', {
        correlationId,
        conversationId,
        userId
      })

      // In production, update in database
      // await prisma.message.updateMany({
      //   where: {
      //     conversationId,
      //     recipientId: userId,
      //     readAt: null
      //   },
      //   data: {
      //     readAt: new Date()
      //   }
      // })

      // Log audit event
      await auditLogger.log({
        userId,
        action: 'CONVERSATION_READ',
        resource: 'Conversation',
        resourceId: conversationId,
        correlationId
      })

    } catch (error) {
      logError(createError.internal('CONVERSATION_READ_ERROR', 'Failed to mark conversation as read', {
        error,
        correlationId,
        conversationId,
        userId
      }))
      throw error
    }
  }

  /**
   * Archive conversation
   */
  async archiveConversation(
    conversationId: string,
    userId: string,
    correlationId?: string
  ): Promise<void> {
    try {
      logInfo('Archiving conversation', {
        correlationId,
        conversationId,
        userId
      })

      // In production, update in database
      // await prisma.conversation.update({
      //   where: { id: conversationId },
      //   data: { status: 'archived' }
      // })

      // Log audit event
      await auditLogger.log({
        userId,
        action: 'CONVERSATION_ARCHIVED',
        resource: 'Conversation',
        resourceId: conversationId,
        correlationId
      })

    } catch (error) {
      logError(createError.internal('CONVERSATION_ARCHIVE_ERROR', 'Failed to archive conversation', {
        error,
        correlationId,
        conversationId,
        userId
      }))
      throw error
    }
  }

  /**
   * Send system message
   */
  async sendSystemMessage(
    conversationId: string,
    content: string,
    messageType: 'system' | 'offer' | 'contract' = 'system',
    metadata?: Record<string, any>,
    correlationId?: string
  ): Promise<Message> {
    return await this.sendMessage({
      conversationId,
      senderId: 'system',
      senderType: 'system',
      recipientId: 'all',
      recipientType: 'user',
      content,
      messageType,
      metadata
    }, correlationId)
  }

  /**
   * Create conversation for engagement
   */
  async createEngagementConversation(
    engagementId: string,
    seekerUserId: string,
    providerUserId: string,
    correlationId?: string
  ): Promise<Conversation> {
    return await this.createConversation({
      participants: [seekerUserId, providerUserId],
      type: 'direct',
      subject: 'Engagement Communication',
      engagementId,
      status: 'active',
      metadata: { purpose: 'engagement_communication' }
    }, correlationId)
  }

  /**
   * Create conversation for offer discussion
   */
  async createOfferConversation(
    offerId: string,
    seekerUserId: string,
    providerUserId: string,
    correlationId?: string
  ): Promise<Conversation> {
    return await this.createConversation({
      participants: [seekerUserId, providerUserId],
      type: 'direct',
      subject: 'Offer Discussion',
      offerId,
      status: 'active',
      metadata: { purpose: 'offer_discussion' }
    }, correlationId)
  }

  /**
   * Get unread message count for user
   */
  async getUnreadCount(userId: string, correlationId?: string): Promise<number> {
    try {
      // In production, query from database
      // const count = await prisma.message.count({
      //   where: {
      //     recipientId: userId,
      //     readAt: null
      //   }
      // })

      // Mock count for now
      const count = 0

      return count

    } catch (error) {
      logError(createError.internal('UNREAD_COUNT_ERROR', 'Failed to get unread count', {
        error,
        correlationId,
        userId
      }))
      return 0
    }
  }

  /**
   * Search messages
   */
  async searchMessages(
    userId: string,
    query: string,
    conversationId?: string,
    correlationId?: string
  ): Promise<Message[]> {
    try {
      logInfo('Searching messages', {
        correlationId,
        userId,
        query: query.substring(0, 50), // Log partial query for privacy
        conversationId
      })

      // In production, implement full-text search
      // const messages = await prisma.message.findMany({
      //   where: {
      //     OR: [
      //       { senderId: userId },
      //       { recipientId: userId }
      //     ],
      //     content: {
      //       contains: query,
      //       mode: 'insensitive'
      //     },
      //     ...(conversationId && { conversationId })
      //   },
      //   orderBy: { createdAt: 'desc' },
      //   take: 50
      // })

      // Mock results for now
      const messages: Message[] = []

      return messages

    } catch (error) {
      logError(createError.internal('MESSAGE_SEARCH_ERROR', 'Failed to search messages', {
        error,
        correlationId,
        userId,
        query
      }))
      return []
    }
  }

  /**
   * Get messaging statistics
   */
  async getMessagingStats(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalMessages: number
    totalConversations: number
    activeConversations: number
    messagesByType: Record<string, number>
    averageResponseTime: number
  }> {
    // In production, query from database
    // const stats = await prisma.$transaction([
    //   prisma.message.count({
    //     where: { createdAt: { gte: startDate, lte: endDate } }
    //   }),
    //   prisma.conversation.count({
    //     where: { createdAt: { gte: startDate, lte: endDate } }
    //   }),
    //   prisma.conversation.count({
    //     where: { status: 'active' }
    //   }),
    //   prisma.message.groupBy({
    //     by: ['messageType'],
    //     where: { createdAt: { gte: startDate, lte: endDate } },
    //     _count: true
    //   })
    // ])

    // Mock statistics
    return {
      totalMessages: 1250,
      totalConversations: 85,
      activeConversations: 42,
      messagesByType: {
        text: 1100,
        file: 75,
        system: 50,
        offer: 15,
        contract: 10
      },
      averageResponseTime: 3600 // 1 hour in seconds
    }
  }
}

// Export singleton instance
export const messagingService = new MessagingService()
