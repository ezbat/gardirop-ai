import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/returns/create
 * Customer creates a return request for delivered order
 */
export async function POST(request: NextRequest) {
  try {
    const { orderId, reason, description } = await request.json()

    if (!orderId || !reason) {
      return NextResponse.json(
        { error: 'Order ID and reason required' },
        { status: 400 }
      )
    }

    // Get user ID
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify order belongs to user and is delivered
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          product:products (
            seller_id
          )
        )
      `)
      .eq('id', orderId)
      .eq('user_id', userId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check order state (must be DELIVERED or COMPLETED)
    if (!['DELIVERED', 'COMPLETED'].includes(order.state)) {
      return NextResponse.json(
        { error: `Cannot return order in ${order.state} state. Order must be delivered first.` },
        { status: 400 }
      )
    }

    // Check if return window is valid (14 days for EU)
    const deliveredDate = new Date(order.delivered_at || order.updated_at)
    const daysSinceDelivery = Math.floor(
      (Date.now() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSinceDelivery > 14) {
      return NextResponse.json(
        { error: 'Return window expired. Returns must be requested within 14 days of delivery.' },
        { status: 400 }
      )
    }

    // Get first seller (for multi-seller, would need to handle separately)
    const sellerId = order.order_items[0].product.seller_id

    // Check if return request already exists
    const { data: existingReturn } = await supabase
      .from('return_requests')
      .select('id, status')
      .eq('order_id', orderId)
      .single()

    if (existingReturn) {
      return NextResponse.json(
        { error: `Return request already exists with status: ${existingReturn.status}` },
        { status: 400 }
      )
    }

    // Create return request
    const { data: returnRequest, error: createError } = await supabase
      .from('return_requests')
      .insert({
        order_id: orderId,
        user_id: userId,
        seller_id: sellerId,
        reason,
        description,
        refund_amount: order.total_amount,
        status: 'pending',
      })
      .select()
      .single()

    if (createError) {
      console.error('Create return request error:', createError)
      return NextResponse.json(
        { error: 'Failed to create return request' },
        { status: 500 }
      )
    }

    // Create return items
    const returnItems = order.order_items.map((item: any) => ({
      return_request_id: returnRequest.id,
      order_item_id: item.id,
      quantity: item.quantity,
      reason,
    }))

    await supabase.from('return_items').insert(returnItems)

    console.log(`✅ Return request created: ${returnRequest.id} for order ${orderId}`)

    return NextResponse.json({
      success: true,
      return_request: returnRequest,
      message: 'Return request submitted. Seller will review within 48 hours.',
    })

  } catch (error: any) {
    console.error('❌ Create return request error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create return request' },
      { status: 500 }
    )
  }
}
