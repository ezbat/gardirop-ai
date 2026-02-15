import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { SendcloudAPI } from '@/lib/shipping/sendcloud'
import { transitionOrderState } from '@/lib/orderStateMachine'

/**
 * POST /api/shipping/webhook
 * Handles shipping carrier webhooks (Sendcloud, DHL, etc.)
 *
 * Webhook events:
 * - parcel_status_changed: Track delivery progress
 * - parcel_delivered: Order delivered
 * - parcel_exception: Delivery failed
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const signature = request.headers.get('x-sendcloud-signature')

    console.log('📦 Shipping webhook received:', body.action || body.event)

    // Verify webhook signature (if Sendcloud provides one)
    if (signature && process.env.SENDCLOUD_WEBHOOK_SECRET) {
      const sendcloud = new SendcloudAPI()
      const isValid = sendcloud.verifyWebhookSignature(
        JSON.stringify(body),
        signature,
        process.env.SENDCLOUD_WEBHOOK_SECRET
      )

      if (!isValid) {
        console.error('❌ Invalid webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    // Handle different webhook events
    switch (body.action) {
      case 'parcel_status_changed':
        await handleParcelStatusChanged(body)
        break

      default:
        console.log(`⚠️ Unhandled webhook event: ${body.action}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('❌ Shipping webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle parcel status change from Sendcloud
 */
async function handleParcelStatusChanged(data: any) {
  try {
    const parcel = data.parcel
    const trackingNumber = parcel.tracking_number
    const statusId = parcel.status.id
    const statusMessage = parcel.status.message

    console.log(`📍 Tracking update: ${trackingNumber} - ${statusMessage} (${statusId})`)

    // Log shipping event
    await supabase
      .from('shipping_events')
      .insert({
        tracking_number: trackingNumber,
        event_type: statusMessage,
        event_description: statusMessage,
        event_timestamp: new Date().toISOString(),
        raw_webhook_data: data,
      })

    // Find order by tracking number
    const { data: order } = await supabase
      .from('orders')
      .select('id, state')
      .eq('tracking_number', trackingNumber)
      .single()

    if (!order) {
      console.log(`⚠️ Order not found for tracking: ${trackingNumber}`)
      return
    }

    // Map Sendcloud status to order state
    const sendcloud = new SendcloudAPI()
    const newState = sendcloud.mapStatusToOrderState(statusId)

    console.log(`🔄 Transitioning order ${order.id}: ${order.state} → ${newState}`)

    // Handle DELIVERED status
    if (statusId === 11) { // Sendcloud "Delivered" status
      await transitionOrderState(order.id, 'DELIVERED', {
        delivered_at: new Date().toISOString(),
        delivery_proof_url: parcel.tracking_url,
      })

      // Update shipping label status
      await supabase
        .from('shipping_labels')
        .update({
          status: 'delivered',
          actual_delivery: new Date().toISOString(),
        })
        .eq('tracking_number', trackingNumber)

      console.log(`✅ Order ${order.id} marked as DELIVERED`)
    }

    // Handle failed delivery
    if (statusId === 12 || statusId === 13) { // Delivery failed or exception
      console.log(`⚠️ Delivery exception for order ${order.id}`)

      // Could trigger return flow or seller notification here
      // For now, just log the event
    }

  } catch (error) {
    console.error('handleParcelStatusChanged error:', error)
  }
}

/**
 * GET /api/shipping/webhook/test
 * Test endpoint to simulate webhook
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const trackingNumber = searchParams.get('tracking')

  if (!trackingNumber) {
    return NextResponse.json({ error: 'tracking parameter required' }, { status: 400 })
  }

  // Simulate delivered event
  const mockEvent = {
    action: 'parcel_status_changed',
    timestamp: Date.now(),
    parcel: {
      id: 12345,
      tracking_number: trackingNumber,
      status: {
        id: 11, // Delivered
        message: 'Delivered',
      },
      tracking_url: `https://track.example.com/${trackingNumber}`,
    },
  }

  await handleParcelStatusChanged(mockEvent)

  return NextResponse.json({
    message: 'Test webhook processed',
    tracking_number: trackingNumber,
    simulated_status: 'DELIVERED',
  })
}
