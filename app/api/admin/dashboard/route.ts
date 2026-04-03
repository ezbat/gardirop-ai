/**
 * GET /api/admin/dashboard
 *
 * Comprehensive global dashboard data for the admin panel.
 * All queries run in parallel via Promise.all for performance.
 *
 * Auth: x-admin-token header — timing-safe compare against ADMIN_TOKEN env var.
 *
 * Response shape:
 * {
 *   success: true,
 *   kpis: { totalRevenue, monthRevenue, totalOrders, monthOrders, paidOrders,
 *           refundedOrders, refundRate, avgOrderValue, totalSellers,
 *           approvedProducts, pendingModeration, pendingPayouts,
 *           failedPayouts, pendingApplications, stuckOrders },
 *   charts: { revenueByDay, ordersByDay },   // last 30 days, every day filled
 *   topProducts: [{ productId, title, revenue, unitsSold }],  // top 5 by revenue
 *   recentOrders: [...],   // last 10 orders
 *   alerts: [{ type, severity, message, count, href }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'
import { fetchThresholdConfig, resolveThreshold } from '@/lib/inventory-threshold'

// ─── Date helpers ─────────────────────────────────────────────────────────────
function toUTCDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function dayKey(iso: string): string {
  return iso.slice(0, 10)
}

/**
 * Fill every calendar day in [fromDate, toDate] with a value,
 * defaulting to 0 for days not present in `data`.
 */
function fillDays(
  data: { date: string; value: number }[],
  fromDate: Date,
  toDate: Date,
): { date: string; value: number }[] {
  const map    = new Map(data.map(d => [d.date, d.value]))
  const result: { date: string; value: number }[] = []
  const cur    = new Date(fromDate)
  cur.setUTCHours(0, 0, 0, 0)
  const end = new Date(toDate)
  end.setUTCHours(23, 59, 59, 999)

  while (cur <= end) {
    const date = toUTCDateStr(cur)
    result.push({ date, value: map.get(date) ?? 0 })
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return result
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const now = new Date()

  // 30-day window for charts & month KPIs
  const from30 = new Date(now)
  from30.setUTCDate(from30.getUTCDate() - 29)
  from30.setUTCHours(0, 0, 0, 0)
  const to30 = new Date(now)
  to30.setUTCHours(23, 59, 59, 999)
  const from30ISO = from30.toISOString()
  const to30ISO   = to30.toISOString()

  // Stuck orders: CREATED / PAYMENT_PENDING for > 24 h
  const stuck24hISO = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  // ── Phase 1: fully parallel ────────────────────────────────────────────────
  const [
    allOrdersRes,
    chartOrdersRes,
    recentOrdersRes,
    sellersCountRes,
    approvedProductsCountRes,
    pendingModerationCountRes,
    pendingPayoutsCountRes,
    failedPayoutsCountRes,
    pendingApplicationsCountRes,
    orderItemsRes,
    lowStockProductsRes,
    stuckOrdersCountRes,
  ] = await Promise.all([

    // All orders (capped 5 000) — all-time KPIs
    supabaseAdmin
      .from('orders')
      .select('id, state, payment_status, total_amount')
      .order('created_at', { ascending: false })
      .limit(5000),

    // Last 30 days orders — chart data
    supabaseAdmin
      .from('orders')
      .select('id, state, payment_status, total_amount, created_at')
      .gte('created_at', from30ISO)
      .lte('created_at', to30ISO)
      .order('created_at', { ascending: true })
      .limit(2000),

    // Recent 10 orders — table
    supabaseAdmin
      .from('orders')
      .select('id, state, payment_status, total_amount, currency, created_at')
      .order('created_at', { ascending: false })
      .limit(10),

    // Sellers: count only
    supabaseAdmin
      .from('sellers')
      .select('id', { count: 'exact', head: true }),

    // Approved products: count only
    supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('moderation_status', 'approved'),

    // Pending moderation: count only
    supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('moderation_status', 'pending'),

    // Pending payouts (requested / approved / processing): count only
    supabaseAdmin
      .from('seller_payouts')
      .select('id', { count: 'exact', head: true })
      .in('status', ['requested', 'approved', 'processing']),

    // Failed / rejected payouts: count only
    supabaseAdmin
      .from('seller_payouts')
      .select('id', { count: 'exact', head: true })
      .in('status', ['failed', 'rejected']),

    // Pending seller applications: count only
    supabaseAdmin
      .from('seller_applications')
      .select('id', { count: 'exact', head: true })
      .in('status', ['submitted', 'under_review']),

    // Order items (latest 3 000, no date filter) — top products aggregation
    supabaseAdmin
      .from('order_items')
      .select('product_id, price, quantity')
      .limit(3000),

    // Approved products with low / zero stock — fetch up to 50 for threshold filtering
    supabaseAdmin
      .from('products')
      .select('id, title, stock_quantity, seller_id, low_stock_threshold, category')
      .eq('moderation_status', 'approved')
      .lte('stock_quantity', 20)
      .order('stock_quantity', { ascending: true })
      .limit(50),

    // Stuck orders: CREATED or PAYMENT_PENDING for > 24 h, count only
    supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('state', ['CREATED', 'PAYMENT_PENDING'])
      .lt('created_at', stuck24hISO),
  ])

  const allOrders     = allOrdersRes.data    ?? []
  const chartOrders   = chartOrdersRes.data  ?? []
  const recentOrders  = recentOrdersRes.data ?? []
  const orderItems    = orderItemsRes.data   ?? []
  const lowStockProds = lowStockProductsRes.data ?? []

  // Load threshold config for alert filtering
  const thresholdConfig = await fetchThresholdConfig()

  // ── All-time KPIs ─────────────────────────────────────────────────────────
  const paidAllOrders  = allOrders.filter(o => o.payment_status === 'paid')
  const totalRevenue   = paidAllOrders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0)
  const totalOrders    = allOrders.length
  const refundedOrders = allOrders.filter(o => o.state === 'REFUNDED').length
  const refundRate     = totalOrders > 0 ? (refundedOrders / totalOrders) * 100 : 0

  // ── 30-day KPIs ───────────────────────────────────────────────────────────
  const paidChartOrders = chartOrders.filter(o => o.payment_status === 'paid')
  const monthRevenue    = paidChartOrders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0)
  const monthOrders     = chartOrders.length
  const avgOrderValue   = paidChartOrders.length > 0 ? monthRevenue / paidChartOrders.length : 0

  // ── Chart data ────────────────────────────────────────────────────────────
  const revMap   = new Map<string, number>()
  const countMap = new Map<string, number>()

  for (const o of chartOrders) {
    const date = dayKey(o.created_at)
    countMap.set(date, (countMap.get(date) ?? 0) + 1)
    if (o.payment_status === 'paid') {
      revMap.set(date, (revMap.get(date) ?? 0) + Number(o.total_amount ?? 0))
    }
  }

  const revenueByDay = fillDays(
    Array.from(revMap.entries()).map(([date, value]) => ({ date, value })),
    from30, to30,
  )
  const ordersByDay = fillDays(
    Array.from(countMap.entries()).map(([date, value]) => ({ date, value })),
    from30, to30,
  )

  // ── Top Products — phase 2 (sequential, small) ────────────────────────────
  const productMap = new Map<string, { revenue: number; units: number }>()
  for (const item of orderItems) {
    if (!item.product_id) continue
    const cur = productMap.get(item.product_id) ?? { revenue: 0, units: 0 }
    cur.revenue += Number(item.price ?? 0) * Number(item.quantity ?? 0)
    cur.units   += Number(item.quantity ?? 0)
    productMap.set(item.product_id, cur)
  }

  const topIds = Array.from(productMap.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([id]) => id)

  let topProducts: { productId: string; title: string; revenue: number; unitsSold: number }[] = []

  if (topIds.length > 0) {
    const { data: prods } = await supabaseAdmin
      .from('products')
      .select('id, title')
      .in('id', topIds)

    topProducts = topIds.map(id => {
      const stats = productMap.get(id)!
      const prod  = prods?.find(p => p.id === id)
      return {
        productId: id,
        title:     prod?.title ?? 'Unknown Product',
        revenue:   Math.round(stats.revenue * 100) / 100,
        unitsSold: stats.units,
      }
    })
  }

  // ── Alerts ────────────────────────────────────────────────────────────────
  type AlertSeverity = 'warning' | 'error' | 'info'
  interface DashAlert {
    type:     string
    severity: AlertSeverity
    message:  string
    count:    number
    href:     string
  }
  const alerts: DashAlert[] = []

  const outOfStockProds = lowStockProds.filter(p => p.stock_quantity === 0)
  const lowStockOnly    = lowStockProds.filter(p => {
    if (p.stock_quantity <= 0) return false
    const thr = resolveThreshold(thresholdConfig, p as any)
    return p.stock_quantity <= thr
  })

  if (outOfStockProds.length > 0) {
    alerts.push({
      type:     'out_of_stock',
      severity: 'error',
      message:  `${outOfStockProds.length} product${outOfStockProds.length > 1 ? 's' : ''} out of stock`,
      count:    outOfStockProds.length,
      href:     '/admin/products?filter=out_of_stock',
    })
  }

  if (lowStockOnly.length > 0) {
    alerts.push({
      type:     'low_stock',
      severity: 'warning',
      message:  `${lowStockOnly.length} product${lowStockOnly.length > 1 ? 's' : ''} running low on stock`,
      count:    lowStockOnly.length,
      href:     '/admin/products?filter=low_stock',
    })
  }

  const failedPayoutsCount = failedPayoutsCountRes.count ?? 0
  if (failedPayoutsCount > 0) {
    alerts.push({
      type:     'failed_payout',
      severity: 'error',
      message:  `${failedPayoutsCount} payout${failedPayoutsCount > 1 ? 's' : ''} failed or rejected`,
      count:    failedPayoutsCount,
      href:     '/admin/payouts?filter=failed',
    })
  }

  const stuckOrdersCount = stuckOrdersCountRes.count ?? 0
  if (stuckOrdersCount > 0) {
    alerts.push({
      type:     'stuck_order',
      severity: 'error',
      message:  `${stuckOrdersCount} order${stuckOrdersCount > 1 ? 's' : ''} stuck for over 24 hours`,
      count:    stuckOrdersCount,
      href:     '/admin/orders?filter=stuck',
    })
  }

  const pendingModerationCount = pendingModerationCountRes.count ?? 0
  if (pendingModerationCount > 0) {
    alerts.push({
      type:     'pending_moderation',
      severity: 'info',
      message:  `${pendingModerationCount} product${pendingModerationCount > 1 ? 's' : ''} awaiting moderation`,
      count:    pendingModerationCount,
      href:     '/admin/products?filter=pending',
    })
  }

  // ── Response ──────────────────────────────────────────────────────────────
  return NextResponse.json({
    success: true,
    kpis: {
      totalRevenue:        Math.round(totalRevenue * 100) / 100,
      monthRevenue:        Math.round(monthRevenue * 100) / 100,
      totalOrders,
      monthOrders,
      paidOrders:          paidAllOrders.length,
      refundedOrders,
      refundRate:          Math.round(refundRate * 10) / 10,
      avgOrderValue:       Math.round(avgOrderValue * 100) / 100,
      totalSellers:        sellersCountRes.count          ?? 0,
      approvedProducts:    approvedProductsCountRes.count ?? 0,
      pendingModeration:   pendingModerationCount,
      pendingPayouts:      pendingPayoutsCountRes.count   ?? 0,
      failedPayouts:       failedPayoutsCount,
      pendingApplications: pendingApplicationsCountRes.count ?? 0,
      stuckOrders:         stuckOrdersCount,
    },
    charts: {
      revenueByDay,
      ordersByDay,
    },
    topProducts,
    recentOrders,
    alerts,
  })
}
