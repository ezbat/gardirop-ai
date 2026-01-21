import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    // Get seller ID
    const { data: seller } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!seller) {
      return NextResponse.json({ orders: [] })
    }

    // Get orders for this seller
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            title,
            images
          )
        ),
        users (
          name,
          email
        )
      `)
      .eq('seller_id', seller.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Format orders
    const formattedOrders = orders?.map(order => ({
      ...order,
      customer_name: order.users?.name || 'Bilinmiyor',
      items: order.order_items?.map((item: any) => ({
        product_name: item.products?.title || 'Ürün',
        product_image: item.products?.images?.[0],
        quantity: item.quantity,
        price: item.price
      }))
    }))

    return NextResponse.json({ orders: formattedOrders })
  } catch (error) {
    console.error('Get orders error:', error)
    return NextResponse.json({ error: 'Failed to get orders' }, { status: 500 })
  }
}
