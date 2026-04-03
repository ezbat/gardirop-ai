import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/stores — Public store directory
 *
 * Returns active seller stores with storefront settings, product counts,
 * and follower counts. Used by the homepage StoreGrid.
 *
 * Query params:
 *   limit  = number (default 12, max 24)
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const limit = Math.min(24, Math.max(1, parseInt(url.searchParams.get('limit') || '12')))

  try {
    // Fetch active sellers ordered by followers, then created_at
    const { data: sellers, error } = await supabaseAdmin
      .from('sellers')
      .select(`
        id, user_id, shop_name, shop_slug, logo_url, banner_url,
        description, category, follower_count, is_verified, status, created_at
      `)
      .in('status', ['active', 'approved'])
      .order('follower_count', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[stores] DB error:', error.message)
      return NextResponse.json({ success: true, stores: [] })
    }

    if (!sellers || sellers.length === 0) {
      return NextResponse.json({ success: true, stores: [] })
    }

    // Batch-fetch storefront settings
    const sellerIds = sellers.map((s) => s.id)
    const { data: settings } = await supabaseAdmin
      .from('storefront_settings')
      .select('seller_id, accent_color, theme_preset, banner_url, headline')
      .in('seller_id', sellerIds)

    const settingsMap: Record<string, any> = {}
    for (const s of settings || []) {
      settingsMap[s.seller_id] = s
    }

    // Batch-fetch product counts per seller
    const countPromises = sellers.map(async (s) => {
      const { count } = await supabaseAdmin
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', s.id)
        .eq('status', 'active')
        .eq('moderation_status', 'approved')
      return { sellerId: s.id, count: count || 0 }
    })
    const counts = await Promise.all(countPromises)
    const countMap: Record<string, number> = {}
    for (const c of counts) countMap[c.sellerId] = c.count

    // Build response
    const stores = sellers.map((s) => {
      const sf = settingsMap[s.id]
      return {
        id: s.id,
        shop_name: s.shop_name || 'Store',
        shop_slug: s.shop_slug,
        logo_url: s.logo_url,
        banner_url: sf?.banner_url || s.banner_url || null,
        description: s.description || null,
        category: s.category || null,
        follower_count: s.follower_count || 0,
        product_count: countMap[s.id] || 0,
        is_verified: s.is_verified || false,
        accent_color: sf?.accent_color || '#D97706',
      }
    })

    return NextResponse.json({ success: true, stores })
  } catch (err: any) {
    console.error('[stores] error:', err?.message)
    return NextResponse.json({ success: true, stores: [] })
  }
}
