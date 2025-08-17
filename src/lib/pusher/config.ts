import Pusher from 'pusher'

// Server-side Pusher instance
export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || 'test-app-id',
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || 'test-key',
  secret: process.env.PUSHER_SECRET || 'test-secret',
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
  useTLS: true,
})

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

// Helper function to trigger events
export const triggerEvent = (
  channel: string,
  event: string,
  data: unknown
) => {
  return pusher.trigger(channel, event, data)
}

// Helper function to trigger user notification
export const triggerUserNotification = (
  userId: string,
  event: string,
  data: unknown
) => {
  return triggerEvent(CHANNELS.USER_NOTIFICATIONS(userId), event, data)
}

// Helper function to trigger company notification
export const triggerCompanyNotification = (
  companyId: string,
  event: string,
  data: unknown
) => {
  return triggerEvent(CHANNELS.COMPANY_NOTIFICATIONS(companyId), event, data)
}
