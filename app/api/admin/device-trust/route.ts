import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { validateSession } from '@/lib/admin-sessions'
import {
  registerTrustedDevice,
  verifyTrustedDevice,
  createHMACDeviceToken,
  DEVICE_COOKIE_NAME,
  DEVICE_COOKIE_OPTIONS,
} from '@/lib/admin-device'

/**
 * POST /api/admin/device-trust — Register this device as trusted.
 * Requires valid admin token. Issues httpOnly cookie.
 *
 * GET /api/admin/device-trust — Check if current device is trusted.
 * No admin token needed (cookie-only check).
 */

function verifyAdminToken(token: string): boolean {
  if (!token) return false

  // Method 1: Static ADMIN_TOKEN env var
  const expected = process.env.ADMIN_TOKEN ?? ''
  if (expected) {
    try {
      const a = Buffer.from(token)
      const b = Buffer.from(expected)
      if (a.length !== b.length) {
        crypto.timingSafeEqual(Buffer.alloc(b.length), b)
      } else if (crypto.timingSafeEqual(a, b)) {
        return true
      }
    } catch {}
  }

  // Method 2: Session token from shared session store
  if (validateSession(token)) {
    return true
  }

  return false
}

// ── POST: Register trusted device ────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const adminToken = request.headers.get('x-admin-token') ?? ''
  if (!verifyAdminToken(adminToken)) {
    return NextResponse.json({ trusted: false }, { status: 401 })
  }

  // Check if already trusted via existing cookie
  const existing = request.cookies.get(DEVICE_COOKIE_NAME)?.value
  if (existing) {
    const valid = await verifyTrustedDevice(existing)
    if (valid) {
      return NextResponse.json({ trusted: true, existing: true })
    }
  }

  // Register new device (DB-backed with HMAC fallback)
  const rawToken = await registerTrustedDevice()
  if (!rawToken) {
    // Fallback to HMAC-only if DB is unavailable
    const hmacToken = createHMACDeviceToken()
    const response = NextResponse.json({ trusted: true, existing: false })
    response.cookies.set(DEVICE_COOKIE_NAME, hmacToken, DEVICE_COOKIE_OPTIONS)
    return response
  }

  const response = NextResponse.json({ trusted: true, existing: false })
  response.cookies.set(DEVICE_COOKIE_NAME, rawToken, DEVICE_COOKIE_OPTIONS)
  return response
}

// ── GET: Check device trust ──────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(DEVICE_COOKIE_NAME)?.value
  if (!cookie) {
    return NextResponse.json({ trusted: false })
  }

  const valid = await verifyTrustedDevice(cookie)
  return NextResponse.json({ trusted: valid })
}
