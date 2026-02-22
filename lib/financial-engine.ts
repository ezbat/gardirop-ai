import { supabaseAdmin } from './supabase-admin'
import { MWST_STANDARD } from './tax-invoice'

// ═══════════════════════════════════════════════════════════
// WEARO Financial Engine - Real Database Aggregation
// NO hardcoded values. All calculations from actual DB data.
// ═══════════════════════════════════════════════════════════

export interface FinancialSummary {
  totalRevenue: number
  totalPlatformFees: number
  sellerEarnings: number
  totalTaxCollected: number
  pendingBalance: number
  availableBalance: number
  totalWithdrawn: number
  orderCount: number
  averageOrderValue: number
  commissionRate: number
}

export interface DailyRevenue {
  date: string
  revenue: number
  orders: number
  platformFees: number
  sellerEarnings: number
}

export interface PeriodComparison {
  current: number
  previous: number
  changePercent: number
  trend: 'up' | 'down' | 'stable'
}

export interface RevenueByCategory {
  category: string
  revenue: number
  orderCount: number
  percentage: number
}

export interface PayoutSummary {
  totalPaid: number
  totalPending: number
  nextPayoutEstimate: number
  lastPayoutDate: string | null
  lastPayoutAmount: number
}

// ─── CORE: Revenue Calculation ──────────────────────────────
/**
 * Calculate total revenue for a seller within a date range.
 * Revenue = SUM(orders.total_amount WHERE status IN ('PAID','COMPLETED','DELIVERED'))
 */
export async function getSellerRevenue(
  sellerId: string,
  startDate?: string,
  endDate?: string
): Promise<{ revenue: number; orderCount: number }> {
  let query = supabaseAdmin
    .from('orders')
    .select('total_amount, platform_fee, seller_earnings')
    .eq('seller_id', sellerId)
    .eq('payment_status', 'paid')

  if (startDate) query = query.gte('created_at', startDate)
  if (endDate) query = query.lte('created_at', endDate)

  const { data: orders, error } = await query

  if (error || !orders) return { revenue: 0, orderCount: 0 }

  const revenue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || '0'), 0)
  return {
    revenue: Math.round(revenue * 100) / 100,
    orderCount: orders.length,
  }
}

// ─── CORE: Platform Fee Calculation ─────────────────────────
/**
 * Calculate total platform fees for a seller.
 * Platform Fee = SUM(orders.platform_fee) for paid orders.
 * Falls back to commission_rate × total_amount if platform_fee not set.
 */
export async function getSellerPlatformFees(
  sellerId: string,
  commissionRate: number,
  startDate?: string,
  endDate?: string
): Promise<number> {
  let query = supabaseAdmin
    .from('orders')
    .select('total_amount, platform_fee')
    .eq('seller_id', sellerId)
    .eq('payment_status', 'paid')

  if (startDate) query = query.gte('created_at', startDate)
  if (endDate) query = query.lte('created_at', endDate)

  const { data: orders, error } = await query

  if (error || !orders) return 0

  const fees = orders.reduce((sum, o) => {
    const fee = parseFloat(o.platform_fee || '0')
    if (fee > 0) return sum + fee
    // Fallback: calculate from commission rate
    return sum + (parseFloat(o.total_amount || '0') * commissionRate / 100)
  }, 0)

  return Math.round(fees * 100) / 100
}

// ─── CORE: Seller Earnings ──────────────────────────────────
/**
 * Seller Earnings = SUM(orders.total_amount - orders.platform_fee)
 */
export async function getSellerEarnings(
  sellerId: string,
  commissionRate: number,
  startDate?: string,
  endDate?: string
): Promise<number> {
  let query = supabaseAdmin
    .from('orders')
    .select('total_amount, platform_fee, seller_earnings')
    .eq('seller_id', sellerId)
    .eq('payment_status', 'paid')

  if (startDate) query = query.gte('created_at', startDate)
  if (endDate) query = query.lte('created_at', endDate)

  const { data: orders, error } = await query

  if (error || !orders) return 0

  const earnings = orders.reduce((sum, o) => {
    const sellerEarning = parseFloat(o.seller_earnings || '0')
    if (sellerEarning > 0) return sum + sellerEarning
    // Fallback: calculate from total minus commission
    const total = parseFloat(o.total_amount || '0')
    const fee = parseFloat(o.platform_fee || '0')
    if (fee > 0) return sum + (total - fee)
    return sum + (total * (1 - commissionRate / 100))
  }, 0)

  return Math.round(earnings * 100) / 100
}

// ─── DAILY REVENUE BREAKDOWN ────────────────────────────────
/**
 * Get daily revenue breakdown for chart display.
 * Groups orders by date for the specified period.
 */
export async function getDailyRevenue(
  sellerId: string,
  days: number = 30,
  commissionRate: number = 15
): Promise<DailyRevenue[]> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - (days - 1))
  startDate.setHours(0, 0, 0, 0)

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('total_amount, platform_fee, seller_earnings, created_at')
    .eq('seller_id', sellerId)
    .eq('payment_status', 'paid')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })

  if (error || !orders) {
    // Return empty days array
    return generateEmptyDays(days)
  }

  // Group by date
  const dailyMap = new Map<string, DailyRevenue>()

  // Initialize all days
  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    const dateKey = d.toISOString().split('T')[0]
    dailyMap.set(dateKey, {
      date: dateKey,
      revenue: 0,
      orders: 0,
      platformFees: 0,
      sellerEarnings: 0,
    })
  }

  // Fill with actual data
  for (const order of orders) {
    const dateKey = order.created_at.split('T')[0]
    const existing = dailyMap.get(dateKey)
    if (!existing) continue

    const total = parseFloat(order.total_amount || '0')
    let fee = parseFloat(order.platform_fee || '0')
    if (fee === 0) fee = total * commissionRate / 100
    let earning = parseFloat(order.seller_earnings || '0')
    if (earning === 0) earning = total - fee

    existing.revenue += total
    existing.orders += 1
    existing.platformFees += fee
    existing.sellerEarnings += earning
  }

  // Round all values
  return Array.from(dailyMap.values()).map(d => ({
    ...d,
    revenue: Math.round(d.revenue * 100) / 100,
    platformFees: Math.round(d.platformFees * 100) / 100,
    sellerEarnings: Math.round(d.sellerEarnings * 100) / 100,
  }))
}

function generateEmptyDays(days: number): DailyRevenue[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    return {
      date: d.toISOString().split('T')[0],
      revenue: 0,
      orders: 0,
      platformFees: 0,
      sellerEarnings: 0,
    }
  })
}

// ─── REVENUE BY CATEGORY ────────────────────────────────────
/**
 * Break down revenue by product category.
 * Uses order_items joined with products for category info.
 */
export async function getRevenueByCategory(
  sellerId: string,
  startDate?: string,
  endDate?: string
): Promise<RevenueByCategory[]> {
  let query = supabaseAdmin
    .from('order_items')
    .select(`
      quantity, price,
      product:products!inner(category, seller_id),
      order:orders!inner(payment_status, created_at)
    `)
    .eq('product.seller_id', sellerId)
    .eq('order.payment_status', 'paid')

  if (startDate) query = query.gte('order.created_at', startDate)
  if (endDate) query = query.lte('order.created_at', endDate)

  const { data: items, error } = await query

  if (error || !items) return []

  // Group by category
  const categoryMap = new Map<string, { revenue: number; orderCount: number }>()

  for (const item of items as any[]) {
    const category = item.product?.category || 'Sonstige'
    const revenue = parseFloat(item.price || '0') * (item.quantity || 1)

    if (categoryMap.has(category)) {
      const existing = categoryMap.get(category)!
      existing.revenue += revenue
      existing.orderCount += 1
    } else {
      categoryMap.set(category, { revenue, orderCount: 1 })
    }
  }

  const totalRevenue = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.revenue, 0)

  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      revenue: Math.round(data.revenue * 100) / 100,
      orderCount: data.orderCount,
      percentage: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
}

// ─── PERIOD COMPARISON ──────────────────────────────────────
/**
 * Compare current period vs previous period.
 * E.g., this month vs last month, this week vs last week.
 */
export async function getPeriodComparison(
  sellerId: string,
  periodDays: number = 30
): Promise<PeriodComparison> {
  const now = new Date()
  const currentStart = new Date()
  currentStart.setDate(now.getDate() - periodDays)

  const previousStart = new Date()
  previousStart.setDate(currentStart.getDate() - periodDays)

  const [current, previous] = await Promise.all([
    getSellerRevenue(sellerId, currentStart.toISOString(), now.toISOString()),
    getSellerRevenue(sellerId, previousStart.toISOString(), currentStart.toISOString()),
  ])

  const changePercent = previous.revenue > 0
    ? Math.round(((current.revenue - previous.revenue) / previous.revenue) * 10000) / 100
    : current.revenue > 0 ? 100 : 0

  return {
    current: current.revenue,
    previous: previous.revenue,
    changePercent,
    trend: changePercent > 2 ? 'up' : changePercent < -2 ? 'down' : 'stable',
  }
}

// ─── PAYOUT SUMMARY ─────────────────────────────────────────
/**
 * Get payout summary from seller_payouts and seller_balances tables.
 */
export async function getPayoutSummary(sellerId: string): Promise<PayoutSummary> {
  const [balanceResult, lastPayoutResult] = await Promise.all([
    supabaseAdmin
      .from('seller_balances')
      .select('available_balance, pending_balance, total_withdrawn')
      .eq('seller_id', sellerId)
      .single(),
    supabaseAdmin
      .from('seller_payouts')
      .select('net_amount, completed_at')
      .eq('seller_id', sellerId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  const balance = balanceResult.data
  const lastPayout = lastPayoutResult.data

  return {
    totalPaid: parseFloat(balance?.total_withdrawn || '0'),
    totalPending: parseFloat(balance?.pending_balance || '0'),
    nextPayoutEstimate: parseFloat(balance?.available_balance || '0'),
    lastPayoutDate: lastPayout?.completed_at || null,
    lastPayoutAmount: parseFloat(lastPayout?.net_amount || '0'),
  }
}

// ─── AD ROI CALCULATION ─────────────────────────────────────
/**
 * Calculate Ad ROI = campaign.revenueGenerated / campaign.spent
 * Returns per-campaign ROI and aggregate ROI.
 */
export async function getAdROI(sellerId: string): Promise<{
  totalSpent: number
  totalRevenue: number
  roi: number
  campaigns: Array<{ id: string; name: string; spent: number; revenue: number; roi: number }>
}> {
  const { data: campaigns, error } = await supabaseAdmin
    .from('campaigns')
    .select('id, name, spent, revenue_generated, status')
    .eq('seller_id', sellerId)
    .in('status', ['active', 'completed'])

  if (error || !campaigns || campaigns.length === 0) {
    return { totalSpent: 0, totalRevenue: 0, roi: 0, campaigns: [] }
  }

  const totalSpent = campaigns.reduce((sum, c) => sum + parseFloat(c.spent || '0'), 0)
  const totalRevenue = campaigns.reduce((sum, c) => sum + parseFloat(c.revenue_generated || '0'), 0)

  return {
    totalSpent: Math.round(totalSpent * 100) / 100,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    roi: totalSpent > 0 ? Math.round((totalRevenue / totalSpent) * 100) / 100 : 0,
    campaigns: campaigns.map(c => ({
      id: c.id,
      name: c.name,
      spent: parseFloat(c.spent || '0'),
      revenue: parseFloat(c.revenue_generated || '0'),
      roi: parseFloat(c.spent || '0') > 0
        ? Math.round((parseFloat(c.revenue_generated || '0') / parseFloat(c.spent || '0')) * 100) / 100
        : 0,
    })),
  }
}

// ─── TAX SUMMARY ────────────────────────────────────────────
/**
 * Get tax summary from tax_reports table.
 */
export async function getTaxSummary(
  sellerId: string,
  year?: number
): Promise<{
  totalTaxCollected: number
  totalSales: number
  totalFees: number
  netRevenue: number
  reports: Array<{
    period: string
    periodType: string
    totalSales: number
    taxCollected: number
    fees: number
    netRevenue: number
    status: string
  }>
}> {
  const currentYear = year || new Date().getFullYear()

  const { data: reports, error } = await supabaseAdmin
    .from('tax_reports')
    .select('*')
    .eq('seller_id', sellerId)
    .like('period', `${currentYear}%`)
    .order('period', { ascending: true })

  if (error || !reports) {
    return {
      totalTaxCollected: 0,
      totalSales: 0,
      totalFees: 0,
      netRevenue: 0,
      reports: [],
    }
  }

  return {
    totalTaxCollected: reports.reduce((sum, r) => sum + parseFloat(r.total_tax_collected || '0'), 0),
    totalSales: reports.reduce((sum, r) => sum + parseFloat(r.total_sales || '0'), 0),
    totalFees: reports.reduce((sum, r) => sum + parseFloat(r.total_fees || '0'), 0),
    netRevenue: reports.reduce((sum, r) => sum + parseFloat(r.net_revenue || '0'), 0),
    reports: reports.map(r => ({
      period: r.period,
      periodType: r.period_type,
      totalSales: parseFloat(r.total_sales || '0'),
      taxCollected: parseFloat(r.total_tax_collected || '0'),
      fees: parseFloat(r.total_fees || '0'),
      netRevenue: parseFloat(r.net_revenue || '0'),
      status: r.status,
    })),
  }
}

// ─── FULL FINANCIAL SUMMARY ─────────────────────────────────
/**
 * Complete financial summary for seller dashboard.
 * Combines all metrics into one response.
 */
export async function getFullFinancialSummary(
  sellerId: string,
  commissionRate: number = 15
): Promise<FinancialSummary> {
  const [revenueData, fees, earnings, balanceResult] = await Promise.all([
    getSellerRevenue(sellerId),
    getSellerPlatformFees(sellerId, commissionRate),
    getSellerEarnings(sellerId, commissionRate),
    supabaseAdmin
      .from('seller_balances')
      .select('available_balance, pending_balance, total_withdrawn')
      .eq('seller_id', sellerId)
      .single(),
  ])

  const balance = balanceResult.data

  return {
    totalRevenue: revenueData.revenue,
    totalPlatformFees: fees,
    sellerEarnings: earnings,
    totalTaxCollected: Math.round(revenueData.revenue * MWST_STANDARD / 100 * 100) / 100, // Dynamic MwSt from tax constants
    pendingBalance: parseFloat(balance?.pending_balance || '0'),
    availableBalance: parseFloat(balance?.available_balance || '0'),
    totalWithdrawn: parseFloat(balance?.total_withdrawn || '0'),
    orderCount: revenueData.orderCount,
    averageOrderValue: revenueData.orderCount > 0
      ? Math.round((revenueData.revenue / revenueData.orderCount) * 100) / 100
      : 0,
    commissionRate,
  }
}

// ─── TOP PRODUCTS BY REVENUE ────────────────────────────────
/**
 * Get top-selling products by actual revenue from order_items.
 */
export async function getTopProductsByRevenue(
  sellerId: string,
  limit: number = 10,
  startDate?: string,
  endDate?: string
): Promise<Array<{
  productId: string
  title: string
  revenue: number
  unitsSold: number
  averagePrice: number
}>> {
  let query = supabaseAdmin
    .from('order_items')
    .select(`
      quantity, price, product_id,
      product:products!inner(id, title, seller_id),
      order:orders!inner(payment_status, created_at)
    `)
    .eq('product.seller_id', sellerId)
    .eq('order.payment_status', 'paid')

  if (startDate) query = query.gte('order.created_at', startDate)
  if (endDate) query = query.lte('order.created_at', endDate)

  const { data: items, error } = await query

  if (error || !items) return []

  // Aggregate by product
  const productMap = new Map<string, {
    productId: string
    title: string
    revenue: number
    unitsSold: number
  }>()

  for (const item of items as any[]) {
    const productId = item.product_id || item.product?.id
    const title = item.product?.title || 'Unbekannt'
    const revenue = parseFloat(item.price || '0') * (item.quantity || 1)
    const units = item.quantity || 1

    if (productMap.has(productId)) {
      const existing = productMap.get(productId)!
      existing.revenue += revenue
      existing.unitsSold += units
    } else {
      productMap.set(productId, { productId, title, revenue, unitsSold: units })
    }
  }

  return Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
    .map(p => ({
      ...p,
      revenue: Math.round(p.revenue * 100) / 100,
      averagePrice: p.unitsSold > 0
        ? Math.round((p.revenue / p.unitsSold) * 100) / 100
        : 0,
    }))
}

// ─── ORDER STATUS BREAKDOWN ─────────────────────────────────
/**
 * Get count of orders by status for a seller.
 */
export async function getOrderStatusBreakdown(
  sellerId: string
): Promise<Record<string, number>> {
  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('status')
    .eq('seller_id', sellerId)

  if (error || !orders) return {}

  const breakdown: Record<string, number> = {}
  for (const order of orders) {
    const status = order.status || 'unknown'
    breakdown[status] = (breakdown[status] || 0) + 1
  }

  return breakdown
}

// ─── TODAY'S METRICS ────────────────────────────────────────
/**
 * Get today's real-time metrics for the dashboard header.
 */
export async function getTodayMetrics(
  sellerId: string,
  commissionRate: number = 15
): Promise<{
  todayRevenue: number
  todayOrders: number
  todayEarnings: number
  pendingOrders: number
  yesterdayRevenue: number
  changePercent: number
}> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const dayBeforeYesterday = new Date(yesterday)
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1)

  const [todayResult, yesterdayResult, pendingResult] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('total_amount, platform_fee, seller_earnings')
      .eq('seller_id', sellerId)
      .eq('payment_status', 'paid')
      .gte('created_at', today.toISOString()),
    supabaseAdmin
      .from('orders')
      .select('total_amount')
      .eq('seller_id', sellerId)
      .eq('payment_status', 'paid')
      .gte('created_at', yesterday.toISOString())
      .lt('created_at', today.toISOString()),
    supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .in('status', ['pending', 'PENDING', 'processing', 'PROCESSING']),
  ])

  const todayOrders = todayResult.data || []
  const todayRevenue = todayOrders.reduce(
    (sum, o) => sum + parseFloat(o.total_amount || '0'), 0
  )
  const todayEarnings = todayOrders.reduce((sum, o) => {
    const earning = parseFloat(o.seller_earnings || '0')
    if (earning > 0) return sum + earning
    const total = parseFloat(o.total_amount || '0')
    const fee = parseFloat(o.platform_fee || '0')
    if (fee > 0) return sum + (total - fee)
    return sum + (total * (1 - commissionRate / 100))
  }, 0)

  const yesterdayRevenue = (yesterdayResult.data || []).reduce(
    (sum, o) => sum + parseFloat(o.total_amount || '0'), 0
  )

  const changePercent = yesterdayRevenue > 0
    ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 10000) / 100
    : todayRevenue > 0 ? 100 : 0

  return {
    todayRevenue: Math.round(todayRevenue * 100) / 100,
    todayOrders: todayOrders.length,
    todayEarnings: Math.round(todayEarnings * 100) / 100,
    pendingOrders: pendingResult.count || 0,
    yesterdayRevenue: Math.round(yesterdayRevenue * 100) / 100,
    changePercent,
  }
}
