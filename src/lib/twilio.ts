import twilio from 'twilio'
import logger from './logger'

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

const fromNumber = process.env.TWILIO_PHONE_NUMBER

export interface SMSOptions {
  to: string
  body: string
  from?: string
  mediaUrl?: string[]
}

export interface SMSTemplate {
  name: string
  data: Record<string, unknown>
}

/**
 * Sends an SMS message
 */
export async function sendSMS(options: SMSOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { to, body, from: fromNumberOverride, mediaUrl } = options

    const messageData: {
      to: string
      from: string | undefined
      body: string
      mediaUrl?: string[]
    } = {
      to,
      from: fromNumberOverride || fromNumber,
      body
    }

    if (mediaUrl && mediaUrl.length > 0) {
      messageData.mediaUrl = mediaUrl
    }

    const message = await twilioClient.messages.create(messageData)

    logger.info('SMS sent successfully', {
      to,
      messageId: message.sid,
      status: message.status
    })

    return {
      success: true,
      messageId: message.sid
    }
  } catch (error) {
    logger.error('Failed to send SMS', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Sends an SMS notification using a template
 */
export async function sendNotificationSMS(
  to: string,
  template: SMSTemplate,
  options: Partial<SMSOptions> = {}
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const body = renderSMSTemplate(template.name, template.data)
  
  return sendSMS({
    to,
    body,
    ...options
  })
}

/**
 * Sends an OTP verification SMS
 */
export async function sendOTPSMS(
  to: string,
  otpData: { otp: string; expiresIn: string }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendNotificationSMS(to, {
    name: 'otp-verification',
    data: otpData
  })
}

/**
 * Sends a domain verification SMS
 */
export async function sendDomainVerificationSMS(
  to: string,
  verificationData: { domain: string; verificationCode: string }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendNotificationSMS(to, {
    name: 'domain-verification',
    data: verificationData
  })
}

/**
 * Sends an offer notification SMS
 */
export async function sendOfferNotificationSMS(
  to: string,
  offerData: { 
    companyName: string; 
    projectTitle: string; 
    amount: number; 
    shortUrl: string 
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendNotificationSMS(to, {
    name: 'offer-notification',
    data: offerData
  })
}

/**
 * Sends a payment notification SMS
 */
export async function sendPaymentNotificationSMS(
  to: string,
  paymentData: { 
    amount: number; 
    currency: string; 
    projectTitle: string; 
    shortUrl: string 
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendNotificationSMS(to, {
    name: 'payment-notification',
    data: paymentData
  })
}

/**
 * Sends a dispute notification SMS
 */
export async function sendDisputeNotificationSMS(
  to: string,
  disputeData: { 
    projectTitle: string; 
    reason: string; 
    shortUrl: string 
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendNotificationSMS(to, {
    name: 'dispute-notification',
    data: disputeData
  })
}

/**
 * Sends bulk SMS messages
 */
export async function sendBulkSMS(
  recipients: string[],
  template: SMSTemplate,
  options: Partial<SMSOptions> = {}
): Promise<{ success: boolean; sent: number; failed: number; errors: string[] }> {
  const results = await Promise.allSettled(
    recipients.map(recipient => sendNotificationSMS(recipient, template, options))
  )

  const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length
  const failed = results.length - sent
  const errors = results
    .filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success))
    .map(r => r.status === 'rejected' ? (r as PromiseRejectedResult).reason : (r as PromiseFulfilledResult<{ success: boolean; error?: string }>).value.error)

  logger.info('Bulk SMS completed', {
    total: recipients.length,
    sent,
    failed,
    errors: errors.length
  })

  return {
    success: sent > 0,
    sent,
    failed,
    errors
  }
}

/**
 * Validates a phone number format
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  // Basic validation - in production, use a proper phone number validation library
  const phoneRegex = /^\+?[1-9]\d{1,14}$/
  return phoneRegex.test(phoneNumber.replace(/\s/g, ''))
}

/**
 * Formats a phone number for SMS sending
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters except +
  let formatted = phoneNumber.replace(/[^\d+]/g, '')
  
  // Ensure it starts with +
  if (!formatted.startsWith('+')) {
    formatted = '+' + formatted
  }
  
  return formatted
}

/**
 * Renders an SMS template with data
 */
function renderSMSTemplate(templateName: string, data: Record<string, unknown>): string {
  const templates: Record<string, string> = {
    'otp-verification': `Your BenchWarmers verification code is: ${data.otp}. Valid for ${data.expiresIn}.`,
    'domain-verification': `Verify your domain ${data.domain} with code: ${data.verificationCode}`,
    'offer-notification': `New offer from ${data.companyName} for "${data.projectTitle}" - $${data.amount}. View: ${data.shortUrl}`,
    'payment-notification': `Payment of ${data.amount} ${data.currency} received for "${data.projectTitle}". Details: ${data.shortUrl}`,
    'dispute-notification': `Dispute filed for "${data.projectTitle}" - ${data.reason}. View: ${data.shortUrl}`,
    'welcome': `Welcome to BenchWarmers! Your account is now active. Start connecting with talent and companies.`,
    'account-approved': `Your BenchWarmers account has been approved! You can now start using the platform.`,
    'account-rejected': `Your BenchWarmers account application was not approved. Please contact support for more information.`,
    'engagement-started': `Your engagement has started! Track progress and communicate with your team.`,
    'engagement-completed': `Congratulations! Your engagement has been completed successfully.`,
    'milestone-reached': `Milestone reached for your project. Review and approve to continue.`,
    'payment-released': `Payment of ${data.amount} ${data.currency} has been released to your account.`,
    'payment-escrowed': `Payment of ${data.amount} ${data.currency} has been held in escrow for "${data.projectTitle}".`,
    'dispute-resolved': `Dispute for "${data.projectTitle}" has been resolved. Check your dashboard for details.`
  }

  return templates[templateName] || 'BenchWarmers notification'
}

/**
 * Checks if SMS notifications are enabled for a user
 */
export function isSMSEnabled(userPreferences: Record<string, unknown>): boolean {
  return userPreferences?.smsNotifications !== false
}

/**
 * Checks if it's within quiet hours (to avoid sending SMS at night)
 */
export function isWithinQuietHours(timezone: string = 'UTC'): boolean {
  const now = new Date()
  const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
  const hour = userTime.getHours()
  
  // Quiet hours: 10 PM to 8 AM
  return hour >= 22 || hour < 8
}

export { twilioClient }