import posthog from 'posthog-js'

const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  debug: (...args: any[]) => {
    if (isDev) console.log('[DEBUG]', ...args)
  },
  
  info: (...args: any[]) => {
    if (isDev) console.info('[INFO]', ...args)
  },
  
  warn: (message: string, context?: any) => {
    if (isDev) {
      console.warn('[WARN]', message, context)
    } else {
      posthog.capture('frontend_warning', { message, context })
    }
  },
  
  error: (message: string, context?: any) => {
    if (isDev) {
      console.error('[ERROR]', message, context)
    } else {
      posthog.capture('frontend_error', { message, context })
    }
  },
  
  // For user actions/analytics - always send to PostHog
  track: (event: string, properties?: any) => {
    if (isDev) console.log('[TRACK]', event, properties)
    posthog.capture(event, properties)
  }
}