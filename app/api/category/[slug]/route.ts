import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

/**
 * GET /api/category/[slug]
 *
 * Returns products for a given category slug with filtering, sorting, and pagination.
 * Also returns available filter values (brands, price range) for the sidebar.
 *
 * Query params:
 *   sort      — newest | price_asc | price_desc | relevance (default)
 *   minPrice  — minimum price filter
 *   maxPrice  — maximum price filter
 *   brand     — brand filter (comma-separated for multiple)
 *   inStock   — '1' to only show in-stock items (default: all shown, out-of-stock last)
 *   page      — page number (1-based, default 1)
 *   limit     — items per page (default 24, max 48)
 */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const sp = request.nextUrl.searchParams

    const sort     = sp.get('sort') ?? 'relevance'
    const minPrice = sp.get('minPrice') ? Number(sp.get('minPrice')) : null
    const maxPrice = sp.get('maxPrice') ? Number(sp.get('maxPrice')) : null
    const brands   = sp.get('brand')?.split(',').filter(Boolean) ?? []
    const inStock  = sp.get('inStock') === '1'
    const page     = Math.max(1, Number(sp.get('page') ?? '1'))
    const limit    = Math.min(48, Math.max(1, Number(sp.get('limit') ?? '24')))

    // ── Step 1: Find the real category name from slug ──────────────────────
    // Since categories are free-text, we need to find all distinct categories,
    // slugify them, and match against the URL slug.
    const { data: catRows, error: catErr } = await supabaseAdmin
      .from('products')
      .select('category')
      .eq('moderation_status', 'approved')
      .eq('status', 'active')
      .not('category', 'is', null)

    if (catErr) {
      console.error('[api/category/slug] categories lookup:', catErr.message)
      return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 })
    }

    // Build slug→name mapping
    const nameMap = new Map<string, string>()
    for (const row of catRows ?? []) {
      const cat = (row.category as string)?.trim()
      if (!cat) continue
      nameMap.set(slugify(cat), cat)
    }

    const categoryName = nameMap.get(slug)
    if (!categoryName) {
      return NextResponse.json(
        { success: false, error: 'Kategorie nicht gefunden' },
        { status: 404 },
      )
    }

    // ── Step 2: Fetch ALL products in this category (for filter metadata) ───
    const { data: allProducts, error: allErr } = await supabaseAdmin
      .from('products')
      .select('id, title, price, original_price, images, stock_quantity, category, brand, created_at')
      .eq('moderation_status', 'approved')
      .eq('status', 'active')
      .eq('category', categoryName)

    if (allErr) {
      console.error('[api/category/slug] products fetch:', allErr.message)
      return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 })
    }

    const all = allProducts ?? []

    // ── Step 3: Compute filter metadata ────────────────────────────────────
    const brandCounts = new Map<string, number>()
    let priceMin = Infinity
    let priceMax = -Infinity

    for (const p of all) {
      const pr = Number(p.price ?? 0)
      if (pr < priceMin) priceMin = pr
      if (pr > priceMax) priceMax = pr

      const b = (p.brand as string)?.trim()
      if (b) brandCounts.set(b, (brandCounts.get(b) ?? 0) + 1)
    }

    const availableBrands = Array.from(brandCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    // ── Step 4: Apply filters ──────────────────────────────────────────────
    let filtered = [...all]

    if (inStock) {
      filtered = filtered.filter(p => Number(p.stock_quantity ?? 0) > 0)
    }

    if (minPrice != null) {
      filtered = filtered.filter(p => Number(p.price ?? 0) >= minPrice)
    }
    if (maxPrice != null) {
      filtered = filtered.filter(p => Number(p.price ?? 0) <= maxPrice)
    }

    if (brands.length > 0) {
      const lower = new Set(brands.map(b => b.toLowerCase()))
      filtered = filtered.filter(p => {
        const b = (p.brand as string)?.trim().toLowerCase()
        return b && lower.has(b)
      })
    }

    // ── Step 5: Sort ───────────────────────────────────────────────────────
    switch (sort) {
      case 'newest':
        filtered.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
        break
      case 'price_asc':
        filtered.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0))
        break
      case 'price_desc':
        filtered.sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0))
        break
      default:
        // Relevance: in-stock first, then newest
        filtered.sort((a, b) => {
          const aStock = Number(a.stock_quantity ?? 0) > 0 ? 0 : 1
          const bStock = Number(b.stock_quantity ?? 0) > 0 ? 0 : 1
          if (aStock !== bStock) return aStock - bStock
          return (b.created_at ?? '').localeCompare(a.created_at ?? '')
        })
    }

    // ── Step 6: Paginate ───────────────────────────────────────────────────
    const total  = filtered.length
    const offset = (page - 1) * limit
    const paged  = filtered.slice(offset, offset + limit)

    // ── Step 7: Map to DTO ─────────────────────────────────────────────────
    const products = paged.map(p => {
      const price     = Number(p.price ?? 0)
      const compareAt = p.original_price ? Number(p.original_price) : null
      const discount  = compareAt && compareAt > price
        ? Math.round((1 - price / compareAt) * 100)
        : undefined

      return {
        id:              p.id,
        title:           p.title ?? '',
        price,
        currency:        'EUR',
        images:          Array.isArray(p.images) ? (p.images as string[]) : [],
        discountPercent: discount,
        compareAtPrice:  compareAt ?? undefined,
        inventory:       p.stock_quantity != null ? Number(p.stock_quantity) : undefined,
        category:        p.category ?? undefined,
        categorySlug:    slug,
        brand:           (p.brand as string) ?? undefined,
        isNew:           isNewProduct(p.created_at),
      }
    })

    return NextResponse.json(
      {
        success:  true,
        category: { slug, name: categoryName },
        filters: {
          availableBrands,
          priceMin: priceMin === Infinity ? 0 : Math.floor(priceMin),
          priceMax: priceMax === -Infinity ? 0 : Math.ceil(priceMax),
        },
        products,
        total,
        page,
        pageSize: limit,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      },
    )
  } catch (err) {
    console.error('[api/category/slug] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

function isNewProduct(createdAt: string | null): boolean {
  if (!createdAt) return false
  const diff = Date.now() - new Date(createdAt).getTime()
  return diff < 7 * 24 * 60 * 60 * 1000 // 7 days
}
