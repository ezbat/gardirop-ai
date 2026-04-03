import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/storefront/featured-sellers
 * Returns top sellers ordered by follower_count + product count.
 * Public endpoint (no auth required).
 */
export async function GET() {
  try {
    const { data: sellers, error } = await supabaseAdmin
      .from('sellers')
      .select('id, shop_name, logo_url, is_verified, follower_count, post_count, status')
      .in('status', ['active', 'approved'])
      .order('follower_count', { ascending: false })
      .limit(12)

    if (error) {
      console.error('[featured-sellers] DB error:', error.message)
      return NextResponse.json({ success: true, sellers: [] })
    }

    // Enrich with product count
    const enriched = await Promise.all(
      (sellers || []).map(async (s) => {
        const { count } = await supabaseAdmin
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('seller_id', s.id)
          .eq('status', 'active')

        return {
          id: s.id,
          shop_name: s.shop_name,
          logo_url: s.logo_url,
          is_verified: s.is_verified || false,
          follower_count: s.follower_count || 0,
          post_count: s.post_count || 0,
          product_count: count || 0,
        }
      }),
    )

    return NextResponse.json({ success: true, sellers: enriched })
  } catch (err: any) {
    console.error('[featured-sellers] error:', err?.message)
    return NextResponse.json({ success: true, sellers: [] })
  }
}
