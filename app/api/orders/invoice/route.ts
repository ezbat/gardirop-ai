import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')

    console.log('[Invoice API] Request for orderId:', orderId)

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID erforderlich' }, { status: 400 })
    }

    // Siparişi veritabanından al
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*, products(*))')
      .eq('id', orderId)
      .single()

    if (orderError) {
      console.error('[Invoice API] Database error:', orderError)
      return NextResponse.json({ error: 'Datenbankfehler', details: orderError.message }, { status: 500 })
    }

    if (!order) {
      console.log('[Invoice API] Order not found:', orderId)
      return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 })
    }

    console.log('[Invoice API] Order found:', order.id, 'Payment Intent:', order.stripe_payment_intent_id)

    // Stripe payment intent'i al
    if (!order.stripe_payment_intent_id) {
      console.log('[Invoice API] No payment intent ID, generating manual invoice')
      // Eğer Stripe payment intent yoksa, manuel fatura oluştur
      const invoiceData = {
        orderNumber: order.order_number || `WR-${order.id.substring(0, 8).toUpperCase()}`,
        date: order.created_at,
        items: order.order_items.map((item: any) => ({
          name: item.products?.title || 'Ürün',
          quantity: item.quantity,
          price: item.price,
          total: item.quantity * item.price
        })),
        subtotal: order.total_amount,
        shipping: order.shipping_cost || 0,
        tax: order.tax_amount || 0,
        total: order.total_amount,
        customer: {
          name: order.shipping_address?.name || 'Kunde',
          email: order.user_email,
          address: order.shipping_address
        },
        paymentMethod: 'card',
        paymentStatus: order.payment_status
      }

      return NextResponse.json(invoiceData)
    }

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id)
      console.log('[Invoice API] Payment intent retrieved:', paymentIntent.id)

      // Stripe charge'ı al (fatura için)
      if (!paymentIntent.latest_charge) {
        console.log('[Invoice API] No charge found, generating manual invoice')
        throw new Error('No charge')
      }

      const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string)
      console.log('[Invoice API] Charge retrieved, receipt URL:', charge.receipt_url)

      // Fatura URL'ini al
      if (charge.receipt_url) {
        return NextResponse.json({
          invoiceUrl: charge.receipt_url,
          receiptNumber: charge.receipt_number,
          amount: charge.amount / 100,
          currency: charge.currency.toUpperCase(),
          created: new Date(charge.created * 1000).toISOString(),
          paymentMethod: charge.payment_method_details?.type
        })
      }
    } catch (stripeError: any) {
      console.error('[Invoice API] Stripe error:', stripeError.message)
      // Stripe hatası durumunda manuel faturaya geç
    }

    // Eğer receipt URL yoksa, kendi faturamızı oluştur
    const invoiceData = {
      orderNumber: order.order_number || order.id,
      date: order.created_at,
      items: order.order_items.map((item: any) => ({
        name: item.products?.title || 'Ürün',
        quantity: item.quantity,
        price: item.price,
        total: item.quantity * item.price
      })),
      subtotal: order.total_amount,
      shipping: order.shipping_cost || 0,
      tax: order.tax_amount || 0,
      total: order.total_amount,
      customer: {
        name: order.shipping_info?.fullName || order.user_name,
        email: order.user_email,
        address: order.shipping_info
      },
      paymentMethod: 'card'
    }

    return NextResponse.json(invoiceData)

  } catch (error: any) {
    console.error('Invoice error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Rechnung', details: error.message },
      { status: 500 }
    )
  }
}
