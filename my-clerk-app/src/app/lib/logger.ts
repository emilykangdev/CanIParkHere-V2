import posthog from 'posthog-js'

const isDev = process.env.NODE_ENV === 'development'

type LogContext = Record<string, unknown> | unknown[] | string | number | boolean | null | undefined

/**
 * This a wrapper for logging a warning message with optional context. 
 * If running in development mode, logs to console. Otherwise, it sends the log to PostHog.
 *
 * @param {string} message - The warning message to log.
 * @param {LogContext} [context] - Optional context to log with the message.
 */
export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.log('[DEBUG]', ...args)
  },
  
  info: (...args: unknown[]) => {
    if (isDev) console.info('[INFO]', ...args)
  },
  
  warn: (message: string, context?: LogContext) => {
    if (isDev) {
      console.warn('[WARN]', message, context)
    } else {
      posthog.capture('frontend_warning', { message, context })
    }
  },
  
  error: (message: string, context?: LogContext) => {
    if (isDev) {
      console.error('[ERROR]', message, context)
    } else {
      posthog.capture('frontend_error', { message, context })
    }
  },
  
  // For user actions/analytics - always send to PostHog
  track: (event: string, properties?: Record<string, unknown>) => {
    if (isDev) console.log('[TRACK]', event, properties)
    posthog.capture(event, properties)
  }
}
