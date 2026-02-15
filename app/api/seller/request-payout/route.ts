import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { amount } = await request.json()

    if (!amount || amount < 10) {
      return NextResponse.json({ error: 'Minimum çekim tutarı €10.00' }, { status: 400 })
    }

    // Get seller
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, card_verified, card_last4, card_brand')
      .eq('user_id', userId)
      .single()

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Satıcı bulunamadı' }, { status: 404 })
    }

    // Check if card is verified
    if (!seller.card_verified) {
      return NextResponse.json({ error: 'Önce kartınızı doğrulamalısınız' }, { status: 400 })
    }

    // Get balance
    const { data: balance } = await supabase
      .from('seller_balances')
      .select('available_balance, commission_rate')
      .eq('seller_id', seller.id)
      .single()

    if (!balance || balance.available_balance < amount) {
      return NextResponse.json({ error: 'Yetersiz bakiye' }, { status: 400 })
    }

    // Calculate commission
    const commissionRate = balance.commission_rate || 15
    const commissionAmount = (amount * commissionRate) / 100
    const netAmount = amount - commissionAmount

    // Create withdrawal request
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

    // Update seller balance (deduct the amount)
    const { error: updateBalanceError } = await supabase
      .from('seller_balances')
      .update({
        available_balance: balance.available_balance - amount
      })
      .eq('seller_id', seller.id)

    if (updateBalanceError) throw updateBalanceError

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
    console.error('Request payout error:', error)
    return NextResponse.json({ error: 'Ödeme talebi oluşturulurken hata oluştu' }, { status: 500 })
  }
}
