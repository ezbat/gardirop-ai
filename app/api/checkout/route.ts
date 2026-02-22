import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import Stripe from 'stripe'
import { MWST_STANDARD, MWST_ERMAESSIGT } from '@/lib/tax-invoice'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
})

/**
 * POST /api/checkout
 *
 * Creates a Stripe PaymentIntent (or Checkout Session) for an existing order.
 * Uses Stripe Connect with application_fee_amount for platform commission.
 *
 * Body:
 * - orderId: string (required)
 * - returnUrl: string (optional, for redirect after payment)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId, returnUrl } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    // Fetch order with items
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(id, product_id, quantity, price)')
      .eq('id', orderId)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Verify order belongs to this user
    if (order.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify order is in payable state
    if (order.payment_status === 'paid') {
      return NextResponse.json({ error: 'Order is already paid' }, { status: 400 })
    }

    if (!['pending', 'CREATED', 'PAYMENT_PENDING'].includes(order.status)) {
      return NextResponse.json(
        { error: `Order cannot be paid in state: ${order.status}` },
        { status: 400 }
      )
    }

    // Get seller's Stripe Connect account
    let stripeAccountId: string | null = null
    let commissionRate = 15

    if (order.seller_id) {
      const { data: seller } = await supabaseAdmin
        .from('sellers')
        .select('stripe_account_id, stripe_charges_enabled, commission_rate')
        .eq('id', order.seller_id)
        .single()

      if (seller?.stripe_account_id && seller.stripe_charges_enabled) {
        stripeAccountId = seller.stripe_account_id
        commissionRate = parseFloat(seller.commission_rate || '15')
      }
    }

    // Calculate amounts in cents
    const totalAmountCents = Math.round(parseFloat(order.total_amount) * 100)

    // Platform fee: commission_rate% of total
    const applicationFeeCents = Math.round(totalAmountCents * commissionRate / 100)

    // Determine tax rate from order items (use stored tax_rate or default MWST_STANDARD)
    const taxRate = order.tax_rate || MWST_STANDARD

    // Build PaymentIntent params
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: totalAmountCents,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      metadata: {
        order_id: orderId,
        user_id: session.user.id,
        seller_id: order.seller_id || '',
        tax_rate: String(taxRate),
      },
      description: `WEARO Order ${orderId}`,
    }

    // If seller has Stripe Connect account, use destination charge
    if (stripeAccountId) {
      paymentIntentParams.application_fee_amount = applicationFeeCents
      paymentIntentParams.transfer_data = {
        destination: stripeAccountId,
      }
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams)

    // Update order with PaymentIntent ID and transition to PAYMENT_PENDING
    await supabaseAdmin
      .from('orders')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        status: 'PAYMENT_PENDING',
        state: 'PAYMENT_PENDING',
        platform_fee: applicationFeeCents / 100,
        seller_earnings: (totalAmountCents - applicationFeeCents) / 100,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: totalAmountCents,
      applicationFee: applicationFeeCents,
      currency: 'eur',
      stripeConnectAccount: stripeAccountId ? true : false,
    })
  } catch (error: any) {
    console.error('Checkout API error:', error)

    // Handle Stripe-specific errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { error: error.message, code: 'CARD_ERROR' },
        { status: 400 }
      )
    }

    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: 'Invalid payment request', code: 'INVALID_REQUEST' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create payment', details: error?.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/checkout?orderId=xxx
 *
 * Get payment status for an order
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, status, state, payment_status, stripe_payment_intent_id, total_amount, platform_fee, seller_earnings')
      .eq('id', orderId)
      .eq('user_id', session.user.id)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // If there's a PaymentIntent, check its current status from Stripe
    let stripeStatus = null
    if (order.stripe_payment_intent_id) {
      try {
        const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id)
        stripeStatus = pi.status
      } catch {
        // PaymentIntent may not exist in Stripe (e.g., test data)
      }
    }

    return NextResponse.json({
      orderId: order.id,
      status: order.status || order.state,
      paymentStatus: order.payment_status,
      stripeStatus,
      totalAmount: order.total_amount,
      platformFee: order.platform_fee,
      sellerEarnings: order.seller_earnings,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get checkout status' },
      { status: 500 }
    )
  }
}
