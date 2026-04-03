/**
 * GET /api/cron/daily
 *
 * Protected daily maintenance cron job.
 * Auth: x-cron-secret header OR Authorization: Bearer <CRON_SECRET>
 *
 * Jobs:
 *   1. Detect and alert stuck orders (>24h in CREATED/PAYMENT_PENDING)
 *   2. Cleanup old storefront events (>90 days)
 *   3. Detect zero-product sellers (active >7d, no approved products)
 *   4. Mark expired escrow holds
 *   5. Summary log
 *
 * Designed to be called by Vercel Cron, external scheduler, or manually.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createAdminNotification } from '@/lib/notifications'

// ─── Auth ───────────────────────────────────────────────────────────────────────
function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.warn('[cron/daily] CRON_SECRET not set — rejecting all requests')
    return false
  }

  // Check x-cron-secret header (Vercel Cron pattern)
  const headerToken = req.headers.get('x-cron-secret') ?? ''
  if (headerToken === secret) return true

  // Check Authorization: Bearer <token>
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader.startsWith('Bearer ') && authHeader.slice(7) === secret) return true

  return false
}

// ─── GET ────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, unknown> = {}
  const startTime = Date.now()

  // ── Job 1: Stuck orders ─────────────────────────────────────────────────────
  try {
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: stuckOrders, error } = await supabaseAdmin
      .from('orders')
      .select('id, state, created_at, total_amount')
      .in('state', ['CREATED', 'PAYMENT_PENDING'])
      .lt('created_at', cutoff24h)
      .limit(100)

    if (error) throw error

    const count = stuckOrders?.length ?? 0
    results.stuckOrders = { count }

    if (count > 0) {
      // Best-effort admin notification
      createAdminNotification('system_alert', {
        title: `${count} hängende Bestellungen erkannt`,
        body: `${count} Bestellungen sind seit >24h im Status CREATED/PAYMENT_PENDING.`,
        link: '/admin/risk',
      })
    }

    console.log(`[cron/daily] Job 1: ${count} stuck orders detected`)
  } catch (err) {
    results.stuckOrders = { error: err instanceof Error ? err.message : String(err) }
    console.error('[cron/daily] Job 1 failed:', err)
  }

  // ── Job 2: Cleanup old storefront events (>90 days) ─────────────────────────
  try {
    const cutoff90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { error, count } = await supabaseAdmin
      .from('storefront_events')
      .delete()
      .lt('created_at', cutoff90d)

    if (error && error.code !== '42P01') throw error // ignore missing table

    results.cleanupEvents = { deleted: count ?? 0 }
    console.log(`[cron/daily] Job 2: cleaned up ${count ?? 0} old storefront events`)
  } catch (err) {
    results.cleanupEvents = { error: err instanceof Error ? err.message : String(err) }
    console.error('[cron/daily] Job 2 failed:', err)
  }

  // ── Job 3: Zero-product sellers ─────────────────────────────────────────────
  try {
    const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: sellers } = await supabaseAdmin
      .from('sellers')
      .select('id, shop_name')
      .in('status', ['active', 'approved'])
      .lt('created_at', cutoff7d)
      .limit(200)

    if (sellers && sellers.length > 0) {
      const ids = sellers.map(s => s.id)
      const { data: withProds } = await supabaseAdmin
        .from('products')
        .select('seller_id')
        .in('seller_id', ids)
        .eq('moderation_status', 'approved')
        .limit(2000)

      const hasProduct = new Set((withProds ?? []).map(p => p.seller_id))
      const zeroProduct = sellers.filter(s => !hasProduct.has(s.id))

      results.zeroProductSellers = { count: zeroProduct.length }

      if (zeroProduct.length > 0) {
        createAdminNotification('system_alert', {
          title: `${zeroProduct.length} inaktive Verkäufer`,
          body: `${zeroProduct.length} Verkäufer sind seit >7 Tagen aktiv, haben aber keine genehmigten Produkte.`,
          link: '/admin/risk',
        })
      }

      console.log(`[cron/daily] Job 3: ${zeroProduct.length} zero-product sellers`)
    } else {
      results.zeroProductSellers = { count: 0 }
    }
  } catch (err) {
    results.zeroProductSellers = { error: err instanceof Error ? err.message : String(err) }
    console.error('[cron/daily] Job 3 failed:', err)
  }

  // ── Job 4: Mark expired escrow (>30 days after DELIVERED) ───────────────────
  try {
    const cutoff30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Find orders delivered > 30 days ago that haven't been completed
    const { data: expiredEscrow, error } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('state', 'DELIVERED')
      .lt('updated_at', cutoff30d)
      .limit(100)

    if (error) throw error

    const count = expiredEscrow?.length ?? 0
    results.expiredEscrow = { count }

    // Auto-complete these orders (escrow can be released)
    if (count > 0) {
      const ids = expiredEscrow!.map(o => o.id)
      await supabaseAdmin
        .from('orders')
        .update({ state: 'COMPLETED' })
        .in('id', ids)

      createAdminNotification('system_alert', {
        title: `${count} Bestellungen automatisch abgeschlossen`,
        body: `${count} Bestellungen waren >30 Tage im Status DELIVERED und wurden automatisch abgeschlossen.`,
        link: '/admin/risk',
      })
    }

    console.log(`[cron/daily] Job 4: ${count} expired escrow orders auto-completed`)
  } catch (err) {
    results.expiredEscrow = { error: err instanceof Error ? err.message : String(err) }
    console.error('[cron/daily] Job 4 failed:', err)
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  const durationMs = Date.now() - startTime
  console.log(`[cron/daily] All jobs completed in ${durationMs}ms`, results)

  return NextResponse.json({
    success: true,
    durationMs,
    results,
    timestamp: new Date().toISOString(),
  })
}
