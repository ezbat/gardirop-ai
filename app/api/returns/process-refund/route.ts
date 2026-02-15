import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
})

/**
 * POST /api/returns/process-refund
 * Process Stripe refund after seller receives returned item
 */
export async function POST(request: NextRequest) {
  try {
    const { returnRequestId } = await request.json()

    if (!returnRequestId) {
      return NextResponse.json(
        { error: 'Return request ID required' },
        { status: 400 }
      )
    }

    // Get user ID
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify seller owns this return request
    const { data: seller } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!seller) {
      return NextResponse.json({ error: 'Not a seller' }, { status: 403 })
    }

    const { data: returnRequest, error: returnError } = await supabase
      .from('return_requests')
      .select(`
        *,
        order:orders (*)
      `)
      .eq('id', returnRequestId)
      .eq('seller_id', seller.id)
      .single()

    if (returnError || !returnRequest) {
      return NextResponse.json(
        { error: 'Return request not found' },
        { status: 404 }
      )
    }

    // Check status (must be 'returned' or 'approved')
    if (!['approved', 'returned'].includes(returnRequest.status)) {
      return NextResponse.json(
        { error: `Cannot refund return request in ${returnRequest.status} status` },
        { status: 400 }
      )
    }

    const order = returnRequest.order as any

    // Get Stripe payment intent
    if (!order.stripe_payment_intent_id) {
      return NextResponse.json(
        { error: 'No payment intent found for this order' },
        { status: 400 }
      )
    }

    // Calculate refund amount (EUR to cents)
    const refundAmount = Math.round(returnRequest.refund_amount * 100)

    console.log(`💸 Processing refund: €${returnRequest.refund_amount} for order ${order.id}`)

    // Create Stripe refund
    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      amount: refundAmount,
      reason: 'requested_by_customer',
      metadata: {
        order_id: order.id,
        return_request_id: returnRequestId,
      },
    })

    console.log(`✅ Stripe refund created: ${refund.id}`)

    // Update return request status to 'refunded'
    const { error: updateError } = await supabase
      .from('return_requests')
      .update({
        status: 'refunded',
        stripe_refund_id: refund.id,
      })
      .eq('id', returnRequestId)

    if (updateError) {
      console.error('Update return request error:', updateError)
      return NextResponse.json(
        { error: 'Refund created but failed to update return request' },
        { status: 500 }
      )
    }

    // Update order state to REFUNDED
    await supabase
      .from('orders')
      .update({
        state: 'REFUNDED',
        refund_amount: returnRequest.refund_amount,
      })
      .eq('id', order.id)

    return NextResponse.json({
      success: true,
      refund_id: refund.id,
      refund_amount: returnRequest.refund_amount,
      message: `Refund of €${returnRequest.refund_amount} processed successfully`,
    })

  } catch (error: any) {
    console.error('❌ Process refund error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process refund' },
      { status: 500 }
    )
  }
}
