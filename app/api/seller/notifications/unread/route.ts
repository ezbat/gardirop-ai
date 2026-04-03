/**
 * GET /api/seller/notifications/unread
 *
 * Returns unread notification count for the authenticated seller.
 * Used by seller sidebar badge.  Degrades gracefully (42P01).
 *
 * Auth: NextAuth session
 */

import { NextResponse }    from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions }      from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin }    from '@/lib/supabase-admin'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: true, unreadCount: 0 })
  }

  // Resolve seller id
  const { data: sellerRow } = await supabaseAdmin
    .from('sellers')
    .select('id')
    .eq('user_id', session.user.id)
    .in('status', ['active', 'approved'])
    .maybeSingle()

  if (!sellerRow?.id) {
    return NextResponse.json({ success: true, unreadCount: 0 })
  }

  const { count, error } = await supabaseAdmin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_type', 'seller')
    .eq('seller_id', sellerRow.id)
    .eq('is_read', false)

  if (error) {
    if (error.code !== '42P01') console.warn('[api/seller/notifications/unread]', error.message)
    return NextResponse.json({ success: true, unreadCount: 0 })
  }

  return NextResponse.json({ success: true, unreadCount: count ?? 0 })
}
