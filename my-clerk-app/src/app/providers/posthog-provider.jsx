'use client'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'
import posthog from 'posthog-js'

export function PostHogProvider({ children }) {
  useEffect(() => {
    // Initialize PostHog if not already done
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      // Import the client configuration
      import('../../../instrumentation-client.js')
    }
  }, [])

  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return children
  }

  return (
    <PHProvider client={posthog}>
      {children}
    </PHProvider>
  )
}