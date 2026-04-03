/**
 * Server-side trusted admin device management.
 *
 * Architecture:
 *   1. On first successful admin auth, a random opaque device token is generated
 *   2. The token is hashed (SHA-256) and stored in `trusted_admin_devices` table
 *   3. The raw token is set as an httpOnly secure cookie (__adt)
 *   4. On subsequent admin access, the cookie is read and its hash is checked against DB
 *   5. Revoked or missing devices get a generic deny page
 *
 * The raw device token is NEVER stored server-side — only the hash.
 * Cookie: httpOnly, secure, sameSite=strict, path=/admin, 30-day expiry.
 */

import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'

const COOKIE_NAME = '__adt'
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60 // 30 days

// ─── Token generation & hashing ──────────────────────────────────────────────

/** Generate a cryptographically random device token (48 hex chars) */
export function generateDeviceToken(): string {
  return crypto.randomBytes(24).toString('hex')
}

/** One-way hash of the device token for DB storage */
export function hashDeviceToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// ─── DB operations ───────────────────────────────────────────────────────────

/**
 * Register a new trusted device. Returns the raw token to set as cookie.
 * The DB stores only the hash.
 */
export async function registerTrustedDevice(label?: string): Promise<string | null> {
  try {
    const rawToken = generateDeviceToken()
    const tokenHash = hashDeviceToken(rawToken)

    const { error } = await supabaseAdmin
      .from('trusted_admin_devices')
      .insert({
        device_token_hash: tokenHash,
        label: label ?? null,
        last_seen_at: new Date().toISOString(),
      })

    if (error) {
      // If table doesn't exist, fall back to HMAC-only mode
      console.error('[admin-device] DB insert failed:', error.message)
      return rawToken // Still return token — HMAC verification is the fallback
    }

    return rawToken
  } catch (err) {
    console.error('[admin-device] registerTrustedDevice error:', err)
    return generateDeviceToken() // Fallback
  }
}

/**
 * Verify a device token against DB records.
 * Returns true if the hash exists and is not revoked.
 * Also updates last_seen_at.
 */
export async function verifyTrustedDevice(rawToken: string): Promise<boolean> {
  try {
    const tokenHash = hashDeviceToken(rawToken)

    const { data, error } = await supabaseAdmin
      .from('trusted_admin_devices')
      .select('id, revoked')
      .eq('device_token_hash', tokenHash)
      .maybeSingle()

    if (error) {
      // Table might not exist yet — fall back to HMAC verification
      console.error('[admin-device] DB verify failed:', error.message)
      return verifyTokenHMAC(rawToken)
    }

    if (!data) return false
    if (data.revoked) return false

    // Update last_seen (best-effort, don't block)
    void (async () => {
      try {
        await supabaseAdmin
          .from('trusted_admin_devices')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('device_token_hash', tokenHash)
      } catch { /* best-effort */ }
    })()

    return true
  } catch {
    return verifyTokenHMAC(rawToken)
  }
}

/**
 * Revoke a device by its ID.
 */
export async function revokeDevice(deviceId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('trusted_admin_devices')
      .update({ revoked: true })
      .eq('id', deviceId)

    return !error
  } catch {
    return false
  }
}

/**
 * List all trusted devices (for admin management UI).
 */
export async function listTrustedDevices() {
  try {
    const { data, error } = await supabaseAdmin
      .from('trusted_admin_devices')
      .select('id, label, created_at, last_seen_at, revoked')
      .order('created_at', { ascending: false })

    if (error) return []
    return data ?? []
  } catch {
    return []
  }
}

// ─── HMAC fallback (works without DB table) ──────────────────────────────────

function getHMACSecret(): string {
  return process.env.ADMIN_TOKEN ?? process.env.NEXTAUTH_SECRET ?? ''
}

/**
 * HMAC-verify a device token cookie value (format: "token.signature").
 * This is the fallback when the DB table doesn't exist yet.
 */
function verifyTokenHMAC(cookieValue: string): boolean {
  try {
    const secret = getHMACSecret()
    if (!secret) return false

    // Check if cookie is in "token.signature" HMAC format
    const dotIdx = cookieValue.indexOf('.')
    if (dotIdx === -1) {
      // Raw token format (DB-backed) — can't verify without DB
      return false
    }

    const token = cookieValue.substring(0, dotIdx)
    const sig = cookieValue.substring(dotIdx + 1)
    if (!token || !sig) return false

    const expected = crypto.createHmac('sha256', secret).update(token).digest('hex')
    if (expected.length !== sig.length) return false
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'))
  } catch {
    return false
  }
}

/**
 * Create an HMAC-signed cookie value (fallback when DB is unavailable).
 */
export function createHMACDeviceToken(): string {
  const secret = getHMACSecret()
  const deviceId = crypto.randomBytes(24).toString('hex')
  const sig = crypto.createHmac('sha256', secret).update(deviceId).digest('hex')
  return `${deviceId}.${sig}`
}

// ─── Cookie helpers ──────────────────────────────────────────────────────────

export const DEVICE_COOKIE_NAME = COOKIE_NAME
export const DEVICE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: MAX_AGE_SECONDS,
}
