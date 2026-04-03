/**
 * Safe API route handler wrapper.
 *
 * - Catches all uncaught exceptions and returns 500
 * - Attaches a unique request ID to every response
 * - Logs errors with structured context
 * - Never leaks internal error details to the client
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRequestLogger } from './logger'
import { validateEnv } from './env'

type HandlerFn = (
  req: NextRequest,
  ctx: { params?: Record<string, string>; requestId: string }
) => Promise<NextResponse | Response>

/**
 * Wrap an API route handler for production safety.
 *
 * Usage:
 *   export const GET = safeHandler(async (req, { requestId }) => {
 *     // ... your logic
 *     return NextResponse.json({ success: true })
 *   })
 */
export function safeHandler(fn: HandlerFn) {
  // Validate env on first invocation (lazy, once)
  let envChecked = false

  return async (req: NextRequest, routeCtx?: { params?: Promise<Record<string, string>> }) => {
    if (!envChecked) {
      try { validateEnv() } catch { /* logged by validateEnv */ }
      envChecked = true
    }

    const log = createRequestLogger(req)
    const requestId = log.requestId

    try {
      // Resolve route params (Next.js 15 uses Promise-based params)
      const params = routeCtx?.params ? await routeCtx.params : undefined

      const response = await fn(req, { params, requestId })

      // Attach request ID header to response for tracing
      if (response instanceof NextResponse) {
        response.headers.set('x-request-id', requestId)
      }
      return response
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const stack = err instanceof Error ? err.stack : undefined

      log.error('Unhandled API error', {
        error: message,
        stack: stack?.split('\n').slice(0, 5).join('\n'),
        method: req.method,
        url: req.nextUrl.pathname,
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Internal Server Error',
          requestId,
        },
        {
          status: 500,
          headers: { 'x-request-id': requestId },
        }
      )
    }
  }
}
