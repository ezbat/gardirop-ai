/**
 * WEARO Fashion Marketplace - Security & Rate Limiting System
 *
 * Production-grade in-memory rate limiter with security helpers.
 * No external dependencies (no Redis, no ioredis).
 * Uses Map for storage, Node.js crypto for hashing/tokens.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number
  /** Maximum number of requests allowed within the window */
  maxRequests: number
  /** Namespace prefix for key separation */
  keyPrefix: string
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean
  /** Number of remaining requests in the current window */
  remaining: number
  /** When the current window resets */
  resetAt: Date
}

interface RateLimitEntry {
  /** Number of requests made in the current window */
  count: number
  /** Timestamp (ms) when this window expires */
  expiresAt: number
}

// ─────────────────────────────────────────────────────────────
// In-Memory Store
// ─────────────────────────────────────────────────────────────

const store = new Map<string, RateLimitEntry>()

/** Track when the last automatic cleanup ran */
let lastCleanupAt = Date.now()

/** Cleanup interval threshold: 5 minutes */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

/** Maximum store size before forcing an immediate cleanup */
const MAX_STORE_SIZE = 50_000

// ─────────────────────────────────────────────────────────────
// Pre-Configured Rate Limits
// ─────────────────────────────────────────────────────────────

export const API_LIMITS = {
  /** General API calls: 100 requests per minute */
  general: {
    windowMs: 60_000,
    maxRequests: 100,
    keyPrefix: 'gen',
  } satisfies RateLimitConfig,

  /** Authentication (login/register): 10 requests per minute */
  auth: {
    windowMs: 60_000,
    maxRequests: 10,
    keyPrefix: 'auth',
  } satisfies RateLimitConfig,

  /** File/image uploads: 5 requests per minute */
  upload: {
    windowMs: 60_000,
    maxRequests: 5,
    keyPrefix: 'upload',
  } satisfies RateLimitConfig,

  /** Order operations: 20 requests per minute */
  order: {
    windowMs: 60_000,
    maxRequests: 20,
    keyPrefix: 'order',
  } satisfies RateLimitConfig,

  /** Webhook endpoints: 200 requests per minute */
  webhook: {
    windowMs: 60_000,
    maxRequests: 200,
    keyPrefix: 'webhook',
  } satisfies RateLimitConfig,

  /** Search queries: 60 requests per minute */
  search: {
    windowMs: 60_000,
    maxRequests: 60,
    keyPrefix: 'search',
  } satisfies RateLimitConfig,
} as const

// ─────────────────────────────────────────────────────────────
// Core Rate Limiter
// ─────────────────────────────────────────────────────────────

/**
 * Check whether a request identified by `key` is allowed under the
 * given rate limit configuration.
 *
 * Uses a fixed-window algorithm backed by an in-memory Map.
 *
 * @param key    - Unique identifier (IP address, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns        Result indicating success, remaining quota, and reset time
 */
export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const compositeKey = `${config.keyPrefix}:${key}`

  // Trigger lazy cleanup when the store grows too large or enough time passed
  if (
    store.size > MAX_STORE_SIZE ||
    now - lastCleanupAt > CLEANUP_INTERVAL_MS
  ) {
    cleanupExpiredEntries()
  }

  const existing = store.get(compositeKey)

  // If no record exists or the window has expired, start a fresh window
  if (!existing || existing.expiresAt <= now) {
    const expiresAt = now + config.windowMs
    store.set(compositeKey, { count: 1, expiresAt })
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(expiresAt),
    }
  }

  // Window is still active — check the count
  if (existing.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: new Date(existing.expiresAt),
    }
  }

  // Increment and allow
  existing.count += 1
  return {
    success: true,
    remaining: config.maxRequests - existing.count,
    resetAt: new Date(existing.expiresAt),
  }
}

// ─────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────

/**
 * Express-style rate limit middleware for Next.js API routes.
 *
 * Returns `null` when the request is allowed (the caller should
 * continue processing). Returns a `NextResponse` with status 429
 * when the limit is exceeded.
 *
 * @param request - Incoming Next.js request
 * @param config  - Rate limit configuration
 * @returns         `null` if allowed, or a 429 `NextResponse`
 */
export function rateLimitMiddleware(
  request: NextRequest,
  config: RateLimitConfig,
): NextResponse | null {
  const clientId = getClientIdentifier(request)
  const result = rateLimit(clientId, config)

  // Build standard rate-limit headers
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(config.maxRequests),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt.getTime() / 1000)),
  }

  if (!result.success) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
    )

    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: retryAfterSec,
      },
      {
        status: 429,
        headers: {
          ...headers,
          'Retry-After': String(retryAfterSec),
        },
      },
    )
  }

  // Allowed — return null so the caller knows to continue
  return null
}

// ─────────────────────────────────────────────────────────────
// Client Identification
// ─────────────────────────────────────────────────────────────

/**
 * Extract a stable client identifier from the incoming request.
 *
 * Priority order:
 *   1. `x-forwarded-for` first entry (proxy / CDN)
 *   2. `x-real-ip` header
 *   3. `cf-connecting-ip` (Cloudflare)
 *   4. Fallback `"unknown"`
 *
 * The result is trimmed and lowered for consistency.
 */
export function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first.toLowerCase()
  }

  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp.toLowerCase()

  const cfIp = request.headers.get('cf-connecting-ip')?.trim()
  if (cfIp) return cfIp.toLowerCase()

  return 'unknown'
}

// ─────────────────────────────────────────────────────────────
// Memory Management
// ─────────────────────────────────────────────────────────────

/**
 * Remove all expired entries from the in-memory store.
 * Should be called periodically or is triggered automatically
 * when the store exceeds size / time thresholds.
 *
 * @returns The number of entries removed
 */
export function cleanupExpiredEntries(): number {
  const now = Date.now()
  let removed = 0

  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) {
      store.delete(key)
      removed++
    }
  }

  lastCleanupAt = now
  return removed
}

// Auto-cleanup every 5 minutes (server-side only)
if (typeof globalThis !== 'undefined' && typeof window === 'undefined') {
  const timer = setInterval(cleanupExpiredEntries, CLEANUP_INTERVAL_MS)
  // Allow the Node.js process to exit even if the timer is active
  if (timer && typeof timer === 'object' && 'unref' in timer) {
    timer.unref()
  }
}

// ═════════════════════════════════════════════════════════════
// Security Helpers
// ═════════════════════════════════════════════════════════════

/**
 * Sanitise user-supplied strings against XSS attacks.
 *
 * Replaces dangerous HTML characters with their entity equivalents
 * and strips null bytes.
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return ''

  return input
    .replace(/\0/g, '')           // strip null bytes
    .replace(/&/g, '&amp;')       // must come first
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#96;')
    .trim()
}

/**
 * Validate that a string is a well-formed UUID v4.
 */
export function validateUUID(id: string): boolean {
  if (typeof id !== 'string') return false
  const UUID_V4_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return UUID_V4_REGEX.test(id)
}

/**
 * Produce a SHA-256 hex digest of the given data.
 * Suitable for hashing tokens, API keys, etc. before storage.
 */
export function hashSensitiveData(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex')
}

/**
 * Generate a cryptographically secure random token encoded as
 * a URL-safe hex string.
 *
 * @param length - Number of random bytes (default 32 → 64 hex chars)
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex')
}

/**
 * Validate an email address against a reasonable RFC-5322-like pattern.
 *
 * This is intentionally permissive to avoid rejecting valid addresses
 * while still catching obvious junk.
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') return false
  if (email.length > 254) return false // RFC 5321 limit

  const EMAIL_REGEX =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/
  return EMAIL_REGEX.test(email)
}

/**
 * Mask an email address for safe display.
 *
 * `"john.doe@example.com"` → `"j***@example.com"`
 * `"ab@example.com"`       → `"a***@example.com"`
 */
export function maskEmail(email: string): string {
  if (typeof email !== 'string') return ''
  const atIndex = email.indexOf('@')
  if (atIndex <= 0) return '***'

  const local = email.slice(0, atIndex)
  const domain = email.slice(atIndex) // includes '@'

  if (local.length <= 1) {
    return `${local}***${domain}`
  }

  return `${local[0]}***${domain}`
}

/**
 * Mask an IBAN for safe display.
 *
 * `"DE89370400440532013000"` → `"DE89 **** **** **** **** 00"`
 *
 * Shows the first 4 and last 2 characters; everything in between is
 * replaced with grouped asterisks.
 */
export function maskIBAN(iban: string): string {
  if (typeof iban !== 'string') return ''

  // Strip all whitespace for consistent processing
  const cleaned = iban.replace(/\s/g, '')

  if (cleaned.length < 8) return '****'

  const prefix = cleaned.slice(0, 4)
  const suffix = cleaned.slice(-2)

  // Calculate how many masked groups of 4 we need
  const middleLength = cleaned.length - 6 // exclude prefix (4) + suffix (2)
  const groupCount = Math.ceil(middleLength / 4)
  const maskedMiddle = Array(groupCount).fill('****').join(' ')

  return `${prefix} ${maskedMiddle} ${suffix}`
}
