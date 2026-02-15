import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  interval: number // Time window in milliseconds
  uniqueTokenPerInterval: number // Max number of unique tokens per interval
}

interface RateLimitStore {
  count: number
  resetTime: number
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitStore>()

/**
 * Rate limiter using sliding window algorithm
 * @param identifier - Unique identifier (usually IP or user ID)
 * @param config - Rate limit configuration
 * @returns boolean - true if allowed, false if rate limited
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { interval: 60000, uniqueTokenPerInterval: 10 }
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const resetTime = now + config.interval

  const record = rateLimitStore.get(identifier)

  // Clean up old entries periodically
  if (rateLimitStore.size > 10000) {
    const entries = Array.from(rateLimitStore.entries())
    entries.forEach(([key, value]) => {
      if (value.resetTime < now) {
        rateLimitStore.delete(key)
      }
    })
  }

  if (!record || record.resetTime < now) {
    // New window or expired window
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime
    })
    return {
      allowed: true,
      remaining: config.uniqueTokenPerInterval - 1,
      resetTime
    }
  }

  // Within the same window
  if (record.count >= config.uniqueTokenPerInterval) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime
    }
  }

  // Increment count
  record.count++
  rateLimitStore.set(identifier, record)

  return {
    allowed: true,
    remaining: config.uniqueTokenPerInterval - record.count,
    resetTime: record.resetTime
  }
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(req: NextRequest): string {
  // Try to get real IP from headers (for proxies/CDNs)
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'unknown'

  return ip
}

/**
 * Rate limit middleware wrapper
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: RateLimitConfig
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const identifier = getClientIdentifier(req)
    const { allowed, remaining, resetTime } = checkRateLimit(identifier, config)

    if (!allowed) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(config?.uniqueTokenPerInterval || 10),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
            'Retry-After': String(retryAfter)
          }
        }
      )
    }

    const response = await handler(req)

    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Limit', String(config?.uniqueTokenPerInterval || 10))
    response.headers.set('X-RateLimit-Remaining', String(remaining))
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)))

    return response
  }
}

/**
 * Preset rate limit configs
 */
export const RateLimitPresets = {
  // Strict: 5 requests per minute
  strict: { interval: 60000, uniqueTokenPerInterval: 5 },

  // Standard: 10 requests per minute
  standard: { interval: 60000, uniqueTokenPerInterval: 10 },

  // Moderate: 30 requests per minute
  moderate: { interval: 60000, uniqueTokenPerInterval: 30 },

  // Generous: 100 requests per minute
  generous: { interval: 60000, uniqueTokenPerInterval: 100 },

  // Auth: 5 attempts per 15 minutes (for login/signup)
  auth: { interval: 900000, uniqueTokenPerInterval: 5 },

  // API: 1000 requests per hour
  api: { interval: 3600000, uniqueTokenPerInterval: 1000 }
}

/**
 * Clean up expired entries (call this periodically)
 */
export function cleanupRateLimitStore() {
  const now = Date.now()
  const entries = Array.from(rateLimitStore.entries())

  let cleaned = 0
  entries.forEach(([key, value]) => {
    if (value.resetTime < now) {
      rateLimitStore.delete(key)
      cleaned++
    }
  })

  return cleaned
}

// Auto cleanup every 5 minutes
if (typeof window === 'undefined') {
  setInterval(cleanupRateLimitStore, 300000)
}
