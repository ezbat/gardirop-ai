import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'

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
 * Returns real-data seller KPIs, chart data, balance, recent orders, and
 * low-stock products for the authenticated seller.
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

  // ── 1. Resolve seller ──────────────────────────────────────────────────────
  const { data: seller, error: sellerErr } = await supabaseAdmin
    .from('sellers')
    .select('id, shop_name, commission_rate, score')
    .eq('user_id', session.user.id)
    .single()

  if (sellerErr || !seller) {
    return NextResponse.json({ success: false, error: 'Seller not found' }, { status: 404 })
  }

  const sellerId = seller.id
  const commissionRate = parseFloat(seller.commission_rate ?? '15')

  // ── 2. Parallel DB fetches ─────────────────────────────────────────────────
  const [ordersResult, balanceResult, productsResult, recentOrdersResult] = await Promise.all([
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
      .select('id, title, stock_quantity, low_stock_threshold, price, images, moderation_status')
      .eq('seller_id', sellerId)
      .order('stock_quantity', { ascending: true })
      .limit(300),

    // Most recent 10 orders (all time) — for the display table
    supabaseAdmin
      .from('orders')
      .select('id, total_amount, seller_earnings, state, payment_status, created_at, users(email, full_name, name)')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const orders = ordersResult.data ?? []
  const allProducts = productsResult.data ?? []

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

  // ── 5. Low-stock products ─────────────────────────────────────────────────
  const lowStockProducts = allProducts
    .filter(p => p.stock_quantity <= (p.low_stock_threshold ?? 5))
    .slice(0, 10)
    .map(p => ({
      id: p.id,
      title: p.title,
      stock_quantity: p.stock_quantity,
      low_stock_threshold: p.low_stock_threshold ?? 5,
      price: parseFloat(p.price ?? '0'),
      image: (p.images as string[])?.[0] ?? null,
    }))

  // ── 6. Recent orders for display table ───────────────────────────────────
  const recentOrders = (recentOrdersResult.data ?? []).map((o: any) => ({
    id: o.id,
    totalAmount: parseFloat(o.total_amount ?? '0'),
    sellerEarnings: parseFloat(o.seller_earnings ?? '0'),
    state: o.state,
    paymentStatus: o.payment_status,
    createdAt: o.created_at,
    customerName:
      (o.users as any)?.full_name ??
      (o.users as any)?.name ??
      (o.users as any)?.email ??
      'Müşteri',
  }))

  const bal = balanceResult.data

  return NextResponse.json({
    success: true,
    seller: {
      id: seller.id,
      shopName: seller.shop_name,
      commissionRate,
      score: seller.score ?? null,
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
  })
}
