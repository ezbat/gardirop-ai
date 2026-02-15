import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get user's orders with items and products
    // Only show paid orders (exclude pending/unpaid orders)
    const { data: orders, error } = await supabase
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
      .eq('user_id', userId)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Orders fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    // Format orders for response
    const formattedOrders = orders.map(order => ({
      id: order.id,
      order_number: order.order_number || `WR-${order.id.substring(0, 8).toUpperCase()}`,
      created_at: order.created_at,
      status: order.status,
      payment_status: order.payment_status,
      total_amount: order.total_amount,
      shipping_address: order.shipping_address,
      tracking_number: order.tracking_number,
      shipping_carrier: order.shipping_carrier,
      estimated_delivery: order.estimated_delivery,
      tracking_status: order.tracking_status,
      tracking_location: order.tracking_location,
      tracking_last_update: order.tracking_last_update,
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
    }))

    return NextResponse.json({ orders: formattedOrders })

  } catch (error) {
    console.error('Orders API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
