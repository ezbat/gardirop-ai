import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'
import { Resend } from 'resend'
import { getOrderConfirmationEmail } from '@/lib/email-templates'
import Stripe from 'stripe'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session)
        break

      case 'payment_intent.succeeded':
        console.log('PaymentIntent succeeded:', event.data.object)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId

  if (!orderId) {
    console.error('No orderId in session metadata')
    return
  }

  console.log('✅ Payment successful for order:', orderId)

  // Update order: payment_status 'paid', state 'PAID' (state machine compliant)
  const { error } = await supabase
    .from('orders')
      .update({
        payment_status: 'paid',
        status: 'PAID',
        state: 'PAID',
        stripe_payment_intent_id: session.payment_intent as string,
        paid_at: new Date().toISOString(),
      })
    .eq('id', orderId)

  if (error) {
    console.error('Failed to update order after payment:', error)
    return
  }

  console.log('Order updated successfully:', orderId)

  // Fetch order details for email
  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      user:users(email, full_name),
      items:order_items(
        quantity,
        size,
        product:products(title, price, images)
      )
    `)
    .eq('id', orderId)
    .single()

  if (!order || !order.user) {
    console.error('Order or user not found for email')
    return
  }

  // Send confirmation email
  try {
    const emailTemplate = getOrderConfirmationEmail(order as any)

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Wearo <orders@wearo.com>',
      to: order.user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    })

    console.log('📧 Order confirmation email sent to:', order.user.email)
  } catch (emailError) {
    console.error('Failed to send order confirmation email:', emailError)
    // Don't fail the webhook if email fails
  }
}

async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId

  if (!orderId) {
    return
  }

  console.log('⏰ Checkout session expired for order:', orderId)

  // Update order: state machine compliant CANCELLED state
  await supabase
    .from('orders')
    .update({
      payment_status: 'failed',
      status: 'CANCELLED',
      state: 'CANCELLED',
    })
    .eq('id', orderId)
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  // Find order by payment intent ID
  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single()

  if (order) {
    await supabase
      .from('orders')
      .update({
        payment_status: 'failed',
        status: 'CANCELLED',
        state: 'CANCELLED',
      })
      .eq('id', order.id)
  }
}
