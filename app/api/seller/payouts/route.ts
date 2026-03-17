/**
 * GET  /api/seller/payouts          — list own payout history
 * POST /api/seller/payouts          — request a new payout
 *
 * Auth: getServerSession (NextAuth)
 * Balance: derived from ledger_accounts + ledger_entries (seller_balance account)
 * Minimum payout: €10.00
 * Cannot request while another payout is in status: requested | approved | processing
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession }           from 'next-auth'
import { authOptions }                from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin }              from '@/lib/supabase-admin'

// ─── Balance helper ──────────────────────────────────────────────────────────

async function getSellerAvailableBalance(sellerId: string, currency = 'EUR'): Promise<number> {
  // Find the seller_balance ledger account
  const { data: account } = await supabaseAdmin
    .from('ledger_accounts')
    .select('id')
    .eq('account_type', 'seller_balance')
    .eq('owner_id', sellerId)
    .eq('currency', currency)
    .maybeSingle()

  if (!account) return 0

  // Sum entries: credits − debits = balance
  const { data: entries } = await supabaseAdmin
    .from('ledger_entries')
    .select('debit_amount, credit_amount')
    .eq('account_id', account.id)

  if (!entries?.length) return 0

  const balance = entries.reduce(
    (sum, e) => sum + Number(e.credit_amount) - Number(e.debit_amount),
    0,
  )

  return Math.max(0, balance)
}

// ─── GET — list own payouts ──────────────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Resolve seller
  const { data: seller } = await supabaseAdmin
    .from('sellers')
    .select('id, shop_name, currency')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (!seller) {
    return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
  }

  const currency = seller.currency || 'EUR'

  // Parallel: payouts + available balance
  const [{ data: payouts }, availableBalance] = await Promise.all([
    supabaseAdmin
      .from('seller_payouts')
      .select('id, amount, currency, status, requested_at, approved_at, paid_at, rejected_at, rejection_reason, failure_reason, payout_provider, provider_payout_id')
      .eq('seller_id', seller.id)
      .order('requested_at', { ascending: false })
      .limit(50),
    getSellerAvailableBalance(seller.id, currency),
  ])

  // Active request: any open request blocks a new one
  const hasOpenRequest = (payouts ?? []).some((p) =>
    ['requested', 'approved', 'processing'].includes(p.status),
  )

  return NextResponse.json({
    success: true,
    availableBalance,
    currency,
    hasOpenRequest,
    payouts: payouts ?? [],
  })
}

// ─── POST — create payout request ───────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { amount?: unknown; currency?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount < 10) {
    return NextResponse.json({ error: 'Minimum payout amount is €10.00' }, { status: 400 })
  }

  // Resolve seller
  const { data: seller } = await supabaseAdmin
    .from('sellers')
    .select('id, shop_name, currency')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (!seller) {
    return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
  }

  const currency = body.currency || seller.currency || 'EUR'

  // Check for existing open request
  const { data: open } = await supabaseAdmin
    .from('seller_payouts')
    .select('id, status')
    .eq('seller_id', seller.id)
    .in('status', ['requested', 'approved', 'processing'])
    .limit(1)

  if (open?.length) {
    return NextResponse.json(
      { error: 'You already have a pending payout request. Wait for it to be processed before requesting another.' },
      { status: 409 },
    )
  }

  // Verify balance
  const available = await getSellerAvailableBalance(seller.id, currency)
  const requested = Math.round(amount * 100) / 100

  if (requested > available + 0.005) {
    return NextResponse.json(
      { error: `Insufficient balance. Available: ${currency} ${available.toFixed(2)}` },
      { status: 400 },
    )
  }

  // Insert payout request
  const { data: payout, error: insertErr } = await supabaseAdmin
    .from('seller_payouts')
    .insert({
      seller_id:    seller.id,
      amount:       requested,
      currency,
      status:       'requested',
      requested_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (insertErr) {
    console.error('[seller/payouts] insert error:', insertErr)
    return NextResponse.json({ error: 'Failed to create payout request' }, { status: 500 })
  }

  return NextResponse.json({ success: true, payout }, { status: 201 })
}
