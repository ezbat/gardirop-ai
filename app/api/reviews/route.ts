import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { rateLimitMiddleware, API_LIMITS } from '@/lib/rate-limit'

// GET - Fetch reviews for a product (no rate limit for reading)
async function getReviewsHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = searchParams.get('sortBy') || 'recent' // recent, helpful, rating

    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    let query = supabase
      .from('product_reviews')
      .select(`
        id,
        rating,
        title,
        comment,
        images,
        is_verified_purchase,
        helpful_count,
        created_at,
        users!product_reviews_user_id_fkey (
          id,
          name,
          avatar_url
        )
      `)
      .eq('product_id', productId)

    // Sort
    if (sortBy === 'helpful') {
      query = query.order('helpful_count', { ascending: false })
    } else if (sortBy === 'rating') {
      query = query.order('rating', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    query = query.range(offset, offset + limit - 1)

    const { data: reviews, error } = await query

    if (error) {
      console.error('Fetch reviews error:', error)
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
    }

    // Get total count
    const { count } = await supabase
      .from('product_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId)

    return NextResponse.json({
      reviews: reviews || [],
      total: count || 0,
      hasMore: (offset + limit) < (count || 0)
    })

  } catch (error) {
    console.error('Reviews API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const GET = getReviewsHandler

// POST - Create a review (rate limited)
async function createReviewHandler(req: NextRequest) {
  try {
    const body = await req.json()
    const { productId, userId, rating, title, comment, images } = body

    if (!productId || !userId || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    // Check if user has purchased this product
    const { data: orders } = await supabase
      .from('orders')
      .select(`
        id,
        order_items!inner(product_id)
      `)
      .eq('user_id', userId)
      .eq('order_items.product_id', productId)
      .eq('payment_status', 'paid')

    const isVerifiedPurchase = orders && orders.length > 0

    // Create review
    const { data: review, error } = await supabase
      .from('product_reviews')
      .insert({
        product_id: productId,
        user_id: userId,
        rating,
        title: title || null,
        comment: comment || null,
        images: images || [],
        is_verified_purchase: isVerifiedPurchase
      })
      .select(`
        id,
        rating,
        title,
        comment,
        images,
        is_verified_purchase,
        helpful_count,
        created_at,
        users!product_reviews_user_id_fkey (
          id,
          name,
          avatar_url
        )
      `)
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'You have already reviewed this product' }, { status: 400 })
      }
      console.error('Create review error:', error)
      return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
    }

    return NextResponse.json({ review })

  } catch (error) {
    console.error('Create review error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Apply rate limiting: 10 requests per minute for creating reviews
export async function POST(req: NextRequest) {
  const limited = rateLimitMiddleware(req, API_LIMITS.auth)
  if (limited) return limited
  return createReviewHandler(req)
}
