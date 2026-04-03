import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'
import { createRequestLogger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const reqLog = createRequestLogger(request)

  try {
    const auth = requireAdmin(request)
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabaseAdmin
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
    reqLog.error('Get withdrawal requests error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const reqLog = createRequestLogger(request)

  try {
    const auth = requireAdmin(request)
    if (auth.error) return auth.error

    const { requestId, status, adminNotes } = await request.json()

    if (!requestId || !status) {
      return NextResponse.json({ error: 'Request ID and status required' }, { status: 400 })
    }

    const { data: withdrawalRequest, error: fetchError } = await supabaseAdmin
      .from('withdrawal_requests')
      .select('*, seller:sellers(id)')
      .eq('id', requestId)
      .single()

    if (fetchError || !withdrawalRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (status === 'completed') {
      // Atomic balance deduction via RPC with idempotency
      const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('balance_deduct', {
        p_seller_id: withdrawalRequest.seller_id,
        p_amount: withdrawalRequest.amount,
        p_ref_type: 'withdrawal',
        p_ref_id: requestId,
        p_description: `Withdrawal approved by admin - ${withdrawalRequest.method}`,
        p_idempotency_key: `admin_withdrawal_${requestId}`,
      })

      if (rpcError) {
        return NextResponse.json({ error: `Balance deduction failed: ${rpcError.message}` }, { status: 500 })
      }

      const result = rpcResult as { success: boolean; error?: string; duplicate?: boolean }

      if (!result.success) {
        if (result.error === 'INSUFFICIENT_BALANCE') {
          return NextResponse.json({ error: 'Insufficient seller balance' }, { status: 400 })
        }
        return NextResponse.json({ error: result.error || 'Balance deduction failed' }, { status: 400 })
      }

      if (result.duplicate) {
        reqLog.warn('Duplicate withdrawal processing detected', { requestId })
      }
    }

    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from('withdrawal_requests')
      .update({
        status,
        admin_notes: adminNotes,
        processed_by: 'admin',
        processed_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (updateError) throw updateError

    reqLog.audit({
      actor_id: 'admin',
      actor_type: 'admin',
      action: `withdrawal.${status}`,
      resource_type: 'withdrawal_request',
      resource_id: requestId,
      severity: 'info',
      details: {
        amount: withdrawalRequest.amount,
        seller_id: withdrawalRequest.seller_id,
        admin_notes: adminNotes,
      },
    })

    return NextResponse.json({ success: true, request: updatedRequest })
  } catch (error) {
    reqLog.error('Update withdrawal request error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
