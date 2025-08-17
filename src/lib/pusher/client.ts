import PusherClient from 'pusher-js'

// Client-side Pusher instance
export const pusherClient = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_KEY || 'test-key',
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
  }
)

// Channel names
export const CHANNELS = {
  USER_NOTIFICATIONS: (userId: string) => `user-${userId}`,
  COMPANY_NOTIFICATIONS: (companyId: string) => `company-${companyId}`,
  MATCH_UPDATES: (requestId: string) => `match-${requestId}`,
  OFFER_UPDATES: (offerId: string) => `offer-${offerId}`,
  ENGAGEMENT_UPDATES: (engagementId: string) => `engagement-${engagementId}`,
  PAYMENT_UPDATES: (paymentId: string) => `payment-${paymentId}`,
} as const

// Event types
export const EVENTS = {
  NOTIFICATION_CREATED: 'notification-created',
  NOTIFICATION_UPDATED: 'notification-updated',
  MATCH_CREATED: 'match-created',
  OFFER_RECEIVED: 'offer-received',
  OFFER_ACCEPTED: 'offer-accepted',
  OFFER_DECLINED: 'offer-declined',
  PAYMENT_RELEASED: 'payment-released',
  PAYMENT_HELD: 'payment-held',
  ENGAGEMENT_STARTED: 'engagement-started',
  ENGAGEMENT_COMPLETED: 'engagement-completed',
  MILESTONE_REACHED: 'milestone-reached',
  DISPUTE_CREATED: 'dispute-created',
  DISPUTE_RESOLVED: 'dispute-resolved',
} as const
