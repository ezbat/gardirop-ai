import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cartItems, userId, shippingAddress } = body

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    // Calculate total amount
    const subtotal = cartItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
    const shipping = subtotal >= 100 ? 0 : 10
    const total = subtotal + shipping

    // Create line items for Stripe
    const lineItems = cartItems.map((item: any) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.title,
          images: item.images && item.images.length > 0 ? [item.images[0]] : [],
          description: item.brand || 'Product',
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }))

    // Add shipping as a line item if not free
    if (shipping > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Shipping',
            description: 'Standard shipping',
          },
          unit_amount: Math.round(shipping * 100),
        },
        quantity: 1,
      })
    }

    // Create a pending order first
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId,
        total_amount: total,
        status: 'pending',
        shipping_address: shippingAddress,
        payment_status: 'pending',
        payment_method: 'stripe',
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('❌ Order creation error:', orderError)
      console.error('Error details:', JSON.stringify(orderError, null, 2))
      return NextResponse.json({ error: 'Failed to create order', details: orderError?.message }, { status: 500 })
    }

    console.log('✅ Order created:', order.id)

    // Create order items
    const orderItems = cartItems.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id, // Frontend sends this directly
      quantity: item.quantity,
      price: item.price,
      seller_id: item.seller_id,
    }))

    console.log('📦 Creating order items:', orderItems)

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('❌ Order items creation error:', itemsError)
      console.error('Error details:', JSON.stringify(itemsError, null, 2))
      // Rollback order
      await supabaseAdmin.from('orders').delete().eq('id', order.id)
      return NextResponse.json({ error: 'Failed to create order items', details: itemsError?.message }, { status: 500 })
    }

    console.log('✅ Order items created successfully')

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL}/order-confirmation?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/checkout?canceled=true`,
      metadata: {
        orderId: order.id,
        userId: userId,
      },
      customer_email: shippingAddress?.email,
    })

    // Update order with Stripe session ID and advance state machine to PAYMENT_PENDING
    await supabaseAdmin
      .from('orders')
      .update({
        stripe_checkout_session_id: session.id,
        state: 'PAYMENT_PENDING',
        status: 'PAYMENT_PENDING',
      })
      .eq('id', order.id)

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      orderId: order.id,
    })
  } catch (error: any) {
    console.error('Stripe checkout session error:', error?.message || error)
    console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}
