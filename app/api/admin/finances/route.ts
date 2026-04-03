import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request)
    if (auth.error) return auth.error

    const { data: balances, error } = await supabaseAdmin
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
