import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(text: string): string {
  return normalize(text).replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

/** Simple Levenshtein for short words only (≤8 chars). Returns 99 for longer. */
function levenshtein(a: string, b: string): number {
  if (a.length > 8 || b.length > 8) return 99
  const m = a.length,
    n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
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

/**
 * Build phrase suggestions from candidate product titles.
 * Supports typo-tolerance via per-word Levenshtein (1 edit for short words).
 */
function buildSuggestions(
  titles: string[],
  normalizedQ: string,
  max = 8,
): Array<{ text: string; reason: string }> {
  const qWords = normalizedQ.split(' ').filter(Boolean)
  const seen = new Set<string>()
  const result: Array<{ text: string; reason: string }> = []

  for (const title of titles) {
    if (result.length >= max) break
    const normTitle = normalize(title)

    // Check if all query words appear (with 1-edit tolerance per short word)
    const matches = qWords.every((qw) => {
      if (normTitle.includes(qw)) return true
      return normTitle.split(' ').some((tw) => tw.length >= 3 && levenshtein(qw, tw) <= 1)
    })
    if (!matches) continue

    const key = normTitle.slice(0, 50)
    if (!seen.has(key)) {
      seen.add(key)
      result.push({ text: title, reason: 'product' })
    }
  }

  // Also add shorter phrase prefixes (e.g., "Air Force 1" → "Air Force")
  if (result.length < max) {
    for (const title of titles) {
      if (result.length >= max) break
      const words = title.split(' ')
      for (let len = 2; len <= Math.min(words.length - 1, 4); len++) {
        const phrase = words.slice(0, len).join(' ')
        const normPhrase = normalize(phrase)
        const prefixMatches = qWords.every(
          (qw) => normPhrase.includes(qw) || normPhrase.split(' ').some((tw) => tw.length >= 3 && levenshtein(qw, tw) <= 1),
        )
        if (!prefixMatches) continue
        const key = normPhrase.slice(0, 50)
        if (!seen.has(key)) {
          seen.add(key)
          result.push({ text: phrase, reason: 'phrase' })
          break
        }
      }
    }
  }

  return result.slice(0, max)
}

// ─── Route ───────────────────────────────────────────────────────────────────

/**
 * GET /api/storefront/search?q=...&limit=6&sort=relevance|new|price_asc|price_desc
 *
 * Returns typeahead data: suggestions, categories, products, preview.
 * Designed for <200ms response time.
 *
 * Empty q → return top categories + trending products.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '6'), 12)
  const sort = searchParams.get('sort') ?? 'relevance'
  const normalizedQ = normalize(q)

  // ── Empty query: top categories + trending ──────────────────────────────
  if (!normalizedQ) {
    const [productsRes, categoriesRes] = await Promise.all([
      supabaseAdmin
        .from('products')
        .select('id, title, price, original_price, images, stock_quantity, category')
        .eq('moderation_status', 'approved')
        .gt('stock_quantity', 0)
        .order('created_at', { ascending: false })
        .limit(6),
      supabaseAdmin
        .from('products')
        .select('category')
        .eq('moderation_status', 'approved')
        .not('category', 'is', null)
        .limit(100),
    ])

    const products = (productsRes.data ?? []).map(mapProduct)

    const catCounts: Record<string, number> = {}
    for (const row of categoriesRes.data ?? []) {
      if (row.category) catCounts[row.category] = (catCounts[row.category] ?? 0) + 1
    }
    const categories = Object.entries(catCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name]) => ({ name, slug: slugify(name) }))

    return NextResponse.json(
      { success: true, q, normalizedQ, suggestions: [], categories, products, preview: products[0] ?? null },
      { headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' } },
    )
  }

  // ── Main search ──────────────────────────────────────────────────────────
  const mainPattern = `%${normalizedQ}%`
  const firstWord = normalizedQ.split(' ')[0]
  const wordPattern = `%${firstWord}%`

  // Sort order
  const orderCol = sort === 'new' ? 'created_at' : sort === 'price_asc' || sort === 'price_desc' ? 'price' : 'created_at'
  const ascending = sort === 'price_asc'

  const [exactRes, catRes] = await Promise.all([
    // Products matching title or category
    supabaseAdmin
      .from('products')
      .select('id, title, price, original_price, images, stock_quantity, category')
      .eq('moderation_status', 'approved')
      .gt('stock_quantity', 0)
      .or(`title.ilike.${mainPattern},category.ilike.${mainPattern}`)
      .order(orderCol, { ascending })
      .limit(50),

    // Category-level matches for the category column
    supabaseAdmin
      .from('products')
      .select('category')
      .eq('moderation_status', 'approved')
      .ilike('category', mainPattern)
      .limit(20),
  ])

  let candidates = exactRes.data ?? []

  // Fuzzy fallback: if < 3 results, broaden to first-word match
  if (candidates.length < 3) {
    const { data: fallback } = await supabaseAdmin
      .from('products')
      .select('id, title, price, original_price, images, stock_quantity, category')
      .eq('moderation_status', 'approved')
      .gt('stock_quantity', 0)
      .ilike('title', wordPattern)
      .order(orderCol, { ascending })
      .limit(30)

    const existingIds = new Set(candidates.map((p) => p.id))
    for (const p of fallback ?? []) {
      if (!existingIds.has(p.id)) candidates.push(p)
    }
  }

  // Build unique categories from catRes
  const catCounts: Record<string, number> = {}
  for (const row of catRes.data ?? []) {
    if (row.category) catCounts[row.category] = (catCounts[row.category] ?? 0) + 1
  }
  const categories = Object.entries(catCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name]) => ({ name, slug: slugify(name) }))

  const products = candidates.slice(0, limit).map(mapProduct)

  // Suggestions from candidate titles + category names
  const titles = candidates.map((p) => p.title).filter(Boolean)
  const suggestions = buildSuggestions(titles, normalizedQ, 8)

  // Inject category names as suggestions if they match
  for (const cat of categories) {
    if (suggestions.length >= 8) break
    const normCat = normalize(cat.name)
    if (
      normCat.includes(normalizedQ) ||
      normalizedQ.split(' ').every((w) => normCat.includes(w))
    ) {
      if (!suggestions.find((s) => normalize(s.text) === normCat)) {
        suggestions.push({ text: cat.name, reason: 'category' })
      }
    }
  }

  const preview = products[0] ?? null

  return NextResponse.json(
    {
      success: true,
      q,
      normalizedQ,
      suggestions: suggestions.slice(0, 8),
      categories,
      products,
      preview,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20' } },
  )
}
