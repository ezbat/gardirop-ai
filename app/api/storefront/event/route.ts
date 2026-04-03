/**
 * POST /api/storefront/event
 *
 * Fire-and-forget analytics event ingestion.
 * No auth required — anonymous visitors can also send events.
 * The payload is validated minimally; unknown fields are dropped.
 *
 * Body:
 *   event_type  string  required  page_view|product_view|add_to_cart|begin_checkout|purchase
 *   session_id  string  optional
 *   user_id     string  optional  (UUID)
 *   seller_id   string  optional  (UUID)
 *   product_id  string  optional  (UUID)
 *   order_id    string  optional  (UUID)
 *   value       number  optional  (EUR amount)
 *   metadata    object  optional
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const VALID_TYPES = new Set([
  'page_view',
  'product_view',
  'add_to_cart',
  'begin_checkout',
  'purchase',
])

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const eventType = typeof body.event_type === 'string' ? body.event_type : null

  if (!eventType || !VALID_TYPES.has(eventType)) {
    return NextResponse.json({ ok: false, error: 'Invalid event_type' }, { status: 400 })
  }

  const row = {
    event_type: eventType,
    session_id: typeof body.session_id === 'string' ? body.session_id.slice(0, 64) : null,
    user_id:    typeof body.user_id    === 'string' ? body.user_id    : null,
    seller_id:  typeof body.seller_id  === 'string' ? body.seller_id  : null,
    product_id: typeof body.product_id === 'string' ? body.product_id : null,
    order_id:   typeof body.order_id   === 'string' ? body.order_id   : null,
    value:      typeof body.value      === 'number' ? body.value      : null,
    metadata:   body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
      ? body.metadata
      : null,
  }

  const { error } = await supabaseAdmin
    .from('storefront_events')
    .insert(row)

  if (error) {
    // Silently swallow table-not-found errors (migration not yet run)
    if ((error as { code?: string }).code !== '42P01') {
      console.error('[storefront/event] insert error:', error.message)
    }
    // Always return 200 to the client — analytics must never break the UX
  }

  return NextResponse.json({ ok: true })
}
