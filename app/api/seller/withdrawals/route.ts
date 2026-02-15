import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get seller ID
    const { data: seller } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    // Get all withdrawal requests for this seller
    const { data: withdrawals, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('seller_id', seller.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ withdrawals: withdrawals || [] })
  } catch (error) {
    console.error('Get withdrawals error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
