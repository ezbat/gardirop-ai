/**
 * GET  /api/seller/payouts  — payout history + balance summary
 * POST /api/seller/payouts  — request a new payout
 *
 * Auth:    getServerSession (NextAuth)
 * Balance: ledger_accounts/entries primary; seller_balances fallback
 * Min:     €10.00
 * Constraint: only one open request (requested | approved | processing) at a time
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession }          from 'next-auth'
import { authOptions }               from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin }             from '@/lib/supabase-admin'
import { createAdminNotification }   from '@/lib/notifications'
import { sendAdminEmail }            from '@/lib/email'
import { getAdminPayoutRequestedEmail } from '@/lib/email-templates'

const CURRENCY = 'EUR'
const MIN_PAYOUT = 10

// ─── Balance helper ───────────────────────────────────────────────────────────

async function getLedgerBalance(sellerId: string): Promise<number> {
  const { data: account } = await supabaseAdmin
    .from('ledger_accounts')
    .select('id')
    .eq('account_type', 'seller_balance')
    .eq('owner_id', sellerId)
    .eq('currency', CURRENCY)
    .maybeSingle()

  if (!account) return 0

  const { data: entries } = await supabaseAdmin
    .from('ledger_entries')
    .select('debit_amount, credit_amount')
    .eq('account_id', account.id)

  if (!entries?.length) return 0

  return Math.max(
    0,
    entries.reduce((s, e) => s + Number(e.credit_amount) - Number(e.debit_amount), 0),
  )
}

// ─── Seller resolver ──────────────────────────────────────────────────────────

async function resolveSeller(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('sellers')
    .select('id, shop_name, status')
    .eq('user_id', userId)
    .maybeSingle()
  return { seller: data, error }
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { seller, error: sellerErr } = await resolveSeller(session.user.id)
  if (sellerErr) {
    console.error('[seller/payouts GET] seller lookup:', sellerErr.message)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
  if (!seller) {
    return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
  }

  // Parallel fetches
  const [payoutsResult, ledgerBalance, balanceRow] = await Promise.all([
    supabaseAdmin
      .from('seller_payouts')
      .select(
        'id, amount, currency, status, ' +
        'requested_at, approved_at, processing_at, paid_at, rejected_at, failed_at, ' +
        'failure_reason, rejection_reason, ' +
        'payout_provider, provider_payout_id'
      )
      .eq('seller_id', seller.id)
      .order('requested_at', { ascending: false })
      .limit(100),

    getLedgerBalance(seller.id),

    supabaseAdmin
      .from('seller_balances')
      .select('available_balance, pending_balance, total_withdrawn')
      .eq('seller_id', seller.id)
      .maybeSingle(),
  ])

  const payouts = (payoutsResult.data ?? []) as any[]

  // ── Balance: prefer ledger; fall back to seller_balances ──────────────────
  const balFallback = parseFloat(balanceRow.data?.available_balance ?? '0')
  const availableBalance = ledgerBalance > 0 ? ledgerBalance : balFallback
  const pendingBalance   = parseFloat(balanceRow.data?.pending_balance ?? '0')
  const totalWithdrawn   = parseFloat(balanceRow.data?.total_withdrawn ?? '0')

  // ── Summary aggregates from payout rows ───────────────────────────────────
  const paidPayouts   = payouts.filter(p => p.status === 'paid')
  const totalPaidOut  = paidPayouts.reduce((s, p) => s + parseFloat(p.amount), 0)
  // most recent paid_at — payouts are ordered by requested_at, find max paid_at
  const lastPaidAt    = paidPayouts.reduce<string | null>(
    (latest, p) => (!latest || (p.paid_at && p.paid_at > latest)) ? (p.paid_at ?? latest) : latest,
    null,
  )

  // ── Open request (blocks new requests) ───────────────────────────────────
  const openRequest = payouts.find(p =>
    ['requested', 'approved', 'processing'].includes(p.status)
  ) ?? null

  return NextResponse.json({
    success: true,
    currency: CURRENCY,
    balance: {
      available:     Math.round(availableBalance * 100) / 100,
      pending:       Math.round(pendingBalance   * 100) / 100,
      totalWithdrawn: Math.round(totalWithdrawn  * 100) / 100,
      totalPaidOut:  Math.round(totalPaidOut     * 100) / 100,
      lastPaidAt,
    },
    hasOpenRequest: openRequest !== null,
    openRequest,
    payouts,
  })
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { amount?: unknown }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount < MIN_PAYOUT) {
    return NextResponse.json(
      { error: `Mindestbetrag: €${MIN_PAYOUT.toFixed(2)}` },
      { status: 400 },
    )
  }

  const { seller, error: sellerErr } = await resolveSeller(session.user.id)
  if (sellerErr) {
    console.error('[seller/payouts POST] seller lookup:', sellerErr.message)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
  if (!seller) {
    return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
  }

  // Block if open request exists
  const { data: open } = await supabaseAdmin
    .from('seller_payouts')
    .select('id')
    .eq('seller_id', seller.id)
    .in('status', ['requested', 'approved', 'processing'])
    .limit(1)

  if (open?.length) {
    return NextResponse.json(
      { error: 'Es besteht bereits eine offene Auszahlungsanfrage. Bitte warte auf die Bearbeitung.' },
      { status: 409 },
    )
  }

  // Verify balance
  const ledgerBal   = await getLedgerBalance(seller.id)
  const { data: balRow } = await supabaseAdmin
    .from('seller_balances')
    .select('available_balance')
    .eq('seller_id', seller.id)
    .maybeSingle()
  const fallbackBal = parseFloat(balRow?.available_balance ?? '0')
  const available   = ledgerBal > 0 ? ledgerBal : fallbackBal
  const requested   = Math.round(amount * 100) / 100

  if (requested > available + 0.005) {
    return NextResponse.json(
      { error: `Nicht genug Guthaben. Verfügbar: €${available.toFixed(2)}` },
      { status: 400 },
    )
  }

  const { data: payout, error: insertErr } = await supabaseAdmin
    .from('seller_payouts')
    .insert({
      seller_id:    seller.id,
      amount:       requested,
      currency:     CURRENCY,
      status:       'requested',
      requested_at: new Date().toISOString(),
    })
    .select()
    .maybeSingle()

  if (insertErr) {
    console.error('[seller/payouts POST] insert:', insertErr.message)
    return NextResponse.json({ error: 'Auszahlungsanfrage konnte nicht erstellt werden.' }, { status: 500 })
  }

  // Best-effort admin notification
  createAdminNotification('payout_requested', {
    body: `€${requested.toFixed(2)} Auszahlung beantragt.`,
    link: '/admin/finances',
  })

  // Best-effort admin email
  void (async () => {
    try {
      const tpl = getAdminPayoutRequestedEmail({
        shopName: seller.shop_name || 'Shop',
        amount: requested,
        payoutId: payout.id,
      })
      await sendAdminEmail({ subject: tpl.subject, html: tpl.html, tag: 'admin_payout_requested' })
    } catch {}
  })()

  return NextResponse.json({ success: true, payout }, { status: 201 })
}
