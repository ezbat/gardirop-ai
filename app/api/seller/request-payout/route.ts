import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createRequestLogger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const reqLog = createRequestLogger(request)

  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { amount } = await request.json()

    if (!amount || amount < 10) {
      return NextResponse.json({ error: 'Minimum withdrawal amount is €10.00' }, { status: 400 })
    }

    // Get seller
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, card_verified, card_last4, card_brand')
      .eq('user_id', userId)
      .single()

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    if (!seller.card_verified) {
      return NextResponse.json({ error: 'Card must be verified first' }, { status: 400 })
    }

    // Get balance for commission rate
    const { data: balance } = await supabase
      .from('seller_balances')
      .select('available_balance, commission_rate')
      .eq('seller_id', seller.id)
      .single()

    if (!balance) {
      return NextResponse.json({ error: 'Balance not found' }, { status: 400 })
    }

    // Calculate commission
    const commissionRate = balance.commission_rate || 15
    const commissionAmount = (amount * commissionRate) / 100
    const netAmount = amount - commissionAmount

    // Create withdrawal request first
    const { data: withdrawalRequest, error: insertError } = await supabase
      .from('withdrawal_requests')
      .insert([{
        seller_id: seller.id,
        amount,
        method: 'card',
        commission_amount: commissionAmount,
        net_amount: netAmount,
        status: 'pending',
        card_last4: seller.card_last4,
        card_brand: seller.card_brand
      }])
      .select()
      .single()

    if (insertError) throw insertError

    // Atomic balance deduction via RPC
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('balance_deduct', {
      p_seller_id: seller.id,
      p_amount: amount,
      p_ref_type: 'withdrawal_request',
      p_ref_id: withdrawalRequest.id,
      p_description: `Payout request - card ending ${seller.card_last4}`,
      p_idempotency_key: `payout_request_${withdrawalRequest.id}`,
    })

    if (rpcError) {
      // Rollback: cancel the withdrawal request
      await supabase.from('withdrawal_requests').update({ status: 'failed' }).eq('id', withdrawalRequest.id)
      throw rpcError
    }

    const result = rpcResult as { success: boolean; error?: string }

    if (!result.success) {
      await supabase.from('withdrawal_requests').update({ status: 'failed' }).eq('id', withdrawalRequest.id)
      if (result.error === 'INSUFFICIENT_BALANCE') {
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
      }
      return NextResponse.json({ error: result.error || 'Balance deduction failed' }, { status: 400 })
    }

    reqLog.audit({
      actor_id: userId,
      actor_type: 'seller',
      action: 'payout.requested',
      resource_type: 'withdrawal_request',
      resource_id: withdrawalRequest.id,
      severity: 'info',
      details: { amount, commissionRate, netAmount },
    })

    return NextResponse.json({
      success: true,
      request: withdrawalRequest,
      commission: {
        rate: commissionRate,
        amount: commissionAmount,
        net_amount: netAmount
      }
    })

  } catch (error) {
    reqLog.error('Request payout error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Failed to create payout request' }, { status: 500 })
  }
}
