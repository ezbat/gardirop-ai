import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchThresholdConfig, resolveThreshold } from '@/lib/inventory-threshold'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fillDays(
  map: Record<string, { revenue: number; orders: number }>,
  from: Date,
  to: Date,
): Array<{ date: string; revenue: number; orders: number }> {
  const result: Array<{ date: string; revenue: number; orders: number }> = []
  const cur = new Date(from)
  cur.setUTCHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setUTCHours(0, 0, 0, 0)
  while (cur <= end) {
    const key = cur.toISOString().slice(0, 10)
    result.push({ date: key, ...(map[key] ?? { revenue: 0, orders: 0 }) })
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return result
}

// ─── Route ───────────────────────────────────────────────────────────────────

/**
 * GET /api/seller/metrics
 *
 * Returns real-data seller KPIs, chart data, balance, recent orders,
 * low-stock products, and analytics (traffic, conversion, best sellers).
 *
 * Query params:
 *   period  – 7 | 30 | 90 (days, default 30)
 *
 * Auth: NextAuth session only (session cookie).
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const period = Math.min(Math.max(parseInt(searchParams.get('period') || '30'), 1), 90)

  const now = new Date()
  const from = new Date(now)
  from.setDate(from.getDate() - period + 1)
  from.setUTCHours(0, 0, 0, 0)

  const todayStart = new Date(now)
  todayStart.setUTCHours(0, 0, 0, 0)

  // 14-day window for forecast
  const from14 = new Date(now)
  from14.setDate(from14.getDate() - 13)
  from14.setUTCHours(0, 0, 0, 0)

  // ── 1. Resolve seller ──────────────────────────────────────────────────────
  const { data: seller, error: sellerErr } = await supabaseAdmin
    .from('sellers')
    .select('id, shop_name, commission_rate')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (sellerErr) {
    console.error('[seller/metrics] seller lookup:', sellerErr.message)
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 })
  }
  if (!seller) {
    return NextResponse.json({ success: false, error: 'Seller not found' }, { status: 404 })
  }

  const sellerId = seller.id
  const commissionRate = parseFloat(seller.commission_rate ?? '15')

  // ── 2. Parallel DB fetches ─────────────────────────────────────────────────
  const [
    ordersResult,
    balanceResult,
    productsResult,
    recentOrdersResult,
    orderItemsResult,
    eventsResult,
  ] = await Promise.all([
    // Orders in period range — for KPIs + chart aggregation
    supabaseAdmin
      .from('orders')
      .select('id, total_amount, seller_earnings, state, payment_status, created_at')
      .eq('seller_id', sellerId)
      .gte('created_at', from.toISOString())
      .lte('created_at', now.toISOString())
      .limit(2000),

    // Seller balance record
    supabaseAdmin
      .from('seller_balances')
      .select('available_balance, pending_balance, total_withdrawn, total_sales')
      .eq('seller_id', sellerId)
      .maybeSingle(),

    // All products — for low-stock detection and product counts
    supabaseAdmin
      .from('products')
      .select('id, title, stock_quantity, price, images, moderation_status, low_stock_threshold, category')
      .eq('seller_id', sellerId)
      .order('stock_quantity', { ascending: true })
      .limit(300),

    // Most recent 10 orders (all time) — for the display table
    supabaseAdmin
      .from('orders')
      .select('id, total_amount, seller_earnings, state, payment_status, created_at')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .limit(10),

    // Order items in period — for best sellers aggregation
    supabaseAdmin
      .from('order_items')
      .select('product_id, quantity, price, product_title')
      .eq('seller_id', sellerId)
      .gte('created_at', from.toISOString())
      .limit(5000),

    // Storefront events for this seller in period — graceful if table missing
    supabaseAdmin
      .from('storefront_events')
      .select('event_type, product_id, session_id, created_at')
      .eq('seller_id', sellerId)
      .gte('created_at', from.toISOString())
      .limit(50000),
  ])

  const orders = ordersResult.data ?? []
  const allProducts = productsResult.data ?? []

  // Load threshold config once (parallel with DB queries above, resolved here)
  const thresholdConfig = await fetchThresholdConfig()

  // ── 3. KPI aggregation ────────────────────────────────────────────────────
  const isPaid    = (o: any) => o.payment_status === 'paid'
  const isPending = (o: any) => ['PAYMENT_PENDING', 'CREATED'].includes(o.state)
  const isRefunded = (o: any) => ['REFUNDED', 'CANCELLED'].includes(o.state)

  const paidOrders    = orders.filter(isPaid)
  const pendingOrders = orders.filter(isPending)
  const refundedOrders = orders.filter(isRefunded)

  const todayOrders = orders.filter(o => new Date(o.created_at) >= todayStart)
  const todayPaid   = todayOrders.filter(isPaid)

  const revenue       = paidOrders.reduce((s, o) => s + parseFloat(o.total_amount ?? '0'), 0)
  const sellerEarnings = paidOrders.reduce((s, o) => s + parseFloat(o.seller_earnings ?? '0'), 0)
  const todayRevenue  = todayPaid.reduce((s, o) => s + parseFloat(o.total_amount ?? '0'), 0)
  const avgOrderValue = paidOrders.length > 0 ? revenue / paidOrders.length : 0

  const refundTotal = refundedOrders.reduce((s, o) => s + parseFloat(o.total_amount ?? '0'), 0)

  const stateCounts: Record<string, number> = {}
  for (const o of orders) {
    stateCounts[o.state] = (stateCounts[o.state] ?? 0) + 1
  }

  // ── 4. Chart data (revenue + orders per day) ───────────────────────────────
  const dayMap: Record<string, { revenue: number; orders: number }> = {}
  for (const o of paidOrders) {
    const day = o.created_at.slice(0, 10)
    if (!dayMap[day]) dayMap[day] = { revenue: 0, orders: 0 }
    dayMap[day].revenue += parseFloat(o.total_amount ?? '0')
    dayMap[day].orders  += 1
  }
  const revenueByDay = fillDays(dayMap, from, now)

  // ── 5. Low-stock products — resolved threshold per product ───────────────
  const lowStockProducts = allProducts
    .filter(p => {
      const stock = p.stock_quantity ?? 0
      const thr   = resolveThreshold(thresholdConfig, p as any)
      return stock <= thr
    })
    .slice(0, 10)
    .map(p => {
      const thr = resolveThreshold(thresholdConfig, p as any)
      return {
        id:                  p.id,
        title:               p.title,
        stock_quantity:      p.stock_quantity ?? 0,
        low_stock_threshold: thr,
        price:               parseFloat((p as any).price ?? '0'),
        image:               (p.images as string[])?.[0] ?? null,
      }
    })

  // ── 6. Recent orders for display table ───────────────────────────────────
  const recentOrders = (recentOrdersResult.data ?? []).map((o: any) => ({
    id: o.id,
    totalAmount: parseFloat(o.total_amount ?? '0'),
    sellerEarnings: parseFloat(o.seller_earnings ?? '0'),
    state: o.state,
    paymentStatus: o.payment_status,
    createdAt: o.created_at,
    customerName: 'Kunde',
  }))

  // ── 7. Best sellers (aggregate order_items in JS) ─────────────────────────
  const itemMap: Record<string, { product_id: string; title: string; qty: number; revenue: number }> = {}
  for (const item of (orderItemsResult.data ?? [])) {
    if (!item.product_id) continue
    if (!itemMap[item.product_id]) {
      itemMap[item.product_id] = {
        product_id: item.product_id,
        title:      (item as any).product_title ?? 'Produkt',
        qty:        0,
        revenue:    0,
      }
    }
    itemMap[item.product_id].qty     += Number(item.quantity ?? 1)
    itemMap[item.product_id].revenue += parseFloat(String(item.price ?? '0')) * Number(item.quantity ?? 1)
  }
  const bestSellers = Object.values(itemMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map(s => ({
      productId: s.product_id,
      title:     s.title,
      qty:       s.qty,
      revenue:   Math.round(s.revenue * 100) / 100,
    }))

  // ── 8. Analytics from storefront_events ────────────────────────────────────
  let analytics: {
    productViews:    number
    addToCarts:      number
    checkouts:       number
    conversionRate:  number | null
    addToCartRate:   number | null
    uniqueSessions:  number
    refundTotal:     number
    forecastRevenue: number | null
  } | null = null

  const eventsError = eventsResult.error as { code?: string } | null
  // If table doesn't exist yet (42P01), analytics stays null gracefully
  if (!eventsError || eventsError.code !== '42P01') {
    if (!eventsError) {
      const events = eventsResult.data ?? []

      const productViews   = events.filter(e => e.event_type === 'product_view').length
      const addToCarts     = events.filter(e => e.event_type === 'add_to_cart').length
      const checkoutEvents = events.filter(e => e.event_type === 'begin_checkout').length
      const uniqueSessions = new Set(events.map(e => e.session_id).filter(Boolean)).size

      const conversionRate = checkoutEvents > 0
        ? Math.round((paidOrders.length / checkoutEvents) * 1000) / 10  // %
        : null

      const addToCartRate = productViews > 0
        ? Math.round((addToCarts / productViews) * 1000) / 10
        : null

      // Forecast: avg daily revenue over last 14 days × 7
      const last14Orders = orders.filter(
        o => isPaid(o) && new Date(o.created_at) >= from14
      )
      const last14Revenue = last14Orders.reduce((s, o) => s + parseFloat(o.total_amount ?? '0'), 0)
      const forecastRevenue = Math.round((last14Revenue / 14) * 7 * 100) / 100

      analytics = {
        productViews,
        addToCarts,
        checkouts:       checkoutEvents,
        conversionRate,
        addToCartRate,
        uniqueSessions,
        refundTotal:     Math.round(refundTotal * 100) / 100,
        forecastRevenue,
      }
    }
  }

  // Fall back: still calculate refundTotal + forecast even without events table
  if (!analytics) {
    const last14Orders = orders.filter(
      o => isPaid(o) && new Date(o.created_at) >= from14
    )
    const last14Revenue = last14Orders.reduce((s, o) => s + parseFloat(o.total_amount ?? '0'), 0)
    analytics = {
      productViews:    0,
      addToCarts:      0,
      checkouts:       0,
      conversionRate:  null,
      addToCartRate:   null,
      uniqueSessions:  0,
      refundTotal:     Math.round(refundTotal * 100) / 100,
      forecastRevenue: Math.round((last14Revenue / 14) * 7 * 100) / 100,
    }
  }

  const bal = balanceResult.data

  return NextResponse.json({
    success: true,
    seller: {
      id: seller.id,
      shopName: seller.shop_name,
      commissionRate,
      score: null,
    },
    period,
    kpis: {
      revenue:         Math.round(revenue * 100) / 100,
      sellerEarnings:  Math.round(sellerEarnings * 100) / 100,
      paidOrders:      paidOrders.length,
      pendingOrders:   pendingOrders.length,
      refundedOrders:  refundedOrders.length,
      avgOrderValue:   Math.round(avgOrderValue * 100) / 100,
      todayRevenue:    Math.round(todayRevenue * 100) / 100,
      todayOrders:     todayPaid.length,
      stateCounts,
      totalProducts:   allProducts.length,
      activeProducts:  allProducts.filter(p => p.moderation_status === 'approved').length,
      lowStockCount:   lowStockProducts.length,
    },
    balance: {
      available:      parseFloat(bal?.available_balance ?? '0'),
      pending:        parseFloat(bal?.pending_balance   ?? '0'),
      totalWithdrawn: parseFloat(bal?.total_withdrawn   ?? '0'),
      totalSales:     parseFloat(bal?.total_sales       ?? '0'),
    },
    charts: {
      revenueByDay,
    },
    recent: {
      orders: recentOrders,
      lowStockProducts,
    },
    analytics,
    bestSellers,
  })
}
