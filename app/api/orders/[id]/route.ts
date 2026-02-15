import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const orderId = id

    // Get order with items
    const { data: order, error } = await supabase
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
      .eq('user_id', session.user.id)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Format response
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
