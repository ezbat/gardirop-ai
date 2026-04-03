/**
 * GET /api/shop/[sellerId]
 *
 * Public seller storefront API.
 * Returns seller profile + approved, in-stock products.
 *
 * Query params:
 *   sort    — newest (default) | price_asc | price_desc
 *   search  — text search on product title
 *   category — exact category filter
 *   limit   — max products (default 48, max 100)
 *   offset  — pagination offset
 *
 * No auth required (public page).
 * Uses supabaseAdmin to bypass RLS (read-only, filtered server-side).
 * Cached 30s, stale-while-revalidate 60s.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ─── Product DTO (matches storefront ProductCard) ───────────────────────────────
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

function mapProduct(p: any): ShopProductDTO {
  const price = parseFloat(p.price ?? '0')
  const compareAt = p.original_price ? parseFloat(p.original_price) : null
  const discount =
    compareAt && compareAt > price
      ? Math.round((1 - price / compareAt) * 100)
      : undefined

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

  return {
    id: p.id,
    title: p.title ?? '',
    price,
    currency: 'EUR',
    images: Array.isArray(p.images) ? p.images : [],
    compareAtPrice: compareAt ?? undefined,
    discountPercent: discount,
    inventory: p.stock_quantity ?? 0,
    category: p.category ?? null,
    brand: p.brand ?? null,
    isNew: new Date(p.created_at).getTime() > sevenDaysAgo,
    createdAt: p.created_at,
  }
}

// ─── GET ────────────────────────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sellerId: string }> },
) {
  const { sellerId } = await params

  if (!sellerId) {
    return NextResponse.json({ success: false, error: 'Missing sellerId' }, { status: 400 })
  }

  try {
    // ── 1. Fetch seller (public-facing fields only) ───────────────────────────
    const { data: seller, error: sellerErr } = await supabaseAdmin
      .from('sellers')
      .select('id, shop_name, shop_slug, shop_description, logo_url, banner_url, city, country, is_verified, status, created_at')
      .eq('id', sellerId)
      .maybeSingle()

    if (sellerErr) {
      console.error('[shop API] seller fetch error:', sellerErr.message)
      return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
    }

    if (!seller) {
      return NextResponse.json({ success: false, error: 'Seller not found' }, { status: 404 })
    }

    // Only show active/approved sellers
    if (!['active', 'approved'].includes(seller.status)) {
      return NextResponse.json({ success: false, error: 'Seller not found' }, { status: 404 })
    }

    // ── 2. Parse query params ─────────────────────────────────────────────────
    const url = new URL(req.url)
    const sort = url.searchParams.get('sort') ?? 'newest'
    const search = url.searchParams.get('search')?.trim() ?? ''
    const category = url.searchParams.get('category')?.trim() ?? ''
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '48') || 48, 100)
    const offset = parseInt(url.searchParams.get('offset') ?? '0') || 0

    // ── 3. Build products query (only approved + in-stock) ────────────────────
    let query = supabaseAdmin
      .from('products')
      .select('id, title, price, original_price, images, stock_quantity, category, brand, created_at', { count: 'exact' })
      .eq('seller_id', sellerId)
      .eq('moderation_status', 'approved')
      .eq('status', 'active')
      .gt('stock_quantity', 0)

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    if (category) {
      query = query.eq('category', category)
    }

    // Sort
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

    // ── 4. Total approved product count (for stats, no filters) ───────────────
    const [productsRes, totalCountRes, categoriesRes] = await Promise.all([
      query,

      supabaseAdmin
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', sellerId)
        .eq('moderation_status', 'approved')
        .eq('status', 'active')
        .gt('stock_quantity', 0),

      // Distinct categories for filter
      supabaseAdmin
        .from('products')
        .select('category')
        .eq('seller_id', sellerId)
        .eq('moderation_status', 'approved')
        .eq('status', 'active')
        .gt('stock_quantity', 0)
        .not('category', 'is', null)
        .limit(200),
    ])

    if (productsRes.error) {
      console.error('[shop API] products fetch error:', productsRes.error.message)
      return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
    }

    // ── 5. Build category list ────────────────────────────────────────────────
    const catCounts: Record<string, number> = {}
    for (const row of categoriesRes.data ?? []) {
      if (row.category) catCounts[row.category] = (catCounts[row.category] ?? 0) + 1
    }
    const categories = Object.entries(catCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count }))

    // ── 6. Response ───────────────────────────────────────────────────────────
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
        },
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
    console.error('[shop API] unexpected error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
