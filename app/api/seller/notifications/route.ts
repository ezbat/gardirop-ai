/**
 * GET  /api/seller/notifications   — list seller notifications (paginated)
 * POST /api/seller/notifications   — mark notifications as read
 *
 * Auth:  NextAuth session (must be an active seller)
 * GET  Query: ?page=1&limit=20
 * POST Body:  { ids?: string[] }  — omit ids to mark ALL as read
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession }          from 'next-auth'
import { authOptions }               from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin }             from '@/lib/supabase-admin'

async function getSellerId(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('sellers')
    .select('id')
    .eq('user_id', userId)
    .in('status', ['active', 'approved'])
    .maybeSingle()
  return data?.id ?? null
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const sellerId = await getSellerId(session.user.id)
  if (!sellerId) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const page  = Math.max(1, Number(searchParams.get('page')  ?? 1))
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? 20)))
  const from  = (page - 1) * limit

  const { data, error, count } = await supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('recipient_type', 'seller')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (error) {
    if (error.code !== '42P01') console.warn('[api/seller/notifications GET]', error.message)
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
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const sellerId = await getSellerId(session.user.id)
  if (!sellerId) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const ids: string[] | undefined = body.ids

  let query = supabaseAdmin
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('recipient_type', 'seller')
    .eq('seller_id', sellerId)
    .eq('is_read', false)

  if (ids?.length) {
    query = query.in('id', ids)
  }

  const { error } = await query

  if (error) {
    if (error.code !== '42P01') console.warn('[api/seller/notifications POST]', error.message)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
