/**
 * GET  /api/admin/notifications   — list admin notifications (paginated)
 * POST /api/admin/notifications   — mark notifications as read
 *
 * Auth:  x-admin-token header
 * GET  Query: ?page=1&limit=20
 * POST Body:  { ids?: string[] }  — omit ids to mark ALL as read
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin }             from '@/lib/supabase-admin'
import { requireAdmin }              from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { searchParams } = request.nextUrl
  const page  = Math.max(1, Number(searchParams.get('page')  ?? 1))
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? 20)))
  const from  = (page - 1) * limit

  const { data, error, count } = await supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('recipient_type', 'admin')
    .eq('admin_scope', true)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (error) {
    if (error.code !== '42P01') console.warn('[api/admin/notifications GET]', error.message)
    return NextResponse.json({ success: true, notifications: [], total: 0, page, limit })
  }

  return NextResponse.json({
    success:       true,
    notifications: data ?? [],
    total:         count ?? 0,
    page,
    limit,
  })
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const body = await request.json().catch(() => ({}))
  const ids: string[] | undefined = body.ids

  let query = supabaseAdmin
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('recipient_type', 'admin')
    .eq('admin_scope', true)
    .eq('is_read', false)

  if (ids?.length) {
    query = query.in('id', ids)
  }

  const { error } = await query

  if (error) {
    if (error.code !== '42P01') console.warn('[api/admin/notifications POST]', error.message)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
