/**
 * GET /api/admin/risk-ops
 *
 * Operational Risk & Moderation dashboard data.
 * Rule-based — no ML scoring. Pure DB queries.
 * All fetches run in parallel via Promise.all.
 *
 * Auth: x-admin-token header
 *
 * Risk rules applied:
 *   failed_payout       — seller_payouts.status IN ('failed','rejected')
 *   pending_payout      — seller_payouts.status IN ('requested','approved','processing')
 *   refunded_order      — orders.state = 'REFUNDED' OR orders.refund_amount > 0
 *   high_refund_seller  — seller with >= 2 refunded orders
 *   stuck_order         — state IN ('CREATED','PAYMENT_PENDING') AND created_at < 24 h ago
 *   zero_product_seller — active seller, no approved products, approved > 7 days ago
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin }             from '@/lib/supabase-admin'
import { requireAdmin }              from '@/lib/admin-auth'

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = requireAdmin(req)
  if (auth.error) return auth.error

  const now         = new Date()
  const stuck24h    = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const days7       = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000).toISOString()

  const [
    failedPayoutsRes,
    pendingPayoutsRes,
    refundedOrdersRes,
    stuckOrdersRes,
    pendingModerationRes,
    needsChangesRes,
    allRefundedForAggRes,
    activeSellersRes,
  ] = await Promise.all([

    // Failed / rejected payouts — list
    supabaseAdmin
      .from('seller_payouts')
      .select('id, seller_id, amount, currency, status, failure_reason, rejection_reason, failed_at, rejected_at, requested_at, seller:sellers(id, shop_name)')
      .in('status', ['failed', 'rejected'])
      .order('requested_at', { ascending: false })
      .limit(50),

    // Pending payouts — list
    supabaseAdmin
      .from('seller_payouts')
      .select('id, seller_id, amount, currency, status, requested_at, seller:sellers(id, shop_name)')
      .in('status', ['requested', 'approved', 'processing'])
      .order('requested_at', { ascending: false })
      .limit(50),

    // Refunded / partial-refund orders — list
    supabaseAdmin
      .from('orders')
      .select('id, state, total_amount, refund_amount, seller_id, created_at, seller:sellers(id, shop_name)')
      .or('state.eq.REFUNDED,refund_amount.gt.0')
      .order('created_at', { ascending: false })
      .limit(50),

    // Stuck orders — list
    supabaseAdmin
      .from('orders')
      .select('id, state, total_amount, created_at')
      .in('state', ['CREATED', 'PAYMENT_PENDING'])
      .lt('created_at', stuck24h)
      .order('created_at', { ascending: true })
      .limit(50),

    // Pending moderation count
    supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('moderation_status', 'pending'),

    // Needs-changes moderation count
    supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('moderation_status', 'needs_changes'),

    // All refunded orders for aggregation (seller_id + refund_amount only)
    supabaseAdmin
      .from('orders')
      .select('seller_id, refund_amount')
      .or('state.eq.REFUNDED,refund_amount.gt.0')
      .limit(5000),

    // Active sellers created > 7 days ago
    supabaseAdmin
      .from('sellers')
      .select('id, shop_name, created_at')
      .in('status', ['active', 'approved'])
      .lt('created_at', days7)
      .order('created_at', { ascending: false })
      .limit(300),
  ])

  // ── High-refund seller aggregation ────────────────────────────────────────
  const refundMap = new Map<string, { count: number; total: number }>()
  for (const o of allRefundedForAggRes.data ?? []) {
    if (!o.seller_id) continue
    const cur = refundMap.get(o.seller_id) ?? { count: 0, total: 0 }
    cur.count += 1
    cur.total += Number(o.refund_amount ?? 0)
    refundMap.set(o.seller_id, cur)
  }

  const highRefundIds = Array.from(refundMap.entries())
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 25)
    .map(([id]) => id)

  let highRefundSellers: {
    seller_id: string; shop_name: string; refund_count: number; total_refund_amount: number
  }[] = []

  if (highRefundIds.length > 0) {
    const { data: names } = await supabaseAdmin
      .from('sellers')
      .select('id, shop_name')
      .in('id', highRefundIds)

    highRefundSellers = highRefundIds.map(id => {
      const s = refundMap.get(id)!
      return {
        seller_id:           id,
        shop_name:           names?.find(n => n.id === id)?.shop_name ?? '—',
        refund_count:        s.count,
        total_refund_amount: Math.round(s.total * 100) / 100,
      }
    })
  }

  // ── Zero-product sellers ──────────────────────────────────────────────────
  const activeSellers = activeSellersRes.data ?? []
  let zeroProductSellers: {
    id: string; shop_name: string; created_at: string; days_since_approval: number
  }[] = []

  if (activeSellers.length > 0) {
    const ids = activeSellers.map(s => s.id)

    const { data: withProds } = await supabaseAdmin
      .from('products')
      .select('seller_id')
      .in('seller_id', ids)
      .eq('moderation_status', 'approved')
      .limit(2000)

    const hasProduct = new Set((withProds ?? []).map(p => p.seller_id))

    zeroProductSellers = activeSellers
      .filter(s => !hasProduct.has(s.id))
      .slice(0, 30)
      .map(s => ({
        id:                  s.id,
        shop_name:           s.shop_name,
        created_at:          s.created_at,
        days_since_approval: Math.floor(
          (now.getTime() - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24),
        ),
      }))
  }

  // ── Stuck orders: annotate hours ─────────────────────────────────────────
  const stuckOrders = (stuckOrdersRes.data ?? []).map(o => ({
    ...o,
    hours_stuck: Math.floor(
      (now.getTime() - new Date(o.created_at).getTime()) / (1000 * 60 * 60),
    ),
  }))

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = {
    failedPayouts:      failedPayoutsRes.data?.length   ?? 0,
    pendingPayouts:     pendingPayoutsRes.data?.length   ?? 0,
    refundedOrders:     refundedOrdersRes.data?.length   ?? 0,
    pendingModeration:  (pendingModerationRes.count ?? 0) + (needsChangesRes.count ?? 0),
    stuckOrders:        stuckOrders.length,
    zeroProductSellers: zeroProductSellers.length,
    highRefundSellers:  highRefundSellers.length,
  }

  return NextResponse.json({
    success: true,
    kpis,
    failedPayouts:      failedPayoutsRes.data  ?? [],
    pendingPayouts:     pendingPayoutsRes.data  ?? [],
    refundedOrders:     refundedOrdersRes.data  ?? [],
    highRefundSellers,
    stuckOrders,
    zeroProductSellers,
  })
}
