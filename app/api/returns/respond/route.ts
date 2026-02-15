import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/returns/respond
 * Seller approves or rejects return request
 */
export async function POST(request: NextRequest) {
  try {
    const { returnRequestId, action, response } = await request.json()

    if (!returnRequestId || !action) {
      return NextResponse.json(
        { error: 'Return request ID and action required' },
        { status: 400 }
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    // Get user ID
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify seller owns this return request
    const { data: seller } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!seller) {
      return NextResponse.json({ error: 'Not a seller' }, { status: 403 })
    }

    const { data: returnRequest, error: returnError } = await supabase
      .from('return_requests')
      .select('*')
      .eq('id', returnRequestId)
      .eq('seller_id', seller.id)
      .single()

    if (returnError || !returnRequest) {
      return NextResponse.json(
        { error: 'Return request not found or unauthorized' },
        { status: 404 }
      )
    }

    // Check status
    if (returnRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot respond to return request in ${returnRequest.status} status` },
        { status: 400 }
      )
    }

    // Update return request
    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    const { error: updateError } = await supabase
      .from('return_requests')
      .update({
        status: newStatus,
        seller_response: response,
      })
      .eq('id', returnRequestId)

    if (updateError) {
      console.error('Update return request error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update return request' },
        { status: 500 }
      )
    }

    // If approved, update order state to RETURN_REQUESTED
    if (action === 'approve') {
      await supabase
        .from('orders')
        .update({
          state: 'RETURN_REQUESTED',
        })
        .eq('id', returnRequest.order_id)

      console.log(`✅ Return approved: ${returnRequestId}`)
    } else {
      console.log(`❌ Return rejected: ${returnRequestId}`)
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      message: action === 'approve'
        ? 'Return approved. Customer will receive return shipping instructions.'
        : 'Return rejected.',
    })

  } catch (error: any) {
    console.error('❌ Respond to return error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to respond to return request' },
      { status: 500 }
    )
  }
}
