import { Resend } from 'resend'
import { logInfo, logError } from './logger'

const resend = new Resend(process.env.RESEND_API_KEY)

interface EmailTemplate {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(template: EmailTemplate): Promise<boolean> {
  try {
    if (!process.env.RESEND_API_KEY) {
      logError('Resend API key not configured', null, { template })
      return false
    }

    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'noreply@benchwarmers.co.za',
      to: template.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    if (error) {
      logError('Email send failed', error, { template })
      return false
    }

    logInfo('Email sent successfully', {
      to: template.to,
      subject: template.subject,
      messageId: data?.id,
    })

    return true
  } catch (error) {
    logError('Email send error', error, { template })
    return false
  }
}

export async function sendDomainVerificationEmail(
  email: string,
  companyName: string,
  domain: string,
  verificationUrl: string
): Promise<boolean> {
  const template: EmailTemplate = {
    to: email,
    subject: `Verify your domain for ${companyName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Domain</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9fafb; }
            .button { 
              display: inline-block; 
              background: #2563eb; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
            }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>BenchWarmers</h1>
              <p>Verify Your Domain Ownership</p>
            </div>
            <div class="content">
              <h2>Hello,</h2>
              <p>Thank you for registering <strong>${companyName}</strong> with BenchWarmers marketplace.</p>
              <p>To complete your registration, please verify that you own the domain <strong>${domain}</strong> by clicking the button below:</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Domain</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px;">
                ${verificationUrl}
              </p>
              <p><strong>Important:</strong> This link will expire in 24 hours for security reasons.</p>
              <p>If you didn't register this company, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>Best regards,<br>The BenchWarmers Team</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Hello,
      
      Thank you for registering ${companyName} with BenchWarmers marketplace.
      
      To complete your registration, please verify that you own the domain ${domain} by clicking the link below:
      
      ${verificationUrl}
      
      This link will expire in 24 hours for security reasons.
      
      If you didn't register this company, please ignore this email.
      
      Best regards,
      The BenchWarmers Team
    `
  }

  return sendEmail(template)
}

export async function sendCompanyApprovalEmail(
  email: string,
  companyName: string,
  approved: boolean,
  rejectionReason?: string
): Promise<boolean> {
  const subject = approved 
    ? `${companyName} approved for BenchWarmers` 
    : `${companyName} registration declined`

  const template: EmailTemplate = {
    to: email,
    subject,
    html: approved ? `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Company Approved</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9fafb; }
            .button { 
              display: inline-block; 
              background: #10b981; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
            }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Congratulations!</h1>
              <p>Your company has been approved</p>
            </div>
            <div class="content">
              <h2>Great news!</h2>
              <p>Your company <strong>${companyName}</strong> has been approved for the BenchWarmers marketplace.</p>
              <p>You can now log in and start using the platform to:</p>
              <ul>
                <li>Create talent profiles (if you're a provider)</li>
                <li>Post talent requests (if you're a seeker)</li>
                <li>Connect with other companies</li>
                <li>Manage your marketplace activities</li>
              </ul>
              <div style="text-align: center;">
                <a href="${process.env.NEXTAUTH_URL}/auth/login" class="button">Login to BenchWarmers</a>
              </div>
              <p>Welcome to the BenchWarmers community!</p>
            </div>
            <div class="footer">
              <p>Best regards,<br>The BenchWarmers Team</p>
            </div>
          </div>
        </body>
      </html>
    ` : `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Registration Declined</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ef4444; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9fafb; }
            .button { 
              display: inline-block; 
              background: #2563eb; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
            }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Registration Update</h1>
              <p>Your company registration status</p>
            </div>
            <div class="content">
              <h2>Registration Declined</h2>
              <p>Unfortunately, your company registration for <strong>${companyName}</strong> has been declined.</p>
              ${rejectionReason ? `
                <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <h3 style="color: #dc2626; margin-top: 0;">Reason:</h3>
                  <p style="margin-bottom: 0;">${rejectionReason}</p>
                </div>
              ` : ''}
              <p>If you believe this is an error or would like to resubmit your application, please contact our support team.</p>
              <div style="text-align: center;">
                <a href="mailto:support@benchwarmers.co.za" class="button">Contact Support</a>
              </div>
            </div>
            <div class="footer">
              <p>Best regards,<br>The BenchWarmers Team</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: approved ? `
      Congratulations!
      
      Your company ${companyName} has been approved for the BenchWarmers marketplace.
      
      You can now log in and start using the platform at: ${process.env.NEXTAUTH_URL}/auth/login
      
      Welcome to the BenchWarmers community!
      
      Best regards,
      The BenchWarmers Team
    ` : `
      Registration Update
      
      Unfortunately, your company registration for ${companyName} has been declined.
      
      ${rejectionReason ? `Reason: ${rejectionReason}` : ''}
      
      If you believe this is an error or would like to resubmit your application, please contact our support team at support@benchwarmers.co.za
      
      Best regards,
      The BenchWarmers Team
    `
  }

  return sendEmail(template)
}