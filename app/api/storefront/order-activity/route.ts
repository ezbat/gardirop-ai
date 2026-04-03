import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/storefront/order-activity
 * Returns platform-wide order metrics for the cargo scene.
 * Public endpoint — no auth required.
 */
export async function GET() {
  try {
    // Total orders platform-wide
    const { count: totalOrders } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })

    // Orders in the last hour (for activity rate)
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString()
    const { count: recentCount } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneHourAgo)

    return NextResponse.json({
      success: true,
      totalOrders: totalOrders ?? 0,
      recentOrdersPerHour: recentCount ?? 0,
    })
  } catch (err: any) {
    console.error('[order-activity] error:', err?.message)
    // Graceful fallback — scene still works with visual defaults
    return NextResponse.json({
      success: true,
      totalOrders: 0,
      recentOrdersPerHour: 0,
    })
  }
}
