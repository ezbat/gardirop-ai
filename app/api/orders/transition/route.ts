import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { transitionOrderState, getNextStates } from '@/lib/orderStateMachine'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { restoreStockForOrder } from '@/lib/inventory'

/**
 * POST: Transition order to a new state
 *
 * Body:
 * - orderId: string (UUID)
 * - toState: State (one of OrderState enum values)
 * - metadata: object (optional - e.g., tracking_number, refund_id)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { orderId, toState, metadata } = await request.json()

    if (!orderId || !toState) {
      return NextResponse.json(
        { error: 'orderId and toState are required' },
        { status: 400 }
      )
    }

    // Fetch order with seller info
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(id, product_id, quantity, price)')
      .eq('id', orderId)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // ─── Permission Check ───────────────────────────────
    const isCustomer = order.user_id === userId

    // Real seller check: look up if user is the seller for this order
    let isSeller = false
    if (order.seller_id) {
      const { data: seller } = await supabaseAdmin
        .from('sellers')
        .select('id')
        .eq('id', order.seller_id)
        .eq('user_id', userId)
        .single()
      isSeller = !!seller
    }

    // Admin check
    const { data: adminData } = await supabaseAdmin
      .from('admins')
      .select('id')
      .eq('user_id', userId)
      .single()
    const isAdmin = !!adminData

    // Fallback: check users.role
    if (!isAdmin) {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()
      if (user?.role === 'admin') {
        // treat as admin
      } else if (!isCustomer && !isSeller) {
        return NextResponse.json(
          { error: 'You do not have permission to modify this order' },
          { status: 403 }
        )
      }
    }

    // ─── State Transition ───────────────────────────────
    await transitionOrderState(orderId, toState, metadata)

    // ─── Side Effects on State Change ───────────────────
    // Restore stock on cancellation
    if (toState === 'CANCELLED' || toState === 'REFUNDED') {
      const items = (order.order_items || []).map((item: any) => ({
        productId: item.product_id,
        quantity: item.quantity,
      }))
      if (items.length > 0) {
        await restoreStockForOrder(
          orderId,
          items,
          toState === 'CANCELLED' ? 'cancellation' : 'return',
          userId
        )
      }
    }

    // Fetch updated order
    const { data: updatedOrder } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    })
  } catch (error: any) {
    console.error('Order transition error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to transition order state' },
      { status: 400 }
    )
  }
}

/**
 * GET: Get available transitions for an order
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('state, state_history, previous_state')
      .eq('id', orderId)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const availableTransitions = getNextStates(order.state)

    return NextResponse.json({
      currentState: order.state,
      previousState: order.previous_state,
      availableTransitions,
      stateHistory: order.state_history || [],
    })
  } catch (error: any) {
    console.error('Get transitions error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get order transitions' },
      { status: 500 }
    )
  }
}
