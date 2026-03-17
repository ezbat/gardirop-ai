import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
}

function mapProduct(p: any): ProductCardDTO {
  const price = parseFloat(p.price ?? '0')
  const compareAt = p.original_price ? parseFloat(p.original_price) : null
  const discount =
    compareAt && compareAt > price
      ? Math.round((1 - price / compareAt) * 100)
      : undefined
  return {
    id: p.id,
    title: p.title ?? '',
    price,
    currency: 'EUR',
    images: Array.isArray(p.images) ? p.images : [],
    discountPercent: discount,
    compareAtPrice: compareAt ?? undefined,
    inventory: p.stock_quantity ?? undefined,
    category: p.category ?? undefined,
    categorySlug: p.category ? slugify(p.category) : undefined,
  }
}

export interface ProductCardDTO {
  id: string
  title: string
  price: number
  currency: string
  images: string[]
  discountPercent?: number
  compareAtPrice?: number
  inventory?: number
  category?: string
  categorySlug?: string
}

// ─── Route ───────────────────────────────────────────────────────────────────

/**
 * GET /api/storefront/home
 *
 * Returns homepage data: categories (derived from products), deals,
 * new arrivals, and popular picks. All from real DB data, no invented values.
 *
 * Cached 30s, stale-while-revalidate 60s.
 */
export async function GET() {
  try {
    const [dealsRes, newRes, popularRes, categoriesRes] = await Promise.all([
      // Products that have a real original_price > price (genuine deals)
      supabaseAdmin
        .from('products')
        .select('id, title, price, original_price, images, stock_quantity, category')
        .eq('moderation_status', 'approved')
        .not('original_price', 'is', null)
        .gt('stock_quantity', 0)
        .order('created_at', { ascending: false })
        .limit(24),

      // New arrivals
      supabaseAdmin
        .from('products')
        .select('id, title, price, original_price, images, stock_quantity, category')
        .eq('moderation_status', 'approved')
        .gt('stock_quantity', 0)
        .order('created_at', { ascending: false })
        .limit(12),

      // Popular picks (broader set, will be shuffled)
      supabaseAdmin
        .from('products')
        .select('id, title, price, original_price, images, stock_quantity, category')
        .eq('moderation_status', 'approved')
        .gt('stock_quantity', 0)
        .order('created_at', { ascending: false })
        .range(0, 47),

      // Distinct category values for the category grid
      supabaseAdmin
        .from('products')
        .select('category')
        .eq('moderation_status', 'approved')
        .not('category', 'is', null)
        .limit(300),
    ])

    // Real deals only — original_price must exceed price
    const realDeals = (dealsRes.data ?? []).filter(
      (p) => p.original_price && parseFloat(p.original_price) > parseFloat(p.price),
    )

    // If fewer than 4 genuine deals, pad with newest products (labelled differently by frontend)
    const hasRealDeals = realDeals.length >= 4
    const paddedDeals = hasRealDeals
      ? realDeals.slice(0, 12)
      : [
          ...realDeals,
          ...(newRes.data ?? [])
            .filter((p) => !realDeals.find((d) => d.id === p.id))
            .slice(0, Math.max(0, 12 - realDeals.length)),
        ].slice(0, 12)

    const deals = paddedDeals.map(mapProduct)
    const newArrivals = (newRes.data ?? []).slice(0, 8).map(mapProduct)

    // Fisher-Yates shuffle for popular picks
    const shuffled = [...(popularRes.data ?? [])]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    const popular = shuffled.slice(0, 12).map(mapProduct)

    // Build category list from distinct category text values, sorted by frequency
    const catCounts: Record<string, number> = {}
    for (const row of categoriesRes.data ?? []) {
      if (row.category) catCounts[row.category] = (catCounts[row.category] ?? 0) + 1
    }
    const categories = Object.entries(catCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 12)
      .map(([name, count]) => ({ name, slug: slugify(name), count }))

    return NextResponse.json(
      { success: true, hasRealDeals, categories, deals, newArrivals, popular },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } },
    )
  } catch (err: any) {
    console.error('[storefront/home]', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
