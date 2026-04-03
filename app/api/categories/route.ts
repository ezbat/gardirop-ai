import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

/**
 * GET /api/categories
 *
 * Returns all categories derived from approved active products.
 * Categories are free-text on products.category — we aggregate them
 * and return slug + name + productCount.
 *
 * Cached 60s, stale-while-revalidate 120s.
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

export async function GET() {
  try {
    const { data: rows, error } = await supabaseAdmin
      .from('products')
      .select('category')
      .eq('moderation_status', 'approved')
      .eq('status', 'active')
      .gt('stock_quantity', 0)
      .not('category', 'is', null)

    if (error) {
      console.error('[api/categories] DB error:', error.message)
      return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 })
    }

    // Aggregate categories by count
    const counts = new Map<string, number>()
    for (const row of rows ?? []) {
      const cat = (row.category as string)?.trim()
      if (!cat) continue
      counts.set(cat, (counts.get(cat) ?? 0) + 1)
    }

    // Sort by product count descending, then alphabetically
    const categories = Array.from(counts.entries())
      .map(([name, productCount]) => ({
        slug: slugify(name),
        name,
        productCount,
      }))
      .sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name))

    return NextResponse.json(
      { success: true, categories },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      },
    )
  } catch (err) {
    console.error('[api/categories] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
