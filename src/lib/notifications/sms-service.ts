import { logInfo, logError, createError } from '@/lib/errors'
import { auditLogger } from '@/lib/audit/audit-logger'

export interface SMSMessage {
  to: string
  message: string
  type: 'verification' | 'alert' | 'notification' | 'marketing'
  priority: 'low' | 'medium' | 'high' | 'critical'
  metadata?: Record<string, any>
}

export interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
  cost?: number
}

export interface SMSTemplate {
  id: string
  name: string
  template: string
  variables: string[]
}

export class SMSService {
  private accountSid: string
  private authToken: string
  private fromNumber: string

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || ''
    this.authToken = process.env.TWILIO_AUTH_TOKEN || ''
    this.fromNumber = process.env.TWILIO_FROM_NUMBER || ''
  }

  /**
   * Send SMS message
   */
  async sendSMS(
    message: SMSMessage,
    correlationId?: string
  ): Promise<SMSResult> {
    try {
      logInfo('Sending SMS message', {
        correlationId,
        to: this.maskPhoneNumber(message.to),
        type: message.type,
        priority: message.priority
      })

      // Validate configuration
      if (!this.accountSid || !this.authToken || !this.fromNumber) {
        throw createError.internal(
          'SMS_CONFIG_ERROR',
          'Twilio configuration missing',
          { correlationId }
        )
      }

      // Validate phone number format
      const cleanedNumber = this.cleanPhoneNumber(message.to)
      if (!this.isValidPhoneNumber(cleanedNumber)) {
        throw createError.validation(
          'INVALID_PHONE_NUMBER',
          'Invalid phone number format',
          { phoneNumber: this.maskPhoneNumber(message.to), correlationId }
        )
      }

      // Mock Twilio API call - replace with actual Twilio SDK
      const messageId = `SM${Date.now()}${Math.random().toString(36).substr(2, 9)}`
      
      // In production, use actual Twilio client:
      // const client = twilio(this.accountSid, this.authToken)
      // const twilioMessage = await client.messages.create({
      //   body: message.message,
      //   from: this.fromNumber,
      //   to: cleanedNumber
      // })

      // Store SMS record
      await this.storeSMSRecord({
        messageId,
        to: cleanedNumber,
        message: message.message,
        type: message.type,
        priority: message.priority,
        status: 'sent',
        metadata: message.metadata,
        correlationId
      })

      // Log audit event
      await auditLogger.log({
        action: 'SMS_SENT',
        resource: 'SMS',
        resourceId: messageId,
        newValues: {
          to: this.maskPhoneNumber(cleanedNumber),
          type: message.type,
          priority: message.priority
        },
        correlationId
      })

      logInfo('SMS sent successfully', {
        correlationId,
        messageId,
        to: this.maskPhoneNumber(cleanedNumber)
      })

      return {
        success: true,
        messageId,
        cost: 0.01 // Mock cost
      }

    } catch (error) {
      logError(createError.internal('SMS_SEND_ERROR', 'Failed to send SMS', {
        error,
        correlationId,
        to: this.maskPhoneNumber(message.to)
      }))

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Send verification code
   */
  async sendVerificationCode(
    phoneNumber: string,
    code: string,
    correlationId?: string
  ): Promise<SMSResult> {
    const message: SMSMessage = {
      to: phoneNumber,
      message: `Your Benchwarmers verification code is: ${code}. This code expires in 10 minutes.`,
      type: 'verification',
      priority: 'high',
      metadata: { code, purpose: 'phone_verification' }
    }

    return await this.sendSMS(message, correlationId)
  }

  /**
   * Send contract signing notification
   */
  async sendContractNotification(
    phoneNumber: string,
    contractId: string,
    companyName: string,
    correlationId?: string
  ): Promise<SMSResult> {
    const message: SMSMessage = {
      to: phoneNumber,
      message: `New contract from ${companyName} requires your signature. Check your Benchwarmers dashboard to review and sign.`,
      type: 'notification',
      priority: 'high',
      metadata: { contractId, companyName, purpose: 'contract_signing' }
    }

    return await this.sendSMS(message, correlationId)
  }

  /**
   * Send payment notification
   */
  async sendPaymentNotification(
    phoneNumber: string,
    amount: number,
    engagementId: string,
    correlationId?: string
  ): Promise<SMSResult> {
    const message: SMSMessage = {
      to: phoneNumber,
      message: `Payment of $${amount.toFixed(2)} has been released for your completed engagement. Check your dashboard for details.`,
      type: 'notification',
      priority: 'high',
      metadata: { amount, engagementId, purpose: 'payment_release' }
    }

    return await this.sendSMS(message, correlationId)
  }

  /**
   * Send offer notification
   */
  async sendOfferNotification(
    phoneNumber: string,
    offerAmount: number,
    seekerCompany: string,
    correlationId?: string
  ): Promise<SMSResult> {
    const message: SMSMessage = {
      to: phoneNumber,
      message: `New offer of $${offerAmount.toFixed(2)} from ${seekerCompany}. Review and respond in your Benchwarmers dashboard.`,
      type: 'notification',
      priority: 'medium',
      metadata: { offerAmount, seekerCompany, purpose: 'new_offer' }
    }

    return await this.sendSMS(message, correlationId)
  }

  /**
   * Send security alert
   */
  async sendSecurityAlert(
    phoneNumber: string,
    alertType: string,
    details: string,
    correlationId?: string
  ): Promise<SMSResult> {
    const message: SMSMessage = {
      to: phoneNumber,
      message: `Security Alert: ${alertType}. ${details}. If this wasn't you, please contact support immediately.`,
      type: 'alert',
      priority: 'critical',
      metadata: { alertType, details, purpose: 'security_alert' }
    }

    return await this.sendSMS(message, correlationId)
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulkSMS(
    messages: SMSMessage[],
    correlationId?: string
  ): Promise<SMSResult[]> {
    const results: SMSResult[] = []
    
    for (const message of messages) {
      const result = await this.sendSMS(message, correlationId)
      results.push(result)
      
      // Add delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return results
  }

  /**
   * Get SMS templates
   */
  getTemplates(): SMSTemplate[] {
    return [
      {
        id: 'verification_code',
        name: 'Verification Code',
        template: 'Your {{platform}} verification code is: {{code}}. This code expires in {{expiry}} minutes.',
        variables: ['platform', 'code', 'expiry']
      },
      {
        id: 'contract_notification',
        name: 'Contract Notification',
        template: 'New contract from {{company}} requires your signature. Check your {{platform}} dashboard to review and sign.',
        variables: ['company', 'platform']
      },
      {
        id: 'payment_notification',
        name: 'Payment Notification',
        template: 'Payment of ${{amount}} has been released for your completed engagement. Check your dashboard for details.',
        variables: ['amount']
      },
      {
        id: 'offer_notification',
        name: 'Offer Notification',
        template: 'New offer of ${{amount}} from {{company}}. Review and respond in your {{platform}} dashboard.',
        variables: ['amount', 'company', 'platform']
      },
      {
        id: 'security_alert',
        name: 'Security Alert',
        template: 'Security Alert: {{alert_type}}. {{details}}. If this wasn\'t you, please contact support immediately.',
        variables: ['alert_type', 'details']
      }
    ]
  }

  /**
   * Render template with variables
   */
  renderTemplate(templateId: string, variables: Record<string, string>): string {
    const template = this.getTemplates().find(t => t.id === templateId)
    if (!template) {
      throw createError.validation('TEMPLATE_NOT_FOUND', 'SMS template not found', { templateId })
    }

    let rendered = template.template
    for (const [key, value] of Object.entries(variables)) {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value)
    }

    return rendered
  }

  /**
   * Clean and format phone number
   */
  private cleanPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '')
    
    // Add country code if missing (assuming US/CA)
    if (cleaned.length === 10) {
      return `+1${cleaned}`
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`
    } else if (cleaned.startsWith('27') && cleaned.length === 11) {
      // South African number
      return `+${cleaned}`
    }
    
    return `+${cleaned}`
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic validation - should start with + and have 10-15 digits
    const phoneRegex = /^\+[1-9]\d{9,14}$/
    return phoneRegex.test(phoneNumber)
  }

  /**
   * Mask phone number for logging
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length < 4) return '****'
    return phoneNumber.slice(0, -4) + '****'
  }

  /**
   * Store SMS record in database
   */
  private async storeSMSRecord(record: {
    messageId: string
    to: string
    message: string
    type: string
    priority: string
    status: string
    metadata?: Record<string, any>
    correlationId?: string
  }): Promise<void> {
    try {
      // In production, store in database
      // await prisma.smsMessage.create({
      //   data: {
      //     id: record.messageId,
      //     to: record.to,
      //     message: record.message,
      //     type: record.type,
      //     priority: record.priority,
      //     status: record.status,
      //     metadata: record.metadata ? JSON.stringify(record.metadata) : null,
      //     correlationId: record.correlationId,
      //     sentAt: new Date()
      //   }
      // })

      logInfo('SMS record stored', {
        messageId: record.messageId,
        correlationId: record.correlationId
      })

    } catch (error) {
      logError('Failed to store SMS record', {
        error,
        messageId: record.messageId,
        correlationId: record.correlationId
      })
    }
  }

  /**
   * Get SMS delivery status
   */
  async getDeliveryStatus(messageId: string): Promise<{
    status: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered'
    errorCode?: string
    errorMessage?: string
  }> {
    try {
      // In production, query Twilio API for status
      // const client = twilio(this.accountSid, this.authToken)
      // const message = await client.messages(messageId).fetch()
      
      // Mock response
      return {
        status: 'delivered'
      }

    } catch (error) {
      logError('Failed to get SMS delivery status', { error, messageId })
      return {
        status: 'failed',
        errorMessage: 'Failed to retrieve status'
      }
    }
  }

  /**
   * Get SMS usage statistics
   */
  async getUsageStats(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalSent: number
    totalCost: number
    byType: Record<string, number>
    byPriority: Record<string, number>
    deliveryRate: number
  }> {
    // In production, query from database
    // const stats = await prisma.smsMessage.groupBy({
    //   by: ['type', 'priority', 'status'],
    //   where: {
    //     sentAt: { gte: startDate, lte: endDate }
    //   },
    //   _count: true
    // })

    // Mock statistics
    return {
      totalSent: 150,
      totalCost: 1.50,
      byType: {
        verification: 50,
        notification: 80,
        alert: 15,
        marketing: 5
      },
      byPriority: {
        low: 20,
        medium: 60,
        high: 50,
        critical: 20
      },
      deliveryRate: 0.98
    }
  }
}

// Export singleton instance
export const smsService = new SMSService()
