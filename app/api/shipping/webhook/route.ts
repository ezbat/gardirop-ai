/**
 * POST /api/shipping/webhook
 * Handles shipping carrier webhooks (Sendcloud).
 *
 * Webhook events:
 *  - parcel_status_changed → Track delivery progress
 *  - parcel delivered (statusId 11) → Mark DELIVERED + email customer
 *  - parcel exception (statusId 12/13) → Log for manual review
 *
 * SECURITY:
 *  - Uses supabaseAdmin (not anon client)
 *  - Sendcloud signature verification when secret is configured
 *
 * SIDE EFFECTS:
 *  - Sends delivery email to customer (best-effort)
 *  - Creates in-app notification for customer
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getOrderDeliveredEmail } from '@/lib/email-templates'
import { sendEmail } from '@/lib/email'
import { createCustomerNotification } from '@/lib/notifications'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const signature = request.headers.get('x-sendcloud-signature')

    console.log('[shipping-webhook] Event received:', body.action || body.event)

    // Verify webhook signature if configured
    if (signature && process.env.SENDCLOUD_WEBHOOK_SECRET) {
      const expected = crypto
        .createHmac('sha256', process.env.SENDCLOUD_WEBHOOK_SECRET)
        .update(JSON.stringify(body))
        .digest('hex')

      if (signature !== expected) {
        console.error('[shipping-webhook] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    switch (body.action) {
      case 'parcel_status_changed':
        await handleParcelStatusChanged(body)
        break
      default:
        console.log(`[shipping-webhook] Unhandled event: ${body.action}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[shipping-webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleParcelStatusChanged(data: any) {
  try {
    const parcel = data.parcel
    const trackingNumber = parcel.tracking_number
    const statusId = parcel.status.id
    const statusMessage = parcel.status.message

    console.log(`[shipping-webhook] Tracking: ${trackingNumber} — ${statusMessage} (${statusId})`)

    // Log shipping event (best-effort, table may not exist)
    try {
      await supabaseAdmin
        .from('shipping_events')
        .insert({
          tracking_number: trackingNumber,
          event_type: statusMessage,
          event_description: statusMessage,
          event_timestamp: new Date().toISOString(),
          raw_webhook_data: data,
        })
    } catch {
      // shipping_events table may not exist — non-fatal
    }

    // Find order by tracking number
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, state, user_id, order_number, total_amount')
      .eq('tracking_number', trackingNumber)
      .maybeSingle()

    if (!order) {
      console.log(`[shipping-webhook] No order found for tracking: ${trackingNumber}`)
      return
    }

    // ── DELIVERED ──────────────────────────────────────────────────────────
    if (statusId === 11) {
      // Update order state
      const { error: updateErr } = await supabaseAdmin
        .from('orders')
        .update({
          state: 'DELIVERED',
          status: 'delivered',
          delivered_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      if (updateErr) {
        console.error(`[shipping-webhook] Failed to update order ${order.id}:`, updateErr.message)
        return
      }

      // Update shipping label
      await supabaseAdmin
        .from('shipping_labels')
        .update({
          status: 'delivered',
          actual_delivery: new Date().toISOString(),
        })
        .eq('tracking_number', trackingNumber)

      console.log(`[shipping-webhook] Order ${order.id} marked DELIVERED`)

      // ── Send delivery email + notification (best-effort) ────────────────
      void (async () => {
        try {
          const { data: customer } = await supabaseAdmin
            .from('users')
            .select('email, full_name')
            .eq('id', order.user_id)
            .maybeSingle()

          if (customer?.email) {
            const orderNumber = order.order_number || order.id.substring(0, 8).toUpperCase()

            const tpl = getOrderDeliveredEmail({
              orderId: order.id,
              customerName: customer.full_name || 'Kunde',
            })

            await sendEmail({
              to: customer.email,
              subject: tpl.subject,
              html: tpl.html,
              tag: 'order_delivered',
            })
            console.log('[shipping-webhook] Delivery email sent to:', customer.email)
          }

          // In-app notification
          createCustomerNotification(order.user_id, 'order_delivered', {
            body: 'Deine Bestellung wurde zugestellt! Wir hoffen, alles gefällt dir.',
            link: '/orders',
          })
        } catch (err) {
          console.warn('[shipping-webhook] Email/notification failed:', err)
        }
      })()
    }

    // ── DELIVERY EXCEPTION ────────────────────────────────────────────────
    if (statusId === 12 || statusId === 13) {
      console.warn(`[shipping-webhook] Delivery exception for order ${order.id} — tracking: ${trackingNumber}`)
      // Could trigger seller notification here in the future
    }
  } catch (error) {
    console.error('[shipping-webhook] handleParcelStatusChanged error:', error)
  }
}
