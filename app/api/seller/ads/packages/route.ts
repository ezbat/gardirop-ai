import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/seller/ads/packages — List active ad packages (public)
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('ad_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) throw error

    return NextResponse.json({ success: true, packages: data || [] })
  } catch (error) {
    console.error('[seller/ads/packages] GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load packages' }, { status: 500 })
  }
}
