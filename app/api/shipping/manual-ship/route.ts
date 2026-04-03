/**
 * POST /api/shipping/manual-ship
 *
 * Allows seller to manually enter tracking number and mark order as shipped.
 *
 * SECURITY:
 *  - Uses getServerSession (not x-user-id header)
 *  - Uses supabaseAdmin (not anon client)
 *  - Verifies seller ownership via order_items→products→seller_id
 *
 * Side effects:
 *  - Sends shipping email to customer (best-effort)
 *  - Creates in-app notification for customer
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { validateTrackingNumber, getTrackingURL } from '@/lib/shipping/tracking'
import { getOrderShippedEmail } from '@/lib/email-templates'
import { sendEmail } from '@/lib/email'
import { createCustomerNotification } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    // ── 1. Authenticate ───────────────────────────────────────────────────
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }
    const userId = session.user.id

    const { orderId, trackingNumber, carrier = 'DHL', estimatedDelivery } = await request.json()

    if (!orderId || !trackingNumber) {
      return NextResponse.json(
        { error: 'Bestell-ID und Sendungsnummer erforderlich' },
        { status: 400 },
      )
    }

    // Validate tracking number format
    if (!validateTrackingNumber(trackingNumber, carrier)) {
      return NextResponse.json(
        { error: `Ungültige Sendungsnummer für ${carrier}` },
        { status: 400 },
      )
    }

    // ── 2. Get seller ─────────────────────────────────────────────────────
    const { data: seller, error: sellerErr } = await supabaseAdmin
      .from('sellers')
      .select('id, shop_name')
      .eq('user_id', userId)
      .maybeSingle()

    if (sellerErr || !seller) {
      return NextResponse.json({ error: 'Kein Verkäufer-Konto' }, { status: 403 })
    }

    // ── 3. Fetch order with items ─────────────────────────────────────────
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, state, user_id, order_number, total_amount')
      .eq('id', orderId)
      .maybeSingle()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 })
    }

    // Only PAID or already SHIPPED orders can be shipped/updated
    if (order.state !== 'PAID' && order.state !== 'SHIPPED') {
      return NextResponse.json(
        { error: `Bestellung muss im Status PAID oder SHIPPED sein (aktuell: ${order.state})` },
        { status: 400 },
      )
    }

    // ── 4. Verify seller owns items in this order ─────────────────────────
    const { data: sellerItems } = await supabaseAdmin
      .from('order_items')
      .select('id, product_id, products(seller_id)')
      .eq('order_id', orderId)

    const ownedItems = (sellerItems ?? []).filter(
      (item: any) => item.products?.seller_id === seller.id,
    )

    if (ownedItems.length === 0) {
      return NextResponse.json(
        { error: 'Keine Artikel von diesem Verkäufer in der Bestellung' },
        { status: 403 },
      )
    }

    const isUpdate = order.state === 'SHIPPED'

    // ── 5. Calculate estimated delivery ───────────────────────────────────
    const estimatedDeliveryDate = estimatedDelivery
      ? new Date(estimatedDelivery)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // ── 6. Update order ───────────────────────────────────────────────────
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        tracking_number: trackingNumber,
        shipping_carrier: carrier,
        shipped_at: new Date().toISOString(),
        estimated_delivery: estimatedDeliveryDate.toISOString(),
        status: 'shipped',
        state: 'SHIPPED',
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('[manual-ship] Order update failed:', updateError)
      return NextResponse.json({ error: 'Bestellung konnte nicht aktualisiert werden' }, { status: 500 })
    }

    console.log(`[manual-ship] Order ${orderId} ${isUpdate ? 'tracking updated' : 'marked shipped'}: ${trackingNumber}`)

    // ── 7. Send shipping email + notification (best-effort) ───────────────
    if (!isUpdate) {
      void (async () => {
        try {
          // Get customer info
          const { data: customer } = await supabaseAdmin
            .from('users')
            .select('email, full_name')
            .eq('id', order.user_id)
            .maybeSingle()

          if (customer?.email) {
            const trackingUrl = getTrackingURL(trackingNumber, carrier)
            const orderNumber = order.order_number || order.id.substring(0, 8).toUpperCase()

            const tpl = getOrderShippedEmail({
              orderId,
              customerName: customer.full_name || 'Kunde',
              trackingNumber,
              carrier,
              trackingUrl: trackingUrl || undefined,
            })

            await sendEmail({
              to: customer.email,
              subject: tpl.subject,
              html: tpl.html,
              tag: 'order_shipped',
            })
            console.log('[manual-ship] Shipping email sent to:', customer.email)
          }

          // In-app notification
          createCustomerNotification(order.user_id, 'order_shipped', {
            body: `Deine Bestellung ist unterwegs! Sendungsnummer: ${trackingNumber}`,
            link: `/orders`,
          })
        } catch (err) {
          console.warn('[manual-ship] Email/notification failed:', err)
        }
      })()
    }

    return NextResponse.json({
      success: true,
      message: isUpdate ? 'Tracking-Informationen aktualisiert' : 'Bestellung als versandt markiert',
      tracking_number: trackingNumber,
      carrier,
      estimated_delivery: estimatedDeliveryDate.toISOString(),
    })
  } catch (error: any) {
    console.error('[manual-ship] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Versand konnte nicht markiert werden' },
      { status: 500 },
    )
  }
}
