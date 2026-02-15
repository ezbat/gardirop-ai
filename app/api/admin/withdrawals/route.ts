import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin check (simplified for m3000)
    if (userId !== 'm3000') {
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (user?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
      }
    }

    let query = supabase
      .from('withdrawal_requests')
      .select(`
        *,
        seller:sellers(id, shop_name, phone, user_id)
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: requests, error } = await query

    if (error) throw error

    return NextResponse.json({ requests: requests || [] })
  } catch (error) {
    console.error('Get withdrawal requests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const { requestId, status, adminNotes } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin check (simplified for m3000)
    if (userId !== 'm3000') {
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (user?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
      }
    }

    if (!requestId || !status) {
      return NextResponse.json({ error: 'Request ID and status required' }, { status: 400 })
    }

    const { data: withdrawalRequest, error: fetchError } = await supabase
      .from('withdrawal_requests')
      .select('*, seller:sellers(id)')
      .eq('id', requestId)
      .single()

    if (fetchError || !withdrawalRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (status === 'completed') {
      const { data: currentBalance } = await supabase
        .from('seller_balances')
        .select('available_balance, total_withdrawn')
        .eq('seller_id', withdrawalRequest.seller_id)
        .single()

      if (!currentBalance) {
        return NextResponse.json({ error: 'Balance not found' }, { status: 404 })
      }

      const { error: balanceError } = await supabase
        .from('seller_balances')
        .update({
          available_balance: currentBalance.available_balance - withdrawalRequest.amount,
          total_withdrawn: currentBalance.total_withdrawn + withdrawalRequest.amount
        })
        .eq('seller_id', withdrawalRequest.seller_id)

      if (balanceError) throw balanceError

      await supabase
        .from('seller_transactions')
        .insert([{
          seller_id: withdrawalRequest.seller_id,
          type: 'withdrawal',
          amount: withdrawalRequest.amount,
          commission_amount: 0,
          net_amount: -withdrawalRequest.amount,
          status: 'completed',
          description: `Para çekme talebi onaylandı - ${withdrawalRequest.method}`
        }])
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from('withdrawal_requests')
      .update({
        status,
        admin_notes: adminNotes,
        processed_by: userId,
        processed_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ success: true, request: updatedRequest })
  } catch (error) {
    console.error('Update withdrawal request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
