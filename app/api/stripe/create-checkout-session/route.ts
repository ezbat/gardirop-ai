/**
 * POST /api/stripe/create-checkout-session
 *
 * Creates a Stripe Checkout Session for a cart purchase.
 *
 * SECURITY:
 *  - Server-side stock verification before creating Stripe session
 *  - Prices read from DB (not trusted from client payload)
 *  - Authenticated users: userId from session
 *  - Guest users: no userId, order linked via guest_email + stripe session
 *
 * GUEST CHECKOUT:
 *  - Bio-link commerce requires zero-friction purchase
 *  - Guests provide email + shipping in checkout form
 *  - Order is created with guest_email instead of user_id
 *  - Stripe customer_email enables post-purchase communication
 *  - Guest can view order via order_id from confirmation URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    // ── 1. Auth (optional — guests allowed) ──────────────────────────────
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id ?? null

    const body = await request.json()
    const { cartItems, shippingAddress } = body

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: 'Warenkorb ist leer' }, { status: 400 })
    }

    if (!shippingAddress?.email || !shippingAddress?.fullName || !shippingAddress?.address) {
      return NextResponse.json({ error: 'Lieferadresse unvollständig' }, { status: 400 })
    }

    // ── 2. Server-side product verification ───────────────────────────────
    const productIds = cartItems.map((item: any) => item.product_id).filter(Boolean)
    if (productIds.length === 0) {
      return NextResponse.json({ error: 'Keine gültigen Produkte' }, { status: 400 })
    }

    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, title, price, original_price, images, stock_quantity, brand, seller_id, status, moderation_status')
      .in('id', productIds)

    if (productsError || !products) {
      console.error('[checkout] Products fetch error:', productsError?.message)
      return NextResponse.json({ error: 'Produkte konnten nicht geladen werden' }, { status: 500 })
    }

    // Build verified cart with DB prices and stock
    const verifiedItems: Array<{
      product_id: string
      title: string
      price: number
      quantity: number
      images: string[]
      brand: string | null
      seller_id: string
    }> = []

    const stockErrors: string[] = []

    for (const clientItem of cartItems) {
      const dbProduct = products.find((p: any) => p.id === clientItem.product_id)

      if (!dbProduct) {
        stockErrors.push(`Produkt nicht gefunden: ${clientItem.title || clientItem.product_id}`)
        continue
      }

      if (dbProduct.moderation_status !== 'approved' || dbProduct.status !== 'active') {
        stockErrors.push(`${dbProduct.title} ist nicht mehr verfügbar`)
        continue
      }

      const requestedQty = Math.max(1, parseInt(clientItem.quantity) || 1)
      const availableStock = dbProduct.stock_quantity ?? 0

      if (availableStock <= 0) {
        stockErrors.push(`${dbProduct.title} ist ausverkauft`)
        continue
      }

      const finalQty = Math.min(requestedQty, availableStock)

      verifiedItems.push({
        product_id: dbProduct.id,
        title: dbProduct.title,
        price: parseFloat(dbProduct.price),  // DB price, not client price
        quantity: finalQty,
        images: Array.isArray(dbProduct.images) ? dbProduct.images : [],
        brand: dbProduct.brand ?? null,
        seller_id: dbProduct.seller_id,
      })
    }

    if (verifiedItems.length === 0) {
      return NextResponse.json({
        error: 'Keine gültigen Produkte im Warenkorb',
        details: stockErrors,
      }, { status: 400 })
    }

    // ── 3. Calculate totals ───────────────────────────────────────────────
    const subtotal = verifiedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const shipping = subtotal >= 100 ? 0 : 10
    const total = subtotal + shipping

    // ── 4. Create pending order ───────────────────────────────────────────
    const orderPayload: Record<string, any> = {
      total_amount: total,
      status: 'pending',
      shipping_address: shippingAddress,
      payment_status: 'pending',
      payment_method: 'stripe',
    }

    // Authenticated user → link by user_id
    // Guest → link by guest_email (shipping email)
    if (userId) {
      orderPayload.user_id = userId
    } else {
      orderPayload.guest_email = shippingAddress.email
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(orderPayload)
      .select()
      .single()

    if (orderError || !order) {
      console.error('[checkout] Order creation error:', orderError)
      return NextResponse.json({ error: 'Bestellung konnte nicht erstellt werden', details: orderError?.message }, { status: 500 })
    }

    // ── 5. Create order items ─────────────────────────────────────────────
    const orderItems = verifiedItems.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
      seller_id: item.seller_id,
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('[checkout] Order items error:', itemsError)
      await supabaseAdmin.from('orders').delete().eq('id', order.id)
      return NextResponse.json({ error: 'Bestellpositionen konnten nicht erstellt werden' }, { status: 500 })
    }

    // ── 6. Create Stripe checkout session ─────────────────────────────────
    const lineItems = verifiedItems.map(item => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.title,
          images: item.images.length > 0 ? [item.images[0]] : [],
          description: item.brand || 'Produkt',
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }))

    if (shipping > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Versand',
            description: 'Standardversand',
            images: [],
          },
          unit_amount: Math.round(shipping * 100),
        },
        quantity: 1,
      })
    }

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${baseUrl}/order-confirmation?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
      cancel_url: `${baseUrl}/checkout?canceled=true`,
      metadata: {
        orderId: order.id,
        ...(userId ? { userId } : { guestEmail: shippingAddress.email }),
      },
      customer_email: shippingAddress.email,
    })

    // ── 7. Update order with Stripe session ID ────────────────────────────
    await supabaseAdmin
      .from('orders')
      .update({
        stripe_checkout_session_id: stripeSession.id,
        state: 'PAYMENT_PENDING',
        status: 'PAYMENT_PENDING',
      })
      .eq('id', order.id)

    return NextResponse.json({
      sessionId: stripeSession.id,
      url: stripeSession.url,
      orderId: order.id,
      ...(stockErrors.length > 0 ? { warnings: stockErrors } : {}),
    })
  } catch (error: any) {
    console.error('[checkout] Stripe session error:', error?.message || error)
    return NextResponse.json(
      { error: 'Interner Serverfehler', details: error?.message },
      { status: 500 },
    )
  }
}
