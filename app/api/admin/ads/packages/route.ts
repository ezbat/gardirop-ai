import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'

/**
 * GET /api/admin/ads/packages — List all packages (including inactive)
 */
export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { data, error } = await supabaseAdmin
    .from('ad_packages')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ success: false, error: 'Failed to load' }, { status: 500 })
  }

  return NextResponse.json({ success: true, packages: data || [] })
}

/**
 * POST /api/admin/ads/packages — Create a new package
 */
export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { data, error } = await supabaseAdmin
      .from('ad_packages')
      .insert(body)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, package: data })
  } catch (error) {
    console.error('[admin/ads/packages] POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/ads/packages — Update a package
 * Body: { id, ...fields }
 */
export async function PATCH(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  try {
    const { id, ...fields } = await request.json()
    if (!id) {
      return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('ad_packages')
      .update(fields)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, package: data })
  } catch (error) {
    console.error('[admin/ads/packages] PATCH error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
}
