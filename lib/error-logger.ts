import * as Sentry from '@sentry/nextjs'

export interface ErrorLogContext {
  userId?: string
  endpoint?: string
  method?: string
  statusCode?: number
  [key: string]: any
}

/**
 * Log error to Sentry with context
 */
export function logError(
  error: Error | unknown,
  context?: ErrorLogContext
): void {
  // Development: log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('🔴 Error:', error)
    if (context) {
      console.error('📝 Context:', context)
    }
    return
  }

  // Production: send to Sentry
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, { value })
      })

      if (context.userId) {
        scope.setUser({ id: context.userId })
      }

      if (context.endpoint) {
        scope.setTag('endpoint', context.endpoint)
      }

      if (context.method) {
        scope.setTag('method', context.method)
      }
    }

    if (error instanceof Error) {
      Sentry.captureException(error)
    } else {
      Sentry.captureException(new Error(String(error)))
    }
  })
}

/**
 * Log message to Sentry
 */
export function logMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: ErrorLogContext
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`📢 [${level.toUpperCase()}]:`, message, context)
    return
  }

  Sentry.withScope((scope) => {
    scope.setLevel(level)

    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, { value })
      })
    }

    Sentry.captureMessage(message)
  })
}

/**
 * Capture performance metric
 */
export function logPerformance(
  operation: string,
  duration: number,
  context?: ErrorLogContext
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`⚡ Performance [${operation}]: ${duration}ms`, context)
    return
  }

  Sentry.withScope((scope) => {
    scope.setTag('operation', operation)
    scope.setContext('performance', {
      duration,
      ...context
    })

    Sentry.captureMessage(`Performance: ${operation} took ${duration}ms`, 'info')
  })
}

/**
 * Start performance transaction
 */
export function startTransaction(name: string, op: string) {
  const start = Date.now()

  return {
    finish: () => {
      const duration = Date.now() - start

      if (process.env.NODE_ENV === 'development') {
        console.log(`⚡ [${op}] ${name}: ${duration}ms`)
      } else {
        logPerformance(name, duration, { operation: op })
      }
    }
  }
}

/**
 * Wrapper for API handlers with automatic error logging
 */
export function withErrorLogging<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  endpoint: string
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args)
    } catch (error) {
      logError(error, {
        endpoint,
        args: JSON.stringify(args).substring(0, 1000) // Limit size
      })
      throw error
    }
  }) as T
}
