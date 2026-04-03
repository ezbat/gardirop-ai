import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/seller/ads — List seller's own ad applications
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data: seller } = await supabaseAdmin
    .from('sellers')
    .select('id')
    .eq('user_id', session.user.id)
    .in('status', ['active', 'approved'])
    .maybeSingle()

  if (!seller) {
    return NextResponse.json({ success: false, error: 'Seller not found' }, { status: 403 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('ad_applications')
      .select('*, ad_packages(*)')
      .eq('seller_id', seller.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, applications: data || [] })
  } catch (error) {
    console.error('[seller/ads] GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load applications' }, { status: 500 })
  }
}
