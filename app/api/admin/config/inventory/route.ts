/**
 * GET  /api/admin/config/inventory
 * POST /api/admin/config/inventory
 *
 * Manage the three-level inventory threshold system:
 *   global default → category overrides → product overrides
 *
 * Auth: x-admin-token header (timing-safe compare against ADMIN_TOKEN env var).
 *
 * GET response:
 * {
 *   globalThreshold: number,
 *   categoryConfigs: [{ id, category_slug, low_stock_threshold, updated_at }],
 *   productOverrides: {
 *     items: [{ id, title, category, stock_quantity, low_stock_threshold }],
 *     total: number, page: number, limit: number
 *   },
 *   stats: { categoryCount: number, productCount: number }
 * }
 *
 * POST body (action-based):
 *   { action: 'set_global',    threshold: number }
 *   { action: 'set_category',  category_slug: string, threshold: number }
 *   { action: 'clear_category', category_slug: string }
 *   { action: 'set_product',   product_id: string, threshold: number }
 *   { action: 'clear_product', product_id: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const page    = Math.max(1, parseInt(searchParams.get('page')  || '1'))
  const limit   = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
  const search  = searchParams.get('search') || ''
  const offset  = (page - 1) * limit

  // Run all queries in parallel
  const [globalRes, categoryRes, productOverrideCountRes, productOverrideRes] = await Promise.all([
    // Global threshold
    supabaseAdmin
      .from('global_config')
      .select('value')
      .eq('key', 'inventory.default_low_stock_threshold')
      .maybeSingle(),

    // All category configs
    supabaseAdmin
      .from('category_stock_configs')
      .select('id, category_slug, low_stock_threshold, updated_at')
      .order('category_slug', { ascending: true }),

    // Count of products with threshold override
    supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .not('low_stock_threshold', 'is', null),

    // Product overrides (paginated)
    (() => {
      let q = supabaseAdmin
        .from('products')
        .select('id, title, category, stock_quantity, low_stock_threshold')
        .not('low_stock_threshold', 'is', null)
        .order('title', { ascending: true })
        .range(offset, offset + limit - 1)
      if (search) {
        q = q.ilike('title', `%${search}%`)
      }
      return q
    })(),
  ])

  // Extract global threshold
  let globalThreshold = 5
  if (!globalRes.error && globalRes.data) {
    const val = (globalRes.data.value as Record<string, unknown>)?.threshold
    if (typeof val === 'number' && val >= 0) globalThreshold = val
  }

  const categoryConfigs = globalRes.error?.code === '42P01' ? [] : (categoryRes.data ?? [])
  const productOverrides = productOverrideRes.data ?? []
  const productTotal     = productOverrideCountRes.count ?? 0
  const categoryCount    = categoryConfigs.length
  const productCount     = productTotal

  return NextResponse.json({
    success: true,
    globalThreshold,
    categoryConfigs,
    productOverrides: {
      items: productOverrides,
      total: productTotal,
      page,
      limit,
    },
    stats: { categoryCount, productCount },
  })
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { action } = body

  switch (action) {
    // ── set_global ────────────────────────────────────────────────────────────
    case 'set_global': {
      const threshold = body.threshold
      if (typeof threshold !== 'number' || threshold < 0 || !Number.isInteger(threshold)) {
        return NextResponse.json(
          { success: false, error: 'threshold must be a non-negative integer' },
          { status: 400 },
        )
      }

      const { error } = await supabaseAdmin
        .from('global_config')
        .upsert(
          {
            key:        'inventory.default_low_stock_threshold',
            value:      { threshold },
            description: 'Default low-stock alert threshold (units). Applied to all products unless overridden at category or product level.',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' },
        )

      if (error) {
        console.error('[admin/config/inventory] set_global:', error.message)
        return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 })
      }

      return NextResponse.json({ success: true, globalThreshold: threshold })
    }

    // ── set_category ──────────────────────────────────────────────────────────
    case 'set_category': {
      const { category_slug, threshold } = body
      if (!category_slug || typeof category_slug !== 'string' || !category_slug.trim()) {
        return NextResponse.json({ success: false, error: 'category_slug required' }, { status: 400 })
      }
      if (typeof threshold !== 'number' || threshold < 0 || !Number.isInteger(threshold)) {
        return NextResponse.json(
          { success: false, error: 'threshold must be a non-negative integer' },
          { status: 400 },
        )
      }

      const { data, error } = await supabaseAdmin
        .from('category_stock_configs')
        .upsert(
          {
            category_slug:       category_slug.trim(),
            low_stock_threshold: threshold,
            updated_at:          new Date().toISOString(),
          },
          { onConflict: 'category_slug' },
        )
        .select('id, category_slug, low_stock_threshold, updated_at')
        .maybeSingle()

      if (error) {
        console.error('[admin/config/inventory] set_category:', error.message)
        return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 })
      }

      return NextResponse.json({ success: true, categoryConfig: data })
    }

    // ── clear_category ────────────────────────────────────────────────────────
    case 'clear_category': {
      const { category_slug } = body
      if (!category_slug || typeof category_slug !== 'string') {
        return NextResponse.json({ success: false, error: 'category_slug required' }, { status: 400 })
      }

      const { error } = await supabaseAdmin
        .from('category_stock_configs')
        .delete()
        .eq('category_slug', category_slug)

      if (error) {
        console.error('[admin/config/inventory] clear_category:', error.message)
        return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    // ── set_product ───────────────────────────────────────────────────────────
    case 'set_product': {
      const { product_id, threshold } = body
      if (!product_id || typeof product_id !== 'string') {
        return NextResponse.json({ success: false, error: 'product_id required' }, { status: 400 })
      }
      if (typeof threshold !== 'number' || threshold < 0 || !Number.isInteger(threshold)) {
        return NextResponse.json(
          { success: false, error: 'threshold must be a non-negative integer' },
          { status: 400 },
        )
      }

      const { error } = await supabaseAdmin
        .from('products')
        .update({ low_stock_threshold: threshold })
        .eq('id', product_id)

      if (error) {
        console.error('[admin/config/inventory] set_product:', error.message)
        return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    // ── clear_product ─────────────────────────────────────────────────────────
    case 'clear_product': {
      const { product_id } = body
      if (!product_id || typeof product_id !== 'string') {
        return NextResponse.json({ success: false, error: 'product_id required' }, { status: 400 })
      }

      const { error } = await supabaseAdmin
        .from('products')
        .update({ low_stock_threshold: null })
        .eq('id', product_id)

      if (error) {
        console.error('[admin/config/inventory] clear_product:', error.message)
        return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    default:
      return NextResponse.json(
        { success: false, error: `Unknown action: ${action}` },
        { status: 400 },
      )
  }
}
