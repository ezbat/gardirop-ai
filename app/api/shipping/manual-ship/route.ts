import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { transitionOrderState } from '@/lib/orderStateMachine'
import { validateTrackingNumber, getTrackingURL } from '@/lib/shipping/tracking'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * POST /api/shipping/manual-ship
 * Allows seller to manually enter tracking number without Sendcloud
 *
 * For sellers who ship via their own carrier accounts
 */
export async function POST(request: NextRequest) {
  try {
    const { orderId, trackingNumber, carrier = 'DHL', estimatedDelivery } = await request.json()

    if (!orderId || !trackingNumber) {
      return NextResponse.json(
        { error: 'Order ID and tracking number required' },
        { status: 400 }
      )
    }

    // Validate tracking number format
    if (!validateTrackingNumber(trackingNumber, carrier)) {
      return NextResponse.json(
        { error: `Ungültige Sendungsnummer für ${carrier}` },
        { status: 400 }
      )
    }

    // Get user session
    const userId = request.headers.get('x-user-id')

    // Verify seller owns this order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          product:products (
            seller_id
          )
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Verify order is in PAID or SHIPPED state (allow updating tracking)
    if (order.state !== 'PAID' && order.state !== 'SHIPPED') {
      return NextResponse.json(
        { error: `Order must be in PAID or SHIPPED state (current: ${order.state})` },
        { status: 400 }
      )
    }

    // If already shipped, just update tracking info (don't transition state)
    const isUpdate = order.state === 'SHIPPED'

    // Get seller
    const { data: seller } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!seller) {
      return NextResponse.json({ error: 'Not a seller' }, { status: 403 })
    }

    // Verify seller owns at least one item
    const sellerItems = order.order_items.filter(
      (item: any) => item.product.seller_id === seller.id
    )

    if (sellerItems.length === 0) {
      return NextResponse.json(
        { error: 'No items from this seller in order' },
        { status: 403 }
      )
    }

    // Calculate estimated delivery (default: 7 days from now)
    const estimatedDeliveryDate = estimatedDelivery
      ? new Date(estimatedDelivery)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Update order with tracking info and status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        tracking_number: trackingNumber,
        shipping_carrier: carrier || 'Manual',
        shipped_at: new Date().toISOString(),
        estimated_delivery: estimatedDeliveryDate.toISOString(),
        status: 'shipped',  // ← UI için status
        state: 'SHIPPED',   // ← State machine için state
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('Failed to update order:', updateError)
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      )
    }

    // Create shipping label record (for tracking)
    await supabase
      .from('shipping_labels')
      .insert({
        order_id: orderId,
        seller_id: seller.id,
        tracking_number: trackingNumber,
        carrier: carrier || 'Manual',
        service: 'Manual Shipping',
        label_url: '', // No label URL for manual shipping
        estimated_delivery: estimatedDeliveryDate.toISOString(),
        status: 'shipped',
      })

    const message = isUpdate
      ? `📦 Tracking updated for order ${orderId}: ${trackingNumber}`
      : `📦 Order ${orderId} manually shipped: ${trackingNumber}`

    console.log(message)

    // Get customer email
    const { data: customer } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', order.user_id)
      .single()

    // Send shipping notification email
    if (customer?.email && !isUpdate) {
      const trackingUrl = getTrackingURL(trackingNumber, carrier)

      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Wearo <orders@wearo.com>',
          to: customer.email,
          subject: `📦 Ihre Bestellung wurde versandt - ${order.order_number || order.id.substring(0, 8).toUpperCase()}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Gute Nachrichten! 📦</h2>
              <p>Hallo ${customer.name || 'Kunde'},</p>
              <p>Ihre Bestellung wurde versandt und ist auf dem Weg zu Ihnen!</p>

              <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <p><strong>Bestellnummer:</strong> ${order.order_number || order.id.substring(0, 8).toUpperCase()}</p>
                <p><strong>Versanddienstleister:</strong> ${carrier}</p>
                <p><strong>Sendungsnummer:</strong> <code style="background: white; padding: 5px 10px; border-radius: 5px;">${trackingNumber}</code></p>
                <p><strong>Voraussichtliche Lieferung:</strong> ${new Date(estimatedDeliveryDate).toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>

              ${trackingUrl ? `
                <a href="${trackingUrl}" style="display: inline-block; background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
                  📍 Sendung verfolgen
                </a>
              ` : ''}

              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                Sie können Ihre Sendung auch in der Wearo App verfolgen.
              </p>

              <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
              <p style="color: #999; font-size: 12px;">
                Bei Fragen kontaktieren Sie uns unter support@wearo.com
              </p>
            </div>
          `
        })

        console.log('📧 Shipping notification sent to:', customer.email)
      } catch (emailError) {
        console.error('Failed to send shipping email:', emailError)
      }
    }

    // Create in-app notification
    if (!isUpdate) {
      const trackingUrl = getTrackingURL(trackingNumber, carrier)

      await supabase
        .from('notifications')
        .insert({
          user_id: order.user_id,
          type: 'order_shipped',
          title: '📦 Ihre Bestellung wurde versandt',
          message: `Ihre Bestellung ist unterwegs! Sendungsnummer: ${trackingNumber}`,
          link: `/orders/${orderId}`,  // ← Tıklayınca siparişe git
          data: {
            order_id: orderId,
            tracking_number: trackingNumber,
            carrier,
            tracking_url: trackingUrl,
            estimated_delivery: estimatedDeliveryDate.toISOString()
          },
          read: false
        })

      console.log('🔔 In-app notification created for user:', order.user_id)
    }

    return NextResponse.json({
      success: true,
      message: isUpdate ? 'Tracking information updated' : 'Order marked as shipped',
      tracking_number: trackingNumber,
      carrier: carrier || 'Manual',
      estimated_delivery: estimatedDeliveryDate.toISOString()
    })

  } catch (error: any) {
    console.error('❌ Manual ship error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to mark order as shipped' },
      { status: 500 }
    )
  }
}
