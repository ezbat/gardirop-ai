import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  getSellerRevenue,
  getDailyRevenue,
  getTopProductsByRevenue,
  getTodayMetrics,
  getOrderStatusBreakdown,
  getPeriodComparison,
} from '@/lib/financial-engine'

/**
 * GET /api/seller/analytics
 *
 * Enhanced analytics endpoint using the Real Financial Engine.
 * All revenue/sales data from actual database aggregation.
 * NO hardcoded values.
 *
 * Query params:
 *   - period: '7' | '30' | '90' (days, default 7)
 */
export async function GET(request: NextRequest) {
  try {
    // Support both auth methods: NextAuth session and x-user-id header
    let userId: string | null = null

    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      userId = session.user.id
    } else {
      userId = request.headers.get('x-user-id')
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = parseInt(searchParams.get('period') || '7')

    // Get seller info with commission rate
    const { data: seller } = await supabaseAdmin
      .from('sellers')
      .select('id, commission_rate')
      .eq('user_id', userId)
      .single()

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    const sellerId = seller.id
    const commissionRate = parseFloat(seller.commission_rate || '15')

    // Date range
    const endDate = new Date().toISOString()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - period)

    // Fetch all analytics data in parallel from real sources
    const [
      productCounts,
      activeCounts,
      pendingCounts,
      products,
      outfitCounts,
      revenueData,
      dailyStats,
      topProducts,
      todayMetrics,
      orderStatus,
      periodComparison,
      recentOrdersResult,
    ] = await Promise.all([
      // Product counts
      supabaseAdmin
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerId),
      supabaseAdmin
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerId)
        .eq('moderation_status', 'approved'),
      supabaseAdmin
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerId)
        .eq('moderation_status', 'pending'),
      // All products (for low stock)
      supabaseAdmin
        .from('products')
        .select('id, title, stock_quantity, price, low_stock_threshold, sku, images')
        .eq('seller_id', sellerId),
      // Outfit count
      supabaseAdmin
        .from('outfits')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerId),
      // Real revenue from financial engine
      getSellerRevenue(sellerId, startDate.toISOString(), endDate),
      // Daily breakdown from financial engine
      getDailyRevenue(sellerId, period, commissionRate),
      // Top products from financial engine (real order_items aggregation)
      getTopProductsByRevenue(sellerId, 5, startDate.toISOString(), endDate),
      // Today's metrics from financial engine
      getTodayMetrics(sellerId, commissionRate),
      // Order status breakdown
      getOrderStatusBreakdown(sellerId),
      // Period comparison
      getPeriodComparison(sellerId, period),
      // Recent orders (raw, for display)
      supabaseAdmin
        .from('orders')
        .select(`
          id, total_amount, status, payment_status, created_at,
          platform_fee, seller_earnings, tax_amount,
          users(email, full_name, name)
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    // Low stock products (using real threshold from DB)
    const lowStockProducts = (products.data || [])
      .filter((p: any) => {
        const threshold = p.low_stock_threshold || 5
        return p.stock_quantity <= threshold
      })
      .sort((a: any, b: any) => a.stock_quantity - b.stock_quantity)
      .slice(0, 5)
      .map((p: any) => ({
        id: p.id,
        title: p.title,
        stock_quantity: p.stock_quantity,
        low_stock_threshold: p.low_stock_threshold || 5,
        price: p.price,
        sku: p.sku,
        image: p.images?.[0] || null,
      }))

    // Format daily stats for chart display
    const formattedDailyStats = dailyStats.map(d => ({
      date: new Date(d.date).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' }),
      fullDate: d.date,
      revenue: d.revenue,
      orders: d.orders,
      platformFees: d.platformFees,
      sellerEarnings: d.sellerEarnings,
    }))

    // Format recent orders
    const formattedRecentOrders = (recentOrdersResult.data || []).map((order: any) => ({
      id: order.id,
      totalAmount: parseFloat(order.total_amount || '0'),
      platformFee: parseFloat(order.platform_fee || '0'),
      sellerEarnings: parseFloat(order.seller_earnings || '0'),
      taxAmount: parseFloat(order.tax_amount || '0'),
      status: order.status,
      paymentStatus: order.payment_status,
      createdAt: order.created_at,
      customerName: order.users?.full_name || order.users?.name || order.users?.email || 'Unbekannt',
    }))

    const analytics = {
      summary: {
        totalProducts: productCounts.count || 0,
        activeProducts: activeCounts.count || 0,
        pendingProducts: pendingCounts.count || 0,
        totalOutfits: outfitCounts.count || 0,
        // Real financial data from DB aggregation
        totalRevenue: revenueData.revenue,
        totalOrders: revenueData.orderCount,
        averageOrderValue: revenueData.orderCount > 0
          ? Math.round((revenueData.revenue / revenueData.orderCount) * 100) / 100
          : 0,
        commissionRate,
      },
      today: todayMetrics,
      dailyStats: formattedDailyStats,
      topProducts,
      lowStockProducts,
      recentOrders: formattedRecentOrders,
      orderStatus,
      periodComparison,
      meta: {
        period,
        startDate: startDate.toISOString(),
        endDate,
        generatedAt: new Date().toISOString(),
      },
    }

    return NextResponse.json({ analytics })
  } catch (error: any) {
    console.error('Seller analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}
