import { NextRequest, NextResponse } from 'next/server'
import { withRoleAuth } from '@/middleware/rbac'
import { createError, logError } from '@/lib/errors'

interface EmailRequest {
  to: string
  subject: string
  template: string
  data: Record<string, any>
}

// Email templates
const EMAIL_TEMPLATES = {
  'new-offer': {
    subject: (data: any) => `New Offer from ${data.senderCompanyName} - ${data.offerDetails.formattedRate}`,
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Offer Received</h2>
        <p>Hi ${data.recipientName},</p>
        <p>You've received a new offer from <strong>${data.senderCompanyName}</strong>:</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Offer Details</h3>
          <p><strong>Rate:</strong> ${data.offerDetails.formattedRate}</p>
          <p><strong>Start Date:</strong> ${data.offerDetails.startDateFormatted}</p>
          <p><strong>Duration:</strong> ${data.offerDetails.duration}</p>
          <p><strong>Total Amount:</strong> ${data.offerDetails.formattedTotal}</p>
          
          <div style="background: #e0f2fe; padding: 15px; border-radius: 6px; margin-top: 15px;">
            <h4 style="margin: 0 0 10px 0; color: #0369a1;">Your Earnings</h4>
            <p style="margin: 0;"><strong>Net Amount (after 15% platform fee):</strong> ${data.offerDetails.formattedNetAmount}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">Platform Fee: ${data.offerDetails.formattedPlatformFee}</p>
          </div>
        </div>
        
        <p><strong>Terms:</strong></p>
        <p style="background: #f1f5f9; padding: 15px; border-radius: 6px;">${data.offerDetails.terms}</p>
        
        <div style="margin: 30px 0;">
          <a href="${data.actionUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View & Respond to Offer</a>
        </div>
        
        <p style="color: #64748b; font-size: 14px;">
          You can accept, reject, or send a counter offer. 
          <a href="${data.dashboardUrl}">View all offers</a>
        </p>
      </div>
    `
  },
  'offer-accepted': {
    subject: (data: any) => `Offer Accepted - ${data.senderCompanyName}`,
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Offer Accepted! 🎉</h2>
        <p>Hi ${data.recipientName},</p>
        <p>Great news! Your offer to <strong>${data.senderCompanyName}</strong> has been accepted.</p>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
          <h3 style="margin-top: 0; color: #16a34a;">Accepted Offer</h3>
          <p><strong>Rate:</strong> ${data.offerDetails.formattedRate}</p>
          <p><strong>Start Date:</strong> ${data.offerDetails.startDateFormatted}</p>
          <p><strong>Duration:</strong> ${data.offerDetails.duration}</p>
          <p><strong>Total Value:</strong> ${data.offerDetails.formattedTotal}</p>
        </div>
        
        <p>Next steps:</p>
        <ul>
          <li>The project will begin on ${data.offerDetails.startDateFormatted}</li>
          <li>Funds are held in escrow for your protection</li>
          <li>You'll receive payment upon project completion</li>
        </ul>
        
        <div style="margin: 30px 0;">
          <a href="${data.actionUrl}" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Project Details</a>
        </div>
      </div>
    `
  },
  'offer-rejected': {
    subject: (data: any) => `Offer Update - ${data.senderCompanyName}`,
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Offer Update</h2>
        <p>Hi ${data.recipientName},</p>
        <p>Your offer to <strong>${data.senderCompanyName}</strong> was not accepted this time.</p>
        
        ${data.message ? `
        <div style="background: #fef2f2; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p><strong>Message from ${data.senderCompanyName}:</strong></p>
          <p>${data.message}</p>
        </div>
        ` : ''}
        
        <p>Don't worry - there are many other opportunities available!</p>
        
        <div style="margin: 30px 0;">
          <a href="${data.dashboardUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Browse More Opportunities</a>
        </div>
      </div>
    `
  },
  'offer-countered': {
    subject: (data: any) => `Counter Offer - ${data.senderCompanyName}`,
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ea580c;">Counter Offer Received</h2>
        <p>Hi ${data.recipientName},</p>
        <p><strong>${data.senderCompanyName}</strong> has sent you a counter offer:</p>
        
        <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ea580c;">
          <h3 style="margin-top: 0;">Counter Offer Details</h3>
          <p><strong>New Rate:</strong> ${data.offerDetails.formattedRate}</p>
          <p><strong>Start Date:</strong> ${data.offerDetails.startDateFormatted}</p>
          <p><strong>Duration:</strong> ${data.offerDetails.duration}</p>
          <p><strong>Total Amount:</strong> ${data.offerDetails.formattedTotal}</p>
          
          <div style="background: #e0f2fe; padding: 15px; border-radius: 6px; margin-top: 15px;">
            <h4 style="margin: 0 0 10px 0; color: #0369a1;">Your Earnings</h4>
            <p style="margin: 0;"><strong>Net Amount (after 15% platform fee):</strong> ${data.offerDetails.formattedNetAmount}</p>
          </div>
        </div>
        
        ${data.message ? `
        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p><strong>Message:</strong></p>
          <p>${data.message}</p>
        </div>
        ` : ''}
        
        <div style="margin: 30px 0;">
          <a href="${data.actionUrl}" style="background: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Review Counter Offer</a>
        </div>
      </div>
    `
  },
  'company-approved': {
    subject: (data: any) => `Welcome to the Marketplace - ${data.companyName} Approved!`,
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Welcome to the Marketplace! 🎉</h2>
        <p>Hi ${data.recipientName},</p>
        <p>Congratulations! <strong>${data.companyName}</strong> has been approved and is now active on our marketplace.</p>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">What's Next?</h3>
          <ul>
            <li>Browse available talent and post job requirements</li>
            <li>Send offers to qualified providers</li>
            <li>Manage your team and projects</li>
            <li>Access analytics and reporting tools</li>
          </ul>
        </div>
        
        <div style="margin: 30px 0;">
          <a href="${data.dashboardUrl}" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Access Your Dashboard</a>
        </div>
        
        <p>If you have any questions, our support team is here to help!</p>
      </div>
    `
  },
  'company-rejected': {
    subject: (data: any) => `Company Registration Update - ${data.companyName}`,
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Registration Update</h2>
        <p>Hi ${data.recipientName},</p>
        <p>Thank you for your interest in joining our marketplace. Unfortunately, we're unable to approve <strong>${data.companyName}</strong> at this time.</p>
        
        ${data.reason ? `
        <div style="background: #fef2f2; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p><strong>Reason:</strong></p>
          <p>${data.reason}</p>
        </div>
        ` : ''}
        
        <p>You're welcome to reapply once you've addressed any concerns mentioned above.</p>
        
        <div style="margin: 30px 0;">
          <a href="${data.loginUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reapply</a>
        </div>
      </div>
    `
  }
}

export async function POST(request: NextRequest) {
  const { user, error } = await withRoleAuth(request, ['send_notifications'])
  
  if (error) {
    return error
  }

  try {
    const body: EmailRequest = await request.json()
    const { to, subject, template, data } = body

    if (!to || !subject || !template) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, template' },
        { status: 400 }
      )
    }

    // Get template
    const emailTemplate = EMAIL_TEMPLATES[template as keyof typeof EMAIL_TEMPLATES]
    if (!emailTemplate) {
      return NextResponse.json(
        { error: `Template '${template}' not found` },
        { status: 400 }
      )
    }

    // Generate email content
    const emailSubject = emailTemplate.subject(data)
    const emailHtml = emailTemplate.html(data)

    // In a real implementation, you would use a service like SendGrid, AWS SES, etc.
    // For now, we'll simulate sending the email
    console.log('📧 Email Notification:', {
      to,
      subject: emailSubject,
      template,
      timestamp: new Date().toISOString()
    })

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100))

    return NextResponse.json({
      success: true,
      message: 'Email notification sent successfully',
      emailId: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    })

  } catch (error) {
    const appError = createError.server(
      'EMAIL_API_ERROR',
      'Failed to process email notification request'
    )
    logError(appError, { error })

    return NextResponse.json(
      { error: 'Failed to send email notification' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { user, error } = await withRoleAuth(request, ['view_analytics'])
  
  if (error) {
    return error
  }

  // Return available email templates
  return NextResponse.json({
    templates: Object.keys(EMAIL_TEMPLATES),
    description: 'Available email notification templates'
  })
}
