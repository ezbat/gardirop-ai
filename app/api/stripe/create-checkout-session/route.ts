import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'
import { calculateCommission } from '@/lib/stripe-connect'

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

    // Calculate commission for each item and prepare line items
    const lineItemsWithCommission = await Promise.all(
      cartItems.map(async (item: any) => {
        // Get seller's commission rate
        const { data: sellerBalance } = await supabase
          .from('seller_balances')
          .select('commission_rate')
          .eq('seller_id', item.seller_id)
          .single()

        const commissionRate = sellerBalance?.commission_rate || 15
        const itemTotal = item.price * item.quantity
        const { commission, sellerPayout } = calculateCommission(itemTotal, commissionRate)

        return {
          lineItem: {
            price_data: {
              currency: 'eur',
              product_data: {
                name: item.title,
                images: item.images && item.images.length > 0 ? [item.images[0]] : [],
                description: item.brand || 'Product',
              },
              unit_amount: Math.round(item.price * 100),
            },
            quantity: item.quantity,
          },
          metadata: {
            product_id: item.product_id,
            seller_id: item.seller_id,
            seller_payout_amount: sellerPayout,
            platform_commission: commission,
            commission_rate: commissionRate,
          }
        }
      })
    )

    const lineItems = lineItemsWithCommission.map(i => i.lineItem)

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

    console.log('📝 Preparing Stripe checkout session with metadata...')

    // Validate metadata size (Stripe limit is ~500KB)
    const metadataStr = JSON.stringify({
      cart_items: lineItemsWithCommission,
      shipping_address: shippingAddress
    })

    if (metadataStr.length > 450000) { // 450KB safety margin
      return NextResponse.json({
        error: 'Cart too large',
        details: 'Please reduce the number of items in your cart'
      }, { status: 400 })
    }

    // Create Stripe checkout session with all data in metadata
    // Order will be created in webhook AFTER payment succeeds
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/checkout?canceled=true`,
      metadata: {
        userId: userId,
        cart_items: JSON.stringify(lineItemsWithCommission),
        shipping_address: JSON.stringify(shippingAddress),
        subtotal: subtotal.toString(),
        shipping_cost: shipping.toString(),
        total: total.toString(),
      },
      customer_email: shippingAddress?.email,
    })

    console.log('✅ Stripe checkout session created:', session.id)
    console.log('💡 Order will be created in webhook after payment succeeds')

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error('Stripe checkout session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
