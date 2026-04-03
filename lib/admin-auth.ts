/**
 * Unified admin authentication module.
 *
 * Replaces ALL inconsistent admin auth patterns:
 *  - x-user-id header (INSECURE — client-spoofable)
 *  - hardcoded 'm3000' checks
 *  - unprotected routes
 *
 * Single source of truth: x-admin-token header verified via
 * constant-time comparison against ADMIN_TOKEN env var.
 *
 * Usage:
 *   import { requireAdmin } from '@/lib/admin-auth'
 *
 *   export const GET = safeHandler(async (req) => {
 *     const auth = requireAdmin(req)
 *     if (auth.error) return auth.error
 *     // ... safe to proceed
 *   })
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { validateSession } from '@/lib/admin-sessions'

interface AuthSuccess {
  error: null
  token: string
}

interface AuthFailure {
  error: NextResponse
  token: null
}

type AuthResult = AuthSuccess | AuthFailure

/**
 * Verify admin token from request headers.
 * Accepts EITHER:
 *  1. Static ADMIN_TOKEN env var (timing-safe comparison)
 *  2. Session token from /api/admin/auth/login (shared session store)
 */
export function requireAdmin(req: NextRequest): AuthResult {
  const token = req.headers.get('x-admin-token') ?? ''
  if (!token) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Unauthorized — missing admin token' },
        { status: 401 }
      ),
      token: null,
    }
  }

  // Method 1: Check static ADMIN_TOKEN env var
  const expected = process.env.ADMIN_TOKEN
  if (expected) {
    const tb = Buffer.from(token)
    const eb = Buffer.from(expected)

    let match: boolean
    if (tb.length !== eb.length) {
      crypto.timingSafeEqual(Buffer.alloc(eb.length), eb)
      match = false
    } else {
      match = crypto.timingSafeEqual(tb, eb)
    }

    if (match) {
      return { error: null, token }
    }
  }

  // Method 2: Check session token from login route
  const session = validateSession(token)
  if (session) {
    return { error: null, token }
  }

  return {
    error: NextResponse.json(
      { success: false, error: 'Unauthorized — invalid admin token' },
      { status: 401 }
    ),
    token: null,
  }
}

/**
 * Extract client IP for rate limiting.
 */
export function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}
