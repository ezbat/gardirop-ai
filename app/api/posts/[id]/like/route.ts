import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/posts/[id]/like
 * Toggles like on a post. Requires authentication.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id: postId } = await params
  const userId = session.user.id

  try {
    // Check if already liked
    const { data: existing } = await supabaseAdmin
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      // Unlike
      await supabaseAdmin.from('likes').delete().eq('id', existing.id)

      // Decrement count
      const { data: post } = await supabaseAdmin
        .from('posts')
        .select('likes_count')
        .eq('id', postId)
        .maybeSingle()

      if (post) {
        await supabaseAdmin
          .from('posts')
          .update({ likes_count: Math.max(0, (post.likes_count || 0) - 1) })
          .eq('id', postId)
      }

      return NextResponse.json({ success: true, liked: false })
    } else {
      // Like
      const { error } = await supabaseAdmin
        .from('likes')
        .insert({ post_id: postId, user_id: userId })

      if (error && error.code !== '23505') throw error

      // Increment count
      const { data: post } = await supabaseAdmin
        .from('posts')
        .select('likes_count')
        .eq('id', postId)
        .maybeSingle()

      if (post) {
        await supabaseAdmin
          .from('posts')
          .update({ likes_count: (post.likes_count || 0) + 1 })
          .eq('id', postId)
      }

      return NextResponse.json({ success: true, liked: true })
    }
  } catch (err: any) {
    console.error('[posts/like POST] error:', err?.message)
    return NextResponse.json({ success: false, error: 'Failed to toggle like' }, { status: 500 })
  }
}
