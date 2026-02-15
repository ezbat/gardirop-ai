import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'
import { Resend } from 'resend'
import { getOrderConfirmationEmail } from '@/lib/email-templates'
import { transitionOrderState } from '@/lib/orderStateMachine'
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
  console.log('💳 Payment successful! Creating order from session:', session.id)

  // 1. IDEMPOTENCY CHECK - Prevent duplicate orders
  const { data: existing } = await supabase
    .from('orders')
    .select('id')
    .eq('stripe_checkout_session_id', session.id)
    .single()

  if (existing) {
    console.log('⚠️ Order already exists for session, skipping:', existing.id)
    return
  }

  // 2. EXTRACT METADATA
  const metadata = session.metadata
  if (!metadata || !metadata.userId || !metadata.cart_items) {
    console.error('❌ Missing required metadata in session:', session.id)
    await logFailedCheckout(session, new Error('Missing metadata'))
    return
  }

  const userId = metadata.userId
  const cartItems = JSON.parse(metadata.cart_items)
  const shippingAddress = JSON.parse(metadata.shipping_address)
  const total = parseFloat(metadata.total)

  console.log('📦 Creating order for user:', userId, 'Total:', total)

  // 3. CREATE ORDER WITH PAID STATE DIRECTLY
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([{
      user_id: userId,
      total_amount: total,
      currency: 'EUR',
      status: 'processing',
      state: 'PAID',  // ← Skip CREATED/PAYMENT_PENDING, start with PAID
      shipping_address: shippingAddress,
      payment_status: 'paid',
      payment_method: 'stripe',
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent as string,
      paid_at: new Date().toISOString(),
    }])
    .select()
    .single()

  if (orderError || !order) {
    console.error('❌ Order creation failed:', orderError)
    await logFailedCheckout(session, orderError || new Error('Order creation failed'))
    throw orderError || new Error('Order creation failed')
  }

  console.log('✅ Order created successfully:', order.id)

  // 4. CREATE ORDER ITEMS WITH COMMISSION DATA
  const orderItems = cartItems.map((item: any) => ({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    price: item.price,
    seller_id: item.seller_id,
    seller_payout_amount: item.metadata.seller_payout_amount,
    platform_commission: item.metadata.platform_commission,
    commission_rate: item.metadata.commission_rate,
    seller_payout_status: 'pending',
  }))

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems)

  if (itemsError) {
    console.error('❌ Order items creation failed:', itemsError)
    // Rollback: delete the order
    await supabase.from('orders').delete().eq('id', order.id)
    await logFailedCheckout(session, itemsError)
    throw itemsError
  }

  console.log('✅ Order items created successfully')
  console.log('💰 Seller balances will be updated automatically via database trigger')

  const orderId = order.id

  // Fetch order details for email
  const { data: orderDetails } = await supabase
    .from('orders')
    .select(`
      *,
      user:users(email, name),
      items:order_items(
        quantity,
        size,
        product:products(title, price, images)
      )
    `)
    .eq('id', orderId)
    .single()

  if (!orderDetails || !orderDetails.user) {
    console.error('Order or user not found for email')
    return
  }

  // Send confirmation email
  try {
    const emailTemplate = getOrderConfirmationEmail(orderDetails as any)

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Wearo <orders@wearo.com>',
      to: orderDetails.user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    })

    console.log('📧 Order confirmation email sent to:', orderDetails.user.email)
  } catch (emailError) {
    console.error('Failed to send order confirmation email:', emailError)
    // Don't fail the webhook if email fails
  }

  // Notify seller(s) about new order
  try {
    // Get order items with product details
    const { data: orderItems } = await supabase
      .from('order_items')
      .select(`
        *,
        product:products!inner(
          title,
          seller_id,
          seller:sellers!inner(
            user_id,
            shop_name
          )
        )
      `)
      .eq('order_id', orderId)

    if (orderItems && orderItems.length > 0) {
      // Group items by seller
      const sellerMap = new Map()
      orderItems.forEach((item: any) => {
        const sellerId = item.product.seller_id
        if (!sellerMap.has(sellerId)) {
          sellerMap.set(sellerId, {
            seller_user_id: item.product.seller.user_id,
            shop_name: item.product.seller.shop_name,
            items: []
          })
        }
        sellerMap.get(sellerId).items.push(item)
      })

      // Send notification to each seller
      for (const [sellerId, sellerData] of sellerMap.entries()) {
        const itemCount = sellerData.items.reduce((sum: number, item: any) => sum + item.quantity, 0)

        await supabase
          .from('notifications')
          .insert({
            user_id: sellerData.seller_user_id,
            type: 'order',
            title: '🎉 Neue Bestellung erhalten!',
            message: `Sie haben eine neue Bestellung mit ${itemCount} Artikel(n) erhalten.`,
            link: `/seller/orders`,  // ← Satıcı siparişler sayfasına git
            data: {
              order_id: orderId,
              order_number: order.order_number || order.id.substring(0, 8).toUpperCase(),
              item_count: itemCount,
              total_amount: sellerData.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
            },
            read: false
          })

        console.log('🔔 Seller notification sent to:', sellerData.shop_name)
      }
    }
  } catch (notifError) {
    console.error('Failed to send seller notifications:', notifError)
    // Don't fail the webhook if notifications fail
  }
}

async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId

  if (!orderId) {
    return
  }

  console.log('⏰ Checkout session expired for order:', orderId)

  // Update order status to cancelled
  await supabase
    .from('orders')
    .update({
      payment_status: 'failed',
      status: 'cancelled',
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
        status: 'cancelled',
      })
      .eq('id', order.id)
  }
}

// Helper function to log failed checkout sessions for manual recovery
async function logFailedCheckout(session: Stripe.Checkout.Session, error: any) {
  try {
    await supabase
      .from('failed_checkouts')
      .insert({
        stripe_session_id: session.id,
        error_message: error?.message || 'Unknown error',
        session_data: session as any,
        retry_count: 0,
      })

    console.log('🚨 Failed checkout logged for manual recovery:', session.id)
  } catch (logError) {
    console.error('Failed to log failed checkout:', logError)
  }
}
