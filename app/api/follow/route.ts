import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/follow
 * Body: { sellerId: string, action: 'follow' | 'unfollow' }
 *
 * Session-authenticated seller follow/unfollow.
 * Uses store_followers table (user_id → seller_id).
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const { sellerId, action } = await request.json()

    if (!sellerId || !['follow', 'unfollow'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'sellerId and action (follow|unfollow) required' },
        { status: 400 },
      )
    }

    if (action === 'follow') {
      const { error } = await supabaseAdmin
        .from('store_followers')
        .insert({ user_id: userId, seller_id: sellerId })

      if (error && error.code !== '23505') throw error

      // Increment follower_count
      const { data: seller } = await supabaseAdmin
        .from('sellers')
        .select('follower_count')
        .eq('id', sellerId)
        .maybeSingle()

      if (seller) {
        await supabaseAdmin
          .from('sellers')
          .update({ follower_count: (seller.follower_count || 0) + 1 })
          .eq('id', sellerId)
      }

      return NextResponse.json({ success: true, following: true })
    } else {
      const { error } = await supabaseAdmin
        .from('store_followers')
        .delete()
        .eq('user_id', userId)
        .eq('seller_id', sellerId)

      if (error) throw error

      // Decrement follower_count
      const { data: seller } = await supabaseAdmin
        .from('sellers')
        .select('follower_count')
        .eq('id', sellerId)
        .maybeSingle()

      if (seller) {
        await supabaseAdmin
          .from('sellers')
          .update({ follower_count: Math.max(0, (seller.follower_count || 0) - 1) })
          .eq('id', sellerId)
      }

      return NextResponse.json({ success: true, following: false })
    }
  } catch (error: any) {
    console.error('[follow] POST error:', error?.message)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/follow?sellerId=xxx
 * Check if current user follows a seller.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: true, following: false })
  }

  const sellerId = request.nextUrl.searchParams.get('sellerId')
  if (!sellerId) {
    return NextResponse.json({ success: false, error: 'sellerId required' }, { status: 400 })
  }

  try {
    const { data } = await supabaseAdmin
      .from('store_followers')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('seller_id', sellerId)
      .maybeSingle()

    return NextResponse.json({ success: true, following: !!data })
  } catch (err: any) {
    console.error('[follow] GET error:', err?.message)
    return NextResponse.json({ success: true, following: false })
  }
}
