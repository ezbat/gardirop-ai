/**
 * GET /api/notifications/unread
 *
 * Returns unread count for the authenticated customer.
 * Used by nav-header bell badge.  Degrades gracefully (42P01).
 *
 * Auth: NextAuth session — unauthenticated returns { unreadCount: 0 }
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

  const { count, error } = await supabaseAdmin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_type', 'customer')
    .eq('user_id', session.user.id)
    .eq('is_read', false)

  if (error) {
    if (error.code !== '42P01') console.warn('[api/notifications/unread]', error.message)
    return NextResponse.json({ success: true, unreadCount: 0 })
  }

  return NextResponse.json({ success: true, unreadCount: count ?? 0 })
}
