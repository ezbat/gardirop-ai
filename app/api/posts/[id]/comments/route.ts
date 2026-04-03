import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/posts/[id]/comments
 * Returns comments for a post (public, no auth required).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: postId } = await params

  try {
    const { data: comments, error } = await supabaseAdmin
      .from('comments')
      .select('id, body, user_id, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) {
      console.error('[posts/comments GET]', error.message)
      return NextResponse.json({ success: true, comments: [] })
    }

    // Enrich with user info
    const userIds = [...new Set((comments ?? []).map(c => c.user_id))]
    let userMap: Record<string, { name: string; image: string | null }> = {}

    if (userIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, name, image')
        .in('id', userIds)

      for (const u of users ?? []) {
        userMap[u.id] = { name: u.name || 'Nutzer', image: u.image }
      }
    }

    const enriched = (comments ?? []).map(c => ({
      id: c.id,
      body: c.body,
      userId: c.user_id,
      userName: userMap[c.user_id]?.name || 'Nutzer',
      userImage: userMap[c.user_id]?.image || null,
      createdAt: c.created_at,
    }))

    return NextResponse.json({ success: true, comments: enriched })
  } catch (err: any) {
    console.error('[posts/comments GET] error:', err?.message)
    return NextResponse.json({ success: true, comments: [] })
  }
}

/**
 * POST /api/posts/[id]/comments
 * Body: { body: string }
 * Requires authentication.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id: postId } = await params

  try {
    const { body } = await request.json()

    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Comment body required' }, { status: 400 })
    }

    if (body.length > 1000) {
      return NextResponse.json({ success: false, error: 'Comment too long (max 1000 chars)' }, { status: 400 })
    }

    // Verify post exists
    const { data: post } = await supabaseAdmin
      .from('posts')
      .select('id')
      .eq('id', postId)
      .maybeSingle()

    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 })
    }

    // Insert comment
    const { data: comment, error } = await supabaseAdmin
      .from('comments')
      .insert({
        post_id: postId,
        user_id: session.user.id,
        body: body.trim(),
      })
      .select()
      .single()

    if (error) throw error

    // Increment comments_count on post
    const { data: currentPost } = await supabaseAdmin
      .from('posts')
      .select('comments_count')
      .eq('id', postId)
      .maybeSingle()

    if (currentPost) {
      await supabaseAdmin
        .from('posts')
        .update({ comments_count: (currentPost.comments_count || 0) + 1 })
        .eq('id', postId)
    }

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        body: comment.body,
        userId: comment.user_id,
        userName: session.user.name || 'Nutzer',
        userImage: session.user.image || null,
        createdAt: comment.created_at,
      },
    })
  } catch (err: any) {
    console.error('[posts/comments POST] error:', err?.message)
    return NextResponse.json({ success: false, error: 'Failed to add comment' }, { status: 500 })
  }
}
