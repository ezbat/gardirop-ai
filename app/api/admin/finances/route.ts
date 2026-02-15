import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin check (simplified for m3000 username)
    if (userId !== 'm3000') {
      // Also check database for admin role
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (user?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
      }
    }

    const { data: balances, error } = await supabase
      .from('seller_balances')
      .select(`
        *,
        seller:sellers(id, shop_name, phone, user_id)
      `)
      .order('total_sales', { ascending: false })

    if (error) throw error

    return NextResponse.json({ balances: balances || [] })
  } catch (error) {
    console.error('Get finances error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
