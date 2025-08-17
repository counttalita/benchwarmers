import { createError, logError } from '@/lib/errors'

export interface EmailNotificationData {
  to: string
  subject: string
  template: string
  data: Record<string, unknown>
}

export interface OfferNotificationData {
  recipientEmail: string
  recipientName: string
  senderCompanyName: string
  offerDetails: {
    id: string
    rate: number
    startDate: string
    duration: string
    terms: string
    totalAmount: number
    platformFee: number
    netAmount: number
  }
  type: 'new_offer' | 'offer_accepted' | 'offer_rejected' | 'offer_countered'
  message?: string
}

export class EmailNotificationService {
  private static instance: EmailNotificationService
  private apiUrl: string

  private constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  }

  public static getInstance(): EmailNotificationService {
    if (!EmailNotificationService.instance) {
      EmailNotificationService.instance = new EmailNotificationService()
    }
    return EmailNotificationService.instance
  }

  async sendOfferNotification(data: OfferNotificationData): Promise<void> {
    try {
      const emailData = this.buildOfferEmailData(data)
      await this.sendEmail(emailData)
    } catch (error) {
      const appError = createError.server(
        'EMAIL_NOTIFICATION_FAILED',
        'Failed to send offer notification email'
      )
      logError(appError, { data, error })
      throw appError
    }
  }

  private buildOfferEmailData(data: OfferNotificationData): EmailNotificationData {
    const { recipientEmail, recipientName, senderCompanyName, offerDetails, type, message } = data

    let subject: string
    let template: string

    switch (type) {
      case 'new_offer':
        subject = `New Offer from ${senderCompanyName} - $${offerDetails.rate}/hr`
        template = 'new-offer'
        break
      case 'offer_accepted':
        subject = `Offer Accepted - ${senderCompanyName}`
        template = 'offer-accepted'
        break
      case 'offer_rejected':
        subject = `Offer Update - ${senderCompanyName}`
        template = 'offer-rejected'
        break
      case 'offer_countered':
        subject = `Counter Offer - ${senderCompanyName}`
        template = 'offer-countered'
        break
      default:
        subject = `Offer Update - ${senderCompanyName}`
        template = 'offer-update'
    }

    return {
      to: recipientEmail,
      subject,
      template,
      data: {
        recipientName,
        senderCompanyName,
        offerDetails: {
          ...offerDetails,
          formattedRate: `$${offerDetails.rate}/hr`,
          formattedTotal: `$${offerDetails.totalAmount.toLocaleString()}`,
          formattedNetAmount: `$${offerDetails.netAmount.toLocaleString()}`,
          formattedPlatformFee: `$${offerDetails.platformFee.toLocaleString()}`,
          startDateFormatted: new Date(offerDetails.startDate).toLocaleDateString(),
        },
        message,
        type,
        actionUrl: `${this.apiUrl}/offers/${offerDetails.id}`,
        dashboardUrl: `${this.apiUrl}/offers`,
      }
    }
  }

  private async sendEmail(emailData: EmailNotificationData): Promise<void> {
    try {
      const response = await fetch('/api/notifications/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      })

      if (!response.ok) {
        throw new Error(`Email API responded with status: ${response.status}`)
      }

      const result = await response.json()
      if (result.error) {
        throw new Error(result.error)
      }
    } catch (error) {
      const appError = createError.server(
        'EMAIL_SEND_FAILED',
        'Failed to send email notification'
      )
      logError(appError, { emailData, error })
      throw appError
    }
  }

  async sendCompanyApprovalNotification(
    recipientEmail: string,
    recipientName: string,
    companyName: string,
    status: 'approved' | 'rejected',
    reason?: string
  ): Promise<void> {
    try {
      const emailData: EmailNotificationData = {
        to: recipientEmail,
        subject: `Company Registration ${status === 'approved' ? 'Approved' : 'Update'} - ${companyName}`,
        template: status === 'approved' ? 'company-approved' : 'company-rejected',
        data: {
          recipientName,
          companyName,
          status,
          reason,
          dashboardUrl: `${this.apiUrl}/dashboard`,
          loginUrl: `${this.apiUrl}/auth/login`,
        }
      }

      await this.sendEmail(emailData)
    } catch (error) {
      const appError = createError.server(
        'COMPANY_APPROVAL_EMAIL_FAILED',
        'Failed to send company approval notification'
      )
      logError(appError, { recipientEmail, companyName, status, error })
      throw appError
    }
  }

  async sendDomainVerificationNotification(
    recipientEmail: string,
    recipientName: string,
    companyName: string,
    verificationUrl: string
  ): Promise<void> {
    try {
      const emailData: EmailNotificationData = {
        to: recipientEmail,
        subject: `Verify Domain Ownership - ${companyName}`,
        template: 'domain-verification',
        data: {
          recipientName,
          companyName,
          verificationUrl,
          expiresIn: '24 hours',
        }
      }

      await this.sendEmail(emailData)
    } catch (error) {
      const appError = createError.server(
        'DOMAIN_VERIFICATION_EMAIL_FAILED',
        'Failed to send domain verification email'
      )
      logError(appError, { recipientEmail, companyName, error })
      throw appError
    }
  }
}

// Export singleton instance
export const emailNotificationService = EmailNotificationService.getInstance()

// Helper functions for common use cases
export async function notifyOfferReceived(data: OfferNotificationData): Promise<void> {
  return emailNotificationService.sendOfferNotification({
    ...data,
    type: 'new_offer'
  })
}

export async function notifyOfferAccepted(data: OfferNotificationData): Promise<void> {
  return emailNotificationService.sendOfferNotification({
    ...data,
    type: 'offer_accepted'
  })
}

export async function notifyOfferRejected(data: OfferNotificationData): Promise<void> {
  return emailNotificationService.sendOfferNotification({
    ...data,
    type: 'offer_rejected'
  })
}

export async function notifyOfferCountered(data: OfferNotificationData): Promise<void> {
  return emailNotificationService.sendOfferNotification({
    ...data,
    type: 'offer_countered'
  })
}
