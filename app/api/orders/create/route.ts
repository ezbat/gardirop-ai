import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  try {
    // Auth kontrolü
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      console.log('❌ Unauthorized: No session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    console.log('✅ Authenticated user:', userId)

    const body = await request.json()
    const { items, shippingInfo, paymentMethod, totalAmount, shippingCost } = body

    console.log('📦 Creating order:', { userId, itemsCount: items?.length, totalAmount })

    // Validation
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    if (!shippingInfo || !shippingInfo.fullName || !shippingInfo.phone || !shippingInfo.address) {
      return NextResponse.json({ error: 'Shipping info incomplete' }, { status: 400 })
    }

    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId,
        shipping_info: shippingInfo,
        payment_method: paymentMethod,
        total_amount: totalAmount,
        shipping_cost: shippingCost,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (orderError) {
      console.error('❌ Order creation error:', orderError)
      throw orderError
    }

    console.log('✅ Order created:', order.id)

    // Create order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      selected_size: item.selectedSize || null,
      price: item.price
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('❌ Order items error:', itemsError)
      // Rollback order
      await supabaseAdmin.from('orders').delete().eq('id', order.id)
      throw itemsError
    }

    console.log('✅ Order items created')

    // Update product stock
    for (const item of items) {
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('stock_quantity')
        .eq('id', item.productId)
        .single()

      if (product && product.stock_quantity >= item.quantity) {
        await supabaseAdmin
          .from('products')
          .update({ stock_quantity: product.stock_quantity - item.quantity })
          .eq('id', item.productId)
      }
    }

    console.log('✅ Stock updated')

    return NextResponse.json({ 
      success: true,
      order: order 
    }, { status: 201 })

  } catch (error: any) {
    console.error('❌ API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error?.message || 'Unknown error' 
    }, { status: 500 })
  }
}