import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET: Fetch outfits for moderation
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin check
    if (userId !== 'm3000') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('outfits')
      .select(`
        *,
        seller:sellers(id, shop_name, email)
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
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin check
    if (userId !== 'm3000') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const { outfitId, action, notes } = await request.json()

    if (!outfitId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const status = action === 'approve' ? 'approved' : 'rejected'

    const { error } = await supabase
      .from('outfits')
      .update({
        moderation_status: status,
        moderation_notes: notes || null,
        moderated_at: new Date().toISOString(),
        moderated_by: userId
      })
      .eq('id', outfitId)

    if (error) {
      console.error('Update outfit error:', error)
      return NextResponse.json({ error: 'Failed to update outfit' }, { status: 500 })
    }

    // Log admin action
    await supabase.from('admin_actions').insert({
      admin_id: userId,
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
