/**
 * GET  /api/admin/payouts          — list all payout requests (with optional status filter)
 * POST /api/admin/payouts          — action: approve | reject | mark_paid
 *
 * Auth: x-admin-token header — timing-safe compare against ADMIN_TOKEN env var.
 *
 * On mark_paid:
 *   1. Check idempotency (status already 'paid' → return 200 early)
 *   2. Call recordPayoutProcessed(sellerId, amount, payoutId, currency)
 *      which writes a balanced ledger transaction with externalReferenceId='payout_<id>'
 *   3. Update seller_payouts.status = 'paid', paid_at, paid_by, provider info
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin }              from '@/lib/supabase-admin'
import { recordPayoutProcessed }      from '@/lib/ledger-engine'
import { sendEmail }                  from '@/lib/email'
import { getPayoutPaidEmail, getPayoutFailedEmail } from '@/lib/email-templates'
import { createSellerNotification }   from '@/lib/notifications'
import { requireAdmin }               from '@/lib/admin-auth'

// ─── GET — list payouts ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get('status') // optional: e.g. 'requested'
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200)

  let query = supabaseAdmin
    .from('seller_payouts')
    .select(`
      id, amount, currency, status,
      requested_at, approved_at, processing_at, paid_at, rejected_at, failed_at,
      failure_reason, rejection_reason,
      payout_provider, provider_payout_id,
      approved_by, rejected_by, paid_by, ledger_tx_id,
      seller:sellers ( id, shop_name, user_id )
    `)
    .order('requested_at', { ascending: false })
    .limit(limit)

  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const { data: payouts, error } = await query

  if (error) {
    console.error('[admin/payouts] list error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // Summary counts
  const { data: counts } = await supabaseAdmin
    .from('seller_payouts')
    .select('status')

  const summary = (counts ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  return NextResponse.json({ success: true, payouts: payouts ?? [], summary })
}

// ─── POST — actions ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  let body: {
    action?: string
    payoutId?: string
    reason?: string
    providerPayoutId?: string
    payoutProvider?: string
    adminNote?: string
  }

  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { action, payoutId, reason, providerPayoutId, payoutProvider } = body

  if (!action || !payoutId) {
    return NextResponse.json({ error: 'action and payoutId are required' }, { status: 400 })
  }

  // Fetch the payout (with seller)
  const { data: payout, error: fetchErr } = await supabaseAdmin
    .from('seller_payouts')
    .select('id, seller_id, amount, currency, status')
    .eq('id', payoutId)
    .maybeSingle()

  if (fetchErr || !payout) {
    return NextResponse.json({ error: 'Payout not found' }, { status: 404 })
  }

  const now = new Date().toISOString()

  // ── approve ──────────────────────────────────────────────────────────────
  if (action === 'approve') {
    if (!['requested'].includes(payout.status)) {
      return NextResponse.json(
        { error: `Cannot approve a payout in status '${payout.status}'. Must be 'requested'.` },
        { status: 409 },
      )
    }

    const { error: updErr } = await supabaseAdmin
      .from('seller_payouts')
      .update({ status: 'approved', approved_at: now, approved_by: 'admin' })
      .eq('id', payoutId)

    if (updErr) {
      console.error('[admin/payouts] approve error:', updErr)
      return NextResponse.json({ error: 'Failed to approve payout' }, { status: 500 })
    }

    return NextResponse.json({ success: true, action: 'approve', payoutId })
  }

  // ── reject ───────────────────────────────────────────────────────────────
  if (action === 'reject') {
    if (!['requested', 'approved'].includes(payout.status)) {
      return NextResponse.json(
        { error: `Cannot reject a payout in status '${payout.status}'.` },
        { status: 409 },
      )
    }

    const { error: updErr } = await supabaseAdmin
      .from('seller_payouts')
      .update({
        status: 'rejected',
        rejected_at: now,
        rejected_by: 'admin',
        rejection_reason: reason || 'Abgelehnt durch Admin',
      })
      .eq('id', payoutId)

    if (updErr) {
      console.error('[admin/payouts] reject error:', updErr)
      return NextResponse.json({ error: 'Failed to reject payout' }, { status: 500 })
    }

    // Best-effort notifications + email
    void (async () => {
      try {
        createSellerNotification(payout.seller_id, 'payout_failed', {
          body: reason || 'Deine Auszahlung wurde abgelehnt.',
          link: '/seller/dashboard',
        })

        const { data: seller } = await supabaseAdmin
          .from('sellers')
          .select('shop_name, user_id')
          .eq('id', payout.seller_id)
          .maybeSingle()
        if (!seller?.user_id) return
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('email')
          .eq('id', seller.user_id)
          .maybeSingle()
        if (!user?.email) return

        const tpl = getPayoutFailedEmail({
          shopName: seller.shop_name || 'Shop',
          amount: Number(payout.amount),
          reason: reason || undefined,
        })
        await sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html, tag: 'payout_rejected' })
      } catch {}
    })()

    return NextResponse.json({ success: true, action: 'reject', payoutId })
  }

  // ── mark_paid ────────────────────────────────────────────────────────────
  if (action === 'mark_paid') {
    // ── Idempotency guard: already paid → early return ──────────────────
    if (payout.status === 'paid') {
      return NextResponse.json({ success: true, action: 'mark_paid', payoutId, alreadyPaid: true })
    }

    if (!['approved', 'processing'].includes(payout.status)) {
      return NextResponse.json(
        { error: `Cannot mark paid a payout in status '${payout.status}'. Must be 'approved' or 'processing'.` },
        { status: 409 },
      )
    }

    // ── Step 1: Set processing ───────────────────────────────────────────
    await supabaseAdmin
      .from('seller_payouts')
      .update({ status: 'processing', processing_at: now })
      .eq('id', payoutId)
      .eq('status', payout.status) // optimistic lock

    // ── Step 2: Record in ledger (idempotent via externalReferenceId) ────
    const ledgerResult = await recordPayoutProcessed(
      payout.seller_id,
      Number(payout.amount),
      payoutId,             // payoutBatchId = payoutId; externalReferenceId = 'payout_<payoutId>'
      payout.currency || 'EUR',
    )

    if (!ledgerResult.success && !(ledgerResult as any).duplicate) {
      // Roll back to approved
      await supabaseAdmin
        .from('seller_payouts')
        .update({ status: 'approved', processing_at: null })
        .eq('id', payoutId)

      console.error('[admin/payouts] ledger write failed:', ledgerResult.error)
      return NextResponse.json({ error: `Ledger write failed: ${ledgerResult.error}` }, { status: 500 })
    }

    // ── Step 3: Mark paid ────────────────────────────────────────────────
    const { error: paidErr } = await supabaseAdmin
      .from('seller_payouts')
      .update({
        status: 'paid',
        paid_at: now,
        paid_by: 'admin',
        ...(providerPayoutId ? { provider_payout_id: providerPayoutId } : {}),
        ...(payoutProvider   ? { payout_provider: payoutProvider }       : {}),
        ...(ledgerResult.transactionId ? { ledger_tx_id: ledgerResult.transactionId } : {}),
      })
      .eq('id', payoutId)

    if (paidErr) {
      console.error('[admin/payouts] mark_paid update error:', paidErr)
      // Ledger entry already written — do NOT fail silently; alert admin
      return NextResponse.json(
        { error: 'Ledger entry written but status update failed. Correct manually.', ledgerTxId: ledgerResult.transactionId },
        { status: 500 },
      )
    }

    // Best-effort notifications + email
    void (async () => {
      try {
        createSellerNotification(payout.seller_id, 'payout_paid', {
          body: `Deine Auszahlung über ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(payout.amount))} wurde überwiesen.`,
          link: '/seller/dashboard',
        })

        const { data: seller } = await supabaseAdmin
          .from('sellers')
          .select('shop_name, user_id')
          .eq('id', payout.seller_id)
          .maybeSingle()
        if (!seller?.user_id) return
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('email')
          .eq('id', seller.user_id)
          .maybeSingle()
        if (!user?.email) return

        const tpl = getPayoutPaidEmail({
          shopName: seller.shop_name || 'Shop',
          amount: Number(payout.amount),
          currency: payout.currency || 'EUR',
          payoutId: payoutId,
        })
        await sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html, tag: 'payout_paid' })
      } catch {}
    })()

    return NextResponse.json({
      success: true,
      action: 'mark_paid',
      payoutId,
      ledgerTxId: ledgerResult.transactionId,
      duplicate: (ledgerResult as any).duplicate,
    })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
}
