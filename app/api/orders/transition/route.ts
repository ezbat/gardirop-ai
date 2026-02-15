import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { transitionOrderState, canTransition, getNextStates } from '@/lib/orderStateMachine'
import { supabase } from '@/lib/supabase'

/**
 * POST: Transition order to a new state
 *
 * Body:
 * - orderId: string (UUID)
 * - toState: State (one of OrderState enum values)
 * - metadata: object (optional - e.g., tracking_number, refund_id)
 *
 * Returns:
 * - success: boolean
 * - order: updated order object
 * - error: string (if failed)
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

    // Verify user has permission to transition this order
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*, order_items(seller_id)')
      .eq('id', orderId)
      .single()

    if (fetchError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Check permissions:
    // 1. Customer (order owner)
    // 2. Seller (owns items in order)
    // 3. Admin (check admin table)
    const isCustomer = order.user_id === userId
    const isSeller = order.order_items.some((item: any) => {
      // Need to check if userId is the seller's user_id
      return false // TODO: Add seller check
    })

    // Check if user is admin
    const { data: adminData } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', userId)
      .single()

    const isAdmin = !!adminData

    if (!isCustomer && !isSeller && !isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to modify this order' },
        { status: 403 }
      )
    }

    // Attempt state transition
    await transitionOrderState(orderId, toState, metadata)

    // Fetch updated order
    const { data: updatedOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    return NextResponse.json({
      success: true,
      order: updatedOrder
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
 *
 * Query params:
 * - orderId: string (UUID)
 *
 * Returns:
 * - currentState: State
 * - availableTransitions: State[]
 * - stateHistory: array of state changes
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
      return NextResponse.json(
        { error: 'orderId is required' },
        { status: 400 }
      )
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select('state, state_history, previous_state')
      .eq('id', orderId)
      .single()

    if (error || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const availableTransitions = getNextStates(order.state)

    return NextResponse.json({
      currentState: order.state,
      previousState: order.previous_state,
      availableTransitions,
      stateHistory: order.state_history || []
    })

  } catch (error: any) {
    console.error('Get transitions error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get order transitions' },
      { status: 500 }
    )
  }
}
