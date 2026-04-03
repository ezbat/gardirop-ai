import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'

// GET: Fetch all users
export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request)
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    let query = supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (role && role !== 'all') {
      query = query.eq('role', role)
    }

    const { data: users, error } = await query

    if (error) {
      console.error('Fetch users error:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Admin users API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH: Update user (ban/unban, change role)
export async function PATCH(request: NextRequest) {
  try {
    const auth = requireAdmin(request)
    if (auth.error) return auth.error

    const { targetUserId, action, notes } = await request.json()

    if (!targetUserId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let updateData: any = {}

    if (action === 'ban') {
      updateData = {
        is_banned: true,
        banned_at: new Date().toISOString(),
        ban_reason: notes || 'Admin action'
      }
    } else if (action === 'unban') {
      updateData = {
        is_banned: false,
        banned_at: null,
        ban_reason: null
      }
    } else if (action === 'make_admin') {
      updateData = {
        role: 'admin'
      }
    } else if (action === 'make_user') {
      updateData = {
        role: 'user'
      }
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', targetUserId)

    if (error) {
      console.error('Update user error:', error)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    // Log admin action
    await supabaseAdmin.from('admin_actions').insert({
      admin_id: 'admin',
      action_type: action,
      target_type: 'user',
      target_id: targetUserId,
      details: { notes }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin user update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
