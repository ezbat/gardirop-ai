import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/orders/[id]
 *
 * Returns order details. Access control:
 *   - Authenticated user: must own the order (user_id match)
 *   - Guest: must provide ?session_id=stripe_checkout_session_id as proof of ownership
 *
 * This allows the order-confirmation page to load for both
 * authenticated and guest buyers without compromising security.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const session = await getServerSession(authOptions)
    const stripeSessionId = request.nextUrl.searchParams.get('session_id')

    // Must have at least one proof of identity
    if (!session?.user?.id && !stripeSessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build query
    let query = supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          quantity,
          price,
          products (
            id,
            title,
            images
          )
        )
      `)
      .eq('id', orderId)

    // Auth path: filter by user_id
    // Guest path: filter by stripe_checkout_session_id
    if (session?.user?.id) {
      query = query.eq('user_id', session.user.id)
    } else if (stripeSessionId) {
      query = query.eq('stripe_checkout_session_id', stripeSessionId)
    }

    const { data: order, error } = await query.single()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const formattedOrder = {
      id: order.id,
      order_number: order.order_number || `WR-${order.id.substring(0, 8).toUpperCase()}`,
      created_at: order.created_at,
      status: order.status,
      payment_status: order.payment_status,
      total_amount: order.total_amount,
      shipping_address: order.shipping_address,
      tracking_number: order.tracking_number,
      shipping_carrier: order.shipping_carrier,
      tracking_status: order.tracking_status,
      tracking_location: order.tracking_location,
      estimated_delivery: order.estimated_delivery,
      items: order.order_items.map((item: any) => ({
        id: item.id,
        product: {
          id: item.products.id,
          title: item.products.title,
          images: item.products.images
        },
        quantity: item.quantity,
        price: item.price
      }))
    }

    return NextResponse.json({ order: formattedOrder })

  } catch (error) {
    console.error('Order detail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
