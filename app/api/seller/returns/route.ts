/**
 * GET   /api/seller/returns                     — list return requests for seller's orders
 * PATCH /api/seller/returns?action=approve|reject|received  — update return status
 *
 * Auth: getServerSession (NextAuth) → seller lookup
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createCustomerNotification } from '@/lib/notifications'
import { sendEmail } from '@/lib/email'
import { getReturnApprovedEmail, getReturnRejectedEmail } from '@/lib/email-templates'

const REASON_LABELS: Record<string, string> = {
  size_issue:       'Größe passt nicht',
  wrong_item:       'Falscher Artikel',
  defective:        'Beschädigt / Defekt',
  not_as_described: 'Nicht wie beschrieben',
  changed_mind:     'Meinungsänderung',
  other:            'Sonstiges',
}

// ─── Helper: resolve seller ─────────────────────────────────────────────────

async function resolveSeller(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('sellers')
    .select('id, shop_name')
    .eq('user_id', userId)
    .in('status', ['active', 'approved'])
    .maybeSingle()
  return { seller: data, error }
}

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { seller, error: sellerErr } = await resolveSeller(session.user.id)
  if (sellerErr || !seller) {
    return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
  }

  // Guard: return_requests table may not exist yet (migration 036)
  const { data: returns, error } = await supabaseAdmin
    .from('return_requests')
    .select(`
      id, order_id, user_id, status, reason, description,
      refund_amount, seller_response, rejection_reason,
      requested_at, reviewed_at, received_at, refund_processed_at,
      created_at
    `)
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[api/seller/returns GET]', error.message)
    // Table may not exist — return empty gracefully
    return NextResponse.json({
      success: true,
      returns: [],
      summary: { total: 0, pending: 0, approved: 0, refunded: 0 },
    })
  }

  // Enrich with order + customer info
  const orderIds = [...new Set((returns ?? []).map((r: any) => r.order_id))]
  const userIds  = [...new Set((returns ?? []).map((r: any) => r.user_id))]

  let ordersMap: Record<string, any> = {}
  let usersMap:  Record<string, any> = {}

  if (orderIds.length > 0) {
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select(`
        id, total_amount, created_at, state,
        items:order_items(
          id, quantity, price,
          product:products(id, title, images)
        )
      `)
      .in('id', orderIds)
    if (orders) {
      ordersMap = Object.fromEntries(orders.map((o: any) => [o.id, o]))
    }
  }

  if (userIds.length > 0) {
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, name, email, full_name')
      .in('id', userIds)
    if (users) {
      usersMap = Object.fromEntries(users.map((u: any) => [u.id, u]))
    }
  }

  const enriched = (returns ?? []).map((r: any) => ({
    ...r,
    reasonLabel: REASON_LABELS[r.reason] || r.reason,
    order: ordersMap[r.order_id] || null,
    customer: usersMap[r.user_id] || null,
  }))

  // Summary KPIs
  const all = enriched
  const pending  = all.filter((r: any) => r.status === 'pending').length
  const approved = all.filter((r: any) => r.status === 'approved').length
  const refunded = all.filter((r: any) => r.status === 'refunded').length

  return NextResponse.json({
    success: true,
    returns: enriched,
    summary: { total: all.length, pending, approved, refunded },
  })
}

// ─── PATCH: seller action ───────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { seller, error: sellerErr } = await resolveSeller(session.user.id)
  if (sellerErr || !seller) {
    return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
  }

  let body: { returnId?: string; action?: string; response?: string; rejectionReason?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { returnId, action, response: sellerResponse, rejectionReason } = body

  if (!returnId || !action) {
    return NextResponse.json({ error: 'returnId und action sind erforderlich.' }, { status: 400 })
  }

  if (!['approve', 'reject', 'received'].includes(action)) {
    return NextResponse.json({ error: 'Ungültige Aktion.' }, { status: 400 })
  }

  // Verify ownership
  const { data: returnReq, error: rErr } = await supabaseAdmin
    .from('return_requests')
    .select('id, status, order_id, user_id, refund_amount, reason')
    .eq('id', returnId)
    .eq('seller_id', seller.id)
    .maybeSingle()

  if (rErr || !returnReq) {
    return NextResponse.json({ error: 'Rückgabe nicht gefunden.' }, { status: 404 })
  }

  // Validate state transitions
  const validTransitions: Record<string, string[]> = {
    approve:  ['pending'],
    reject:   ['pending'],
    received: ['approved'],
  }

  if (!validTransitions[action]?.includes(returnReq.status)) {
    return NextResponse.json(
      { error: `Aktion "${action}" ist im Status "${returnReq.status}" nicht möglich.` },
      { status: 400 }
    )
  }

  // Reject requires reason
  if (action === 'reject' && !rejectionReason?.trim()) {
    return NextResponse.json(
      { error: 'Bitte gib einen Ablehnungsgrund an.' },
      { status: 400 }
    )
  }

  // Build update
  const now = new Date().toISOString()
  let update: Record<string, any> = {}

  switch (action) {
    case 'approve':
      update = {
        status: 'approved',
        seller_response: sellerResponse || null,
        reviewed_at: now,
      }
      break
    case 'reject':
      update = {
        status: 'rejected',
        rejection_reason: rejectionReason,
        seller_response: sellerResponse || null,
        reviewed_at: now,
      }
      break
    case 'received':
      update = {
        status: 'received',
        received_at: now,
      }
      break
  }

  const { error: updateErr } = await supabaseAdmin
    .from('return_requests')
    .update(update)
    .eq('id', returnId)

  if (updateErr) {
    console.error('[api/seller/returns PATCH]', updateErr.message)
    return NextResponse.json({ error: 'Aktualisierung fehlgeschlagen.' }, { status: 500 })
  }

  // Update order state if approved
  if (action === 'approve') {
    await supabaseAdmin
      .from('orders')
      .update({ state: 'RETURN_APPROVED' })
      .eq('id', returnReq.order_id)
  }

  // ─── Notifications + Emails (best-effort) ─────────────────────────────

  // Get customer info for emails
  const userId = returnReq.user_id
  const { data: customer } = await supabaseAdmin
    .from('users')
    .select('email, name, full_name')
    .eq('id', userId)
    .maybeSingle()

  const customerName = (customer as any)?.full_name || (customer as any)?.name || 'Kunde'
  const customerEmail = (customer as any)?.email

  if (action === 'approve') {
    createCustomerNotification(userId, 'return_approved', {
      body: `Deine Rückgabe für Bestellung #${returnReq.order_id.slice(0, 8).toUpperCase()} wurde genehmigt.`,
      link: '/returns',
    })
    if (customerEmail) {
      void (async () => {
        try {
          const tpl = getReturnApprovedEmail({
            customerName,
            orderId: returnReq.order_id,
            refundAmount: Number(returnReq.refund_amount),
          })
          await sendEmail({ to: customerEmail, subject: tpl.subject, html: tpl.html, tag: 'return_approved' })
        } catch {}
      })()
    }
  }

  if (action === 'reject') {
    createCustomerNotification(userId, 'return_rejected', {
      body: `Deine Rückgabe-Anfrage wurde abgelehnt: ${rejectionReason}`,
      link: '/returns',
    })
    if (customerEmail) {
      void (async () => {
        try {
          const tpl = getReturnRejectedEmail({
            customerName,
            orderId: returnReq.order_id,
            rejectionReason: rejectionReason || undefined,
          })
          await sendEmail({ to: customerEmail, subject: tpl.subject, html: tpl.html, tag: 'return_rejected' })
        } catch {}
      })()
    }
  }

  return NextResponse.json({
    success: true,
    status: update.status,
  })
}
