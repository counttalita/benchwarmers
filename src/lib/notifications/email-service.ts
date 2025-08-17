import { Resend } from 'resend'
import { logInfo, logError } from '@/lib/logger'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export interface EmailNotificationData {
  to: string
  from: string
  subject: string
  html: string
  text?: string
  replyTo?: string
  attachments?: any[]
}

/**
 * Send email notification using Resend
 */
export async function sendEmailNotification(
  notification: any,
  preferences: any,
  correlationId: string
): Promise<void> {
  try {
    // Get user email from notification data or preferences
    const userEmail = notification.data?.userEmail || preferences.email
    
    if (!userEmail) {
      logInfo('No email address found for notification', {
        correlationId,
        notificationId: notification.id,
        userId: notification.userId
      })
      return
    }

    // Generate email template based on notification type
    const template = generateEmailTemplate(notification)
    
    const emailData: EmailNotificationData = {
      to: userEmail,
      from: process.env.RESEND_FROM_EMAIL || 'notifications@benchwarmers.com',
      subject: template.subject,
      html: template.html,
      text: template.text,
      replyTo: process.env.RESEND_REPLY_TO_EMAIL || 'support@benchwarmers.com'
    }

    const result = await resend.emails.send(emailData)

    logInfo('Email notification sent successfully', {
      correlationId,
      notificationId: notification.id,
      emailId: result.data?.id,
      to: userEmail,
      type: notification.type
    })

  } catch (error) {
    logError('Failed to send email notification', {
      correlationId,
      notificationId: notification.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    // Don't throw error to prevent notification failure
    // Email failures shouldn't break the notification system
  }
}

/**
 * Generate email template based on notification type
 */
function generateEmailTemplate(notification: any): EmailTemplate {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://benchwarmers.com'
  
  switch (notification.type) {
    case 'match_created':
      return {
        subject: `🎯 New Talent Match: ${notification.data?.requestTitle || 'Your Project'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">New Talent Match Found!</h2>
            <p>Great news! We found a talented professional that matches your project requirements.</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Match Details:</h3>
              <p><strong>Project:</strong> ${notification.data?.requestTitle || 'Your Project'}</p>
              <p><strong>Match Score:</strong> ${notification.data?.score || 'N/A'}%</p>
              <p><strong>Skills:</strong> ${notification.data?.skills?.join(', ') || 'N/A'}</p>
            </div>
            
            <a href="${baseUrl}/matches/${notification.data?.matchId}" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Match Details
            </a>
            
            <p style="margin-top: 20px; color: #64748b; font-size: 14px;">
              This match will expire in 7 days. Don't miss out on this opportunity!
            </p>
          </div>
        `,
        text: `New Talent Match Found!\n\nProject: ${notification.data?.requestTitle || 'Your Project'}\nMatch Score: ${notification.data?.score || 'N/A'}%\nSkills: ${notification.data?.skills?.join(', ') || 'N/A'}\n\nView match: ${baseUrl}/matches/${notification.data?.matchId}`
      }

    case 'offer_received':
      return {
        subject: `💰 New Offer Received: ${notification.data?.projectTitle || 'Project Offer'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">New Offer Received!</h2>
            <p>You've received a new offer for your project. Review the details below:</p>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Offer Details:</h3>
              <p><strong>Project:</strong> ${notification.data?.projectTitle || 'Your Project'}</p>
              <p><strong>Rate:</strong> $${notification.data?.rate || 'N/A'}/hour</p>
              <p><strong>Duration:</strong> ${notification.data?.duration || 'N/A'} weeks</p>
              <p><strong>Total Amount:</strong> $${notification.data?.totalAmount || 'N/A'}</p>
            </div>
            
            <a href="${baseUrl}/offers/${notification.data?.offerId}" 
               style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Review Offer
            </a>
            
            <p style="margin-top: 20px; color: #64748b; font-size: 14px;">
              Please respond within 3 days to keep the offer active.
            </p>
          </div>
        `,
        text: `New Offer Received!\n\nProject: ${notification.data?.projectTitle || 'Your Project'}\nRate: $${notification.data?.rate || 'N/A'}/hour\nDuration: ${notification.data?.duration || 'N/A'} weeks\nTotal: $${notification.data?.totalAmount || 'N/A'}\n\nReview offer: ${baseUrl}/offers/${notification.data?.offerId}`
      }

    case 'offer_accepted':
      return {
        subject: `✅ Offer Accepted: ${notification.data?.projectTitle || 'Project'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">Offer Accepted!</h2>
            <p>Congratulations! Your offer has been accepted. Here's what happens next:</p>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Next Steps:</h3>
              <ol>
                <li>Payment will be held in escrow</li>
                <li>Project engagement will begin</li>
                <li>You'll receive project details and timeline</li>
              </ol>
            </div>
            
            <a href="${baseUrl}/engagements/${notification.data?.engagementId}" 
               style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Engagement
            </a>
          </div>
        `,
        text: `Offer Accepted!\n\nYour offer has been accepted. Next steps:\n1. Payment held in escrow\n2. Project engagement begins\n3. You'll receive project details\n\nView engagement: ${baseUrl}/engagements/${notification.data?.engagementId}`
      }

    case 'payment_released':
      return {
        subject: `💸 Payment Released: $${notification.data?.amount || 'N/A'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">Payment Released!</h2>
            <p>Great news! Your payment has been released from escrow and is on its way to your account.</p>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Payment Details:</h3>
              <p><strong>Amount:</strong> $${notification.data?.amount || 'N/A'}</p>
              <p><strong>Project:</strong> ${notification.data?.projectTitle || 'N/A'}</p>
              <p><strong>Release Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <a href="${baseUrl}/payments/${notification.data?.paymentId}" 
               style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Payment Details
            </a>
          </div>
        `,
        text: `Payment Released!\n\nAmount: $${notification.data?.amount || 'N/A'}\nProject: ${notification.data?.projectTitle || 'N/A'}\nRelease Date: ${new Date().toLocaleDateString()}\n\nView details: ${baseUrl}/payments/${notification.data?.paymentId}`
      }

    case 'engagement_completed':
      return {
        subject: `🎉 Project Completed: ${notification.data?.projectTitle || 'Your Project'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">Project Completed!</h2>
            <p>Congratulations! Your project has been successfully completed.</p>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Project Summary:</h3>
              <p><strong>Project:</strong> ${notification.data?.projectTitle || 'N/A'}</p>
              <p><strong>Duration:</strong> ${notification.data?.duration || 'N/A'}</p>
              <p><strong>Total Hours:</strong> ${notification.data?.totalHours || 'N/A'}</p>
            </div>
            
            <a href="${baseUrl}/engagements/${notification.data?.engagementId}" 
               style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Project Details
            </a>
            
            <p style="margin-top: 20px; color: #64748b; font-size: 14px;">
              Don't forget to leave a review for your experience!
            </p>
          </div>
        `,
        text: `Project Completed!\n\nProject: ${notification.data?.projectTitle || 'N/A'}\nDuration: ${notification.data?.duration || 'N/A'}\nTotal Hours: ${notification.data?.totalHours || 'N/A'}\n\nView details: ${baseUrl}/engagements/${notification.data?.engagementId}`
      }

    case 'dispute_created':
      return {
        subject: `⚠️ Dispute Filed: ${notification.data?.projectTitle || 'Project'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Dispute Filed</h2>
            <p>A dispute has been filed regarding your project. Our team will review the case.</p>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Dispute Details:</h3>
              <p><strong>Project:</strong> ${notification.data?.projectTitle || 'N/A'}</p>
              <p><strong>Reason:</strong> ${notification.data?.reason || 'N/A'}</p>
              <p><strong>Filed By:</strong> ${notification.data?.filedBy || 'N/A'}</p>
            </div>
            
            <a href="${baseUrl}/disputes/${notification.data?.disputeId}" 
               style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Dispute
            </a>
            
            <p style="margin-top: 20px; color: #64748b; font-size: 14px;">
              We'll contact you within 24 hours to discuss resolution options.
            </p>
          </div>
        `,
        text: `Dispute Filed\n\nProject: ${notification.data?.projectTitle || 'N/A'}\nReason: ${notification.data?.reason || 'N/A'}\nFiled By: ${notification.data?.filedBy || 'N/A'}\n\nView dispute: ${baseUrl}/disputes/${notification.data?.disputeId}`
      }

    default:
      return {
        subject: notification.title,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            
            <a href="${baseUrl}/notifications" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Details
            </a>
          </div>
        `,
        text: `${notification.title}\n\n${notification.message}\n\nView details: ${baseUrl}/notifications`
      }
  }
}

/**
 * Send custom email
 */
export async function sendCustomEmail(data: EmailNotificationData): Promise<any> {
  try {
    const result = await resend.emails.send(data)
    
    logInfo('Custom email sent successfully', {
      to: data.to,
      subject: data.subject,
      emailId: result.data?.id
    })
    
    return result
  } catch (error) {
    logError('Failed to send custom email', {
      to: data.to,
      subject: data.subject,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

/**
 * Send bulk email notifications
 */
export async function sendBulkEmailNotifications(
  notifications: any[],
  correlationId: string
): Promise<void> {
  const promises = notifications.map(notification => 
    sendEmailNotification(notification, {}, correlationId)
  )
  
  await Promise.allSettled(promises)
  
  logInfo('Bulk email notifications processed', {
    correlationId,
    total: notifications.length
  })
}
