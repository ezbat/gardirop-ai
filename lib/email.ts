/**
 * lib/email.ts
 *
 * Central email service using Resend.
 *
 * Best-effort: sendEmail() never throws. Callers fire-and-forget.
 * Env vars:
 *   RESEND_API_KEY       — Resend API key
 *   RESEND_FROM_EMAIL    — Sender address, e.g. "WEARO <noreply@wearo.de>"
 *   NEXT_PUBLIC_APP_URL  — Base URL for links in emails
 *   ADMIN_EMAIL          — (optional) Admin inbox for alerts
 */

import { Resend } from 'resend'

// ─── Singleton ────────────────────────────────────────────────────────────────

let _resend: Resend | null = null

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not configured — emails disabled')
    return null
  }
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  /** Optional plain-text fallback */
  text?: string
  /** Reply-to address */
  replyTo?: string
  /** Descriptive tag for logging, e.g. "order_confirmed" */
  tag?: string
}

export interface SendEmailResult {
  success: boolean
  id?: string
  error?: string
}

// ─── Core sender ──────────────────────────────────────────────────────────────

/**
 * Send an email via Resend. Best-effort: never throws.
 * Returns { success, id?, error? }.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    const resend = getResend()
    if (!resend) {
      console.warn(`[email] Skipped (no API key): ${params.tag ?? params.subject}`)
      return { success: false, error: 'RESEND_API_KEY not configured' }
    }

    const from = process.env.RESEND_FROM_EMAIL || 'WEARO <noreply@wearo.de>'

    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      ...(params.text ? { text: params.text } : {}),
      ...(params.replyTo ? { reply_to: params.replyTo } : {}),
    })

    if (error) {
      console.error(`[email] Resend error (${params.tag ?? 'unknown'}):`, error.message)
      return { success: false, error: error.message }
    }

    console.info(`[email] Sent: ${params.tag ?? params.subject} → ${Array.isArray(params.to) ? params.to.join(', ') : params.to} (id: ${data?.id})`)
    return { success: true, id: data?.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[email] Unexpected error (${params.tag ?? 'unknown'}):`, msg)
    return { success: false, error: msg }
  }
}

// ─── Convenience: admin email ─────────────────────────────────────────────────

/**
 * Send an email to the admin address (from ADMIN_EMAIL env).
 * Skips silently if ADMIN_EMAIL is not set.
 */
export async function sendAdminEmail(params: Omit<SendEmailParams, 'to'>): Promise<SendEmailResult> {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) {
    console.warn(`[email] ADMIN_EMAIL not configured — skipping admin email: ${params.tag}`)
    return { success: false, error: 'ADMIN_EMAIL not configured' }
  }
  return sendEmail({ ...params, to: adminEmail })
}

// ─── App URL helper ───────────────────────────────────────────────────────────

export function appUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://wearo.de'
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
}
