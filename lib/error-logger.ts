export interface ErrorLogContext {
  userId?: string
  endpoint?: string
  method?: string
  statusCode?: number
  [key: string]: any
}

type SeverityLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug'

export function logError(
  error: Error | unknown,
  context?: ErrorLogContext
): void {
  console.error('Error:', error)
  if (context) {
    console.error('Context:', context)
  }
}

export function logMessage(
  message: string,
  level: SeverityLevel = 'info',
  context?: ErrorLogContext
): void {
  console.log(`[${level.toUpperCase()}]:`, message, context)
}

export function logPerformance(
  operation: string,
  duration: number,
  context?: ErrorLogContext
): void {
  console.log(`Performance [${operation}]: ${duration}ms`, context)
}

export function startTransaction(name: string, op: string) {
  const start = Date.now()
  return {
    finish: () => {
      const duration = Date.now() - start
      console.log(`[${op}] ${name}: ${duration}ms`)
    }
  }
}

export function withErrorLogging<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  endpoint: string
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args)
    } catch (error) {
      logError(error, { endpoint })
      throw error
    }
  }) as T
}
