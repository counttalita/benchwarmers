import { notificationService } from './notification-service'
import { logInfo } from '@/lib/logger'

export interface NotificationTriggerData {
  userId: string
  companyId?: string
  type: string
  title: string
  message: string
  data?: Record<string, any>
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}

export class NotificationTriggers {
  /**
   * Trigger notification when a new match is created
   */
  static async onMatchCreated(matchData: {
    matchId: string
    requestId: string
    profileId: string
    score: number
    requestTitle: string
    skills: string[]
    userId: string
    companyId?: string
  }) {
    try {
      await notificationService.createNotification({
        userId: matchData.userId,
        companyId: matchData.companyId,
        type: 'match_created',
        title: 'New Talent Match Found!',
        message: `We found a talented professional (${matchData.score}% match) for your project "${matchData.requestTitle}".`,
        data: {
          matchId: matchData.matchId,
          requestId: matchData.requestId,
          profileId: matchData.profileId,
          score: matchData.score,
          requestTitle: matchData.requestTitle,
          skills: matchData.skills
        },
        priority: 'medium'
      })

      logInfo('Match notification triggered', {
        matchId: matchData.matchId,
        userId: matchData.userId,
        score: matchData.score
      })
    } catch (error) {
      console.error('Failed to trigger match notification:', error)
    }
  }

  /**
   * Trigger notification when an offer is received
   */
  static async onOfferReceived(offerData: {
    offerId: string
    projectTitle: string
    rate: number
    duration: number
    totalAmount: number
    providerName: string
    userId: string
    companyId?: string
  }) {
    try {
      await notificationService.createNotification({
        userId: offerData.userId,
        companyId: offerData.companyId,
        type: 'offer_received',
        title: 'New Offer Received!',
        message: `${offerData.providerName} has submitted an offer for your project "${offerData.projectTitle}".`,
        data: {
          offerId: offerData.offerId,
          projectTitle: offerData.projectTitle,
          rate: offerData.rate,
          duration: offerData.duration,
          totalAmount: offerData.totalAmount,
          providerName: offerData.providerName
        },
        priority: 'high'
      })

      logInfo('Offer notification triggered', {
        offerId: offerData.offerId,
        userId: offerData.userId,
        providerName: offerData.providerName
      })
    } catch (error) {
      console.error('Failed to trigger offer notification:', error)
    }
  }

  /**
   * Trigger notification when an offer is accepted
   */
  static async onOfferAccepted(offerData: {
    offerId: string
    projectTitle: string
    totalAmount: number
    engagementId: string
    userId: string
    companyId?: string
  }) {
    try {
      await notificationService.createNotification({
        userId: offerData.userId,
        companyId: offerData.companyId,
        type: 'offer_accepted',
        title: 'Offer Accepted!',
        message: `Your offer for "${offerData.projectTitle}" has been accepted. The project is now active!`,
        data: {
          offerId: offerData.offerId,
          projectTitle: offerData.projectTitle,
          totalAmount: offerData.totalAmount,
          engagementId: offerData.engagementId
        },
        priority: 'high'
      })

      logInfo('Offer accepted notification triggered', {
        offerId: offerData.offerId,
        userId: offerData.userId,
        engagementId: offerData.engagementId
      })
    } catch (error) {
      console.error('Failed to trigger offer accepted notification:', error)
    }
  }

  /**
   * Trigger notification when payment is released
   */
  static async onPaymentReleased(paymentData: {
    paymentId: string
    amount: number
    projectTitle: string
    userId: string
    companyId?: string
  }) {
    try {
      await notificationService.createNotification({
        userId: paymentData.userId,
        companyId: paymentData.companyId,
        type: 'payment_released',
        title: 'Payment Released!',
        message: `Your payment of $${paymentData.amount} for "${paymentData.projectTitle}" has been released from escrow.`,
        data: {
          paymentId: paymentData.paymentId,
          amount: paymentData.amount,
          projectTitle: paymentData.projectTitle
        },
        priority: 'high'
      })

      logInfo('Payment released notification triggered', {
        paymentId: paymentData.paymentId,
        userId: paymentData.userId,
        amount: paymentData.amount
      })
    } catch (error) {
      console.error('Failed to trigger payment released notification:', error)
    }
  }

  /**
   * Trigger notification when engagement is completed
   */
  static async onEngagementCompleted(engagementData: {
    engagementId: string
    projectTitle: string
    totalHours: number
    totalAmount: number
    userId: string
    companyId?: string
  }) {
    try {
      await notificationService.createNotification({
        userId: engagementData.userId,
        companyId: engagementData.companyId,
        type: 'engagement_completed',
        title: 'Project Completed!',
        message: `Congratulations! Your project "${engagementData.projectTitle}" has been successfully completed.`,
        data: {
          engagementId: engagementData.engagementId,
          projectTitle: engagementData.projectTitle,
          totalHours: engagementData.totalHours,
          totalAmount: engagementData.totalAmount
        },
        priority: 'medium'
      })

      logInfo('Engagement completed notification triggered', {
        engagementId: engagementData.engagementId,
        userId: engagementData.userId,
        projectTitle: engagementData.projectTitle
      })
    } catch (error) {
      console.error('Failed to trigger engagement completed notification:', error)
    }
  }

  /**
   * Trigger notification when a dispute is created
   */
  static async onDisputeCreated(disputeData: {
    disputeId: string
    projectTitle: string
    reason: string
    filedBy: string
    userId: string
    companyId?: string
  }) {
    try {
      await notificationService.createNotification({
        userId: disputeData.userId,
        companyId: disputeData.companyId,
        type: 'dispute_created',
        title: 'Dispute Filed',
        message: `A dispute has been filed for "${disputeData.projectTitle}" by ${disputeData.filedBy}.`,
        data: {
          disputeId: disputeData.disputeId,
          projectTitle: disputeData.projectTitle,
          reason: disputeData.reason,
          filedBy: disputeData.filedBy
        },
        priority: 'urgent'
      })

      logInfo('Dispute notification triggered', {
        disputeId: disputeData.disputeId,
        userId: disputeData.userId,
        filedBy: disputeData.filedBy
      })
    } catch (error) {
      console.error('Failed to trigger dispute notification:', error)
    }
  }

  /**
   * Trigger notification when engagement exceeds planned duration
   */
  static async onEngagementOverdue(engagementData: {
    engagementId: string
    projectTitle: string
    plannedDuration: number
    actualDuration: number
    userId: string
    companyId?: string
  }) {
    try {
      const overduePercentage = ((engagementData.actualDuration - engagementData.plannedDuration) / engagementData.plannedDuration) * 100

      await notificationService.createNotification({
        userId: engagementData.userId,
        companyId: engagementData.companyId,
        type: 'system_alert',
        title: 'Project Overdue Alert',
        message: `Your project "${engagementData.projectTitle}" is ${overduePercentage.toFixed(0)}% over the planned duration.`,
        data: {
          engagementId: engagementData.engagementId,
          projectTitle: engagementData.projectTitle,
          plannedDuration: engagementData.plannedDuration,
          actualDuration: engagementData.actualDuration,
          overduePercentage
        },
        priority: 'high'
      })

      logInfo('Engagement overdue notification triggered', {
        engagementId: engagementData.engagementId,
        userId: engagementData.userId,
        overduePercentage
      })
    } catch (error) {
      console.error('Failed to trigger engagement overdue notification:', error)
    }
  }

  /**
   * Trigger notification for milestone reached
   */
  static async onMilestoneReached(milestoneData: {
    milestoneId: string
    projectTitle: string
    milestoneName: string
    progress: number
    userId: string
    companyId?: string
  }) {
    try {
      await notificationService.createNotification({
        userId: milestoneData.userId,
        companyId: milestoneData.companyId,
        type: 'milestone_reached',
        title: 'Milestone Reached!',
        message: `Great progress! The "${milestoneData.milestoneName}" milestone has been reached for "${milestoneData.projectTitle}".`,
        data: {
          milestoneId: milestoneData.milestoneId,
          projectTitle: milestoneData.projectTitle,
          milestoneName: milestoneData.milestoneName,
          progress: milestoneData.progress
        },
        priority: 'medium'
      })

      logInfo('Milestone notification triggered', {
        milestoneId: milestoneData.milestoneId,
        userId: milestoneData.userId,
        milestoneName: milestoneData.milestoneName
      })
    } catch (error) {
      console.error('Failed to trigger milestone notification:', error)
    }
  }

  /**
   * Trigger custom notification
   */
  static async triggerCustomNotification(data: NotificationTriggerData) {
    try {
      await notificationService.createNotification(data)

      logInfo('Custom notification triggered', {
        userId: data.userId,
        type: data.type,
        title: data.title
      })
    } catch (error) {
      console.error('Failed to trigger custom notification:', error)
    }
  }

  /**
   * Trigger bulk notifications for multiple users
   */
  static async triggerBulkNotifications(notifications: NotificationTriggerData[]) {
    try {
      const promises = notifications.map(data => 
        notificationService.createNotification(data)
      )

      await Promise.allSettled(promises)

      logInfo('Bulk notifications triggered', {
        count: notifications.length,
        types: [...new Set(notifications.map(n => n.type))]
      })
    } catch (error) {
      console.error('Failed to trigger bulk notifications:', error)
    }
  }
}
