/**
 * GET /api/shop/by-slug/[slug]
 *
 * Public storefront API — resolves seller by shop_slug.
 * Returns seller profile + storefront settings + approved products.
 *
 * Query params:
 *   sort     — newest (default) | price_asc | price_desc
 *   search   — text search on product title
 *   category — exact category filter
 *   limit    — max products (default 48, max 100)
 *   offset   — pagination offset
 *
 * No auth required (public page).
 * Uses supabaseAdmin to bypass RLS (read-only, filtered server-side).
 * Cached 30s, stale-while-revalidate 60s.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resolveSellerBySlug, getStorefrontSettings } from '@/lib/storefront'

// ─── Product DTO ────────────────────────────────────────────────────────────────

interface ShopProductDTO {
  id: string
  title: string
  price: number
  currency: string
  images: string[]
  compareAtPrice?: number
  discountPercent?: number
  inventory: number
  category: string | null
  brand: string | null
  isNew: boolean
  createdAt: string
}

function mapProduct(p: Record<string, unknown>): ShopProductDTO {
  const price = parseFloat(String(p.price ?? '0'))
  const compareAt = p.original_price ? parseFloat(String(p.original_price)) : null
  const discount =
    compareAt && compareAt > price
      ? Math.round((1 - price / compareAt) * 100)
      : undefined

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

  return {
    id: String(p.id),
    title: String(p.title ?? ''),
    price,
    currency: 'EUR',
    images: Array.isArray(p.images) ? p.images : [],
    compareAtPrice: compareAt ?? undefined,
    discountPercent: discount,
    inventory: (p.stock_quantity as number) ?? 0,
    category: (p.category as string) ?? null,
    brand: (p.brand as string) ?? null,
    isNew: new Date(String(p.created_at)).getTime() > sevenDaysAgo,
    createdAt: String(p.created_at),
  }
}

// ─── GET ────────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  if (!slug) {
    return NextResponse.json({ success: false, error: 'Missing slug' }, { status: 400 })
  }

  try {
    // 1. Resolve seller by slug
    const seller = await resolveSellerBySlug(slug)

    if (!seller) {
      return NextResponse.json({ success: false, error: 'Store not found' }, { status: 404 })
    }

    // 2. Fetch storefront settings
    const settings = await getStorefrontSettings(seller.id)

    // 3. Parse query params
    const url = new URL(req.url)
    const sort = url.searchParams.get('sort') ?? 'newest'
    const search = url.searchParams.get('search')?.trim() ?? ''
    const category = url.searchParams.get('category')?.trim() ?? ''
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '48') || 48, 100)
    const offset = parseInt(url.searchParams.get('offset') ?? '0') || 0

    // 4. Build products query (only approved + in-stock)
    let query = supabaseAdmin
      .from('products')
      .select('id, title, price, original_price, images, stock_quantity, category, brand, created_at', { count: 'exact' })
      .eq('seller_id', seller.id)
      .eq('moderation_status', 'approved')
      .eq('status', 'active')
      .gt('stock_quantity', 0)

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    if (category) {
      query = query.eq('category', category)
    }

    switch (sort) {
      case 'price_asc':
        query = query.order('price', { ascending: true })
        break
      case 'price_desc':
        query = query.order('price', { ascending: false })
        break
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false })
        break
    }

    query = query.range(offset, offset + limit - 1)

    // 5. Parallel: products + total count + categories
    const [productsRes, totalCountRes, categoriesRes] = await Promise.all([
      query,

      supabaseAdmin
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', seller.id)
        .eq('moderation_status', 'approved')
        .eq('status', 'active')
        .gt('stock_quantity', 0),

      supabaseAdmin
        .from('products')
        .select('category')
        .eq('seller_id', seller.id)
        .eq('moderation_status', 'approved')
        .eq('status', 'active')
        .gt('stock_quantity', 0)
        .not('category', 'is', null)
        .limit(200),
    ])

    if (productsRes.error) {
      console.error('[shop/by-slug] products fetch error:', productsRes.error.message)
      return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
    }

    // 6. Build category list
    const catCounts: Record<string, number> = {}
    for (const row of categoriesRes.data ?? []) {
      if (row.category) catCounts[row.category] = (catCounts[row.category] ?? 0) + 1
    }
    const categories = Object.entries(catCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count }))

    // 7. Response
    const products = (productsRes.data ?? []).map(mapProduct)

    return NextResponse.json(
      {
        success: true,
        seller: {
          id: seller.id,
          shopName: seller.shop_name,
          shopSlug: seller.shop_slug,
          shopDescription: seller.shop_description,
          logoUrl: seller.logo_url,
          bannerUrl: seller.banner_url,
          city: seller.city,
          country: seller.country,
          isVerified: seller.is_verified ?? false,
          memberSince: seller.created_at,
          followerCount: seller.follower_count ?? 0,
        },
        settings,
        stats: {
          productCount: totalCountRes.count ?? 0,
        },
        categories,
        products,
        pagination: {
          total: productsRes.count ?? 0,
          limit,
          offset,
          hasMore: offset + limit < (productsRes.count ?? 0),
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      },
    )
  } catch (err) {
    console.error('[shop/by-slug] unexpected error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
