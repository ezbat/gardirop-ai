import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Resolve seller record from session user_id.
 */
async function resolveSeller(userId: string) {
  const { data } = await supabaseAdmin
    .from('sellers')
    .select('id, shop_name, status')
    .eq('user_id', userId)
    .in('status', ['active', 'approved'])
    .maybeSingle()
  return data
}

/**
 * GET /api/seller/posts — List the authenticated seller's posts
 * Query: ?page=1&limit=20
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const seller = await resolveSeller(session.user.id)
  if (!seller) {
    return NextResponse.json({ success: false, error: 'Seller not found' }, { status: 403 })
  }

  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))
  const offset = (page - 1) * limit

  const { data: posts, error, count } = await supabaseAdmin
    .from('posts')
    .select('id, caption, image_url, video_url, is_video, post_type, linked_product_ids, hashtags, is_promoted, likes_count, comments_count, view_count, engagement_score, created_at', { count: 'exact' })
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[seller/posts] GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load posts' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    posts: posts || [],
    total: count || 0,
    page,
    limit,
  })
}

/**
 * POST /api/seller/posts — Create a new seller post
 * Body: { caption, imageUrl, videoUrl?, isVideo?, postType?, linkedProductIds?, hashtags? }
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const seller = await resolveSeller(session.user.id)
  if (!seller) {
    return NextResponse.json({ success: false, error: 'Seller not found' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const {
      caption = '',
      imageUrl,
      videoUrl,
      isVideo = false,
      postType = 'image',
      linkedProductIds = [],
      hashtags = [],
    } = body

    if (!imageUrl && !videoUrl) {
      return NextResponse.json(
        { success: false, error: 'Image or video required' },
        { status: 400 },
      )
    }

    // Extract hashtags from caption if not provided
    const extractedTags = caption.match(/#[\wäöüßÄÖÜ]+/g)?.map((t: string) => t.slice(1).toLowerCase()) || []
    const allTags = [...new Set([...hashtags, ...extractedTags])]

    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .insert({
        user_id: session.user.id,
        seller_id: seller.id,
        caption,
        image_url: imageUrl || videoUrl,
        video_url: videoUrl || null,
        is_video: isVideo || !!videoUrl,
        post_type: postType,
        linked_product_ids: linkedProductIds,
        hashtags: allTags,
        likes_count: 0,
        comments_count: 0,
        view_count: 0,
        engagement_score: 0,
      })
      .select()
      .maybeSingle()

    if (error) throw error

    // Best-effort: increment seller post_count
    void supabaseAdmin
      .from('sellers')
      .select('post_count')
      .eq('id', seller.id)
      .maybeSingle()
      .then(({ data }) => {
        const current = (data as any)?.post_count || 0
        return supabaseAdmin
          .from('sellers')
          .update({ post_count: current + 1 })
          .eq('id', seller.id)
      })

    return NextResponse.json({ success: true, post })
  } catch (error) {
    console.error('[seller/posts] POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create post' },
      { status: 500 },
    )
  }
}
