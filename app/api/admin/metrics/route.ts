/**
 * /api/admin/metrics
 *
 * Returns KPIs, daily charts, and recent-record tables for the
 * admin dashboard. All data comes from real DB tables.
 *
 * Auth: x-admin-token header — timing-safe compare against ADMIN_TOKEN.
 * Date range: ?from=YYYY-MM-DD&to=YYYY-MM-DD  (default: last 30 days)
 *
 * Response shape:
 *   { success, range, kpis, charts: { revenueByDay, ordersByDay }, recent: { orders, ledger, webhooks } }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'

// ─── Date helpers ─────────────────────────────────────────────────────
function toUTCDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Returns the UTC date string (YYYY-MM-DD) for a given ISO timestamp. */
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
  toDate:   Date,
): { date: string; value: number }[] {
  const map = new Map(data.map(d => [d.date, d.value]))
  const result: { date: string; value: number }[] = []
  const cur = new Date(fromDate)
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

// ─── GET ──────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  // ── Date range ──────────────────────────────────────────────────────
  const { searchParams } = new URL(request.url)
  const fromParam = searchParams.get('from')
  const toParam   = searchParams.get('to')

  const now = new Date()

  const fromDate = fromParam
    ? (() => { const d = new Date(fromParam + 'T00:00:00.000Z'); return d })()
    : (() => { const d = new Date(now); d.setUTCDate(d.getUTCDate() - 29); d.setUTCHours(0,0,0,0); return d })()

  const toDate = toParam
    ? (() => { const d = new Date(toParam + 'T23:59:59.999Z'); return d })()
    : (() => { const d = new Date(now); d.setUTCHours(23,59,59,999); return d })()

  const fromISO = fromDate.toISOString()
  const toISO   = toDate.toISOString()

  // ── Parallel fetches ────────────────────────────────────────────────
  const [
    ordersInRangeRes,
    webhooksInRangeRes,
    ledgerTxnsInRangeRes,
    recentOrdersRes,
    recentWebhooksRes,
  ] = await Promise.all([
    // All orders in range — used for KPIs + charts (capped at 2000)
    supabaseAdmin
      .from('orders')
      .select('id, created_at, state, payment_status, total_amount, currency')
      .gte('created_at', fromISO)
      .lte('created_at', toISO)
      .order('created_at', { ascending: true })
      .limit(2000),

    // All webhook events in range — used for KPIs (capped at 1000)
    supabaseAdmin
      .from('webhook_events')
      .select('event_id, event_type, source, status, error_message, created_at')
      .gte('created_at', fromISO)
      .lte('created_at', toISO)
      .limit(1000),

    // Ledger transactions in range — used for KPIs + imbalance check (capped at 1000)
    supabaseAdmin
      .from('ledger_transactions')
      .select('id, type, reference_type, reference_id, description, created_at')
      .gte('created_at', fromISO)
      .lte('created_at', toISO)
      .order('created_at', { ascending: false })
      .limit(1000),

    // Recent 20 orders across all time (for the table)
    supabaseAdmin
      .from('orders')
      .select('id, created_at, state, payment_status, total_amount, currency')
      .order('created_at', { ascending: false })
      .limit(20),

    // Recent 20 webhook events across all time (for the table)
    supabaseAdmin
      .from('webhook_events')
      .select('event_id, event_type, source, status, attempts, created_at, error_message')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const orders     = ordersInRangeRes.data    ?? []
  const webhooks   = webhooksInRangeRes.data  ?? []
  const ledgerTxns = ledgerTxnsInRangeRes.data ?? []

  // ── KPIs: orders ────────────────────────────────────────────────────
  const paidOrders   = orders.filter(o => o.payment_status === 'paid')
  const revenue      = paidOrders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0)
  const paidCount    = paidOrders.length
  const pendingCount = orders.filter(o => o.payment_status !== 'paid').length

  const statePaymentPending = orders.filter(o => o.state === 'PAYMENT_PENDING').length
  const stateCreated        = orders.filter(o => o.state === 'CREATED').length
  const statePaid           = orders.filter(o => o.state === 'PAID').length

  // ── KPIs: webhooks ──────────────────────────────────────────────────
  const webhookCompleted = webhooks.filter(w =>
    w.event_type === 'checkout.session.completed' &&
    w.source     === 'stripe' &&
    w.status     === 'completed'
  ).length

  const webhookErrors = webhooks.filter(w =>
    w.status === 'failed' || (w.error_message != null && w.error_message !== '')
  ).length

  // ── KPIs: ledger ────────────────────────────────────────────────────
  const ledgerPaymentReceived = ledgerTxns.filter(
    t => t.type === 'payment_received' && t.reference_type === 'order'
  ).length

  // Imbalance: fetch entries for the transactions in range, group, compare
  let ledgerImbalanceCount = 0

  if (ledgerTxns.length > 0) {
    // Supabase .in() is safe up to ~500 items; slice defensively
    const txnIds = ledgerTxns.map(t => t.id).slice(0, 500)

    const { data: entries } = await supabaseAdmin
      .from('ledger_entries')
      .select('transaction_id, debit_amount, credit_amount')
      .in('transaction_id', txnIds)

    if (entries && entries.length > 0) {
      // Aggregate debit / credit per transaction
      const totals = new Map<string, { d: number; c: number }>()

      for (const e of entries) {
        const cur = totals.get(e.transaction_id) ?? { d: 0, c: 0 }
        cur.d += Number(e.debit_amount  ?? 0)
        cur.c += Number(e.credit_amount ?? 0)
        totals.set(e.transaction_id, cur)
      }

      for (const [, { d, c }] of totals) {
        if (Math.abs(d - c) > 0.001) ledgerImbalanceCount++
      }
    }
  }

  // ── Charts ──────────────────────────────────────────────────────────
  // Build raw day → value maps from orders data
  const revMap    = new Map<string, number>()
  const countMap  = new Map<string, number>()

  for (const o of orders) {
    const date = dayKey(o.created_at)
    countMap.set(date, (countMap.get(date) ?? 0) + 1)
    if (o.payment_status === 'paid') {
      revMap.set(date, (revMap.get(date) ?? 0) + Number(o.total_amount ?? 0))
    }
  }

  const revenueByDay = fillDays(
    Array.from(revMap.entries()).map(([date, value]) => ({ date, value })),
    fromDate, toDate,
  )

  const ordersByDay = fillDays(
    Array.from(countMap.entries()).map(([date, value]) => ({ date, value })),
    fromDate, toDate,
  )

  // ── Response ────────────────────────────────────────────────────────
  return NextResponse.json({
    success: true,
    range: { from: fromISO, to: toISO },
    kpis: {
      revenue:              Math.round(revenue * 100) / 100,
      paidOrders:           paidCount,
      pendingOrders:        pendingCount,
      statePaymentPending,
      stateCreated,
      statePaid,
      webhookCompleted,
      webhookErrors,
      ledgerPaymentReceived,
      ledgerImbalanceCount,
    },
    charts: {
      revenueByDay,
      ordersByDay,
    },
    recent: {
      orders:   recentOrdersRes.data   ?? [],
      ledger:   ledgerTxns.slice(0, 20),
      webhooks: recentWebhooksRes.data ?? [],
    },
  })
}
