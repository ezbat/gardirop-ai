import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/feed — Public social feed of seller posts
 *
 * Query params:
 *   filter = 'trending' | 'following' | 'new' | 'shop' (default 'trending')
 *   cursor = ISO date string (for keyset pagination)
 *   limit  = number (default 20, max 50)
 *   seller = seller UUID (filter to one seller's posts)
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  const url = new URL(request.url)
  const filter = url.searchParams.get('filter') || 'trending'
  const cursor = url.searchParams.get('cursor')
  const sellerId = url.searchParams.get('seller')
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))

  try {
    // Check if 038 migration columns exist by selecting one row
    const { error: schemaCheck } = await supabaseAdmin
      .from('posts')
      .select('seller_id')
      .limit(1)

    if (schemaCheck) {
      // 038 migration not applied yet — return empty feed gracefully
      return NextResponse.json({ success: true, posts: [], hasMore: false, nextCursor: null })
    }

    let query = supabaseAdmin
      .from('posts')
      .select(`
        id, user_id, seller_id, caption, image_url, video_url, is_video,
        post_type, linked_product_ids, hashtags, is_promoted,
        likes_count, comments_count, view_count, engagement_score,
        created_at
      `)
      .not('seller_id', 'is', null) // Only seller posts
      .eq('is_archived', false)

    // Filter to a specific seller
    if (sellerId) {
      query = query.eq('seller_id', sellerId)
    }

    // Filter by "following" — only show posts from followed sellers
    if (filter === 'following' && userId) {
      const { data: follows } = await supabaseAdmin
        .from('store_followers')
        .select('seller_id')
        .eq('user_id', userId)

      const followedIds = follows?.map((f) => f.seller_id) || []
      if (followedIds.length === 0) {
        return NextResponse.json({ success: true, posts: [], hasMore: false })
      }
      query = query.in('seller_id', followedIds)
    }

    // Filter: shop = only posts with linked products
    if (filter === 'shop') {
      query = query.not('linked_product_ids', 'eq', '{}')
    }

    // Ordering
    if (filter === 'trending') {
      query = query.order('engagement_score', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    // Cursor-based pagination
    if (cursor) {
      if (filter === 'trending') {
        // For trending, cursor is score|id
        const [scoreStr, cursorId] = cursor.split('|')
        const score = parseFloat(scoreStr)
        if (!isNaN(score) && cursorId) {
          query = query.or(`engagement_score.lt.${score},and(engagement_score.eq.${score},id.lt.${cursorId})`)
        }
      } else {
        query = query.lt('created_at', cursor)
      }
    }

    query = query.limit(limit + 1) // Fetch one extra to detect hasMore

    const { data: rawPosts, error } = await query

    if (error) throw error

    const hasMore = (rawPosts?.length || 0) > limit
    const posts = (rawPosts || []).slice(0, limit)

    // Fetch promoted posts to inject (max 2, at positions 3 and 8)
    let promotedPosts: any[] = []
    if (!cursor && !sellerId && filter !== 'following') {
      const organicIds = new Set(posts.map((p) => p.id))
      const { data: promoted } = await supabaseAdmin
        .from('posts')
        .select(`
          id, user_id, seller_id, caption, image_url, video_url, is_video,
          post_type, linked_product_ids, hashtags, is_promoted,
          likes_count, comments_count, view_count, engagement_score,
          created_at
        `)
        .eq('is_promoted', true)
        .not('seller_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(4)

      promotedPosts = (promoted || []).filter((p) => !organicIds.has(p.id)).slice(0, 2)

      // Inject at positions 3 and 8
      if (promotedPosts.length > 0 && posts.length > 2) {
        posts.splice(2, 0, promotedPosts[0])
      }
      if (promotedPosts.length > 1 && posts.length > 7) {
        posts.splice(7, 0, promotedPosts[1])
      }
    }

    // Enrich with seller info
    const sellerIds = [...new Set(posts.map((p) => p.seller_id).filter(Boolean))]
    let sellersMap: Record<string, any> = {}
    if (sellerIds.length > 0) {
      const { data: sellers } = await supabaseAdmin
        .from('sellers')
        .select('id, shop_name, logo_url, is_verified')
        .in('id', sellerIds)

      for (const s of sellers || []) {
        sellersMap[s.id] = s
      }
    }

    // Enrich with linked product info (title, price, first image)
    const allProductIds = [...new Set(posts.flatMap((p) => p.linked_product_ids || []).filter(Boolean))]
    let productsMap: Record<string, { id: string; title: string; price: number; images: string[] }> = {}
    if (allProductIds.length > 0) {
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id, title, price, images')
        .in('id', allProductIds)

      for (const pr of products || []) {
        productsMap[pr.id] = { id: pr.id, title: pr.title, price: pr.price, images: pr.images || [] }
      }
    }

    // Enrich with user like/bookmark status
    let likedSet = new Set<string>()
    let bookmarkedSet = new Set<string>()
    if (userId && posts.length > 0) {
      const postIds = posts.map((p) => p.id)

      const [likesRes, bookmarksRes] = await Promise.all([
        supabaseAdmin
          .from('likes')
          .select('post_id')
          .eq('user_id', userId)
          .in('post_id', postIds),
        supabaseAdmin
          .from('bookmarks')
          .select('post_id')
          .eq('user_id', userId)
          .in('post_id', postIds),
      ])

      for (const l of likesRes.data || []) likedSet.add(l.post_id)
      for (const b of bookmarksRes.data || []) bookmarkedSet.add(b.post_id)
    }

    // Build enriched response
    const enriched = posts.map((p) => ({
      ...p,
      seller: sellersMap[p.seller_id] || null,
      liked_by_user: likedSet.has(p.id),
      bookmarked_by_user: bookmarkedSet.has(p.id),
      linked_products: (p.linked_product_ids || [])
        .map((pid: string) => productsMap[pid])
        .filter(Boolean),
    }))

    // Build next cursor
    let nextCursor: string | null = null
    if (hasMore && posts.length > 0) {
      const last = posts[posts.length - 1]
      if (filter === 'trending') {
        nextCursor = `${last.engagement_score}|${last.id}`
      } else {
        nextCursor = last.created_at
      }
    }

    return NextResponse.json({
      success: true,
      posts: enriched,
      hasMore,
      nextCursor,
    })
  } catch (error) {
    console.error('[feed] GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load feed' },
      { status: 500 },
    )
  }
}
