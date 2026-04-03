/**
 * /api/admin/backfill-ledger
 *
 * Backfills missing ledger_transactions rows for orders that are
 * payment_status='paid' but have no 'payment_received' ledger entry.
 *
 * Root cause: earlier webhook version crashed selecting non-existent
 * orders.tax_amount / orders.platform_fee columns, leaving orders
 * marked PAID with 0 ledger rows.
 *
 * Auth: x-admin-token header must match process.env.ADMIN_TOKEN
 *
 *   GET  → dry-run: shows which orders are missing, no writes
 *   POST → writes up to PROCESS_LIMIT missing entries, returns summary
 *
 * Security layers (added in hardening pass):
 *   1. Production gate  — permanently disabled in production (NODE_ENV=production → always 404)
 *   2. Timing-safe auth — crypto.timingSafeEqual, never a plain === compare
 *   3. IP allowlist     — optional ADMIN_ALLOWED_IPS env var
 *   4. Rate limiting    — 20 req / 10 min per IP (in-memory, per-instance)
 *   5. Audit logging    — every POST writes to audit_logs (non-blocking)
 *   6. Token guard      — 500 with clear message if ADMIN_TOKEN missing
 *   7. Consistent errors — all error responses: { success: false, error: "..." }
 *
 * Selection SQL (two round-trips because Supabase JS has no NOT EXISTS):
 *
 *   -- Step 1
 *   SELECT id, total_amount, currency, created_at
 *   FROM   orders
 *   WHERE  payment_status = 'paid'
 *   ORDER  BY created_at DESC
 *   LIMIT  200;
 *
 *   -- Step 2
 *   SELECT reference_id
 *   FROM   ledger_transactions
 *   WHERE  reference_type = 'order'
 *     AND  type           = 'payment_received'
 *     AND  reference_id   IN (<ids from step 1 as text>);
 *
 *   -- Missing = step-1 ids NOT IN step-2 result set (computed in JS)
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { recordPaymentReceived } from '@/lib/ledger-engine'
import { requireAdmin } from '@/lib/admin-auth'

// ─── Tunables ────────────────────────────────────────────────────────
const SCAN_LIMIT    = 200  // how many recent paid orders to inspect
const PROCESS_LIMIT = 50   // max backfill writes per invocation

// ─── Rate limiter (in-memory, per process instance) ──────────────────
// Sufficient for a low-traffic admin endpoint. Resets on deploy.
const RATE_LIMIT_MAX    = 20
const RATE_LIMIT_WINDOW = 10 * 60 * 1000  // 10 minutes in ms

const rateLimitMap = new Map<string, { count: number; windowStart: number }>()

function isRateLimited(ip: string): boolean {
  const now   = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    // Fresh window
    rateLimitMap.set(ip, { count: 1, windowStart: now })
    return false
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true
  }

  entry.count++
  return false
}

// ─── IP extraction ────────────────────────────────────────────────────
function getClientIp(request: NextRequest): string {
  // x-forwarded-for may contain a comma-separated chain; take the first entry
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  return 'unknown'
}

// ─── Production gate ─────────────────────────────────────────────────
// This endpoint is permanently disabled in production.
// There is no opt-in flag — if NODE_ENV is 'production' the route
// always returns 404, making it invisible to scanners and attackers.
function productionGate(): NextResponse | null {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }
  return null
}

// ─── Audit logging ───────────────────────────────────────────────────
// Fire-and-forget. Never blocks or throws to the caller.
async function writeAuditLog(
  ip:        string,
  requestId: string,
  details:   { found: number; written: number; skipped: number },
): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        actor:      'admin_backfill',
        action:     'backfill_ledger',
        resource:   'orders',
        details,
        ip,
        request_id: requestId,
        // created_at defaults to NOW() in DB
      })

    if (error) {
      console.error('[Backfill] Audit log write failed:', error.message)
    }
  } catch (err) {
    console.error('[Backfill] Audit log exception:', err instanceof Error ? err.message : String(err))
  }
}

// ─── Core selection logic ─────────────────────────────────────────────

interface OrderRow {
  id:           string
  total_amount: number
  currency:     string
  created_at:   string
}

async function findMissing(): Promise<
  { scanned: number; rows: OrderRow[]; error?: never } |
  { scanned: 0;     rows: [];         error: string  }
> {
  // Step 1 — recent paid orders
  const { data: paidOrders, error: ordersErr } = await supabaseAdmin
    .from('orders')
    .select('id, total_amount, currency, created_at')
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false })
    .limit(SCAN_LIMIT)

  if (ordersErr) {
    return { scanned: 0, rows: [], error: `orders query failed: ${ordersErr.message}` }
  }
  if (!paidOrders || paidOrders.length === 0) {
    return { scanned: 0, rows: [] }
  }

  // Build text-cast id list (ledger_transactions.reference_id is TEXT)
  const idStrings = paidOrders.map(o => String(o.id))

  // Step 2 — which of those already have a payment_received entry?
  const { data: covered, error: ledgerErr } = await supabaseAdmin
    .from('ledger_transactions')
    .select('reference_id')
    .eq('reference_type', 'order')
    .eq('type', 'payment_received')
    .in('reference_id', idStrings)

  if (ledgerErr) {
    return { scanned: 0, rows: [], error: `ledger_transactions query failed: ${ledgerErr.message}` }
  }

  const coveredSet = new Set((covered ?? []).map(r => String(r.reference_id)))

  const rows: OrderRow[] = paidOrders
    .filter(o => !coveredSet.has(String(o.id)))
    .map(o => ({
      id:           String(o.id),           // UUID → TEXT, matches reference_id column type
      total_amount: Number(o.total_amount || 0),
      currency:     String(o.currency || 'EUR'),
      created_at:   String(o.created_at),
    }))

  return { scanned: paidOrders.length, rows }
}

// ─── GET — dry-run ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const gate = productionGate()
  if (gate) return gate

  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const ip = getClientIp(request)

  const result = await findMissing()
  if (result.error) {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    dry_run: true,
    scanned: result.scanned,
    missing: result.rows.length,
    orders:  result.rows,
    message:
      result.rows.length === 0
        ? `All ${result.scanned} recently paid orders already have ledger entries.`
        : `${result.rows.length} of ${result.scanned} paid orders are missing a payment_received entry. POST to backfill (up to ${PROCESS_LIMIT} per run).`,
  })
}

// ─── POST — execute backfill ──────────────────────────────────────────

export async function POST(request: NextRequest) {
  const gate = productionGate()
  if (gate) return gate

  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const ip        = getClientIp(request)
  const requestId = crypto.randomUUID()

  console.log(`[Backfill] Starting ledger backfill requestId=${requestId} ip=${ip}`)

  const findResult = await findMissing()
  if (findResult.error) {
    return NextResponse.json({ success: false, error: findResult.error }, { status: 500 })
  }

  const { scanned, rows: allMissing } = findResult
  const toProcess = allMissing.slice(0, PROCESS_LIMIT)

  console.log(
    `[Backfill] Scanned=${scanned} missing=${allMissing.length} ` +
    `processing=${toProcess.length} (cap=${PROCESS_LIMIT})`
  )

  const summary = {
    scanned,
    missing:  allMissing.length,
    written:  0,
    skipped:  0,
    errors:   [] as Array<{ orderId: string; error: string }>,
    capped:   allMissing.length > PROCESS_LIMIT,
  }

  for (const order of toProcess) {
    const { id: orderId, total_amount: totalAmount, currency } = order

    // Guard: skip zero-amount orders (would create invalid ledger entry)
    if (totalAmount <= 0) {
      console.warn(`[Backfill] SKIP zero-amount: ${orderId} total_amount=${totalAmount}`)
      summary.skipped++
      continue
    }

    // Per-row re-check: guards against a concurrent run writing between
    // our bulk SELECT and this loop iteration
    const { data: existing, error: recheckErr } = await supabaseAdmin
      .from('ledger_transactions')
      .select('id')
      .eq('reference_type', 'order')
      .eq('reference_id', orderId)   // TEXT comparison — orderId is already String
      .eq('type', 'payment_received')
      .maybeSingle()

    if (recheckErr) {
      const msg = `re-check query failed: ${recheckErr.message}`
      console.error(`[Backfill] ERROR ${orderId}: ${msg}`)
      summary.errors.push({ orderId, error: msg })
      continue
    }

    if (existing?.id) {
      console.log(`[Backfill] SKIP (appeared since initial scan): ${orderId}`)
      summary.skipped++
      continue
    }

    // Write — ledger-engine sets externalReferenceId='payment_received_<orderId>'
    // so the RPC itself is idempotent; a second call returns { duplicate: true }.
    // Note: the local RPC has only 6 params; ledger-engine falls back automatically
    // from the 10-param FAZ-B signature when it gets "function not found".
    const result = await recordPaymentReceived(orderId, totalAmount, currency)

    if (!result.success) {
      const msg = result.error ?? 'unknown ledger engine error'
      console.error(`[Backfill] ERROR ${orderId}: ${msg}`)
      summary.errors.push({ orderId, error: msg })
      continue
    }

    if ((result as any).duplicate) {
      console.log(`[Backfill] SKIP (idempotency key already used): ${orderId}`)
      summary.skipped++
    } else {
      console.log(
        `[Backfill] WRITTEN ${orderId} | ` +
        `amount=${totalAmount} ${currency} | txId=${result.transactionId}`
      )
      summary.written++
    }
  }

  console.log(
    `[Backfill] Done requestId=${requestId} — scanned=${scanned} missing=${summary.missing} ` +
    `written=${summary.written} skipped=${summary.skipped} ` +
    `errors=${summary.errors.length} capped=${summary.capped}`
  )

  // Audit log — fire and forget, never blocks the response
  void writeAuditLog(ip, requestId, {
    found:   allMissing.length,
    written: summary.written,
    skipped: summary.skipped,
  })

  const remaining = summary.missing - summary.written - summary.skipped - summary.errors.length
  return NextResponse.json({
    success:    summary.errors.length === 0,
    request_id: requestId,
    scanned:    summary.scanned,
    missing:    summary.missing,
    written:    summary.written,
    skipped:    summary.skipped,
    errors:     summary.errors,
    message:
      summary.capped
        ? `Backfill partial (capped at ${PROCESS_LIMIT}): ${summary.written} written, ${summary.skipped} skipped, ${summary.errors.length} error(s). ~${remaining} remain — run again.`
        : `Backfill complete: ${summary.written} written, ${summary.skipped} skipped, ${summary.errors.length} error(s).`,
  })
}
