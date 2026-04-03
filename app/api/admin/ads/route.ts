import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'

/**
 * GET /api/admin/ads — List all ad applications
 * Query: ?status=pending
 */
export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const url = new URL(request.url)
  const status = url.searchParams.get('status')

  try {
    let query = supabaseAdmin
      .from('ad_applications')
      .select('*, ad_packages(*), sellers(id, shop_name, logo_url, is_verified)')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ success: true, applications: data || [] })
  } catch (error) {
    console.error('[admin/ads] GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/ads — Approve or reject an ad application
 * Body: { applicationId, action: 'approve'|'reject', notes?: string }
 */
export async function PATCH(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  try {
    const { applicationId, action, notes } = await request.json()

    if (!applicationId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'applicationId and action (approve|reject) required' },
        { status: 400 },
      )
    }

    if (action === 'approve') {
      // Get application to calculate dates
      const { data: app } = await supabaseAdmin
        .from('ad_applications')
        .select('*, ad_packages(duration_days)')
        .eq('id', applicationId)
        .single()

      if (!app) {
        return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
      }

      const now = new Date()
      const endsAt = new Date(now.getTime() + (app.ad_packages?.duration_days || 7) * 86400000)

      const { error } = await supabaseAdmin
        .from('ad_applications')
        .update({
          status: 'approved',
          admin_notes: notes || null,
          reviewed_by: 'admin',
          reviewed_at: now.toISOString(),
          starts_at: now.toISOString(),
          ends_at: endsAt.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', applicationId)

      if (error) throw error

      // Mark the linked post as promoted
      if (app.post_id) {
        await supabaseAdmin
          .from('posts')
          .update({ is_promoted: true })
          .eq('id', app.post_id)
      }
    } else {
      const { error } = await supabaseAdmin
        .from('ad_applications')
        .update({
          status: 'rejected',
          admin_notes: notes || null,
          reviewed_by: 'admin',
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId)

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/ads] PATCH error:', error)
    return NextResponse.json({ success: false, error: 'Failed to process' }, { status: 500 })
  }
}
