import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Error Filtering
  beforeSend(event, hint) {
    // Filter out known errors
    if (event.exception) {
      const error = hint.originalException

      // Ignore Supabase connection errors (temporary)
      if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
        return null
      }

      // Ignore rate limit errors (they're expected)
      if (error instanceof Error && error.message.includes('Too many requests')) {
        return null
      }
    }

    return event
  },

  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production',
})
