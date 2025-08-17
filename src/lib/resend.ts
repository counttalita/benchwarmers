import { Resend } from 'resend'
import { logger } from './logger'

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailOptions {
  to: string | string[]
  from?: string
  subject: string
  html?: string
  text?: string
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

export interface EmailTemplate {
  name: string
  data: Record<string, any>
}

/**
 * Sends a transactional email
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { to, from, subject, html, text, replyTo, attachments } = options

    const emailData: any = {
      to,
      from: from || process.env.RESEND_FROM_EMAIL || 'noreply@benchwarmers.com',
      subject,
      reply_to: replyTo
    }

    if (html) emailData.html = html
    if (text) emailData.text = text
    if (attachments) emailData.attachments = attachments

    const result = await resend.emails.send(emailData)

    logger.info('Email sent successfully', {
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      messageId: result.data?.id
    })

    return {
      success: true,
      messageId: result.data?.id
    }
  } catch (error) {
    logger.error(error as Error, 'Failed to send email')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Sends a notification email
 */
export async function sendNotificationEmail(
  to: string,
  template: EmailTemplate,
  options: Partial<EmailOptions> = {}
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const html = await renderEmailTemplate(template.name, template.data)
  
  return sendEmail({
    to,
    subject: getEmailSubject(template.name),
    html,
    ...options
  })
}

/**
 * Sends a welcome email to new users
 */
export async function sendWelcomeEmail(
  to: string,
  userData: { name: string; companyName?: string }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendNotificationEmail(to, {
    name: 'welcome',
    data: userData
  })
}

/**
 * Sends a password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  resetData: { name: string; resetToken: string; resetUrl: string }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendNotificationEmail(to, {
    name: 'password-reset',
    data: resetData
  })
}

/**
 * Sends a domain verification email
 */
export async function sendDomainVerificationEmail(
  to: string,
  verificationData: { domain: string; verificationToken: string; verificationUrl: string }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendNotificationEmail(to, {
    name: 'domain-verification',
    data: verificationData
  })
}

/**
 * Sends an offer notification email
 */
export async function sendOfferNotificationEmail(
  to: string,
  offerData: { 
    talentName: string; 
    companyName: string; 
    projectTitle: string; 
    amount: number; 
    offerUrl: string 
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendNotificationEmail(to, {
    name: 'offer-notification',
    data: offerData
  })
}

/**
 * Sends a payment confirmation email
 */
export async function sendPaymentConfirmationEmail(
  to: string,
  paymentData: { 
    amount: number; 
    currency: string; 
    projectTitle: string; 
    transactionId: string 
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendNotificationEmail(to, {
    name: 'payment-confirmation',
    data: paymentData
  })
}

/**
 * Sends a dispute notification email
 */
export async function sendDisputeNotificationEmail(
  to: string,
  disputeData: { 
    disputeId: string; 
    reason: string; 
    projectTitle: string; 
    disputeUrl: string 
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendNotificationEmail(to, {
    name: 'dispute-notification',
    data: disputeData
  })
}

/**
 * Sends bulk emails (for notifications, announcements, etc.)
 */
export async function sendBulkEmail(
  recipients: string[],
  template: EmailTemplate,
  options: Partial<EmailOptions> = {}
): Promise<{ success: boolean; sent: number; failed: number; errors: string[] }> {
  const results = await Promise.allSettled(
    recipients.map(recipient => sendNotificationEmail(recipient, template, options))
  )

  const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length
  const failed = results.length - sent
  const errors = results
    .filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success))
    .map(r => r.status === 'rejected' ? (r as PromiseRejectedResult).reason : (r as PromiseFulfilledResult<any>).value.error)

  logger.info('Bulk email completed', {
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
 * Renders an email template with data
 */
async function renderEmailTemplate(templateName: string, data: Record<string, any>): Promise<string> {
  // In a real implementation, you would use a template engine like Handlebars, EJS, or React Email
  // For now, we'll use simple string replacement
  
  const templates: Record<string, string> = {
    welcome: `
      <h1>Welcome to BenchWarmers, ${data.name}!</h1>
      <p>We're excited to have you on board.</p>
      ${data.companyName ? `<p>Company: ${data.companyName}</p>` : ''}
      <p>Get started by creating your first talent request or profile.</p>
    `,
    'password-reset': `
      <h1>Password Reset Request</h1>
      <p>Hello ${data.name},</p>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${data.resetUrl}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
    `,
    'domain-verification': `
      <h1>Domain Verification</h1>
      <p>Please verify your domain: ${data.domain}</p>
      <a href="${data.verificationUrl}">Verify Domain</a>
    `,
    'offer-notification': `
      <h1>New Offer Received</h1>
      <p>Hello ${data.talentName},</p>
      <p>You've received a new offer from ${data.companyName} for the project: ${data.projectTitle}</p>
      <p>Amount: $${data.amount}</p>
      <a href="${data.offerUrl}">View Offer</a>
    `,
    'payment-confirmation': `
      <h1>Payment Confirmation</h1>
      <p>Your payment of ${data.amount} ${data.currency} for "${data.projectTitle}" has been processed.</p>
      <p>Transaction ID: ${data.transactionId}</p>
    `,
    'dispute-notification': `
      <h1>Dispute Filed</h1>
      <p>A dispute has been filed for the project: ${data.projectTitle}</p>
      <p>Reason: ${data.reason}</p>
      <a href="${data.disputeUrl}">View Dispute</a>
    `
  }

  const template = templates[templateName] || '<p>Email template not found</p>'
  return template
}

/**
 * Gets the subject line for an email template
 */
function getEmailSubject(templateName: string): string {
  const subjects: Record<string, string> = {
    welcome: 'Welcome to BenchWarmers!',
    'password-reset': 'Password Reset Request',
    'domain-verification': 'Verify Your Domain',
    'offer-notification': 'New Offer Received',
    'payment-confirmation': 'Payment Confirmation',
    'dispute-notification': 'Dispute Filed'
  }

  return subjects[templateName] || 'BenchWarmers Notification'
}

export { resend }
