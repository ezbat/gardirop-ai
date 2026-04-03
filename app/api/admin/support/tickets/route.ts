/**
 * GET /api/admin/support/tickets — list all tickets with filters
 *
 * Auth: x-admin-token (requireAdmin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const url = new URL(request.url)
  const status   = url.searchParams.get('status')
  const priority = url.searchParams.get('priority')
  const scope    = url.searchParams.get('scope')
  const search   = url.searchParams.get('q')
  const limit    = Math.min(Number(url.searchParams.get('limit') || 200), 500)

  let query = supabaseAdmin
    .from('support_tickets')
    .select('*')
    .order('last_message_at', { ascending: false })
    .limit(limit)

  if (status && status !== 'all')     query = query.eq('status', status)
  if (priority && priority !== 'all') query = query.eq('priority', priority)
  if (scope && scope !== 'all')       query = query.eq('scope', scope)

  const { data: tickets, error } = await query

  if (error) {
    console.error('[admin/support/tickets GET]', error.message)
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 })
  }

  let list = tickets ?? []

  // Enrich with user + seller info
  const userIds   = [...new Set(list.map((t: any) => t.opened_by_user_id).filter(Boolean))]
  const sellerIds = [...new Set(list.map((t: any) => t.seller_id).filter(Boolean))]

  let usersMap: Record<string, any> = {}
  let sellersMap: Record<string, any> = {}

  if (userIds.length > 0) {
    const { data } = await supabaseAdmin.from('users').select('id, name, email, full_name').in('id', userIds)
    if (data) usersMap = Object.fromEntries(data.map((u: any) => [u.id, u]))
  }
  if (sellerIds.length > 0) {
    const { data } = await supabaseAdmin.from('sellers').select('id, shop_name').in('id', sellerIds)
    if (data) sellersMap = Object.fromEntries(data.map((s: any) => [s.id, s]))
  }

  let enriched = list.map((t: any) => ({
    ...t,
    user: usersMap[t.opened_by_user_id] || null,
    seller: sellersMap[t.seller_id] || null,
  }))

  // Client-side search
  if (search) {
    const s = search.toLowerCase()
    enriched = enriched.filter((t: any) =>
      t.id.toLowerCase().includes(s) ||
      t.subject.toLowerCase().includes(s) ||
      t.user?.name?.toLowerCase().includes(s) ||
      t.user?.email?.toLowerCase().includes(s) ||
      t.seller?.shop_name?.toLowerCase().includes(s)
    )
  }

  // Summary
  const all = tickets ?? []
  const summary = {
    total:       all.length,
    open:        all.filter((t: any) => t.status === 'open').length,
    in_progress: all.filter((t: any) => t.status === 'in_progress').length,
    waiting:     all.filter((t: any) => ['waiting_customer', 'waiting_seller'].includes(t.status)).length,
    resolved:    all.filter((t: any) => t.status === 'resolved').length,
    urgent:      all.filter((t: any) => t.priority === 'urgent' && !['resolved', 'closed'].includes(t.status)).length,
  }

  return NextResponse.json({ success: true, tickets: enriched, summary })
}
