/**
 * GET   /api/admin/returns       — list all return requests (filters: status, seller, orderId)
 * PATCH /api/admin/returns       — admin actions: approve, reject, process_refund, add_note
 *
 * Auth: x-admin-token (requireAdmin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { stripe } from '@/lib/stripe'
import { createCustomerNotification } from '@/lib/notifications'
import { sendEmail } from '@/lib/email'
import { getRefundProcessedEmail, getReturnApprovedEmail, getReturnRejectedEmail } from '@/lib/email-templates'
import { recordRefundIssued } from '@/lib/ledger-engine'

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const url = new URL(request.url)
  const status   = url.searchParams.get('status')
  const sellerId = url.searchParams.get('seller_id')
  const orderId  = url.searchParams.get('order_id')
  const limit    = Math.min(Number(url.searchParams.get('limit') || 100), 500)

  let query = supabaseAdmin
    .from('return_requests')
    .select(`
      id, order_id, user_id, seller_id, status, reason, description,
      refund_amount, seller_response, rejection_reason, admin_notes,
      stripe_refund_id,
      requested_at, reviewed_at, received_at, refund_processed_at,
      created_at, updated_at
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status)   query = query.eq('status', status)
  if (sellerId) query = query.eq('seller_id', sellerId)
  if (orderId)  query = query.eq('order_id', orderId)

  const { data: returns, error } = await query

  if (error) {
    console.error('[api/admin/returns GET]', error.message)
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 })
  }

  // Enrich with order, customer, seller info
  const orderIds  = [...new Set((returns ?? []).map((r: any) => r.order_id))]
  const userIds   = [...new Set((returns ?? []).map((r: any) => r.user_id))]
  const sellerIds = [...new Set((returns ?? []).map((r: any) => r.seller_id).filter(Boolean))]

  let ordersMap:  Record<string, any> = {}
  let usersMap:   Record<string, any> = {}
  let sellersMap: Record<string, any> = {}

  const [ordersRes, usersRes, sellersRes] = await Promise.all([
    orderIds.length > 0
      ? supabaseAdmin.from('orders').select('id, total_amount, state, stripe_payment_intent_id, created_at').in('id', orderIds)
      : { data: [] },
    userIds.length > 0
      ? supabaseAdmin.from('users').select('id, name, email, full_name').in('id', userIds)
      : { data: [] },
    sellerIds.length > 0
      ? supabaseAdmin.from('sellers').select('id, shop_name, user_id, commission_rate').in('id', sellerIds)
      : { data: [] },
  ])

  if ((ordersRes as any).data) ordersMap = Object.fromEntries((ordersRes as any).data.map((o: any) => [o.id, o]))
  if ((usersRes as any).data)  usersMap  = Object.fromEntries((usersRes as any).data.map((u: any) => [u.id, u]))
  if ((sellersRes as any).data) sellersMap = Object.fromEntries((sellersRes as any).data.map((s: any) => [s.id, s]))

  const enriched = (returns ?? []).map((r: any) => ({
    ...r,
    order:    ordersMap[r.order_id]   || null,
    customer: usersMap[r.user_id]     || null,
    seller:   sellersMap[r.seller_id] || null,
  }))

  // Summary
  const all = returns ?? []
  const summary = {
    total:    all.length,
    pending:  all.filter((r: any) => r.status === 'pending').length,
    approved: all.filter((r: any) => r.status === 'approved').length,
    received: all.filter((r: any) => r.status === 'received').length,
    refunded: all.filter((r: any) => r.status === 'refunded').length,
    rejected: all.filter((r: any) => r.status === 'rejected').length,
  }

  return NextResponse.json({ success: true, returns: enriched, summary })
}

// ─── PATCH ──────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  let body: {
    returnId?: string
    action?: string
    rejectionReason?: string
    adminNotes?: string
  }
  try { body = await request.json() }
  catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }) }

  const { returnId, action, rejectionReason, adminNotes } = body

  if (!returnId || !action) {
    return NextResponse.json({ success: false, error: 'returnId and action required' }, { status: 400 })
  }

  const validActions = ['approve', 'reject', 'process_refund', 'add_note']
  if (!validActions.includes(action)) {
    return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 })
  }

  // Load return request
  const { data: rr, error: rrErr } = await supabaseAdmin
    .from('return_requests')
    .select('id, status, order_id, user_id, seller_id, refund_amount, reason, admin_notes')
    .eq('id', returnId)
    .maybeSingle()

  if (rrErr || !rr) {
    return NextResponse.json({ success: false, error: 'Return request not found' }, { status: 404 })
  }

  const now = new Date().toISOString()

  // ─── add_note ─────────────────────────────────────────────────────────

  if (action === 'add_note') {
    if (!adminNotes?.trim()) {
      return NextResponse.json({ success: false, error: 'Note text required' }, { status: 400 })
    }
    const existing = rr.admin_notes || ''
    const newNotes = existing
      ? `${existing}\n\n[${new Date().toLocaleString('de-DE')}] ${adminNotes}`
      : `[${new Date().toLocaleString('de-DE')}] ${adminNotes}`

    const { error } = await supabaseAdmin
      .from('return_requests')
      .update({ admin_notes: newNotes })
      .eq('id', returnId)

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, action: 'note_added' })
  }

  // ─── approve (admin override) ─────────────────────────────────────────

  if (action === 'approve') {
    if (!['pending', 'rejected'].includes(rr.status)) {
      return NextResponse.json({ success: false, error: `Cannot approve from status: ${rr.status}` }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('return_requests')
      .update({
        status: 'approved',
        reviewed_at: now,
        admin_notes: appendNote(rr.admin_notes, adminNotes, 'Admin-Genehmigung'),
      })
      .eq('id', returnId)

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

    // Update order state
    await supabaseAdmin.from('orders').update({ state: 'RETURN_APPROVED' }).eq('id', rr.order_id)

    // Customer notification + email
    notifyCustomerApproval(rr)

    return NextResponse.json({ success: true, status: 'approved' })
  }

  // ─── reject (admin override) ──────────────────────────────────────────

  if (action === 'reject') {
    if (!rejectionReason?.trim()) {
      return NextResponse.json({ success: false, error: 'Rejection reason required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('return_requests')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        reviewed_at: now,
        admin_notes: appendNote(rr.admin_notes, adminNotes, 'Admin-Ablehnung'),
      })
      .eq('id', returnId)

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

    notifyCustomerRejection(rr, rejectionReason)

    return NextResponse.json({ success: true, status: 'rejected' })
  }

  // ─── process_refund ───────────────────────────────────────────────────

  if (action === 'process_refund') {
    if (!['approved', 'received', 'refund_pending'].includes(rr.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot process refund from status: ${rr.status}` },
        { status: 400 }
      )
    }

    // Mark as refund_pending first
    await supabaseAdmin
      .from('return_requests')
      .update({ status: 'refund_pending' })
      .eq('id', returnId)

    // Get order's Stripe payment intent
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, stripe_payment_intent_id, total_amount')
      .eq('id', rr.order_id)
      .maybeSingle()

    if (!order?.stripe_payment_intent_id) {
      // Mark as manually refunded if no Stripe PI
      await supabaseAdmin
        .from('return_requests')
        .update({
          status: 'refunded',
          refund_processed_at: now,
          admin_notes: appendNote(rr.admin_notes, adminNotes, 'Manuelle Erstattung (kein Stripe PI)'),
        })
        .eq('id', returnId)

      await supabaseAdmin
        .from('orders')
        .update({ state: 'REFUNDED', refund_amount: rr.refund_amount })
        .eq('id', rr.order_id)

      notifyCustomerRefund(rr)
      return NextResponse.json({ success: true, status: 'refunded', method: 'manual' })
    }

    // Process Stripe refund
    try {
      const refundAmountCents = Math.round(Number(rr.refund_amount) * 100)

      const refund = await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent_id,
        amount: refundAmountCents,
        reason: 'requested_by_customer',
        metadata: {
          order_id: rr.order_id,
          return_request_id: returnId,
          admin_processed: 'true',
        },
      })

      // Update return request
      await supabaseAdmin
        .from('return_requests')
        .update({
          status: 'refunded',
          stripe_refund_id: refund.id,
          refund_processed_at: now,
          admin_notes: appendNote(rr.admin_notes, adminNotes, `Stripe-Erstattung: ${refund.id}`),
        })
        .eq('id', returnId)

      // Update order
      await supabaseAdmin
        .from('orders')
        .update({ state: 'REFUNDED', refund_amount: rr.refund_amount })
        .eq('id', rr.order_id)

      // Ledger entry (best-effort)
      if (rr.seller_id) {
        void (async () => {
          try {
            const { data: seller } = await supabaseAdmin
              .from('sellers')
              .select('commission_rate')
              .eq('id', rr.seller_id)
              .maybeSingle()
            const commRate = Number((seller as any)?.commission_rate ?? 0.15)
            const amount = Number(rr.refund_amount)
            const commission = Math.round(amount * commRate * 100) / 100
            await recordRefundIssued(rr.order_id, rr.seller_id, amount, commission, 'EUR')
          } catch (e) {
            console.error('[admin/returns] Ledger refund error:', e)
          }
        })()
      }

      notifyCustomerRefund(rr)

      return NextResponse.json({
        success: true,
        status: 'refunded',
        method: 'stripe',
        stripeRefundId: refund.id,
      })
    } catch (stripeErr) {
      // Revert to previous status
      await supabaseAdmin
        .from('return_requests')
        .update({
          status: rr.status === 'refund_pending' ? 'approved' : rr.status,
          admin_notes: appendNote(
            rr.admin_notes,
            `Stripe-Erstattung fehlgeschlagen: ${stripeErr instanceof Error ? stripeErr.message : String(stripeErr)}`,
            'FEHLER'
          ),
        })
        .eq('id', returnId)

      console.error('[admin/returns] Stripe refund failed:', stripeErr)
      return NextResponse.json({
        success: false,
        error: `Stripe-Erstattung fehlgeschlagen: ${stripeErr instanceof Error ? stripeErr.message : 'Unbekannter Fehler'}`,
      }, { status: 500 })
    }
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function appendNote(existing: string | null, note: string | undefined, label: string): string {
  const ts = new Date().toLocaleString('de-DE')
  const entry = `[${ts}] ${label}${note ? ': ' + note : ''}`
  return existing ? `${existing}\n\n${entry}` : entry
}

function notifyCustomerApproval(rr: any) {
  void (async () => {
    try {
      createCustomerNotification(rr.user_id, 'return_approved', {
        body: `Deine Rückgabe für Bestellung #${rr.order_id.slice(0, 8).toUpperCase()} wurde genehmigt.`,
        link: '/returns',
      })

      const { data: customer } = await supabaseAdmin
        .from('users').select('email, name, full_name').eq('id', rr.user_id).maybeSingle()
      if (!(customer as any)?.email) return

      const tpl = getReturnApprovedEmail({
        customerName: (customer as any).full_name || (customer as any).name || 'Kunde',
        orderId: rr.order_id,
        refundAmount: Number(rr.refund_amount),
      })
      await sendEmail({ to: (customer as any).email, subject: tpl.subject, html: tpl.html, tag: 'return_approved' })
    } catch {}
  })()
}

function notifyCustomerRejection(rr: any, reason: string) {
  void (async () => {
    try {
      createCustomerNotification(rr.user_id, 'return_rejected', {
        body: `Deine Rückgabe-Anfrage wurde abgelehnt: ${reason}`,
        link: '/returns',
      })

      const { data: customer } = await supabaseAdmin
        .from('users').select('email, name, full_name').eq('id', rr.user_id).maybeSingle()
      if (!(customer as any)?.email) return

      const tpl = getReturnRejectedEmail({
        customerName: (customer as any).full_name || (customer as any).name || 'Kunde',
        orderId: rr.order_id,
        rejectionReason: reason,
      })
      await sendEmail({ to: (customer as any).email, subject: tpl.subject, html: tpl.html, tag: 'return_rejected' })
    } catch {}
  })()
}

function notifyCustomerRefund(rr: any) {
  void (async () => {
    try {
      createCustomerNotification(rr.user_id, 'refund_processed', {
        body: `Erstattung von €${Number(rr.refund_amount).toFixed(2)} wurde veranlasst.`,
        link: '/returns',
      })

      const { data: customer } = await supabaseAdmin
        .from('users').select('email, name, full_name').eq('id', rr.user_id).maybeSingle()
      if (!(customer as any)?.email) return

      const tpl = getRefundProcessedEmail({
        customerName: (customer as any).full_name || (customer as any).name || 'Kunde',
        orderId: rr.order_id,
        refundAmount: Number(rr.refund_amount),
      })
      await sendEmail({ to: (customer as any).email, subject: tpl.subject, html: tpl.html, tag: 'refund_processed' })
    } catch {}
  })()
}
