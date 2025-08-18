import { prisma } from '@/lib/prisma'
import logger from '@/lib/logger'
import { z } from 'zod'
import Pusher from 'pusher'

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderType: 'talent' | 'seeker' | 'admin'
  content: string
  messageType: 'text' | 'file' | 'image' | 'system'
  fileUrl?: string
  fileName?: string
  fileSize?: number
  isRead: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Conversation {
  id: string
  participants: string[]
  participantNames: Record<string, string>
  participantTypes: Record<string, 'talent' | 'seeker' | 'admin'>
  lastMessage?: Message
  unreadCount: Record<string, number>
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ChatNotification {
  type: 'new_message' | 'conversation_started' | 'message_read'
  conversationId: string
  senderId: string
  senderName: string
  message?: string
  timestamp: Date
}

const messageSchema = z.object({
  conversationId: z.string(),
  senderId: z.string(),
  content: z.string().min(1).max(1000),
  messageType: z.enum(['text', 'file', 'image', 'system']).default('text'),
  fileUrl: z.string().url().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional()
})

export class ChatService {
  private pusher: Pusher

  constructor() {
    this.pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID || '',
      key: process.env.PUSHER_KEY || '',
      secret: process.env.PUSHER_SECRET || '',
      cluster: process.env.PUSHER_CLUSTER || 'mt1',
      useTLS: true
    })
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(data: z.infer<typeof messageSchema>): Promise<Message> {
    try {
      // Validate input
      const validatedData = messageSchema.parse(data)

      // Get sender information
      const sender = await this.getSenderInfo(validatedData.senderId)
      if (!sender) {
        throw new Error('Sender not found')
      }

      // Create message
      const message = await prisma.message.create({
        data: {
          conversationId: validatedData.conversationId,
          senderId: validatedData.senderId,
          senderName: sender.name,
          senderType: sender.type,
          content: validatedData.content,
          messageType: validatedData.messageType,
          fileUrl: validatedData.fileUrl,
          fileName: validatedData.fileName,
          fileSize: validatedData.fileSize,
          isRead: false
        }
      })

      // Update conversation
      await this.updateConversation(validatedData.conversationId, message.id)

      // Send real-time notification
      await this.sendRealTimeMessage(message)

      // Send push notifications to other participants
      await this.sendPushNotifications(message)

      logger.info('Message sent successfully', {
        messageId: message.id,
        conversationId: validatedData.conversationId,
        senderId: validatedData.senderId
      })

      return message

    } catch (error) {
      logger.error('Failed to send message', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Get conversation messages
   */
  async getConversationMessages(
    conversationId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    try {
      // Verify user is part of conversation
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { participants: true }
      })

      if (!conversation || !conversation.participants.includes(userId)) {
        throw new Error('Access denied to conversation')
      }

      // Get messages
      const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      })

      // Mark messages as read for this user
      await this.markMessagesAsRead(conversationId, userId)

      return messages.reverse()

    } catch (error) {
      logger.error('Failed to get conversation messages', {
        conversationId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Create or get conversation between users
   */
  async getOrCreateConversation(
    participantIds: string[],
    context?: {
      engagementId?: string
      requestId?: string
      type: 'engagement' | 'support' | 'general'
    }
  ): Promise<Conversation> {
    try {
      // Get participant information
      const participants = await this.getParticipantsInfo(participantIds)
      if (participants.length !== participantIds.length) {
        throw new Error('Some participants not found')
      }

      // Check if conversation already exists
      const existingConversation = await this.findExistingConversation(participantIds)
      if (existingConversation) {
        return existingConversation
      }

      // Create new conversation
      const conversation = await prisma.conversation.create({
        data: {
          participants: participantIds,
          participantNames: participants.reduce((acc, p) => ({
            ...acc,
            [p.id]: p.name
          }), {}),
          participantTypes: participants.reduce((acc, p) => ({
            ...acc,
            [p.id]: p.type
          }), {}),
          unreadCount: participantIds.reduce((acc, id) => ({
            ...acc,
            [id]: 0
          }), {}),
          isActive: true,
          context: context ? JSON.stringify(context) : null
        }
      })

      // Send system message
      await this.sendSystemMessage(conversation.id, 'Conversation started')

      logger.info('Conversation created successfully', {
        conversationId: conversation.id,
        participants: participantIds
      })

      return conversation

    } catch (error) {
      logger.error('Failed to create conversation', {
        participantIds,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Get user conversations
   */
  async getUserConversations(userId: string): Promise<Conversation[]> {
    try {
      const conversations = await prisma.conversation.findMany({
        where: {
          participants: { has: userId },
          isActive: true
        },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: { updatedAt: 'desc' }
      })

      return conversations.map(conv => ({
        ...conv,
        lastMessage: conv.messages[0] || undefined,
        unreadCount: conv.unreadCount[userId] || 0
      }))

    } catch (error) {
      logger.error('Failed to get user conversations', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      await prisma.message.updateMany({
        where: {
          conversationId,
          senderId: { not: userId },
          isRead: false
        },
        data: { isRead: true }
      })

      // Update unread count
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          unreadCount: {
            update: {
              [userId]: 0
            }
          }
        }
      })

    } catch (error) {
      logger.error('Failed to mark messages as read', {
        conversationId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Upload file for chat
   */
  async uploadFile(
    file: File,
    conversationId: string,
    senderId: string
  ): Promise<{ fileUrl: string; fileName: string; fileSize: number }> {
    try {
      // This would integrate with actual file storage (AWS S3, etc.)
      // For now, return mock data
      const fileUrl = `https://storage.example.com/chat-files/${Date.now()}-${file.name}`
      
      logger.info('File uploaded for chat', {
        fileName: file.name,
        fileSize: file.size,
        conversationId,
        senderId
      })

      return {
        fileUrl,
        fileName: file.name,
        fileSize: file.size
      }

    } catch (error) {
      logger.error('Failed to upload file', {
        fileName: file.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    try {
      // Verify user is part of conversation
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
      })

      if (!conversation || !conversation.participants.includes(userId)) {
        throw new Error('Access denied to conversation')
      }

      // Mark as inactive
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { isActive: false }
      })

      logger.info('Conversation deleted', {
        conversationId,
        userId
      })

    } catch (error) {
      logger.error('Failed to delete conversation', {
        conversationId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  // Private helper methods
  private async getSenderInfo(userId: string): Promise<{ name: string; type: 'talent' | 'seeker' | 'admin' } | null> {
    try {
      // Check user table first
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, role: true }
      })

      if (user) {
        return {
          name: user.name || 'Unknown User',
          type: user.role === 'admin' ? 'admin' : 'seeker'
        }
      }

      // Check talent profile
      const talent = await prisma.talentProfile.findUnique({
        where: { id: userId },
        select: { name: true }
      })

      if (talent) {
        return {
          name: talent.name,
          type: 'talent'
        }
      }

      return null

    } catch (error) {
      logger.error('Failed to get sender info', { userId, error })
      return null
    }
  }

  private async getParticipantsInfo(userIds: string[]): Promise<Array<{ id: string; name: string; type: 'talent' | 'seeker' | 'admin' }>> {
    const participants = []

    for (const userId of userIds) {
      const info = await this.getSenderInfo(userId)
      if (info) {
        participants.push({ id: userId, ...info })
      }
    }

    return participants
  }

  private async findExistingConversation(participantIds: string[]): Promise<Conversation | null> {
    // Find conversation with exact same participants
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { hasEvery: participantIds },
        isActive: true
      }
    })

    return conversations.find(conv => 
      conv.participants.length === participantIds.length &&
      participantIds.every(id => conv.participants.includes(id))
    ) || null
  }

  private async updateConversation(conversationId: string, lastMessageId: string): Promise<void> {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
        lastMessageId
      }
    })
  }

  private async sendRealTimeMessage(message: Message): Promise<void> {
    try {
      await this.pusher.trigger(`conversation-${message.conversationId}`, 'new-message', {
        message: {
          id: message.id,
          senderId: message.senderId,
          senderName: message.senderName,
          content: message.content,
          messageType: message.messageType,
          fileUrl: message.fileUrl,
          fileName: message.fileName,
          createdAt: message.createdAt
        }
      })
    } catch (error) {
      logger.error('Failed to send real-time message', { error })
    }
  }

  private async sendPushNotifications(message: Message): Promise<void> {
    try {
      // Get conversation participants
      const conversation = await prisma.conversation.findUnique({
        where: { id: message.conversationId }
      })

      if (!conversation) return

      // Send notifications to other participants
      const otherParticipants = conversation.participants.filter(id => id !== message.senderId)

      for (const participantId of otherParticipants) {
        // Update unread count
        await prisma.conversation.update({
          where: { id: message.conversationId },
          data: {
            unreadCount: {
              update: {
                [participantId]: (conversation.unreadCount[participantId] || 0) + 1
              }
            }
          }
        })

        // Send push notification (would integrate with actual push service)
        logger.info('Push notification sent', {
          recipientId: participantId,
          messageId: message.id
        })
      }
    } catch (error) {
      logger.error('Failed to send push notifications', { error })
    }
  }

  private async sendSystemMessage(conversationId: string, content: string): Promise<void> {
    try {
      await prisma.message.create({
        data: {
          conversationId,
          senderId: 'system',
          senderName: 'System',
          senderType: 'admin',
          content,
          messageType: 'system',
          isRead: true
        }
      })
    } catch (error) {
      logger.error('Failed to send system message', { error })
    }
  }
}

export const chatService = new ChatService()
