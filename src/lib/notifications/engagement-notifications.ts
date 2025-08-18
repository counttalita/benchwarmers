import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { logInfo, logError } from '@/lib/logger'

export interface EngagementStatusChangeData {
  engagementId: string
  oldStatus: string
  newStatus: string
  changedBy: string
}

export class EngagementNotifications {
  /**
   * Send notifications when engagement status changes to "accepted"
   */
  async notifyStatusChange(data: EngagementStatusChangeData): Promise<void> {
    try {
      if (data.newStatus !== 'accepted') {
        return // Only notify on acceptance
      }

      const engagement = await prisma.engagement.findUnique({
        where: { id: data.engagementId },
        include: {
          offer: {
            include: {
              request: {
                include: {
                  seekerCompany: {
                    include: {
                      users: true
                    }
                  }
                }
              },
              providerCompany: {
                include: {
                  users: true
                }
              },
              talentProfile: {
                include: {
                  user: true
                }
              }
            }
          }
        }
      })

      if (!engagement) {
        throw new Error('Engagement not found')
      }

      // Send notifications to all stakeholders
      await Promise.all([
        this.notifySeekerCompany(engagement),
        this.notifyProvider(engagement),
        this.notifyBenchwarmersList(engagement)
      ])

      logInfo('Engagement acceptance notifications sent', {
        engagementId: data.engagementId,
        seekerCompany: engagement.offer.request.seekerCompany.name,
        provider: engagement.offer.talentProfile.user.name
      })

    } catch (error) {
      logError('Failed to send engagement notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        engagementId: data.engagementId
      })
      throw error
    }
  }

  private async notifySeekerCompany(engagement: any): Promise<void> {
    const seekerCompany = engagement.offer.request.seekerCompany
    const provider = engagement.offer.talentProfile.user
    const request = engagement.offer.request

    const subject = `Talent Accepted - ${provider.name} for ${request.title}`
    
    const htmlContent = `
      <h2>🎉 Talent Accepted!</h2>
      <p>Great news! Your selected talent has been confirmed for your project.</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Project Details</h3>
        <p><strong>Project:</strong> ${request.title}</p>
        <p><strong>Talent:</strong> ${provider.name}</p>
        <p><strong>Company:</strong> ${engagement.offer.providerCompany.name}</p>
        <p><strong>Engagement ID:</strong> ${engagement.id}</p>
      </div>

      <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h4>⚡ Next Steps</h4>
        <p>Our team will contact you shortly to:</p>
        <ul>
          <li>Process the project invoice</li>
          <li>Coordinate project kickoff</li>
          <li>Set up communication channels</li>
        </ul>
      </div>

      <p>Questions? Reply to this email or contact us at support@benchwarmers.com</p>
    `

    // Send to all company users
    for (const user of seekerCompany.users) {
      await sendEmail({
        to: user.email,
        subject,
        html: htmlContent,
        text: `Talent Accepted! ${provider.name} has been confirmed for ${request.title}. Engagement ID: ${engagement.id}. Our team will contact you shortly to process the invoice and coordinate project kickoff.`
      })
    }
  }

  private async notifyProvider(engagement: any): Promise<void> {
    const provider = engagement.offer.talentProfile.user
    const seekerCompany = engagement.offer.request.seekerCompany
    const request = engagement.offer.request

    const subject = `Project Confirmed - ${request.title} with ${seekerCompany.name}`
    
    const htmlContent = `
      <h2>🚀 Project Confirmed!</h2>
      <p>Congratulations! You've been selected for a new project.</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Project Details</h3>
        <p><strong>Project:</strong> ${request.title}</p>
        <p><strong>Client:</strong> ${seekerCompany.name}</p>
        <p><strong>Engagement ID:</strong> ${engagement.id}</p>
      </div>

      <div style="background: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h4>📋 Next Steps</h4>
        <p>Our team will coordinate:</p>
        <ul>
          <li>Project kickoff meeting</li>
          <li>Contract finalization</li>
          <li>Payment processing setup</li>
        </ul>
      </div>

      <p>Ready to get started? We'll be in touch soon!</p>
    `

    await sendEmail({
      to: provider.email,
      subject,
      html: htmlContent,
      text: `Project Confirmed! You've been selected for ${request.title} with ${seekerCompany.name}. Engagement ID: ${engagement.id}. Our team will coordinate the project kickoff and contract finalization.`
    })
  }

  private async notifyBenchwarmersList(engagement: any): Promise<void> {
    const seekerCompany = engagement.offer.request.seekerCompany
    const provider = engagement.offer.talentProfile.user
    const request = engagement.offer.request

    const subject = `🔔 Manual Action Required - Engagement Accepted`
    
    const htmlContent = `
      <h2>Engagement Accepted - Manual Processing Required</h2>
      
      <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>⚡ ACTION REQUIRED</h3>
        <p>A new engagement has been accepted and requires manual processing:</p>
      </div>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Engagement Details</h3>
        <p><strong>Engagement ID:</strong> ${engagement.id}</p>
        <p><strong>Project:</strong> ${request.title}</p>
        <p><strong>Seeker:</strong> ${seekerCompany.name}</p>
        <p><strong>Provider:</strong> ${provider.name} (${engagement.offer.providerCompany.name})</p>
        <p><strong>Budget:</strong> ${request.budget ? `R${request.budget}` : 'Not specified'}</p>
      </div>

      <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h4>📋 Manual Tasks</h4>
        <ol>
          <li>Generate and send invoice to ${seekerCompany.name}</li>
          <li>Set up project tracking</li>
          <li>Coordinate kickoff meeting</li>
          <li>Monitor engagement progress</li>
        </ol>
      </div>

      <p><strong>Dashboard:</strong> <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/engagements/${engagement.id}">View Engagement</a></p>
    `

    // Send to admin team
    const adminEmails = [
      'admin@benchwarmers.com',
      'billing@benchwarmers.com',
      'operations@benchwarmers.com'
    ]

    for (const email of adminEmails) {
      await sendEmail({
        to: email,
        subject,
        html: htmlContent,
        text: `Engagement Accepted - Manual Processing Required. Engagement ID: ${engagement.id}. Project: ${request.title}. Seeker: ${seekerCompany.name}. Provider: ${provider.name}. Please process invoice and coordinate project kickoff.`
      })
    }
  }
}

// Export singleton instance
export const engagementNotifications = new EngagementNotifications()
