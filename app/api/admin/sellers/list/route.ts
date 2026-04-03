import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  // ── Auth: require admin token ──────────────────────────────────────────────
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  try {
    const { status } = await request.json().catch(() => ({})) as { status?: string }

    let query = supabaseAdmin
      .from('seller_applications')
      .select('id, user_id, shop_name, shop_description, business_type, status, city, country, created_at, reviewed_at, reviewed_by, rejection_reason')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: applications, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, applications: applications ?? [] })
  } catch (error) {
    console.error('[admin/sellers/list] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
