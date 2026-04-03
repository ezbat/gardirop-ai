/**
 * GET /api/seller/messages/unread
 *
 * Returns total unread customer→seller message count for the logged-in seller.
 * Sums seller_unread_count across all conversations owned by this seller.
 *
 * Auth: NextAuth session.
 * Used by seller sidebar badge.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Resolve seller — not every user is a seller
  const { data: seller, error: sellerErr } = await supabaseAdmin
    .from('sellers')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (sellerErr) {
    console.error('[api/seller/messages/unread]', sellerErr.message)
  }
  if (!seller) {
    return NextResponse.json({ success: true, unreadCount: 0 })
  }

  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('seller_unread_count')
    .eq('seller_id', seller.id)

  if (error) {
    console.error('[api/seller/messages/unread] conversations fetch:', error.message)
    return NextResponse.json({ success: true, unreadCount: 0 })
  }

  const total = (data ?? []).reduce(
    (sum, c) => sum + (Number(c.seller_unread_count) || 0),
    0,
  )

  return NextResponse.json({ success: true, unreadCount: total })
}
