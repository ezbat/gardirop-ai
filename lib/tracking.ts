/**
 * lib/tracking.ts
 *
 * Lightweight client-side analytics tracker.
 * Fire-and-forget — errors are swallowed silently so analytics never
 * interrupts the user experience.
 *
 * Usage:
 *   import { track } from '@/lib/tracking'
 *   track('product_view', { seller_id, product_id })
 *   track('add_to_cart',  { seller_id, product_id, value: price })
 *   track('begin_checkout')
 *   track('purchase', { order_id, value: total })
 */

export type EventType =
  | 'page_view'
  | 'product_view'
  | 'add_to_cart'
  | 'begin_checkout'
  | 'purchase'

export interface TrackPayload {
  user_id?:    string
  seller_id?:  string
  product_id?: string
  order_id?:   string
  value?:      number
  metadata?:   Record<string, unknown>
}

// ── Session ID ────────────────────────────────────────────────────────────────

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    const KEY = '__sid'
    let sid = sessionStorage.getItem(KEY)
    if (!sid) {
      sid = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)
      sessionStorage.setItem(KEY, sid)
    }
    return sid
  } catch {
    return ''
  }
}

// ── Core track function ────────────────────────────────────────────────────────

export function track(type: EventType, payload: TrackPayload = {}): void {
  if (typeof window === 'undefined') return

  const body = {
    event_type: type,
    session_id: getSessionId(),
    ...payload,
  }

  // Use sendBeacon when available (survives page unloads), fall back to fetch
  const endpoint = '/api/storefront/event'
  const json = JSON.stringify(body)

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([json], { type: 'application/json' }))
    } else {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
        keepalive: true,
      }).catch(() => { /* silent */ })
    }
  } catch {
    // Never throw — analytics must not break the UI
  }
}
