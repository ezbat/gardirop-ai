import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    const { data: balance, error: balanceError } = await supabase
      .from('seller_balances')
      .select('*')
      .eq('seller_id', seller.id)
      .single()

    if (balanceError) {
      const { data: newBalance } = await supabase
        .from('seller_balances')
        .insert([{ seller_id: seller.id }])
        .select()
        .single()

      return NextResponse.json({ balance: newBalance || {
        available_balance: 0,
        pending_balance: 0,
        total_withdrawn: 0,
        total_sales: 0,
        commission_rate: 15.00
      }})
    }

    return NextResponse.json({ balance })
  } catch (error) {
    console.error('Get balance error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
