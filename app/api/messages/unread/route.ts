/**
 * GET /api/messages/unread
 *
 * Returns the total number of unread messages for the logged-in customer.
 * Sums customer_unread_count from all conversations where customer_id = userId.
 *
 * Auth: NextAuth session (guest returns 0, no 401 spam).
 * Used by nav-header badge.
 *
 * Degrades gracefully if conversations table doesn't exist (42P01).
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: true, unreadCount: 0 })
  }

  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('customer_unread_count')
    .eq('customer_id', session.user.id)

  if (error) {
    if (error.code !== '42P01') {
      console.warn('[api/messages/unread]', error.message)
    }
    return NextResponse.json({ success: true, unreadCount: 0 })
  }

  const unreadCount = (data ?? []).reduce(
    (sum, row) => sum + (row.customer_unread_count ?? 0),
    0,
  )

  return NextResponse.json({ success: true, unreadCount })
}
