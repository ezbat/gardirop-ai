import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'

// GET: Fetch outfits for moderation
export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request)
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabaseAdmin
      .from('outfits')
      .select(`
        *,
        seller:sellers(id, shop_name, phone)
      `)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('moderation_status', status)
    }

    const { data: outfits, error } = await query

    if (error) {
      console.error('Fetch outfits error:', error)
      return NextResponse.json({ error: 'Failed to fetch outfits' }, { status: 500 })
    }

    return NextResponse.json({ outfits })
  } catch (error) {
    console.error('Admin outfits API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH: Update outfit moderation status
export async function PATCH(request: NextRequest) {
  try {
    const auth = requireAdmin(request)
    if (auth.error) return auth.error

    const { outfitId, action, notes } = await request.json()

    if (!outfitId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const status = action === 'approve' ? 'approved' : 'rejected'

    const { error } = await supabaseAdmin
      .from('outfits')
      .update({
        moderation_status: status,
        moderation_notes: notes || null,
        moderated_at: new Date().toISOString(),
        moderated_by: 'admin'
      })
      .eq('id', outfitId)

    if (error) {
      console.error('Update outfit error:', error)
      return NextResponse.json({ error: 'Failed to update outfit' }, { status: 500 })
    }

    // Log admin action
    await supabaseAdmin.from('admin_actions').insert({
      admin_id: 'admin',
      action_type: action,
      target_type: 'outfit',
      target_id: outfitId,
      details: { notes }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin outfit update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
