import * as Sentry from '@sentry/nextjs'

export function initSentry() {
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      profilesSampleRate: 0.1,
      integrations: [
        new Sentry.BrowserTracing({
          tracePropagationTargets: ['localhost', 'your-domain.com'],
        }),
      ],
    })
  }
}

export function captureException(error: Error, context?: Record<string, any>) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      extra: context,
    })
  } else {
    console.error('Error:', error, context)
  }
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureMessage(message, level)
  } else {
    console.log(`[${level.toUpperCase()}] ${message}`)
  }
}

export function setUser(user: { id: string; email?: string; companyId?: string }) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.setUser(user)
  }
}

export function setTag(key: string, value: string) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.setTag(key, value)
  }
}

export function setContext(name: string, context: Record<string, any>) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.setContext(name, context)
  }
}
