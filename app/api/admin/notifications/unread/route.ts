/**
 * GET /api/admin/notifications/unread
 *
 * Returns unread admin notification count.
 * Used by admin nav bell badge.  Degrades gracefully (42P01).
 *
 * Auth: x-admin-token header
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin }             from '@/lib/supabase-admin'
import { requireAdmin }              from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return NextResponse.json({ success: true, unreadCount: 0 })

  const { count, error } = await supabaseAdmin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_type', 'admin')
    .eq('admin_scope', true)
    .eq('is_read', false)

  if (error) {
    if (error.code !== '42P01') console.warn('[api/admin/notifications/unread]', error.message)
    return NextResponse.json({ success: true, unreadCount: 0 })
  }

  return NextResponse.json({ success: true, unreadCount: count ?? 0 })
}
