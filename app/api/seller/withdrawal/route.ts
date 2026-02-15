import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: seller } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    const { data: requests, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('seller_id', seller.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ requests: requests || [] })
  } catch (error) {
    console.error('Get withdrawal requests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const { amount, method, bankName, accountHolder, iban, paypalEmail } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!amount || !method) {
      return NextResponse.json({ error: 'Amount and method required' }, { status: 400 })
    }

    const { data: seller } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    const { data: balance } = await supabase
      .from('seller_balances')
      .select('available_balance, commission_rate')
      .eq('seller_id', seller.id)
      .single()

    if (!balance || balance.available_balance < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
    }

    // Calculate commission
    const commissionRate = balance.commission_rate || 15
    const commissionAmount = (amount * commissionRate) / 100
    const netAmount = amount - commissionAmount

    // Create withdrawal request with commission info
    const { data: withdrawalRequest, error } = await supabase
      .from('withdrawal_requests')
      .insert([{
        seller_id: seller.id,
        amount,
        method,
        bank_name: bankName,
        account_holder: accountHolder,
        iban,
        paypal_email: paypalEmail,
        commission_amount: commissionAmount,
        net_amount: netAmount
      }])
      .select()
      .single()

    if (error) throw error

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
    console.error('Create withdrawal request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
