/**
 * GET  /api/returns         — customer: list own return requests
 * POST /api/returns         — customer: create a return request
 *
 * Auth: getServerSession (NextAuth)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createCustomerNotification, createSellerNotification, createAdminNotification } from '@/lib/notifications'
import { sendEmail } from '@/lib/email'
import {
  getReturnRequestReceivedEmail,
  getSellerNewReturnEmail,
} from '@/lib/email-templates'

const RETURN_WINDOW_DAYS = 14

const REASON_LABELS: Record<string, string> = {
  size_issue:       'Größe passt nicht',
  wrong_item:       'Falscher Artikel',
  defective:        'Beschädigt / Defekt',
  not_as_described: 'Nicht wie beschrieben',
  changed_mind:     'Meinungsänderung',
  other:            'Sonstiges',
}

// ─── GET: list customer's return requests ───────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: returns, error } = await supabaseAdmin
    .from('return_requests')
    .select(`
      id, order_id, status, reason, description, refund_amount,
      seller_response, rejection_reason,
      requested_at, reviewed_at, received_at, refund_processed_at,
      created_at
    `)
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[api/returns GET]', error.message)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // Enrich with order info
  const orderIds = [...new Set((returns ?? []).map((r: any) => r.order_id))]
  let ordersMap: Record<string, any> = {}

  if (orderIds.length > 0) {
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select(`
        id, total_amount, created_at, status, state,
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

  const enriched = (returns ?? []).map((r: any) => ({
    ...r,
    reasonLabel: REASON_LABELS[r.reason] || r.reason,
    order: ordersMap[r.order_id] || null,
  }))

  return NextResponse.json({ success: true, returns: enriched })
}

// ─── POST: create return request ────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { orderId?: string; reason?: string; description?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { orderId, reason, description } = body

  if (!orderId || !reason) {
    return NextResponse.json(
      { error: 'Bestell-ID und Rückgabegrund sind erforderlich.' },
      { status: 400 }
    )
  }

  const validReasons = ['size_issue', 'wrong_item', 'defective', 'not_as_described', 'changed_mind', 'other']
  if (!validReasons.includes(reason)) {
    return NextResponse.json({ error: 'Ungültiger Rückgabegrund.' }, { status: 400 })
  }

  // 1. Verify order belongs to user
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .select(`
      id, user_id, total_amount, state, status, delivered_at, updated_at,
      items:order_items(
        id, quantity,
        product:products(seller_id)
      )
    `)
    .eq('id', orderId)
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Bestellung nicht gefunden.' }, { status: 404 })
  }

  // 2. Check eligible state
  if (!['DELIVERED', 'COMPLETED', 'PAID'].includes(order.state ?? order.status)) {
    return NextResponse.json(
      { error: 'Rückgabe ist nur für zugestellte Bestellungen möglich.' },
      { status: 400 }
    )
  }

  // 3. Check 14-day return window
  const refDate = order.delivered_at || order.updated_at
  if (refDate) {
    const daysSince = Math.floor((Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSince > RETURN_WINDOW_DAYS) {
      return NextResponse.json(
        { error: `Das Rückgabefenster von ${RETURN_WINDOW_DAYS} Tagen ist abgelaufen.` },
        { status: 400 }
      )
    }
  }

  // 4. Check for existing active return
  const { data: existing } = await supabaseAdmin
    .from('return_requests')
    .select('id, status')
    .eq('order_id', orderId)
    .not('status', 'in', '("rejected","cancelled")')
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: 'Für diese Bestellung existiert bereits eine aktive Rückgabe-Anfrage.' },
      { status: 409 }
    )
  }

  // 5. Resolve seller
  const sellerId = (order.items as any)?.[0]?.product?.seller_id ?? null

  // 6. Create return request
  const { data: returnReq, error: createErr } = await supabaseAdmin
    .from('return_requests')
    .insert({
      order_id: orderId,
      user_id: session.user.id,
      seller_id: sellerId,
      reason,
      description: description || null,
      refund_amount: order.total_amount,
      status: 'pending',
      requested_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (createErr) {
    // Unique constraint on active return per order
    if (createErr.code === '23505') {
      return NextResponse.json(
        { error: 'Für diese Bestellung existiert bereits eine aktive Rückgabe-Anfrage.' },
        { status: 409 }
      )
    }
    console.error('[api/returns POST] create:', createErr.message)
    return NextResponse.json({ error: 'Rückgabe konnte nicht erstellt werden.' }, { status: 500 })
  }

  // 7. Create return items
  const returnItems = ((order.items as any[]) ?? []).map((item: any) => ({
    return_request_id: returnReq.id,
    order_item_id: item.id,
    quantity: item.quantity ?? 1,
    reason,
  }))
  if (returnItems.length > 0) {
    await supabaseAdmin.from('return_items').insert(returnItems)
  }

  // 8. Notifications + emails (best-effort)
  const reasonLabel = REASON_LABELS[reason] || reason

  // Customer confirmation
  void (async () => {
    try {
      const customerName = session.user?.name || 'Kunde'
      const tpl = getReturnRequestReceivedEmail({
        customerName,
        orderId,
        reason: reasonLabel,
      })
      if (session.user?.email) {
        await sendEmail({ to: session.user.email, subject: tpl.subject, html: tpl.html, tag: 'return_request_received' })
      }
    } catch {}
  })()

  // Seller notification
  if (sellerId) {
    createSellerNotification(sellerId, 'new_return_request', {
      body: `Neue Rückgabe: ${reasonLabel}`,
      link: '/seller/returns',
    })

    // Seller email
    void (async () => {
      try {
        const { data: seller } = await supabaseAdmin
          .from('sellers')
          .select('shop_name, user_id')
          .eq('id', sellerId)
          .maybeSingle()
        if (!seller?.user_id) return
        const { data: sellerUser } = await supabaseAdmin
          .from('users')
          .select('email')
          .eq('id', seller.user_id)
          .maybeSingle()
        if (!sellerUser?.email) return

        const tpl = getSellerNewReturnEmail({
          shopName: seller.shop_name || 'Shop',
          orderId,
          reason: reasonLabel,
          refundAmount: Number(order.total_amount),
        })
        await sendEmail({ to: sellerUser.email, subject: tpl.subject, html: tpl.html, tag: 'seller_new_return' })
      } catch {}
    })()
  }

  // Admin notification
  createAdminNotification('new_return_request', {
    body: `Rückgabe für Bestellung #${orderId.slice(0, 8).toUpperCase()}: ${reasonLabel}`,
    link: '/admin/returns',
  })

  return NextResponse.json({
    success: true,
    returnRequest: returnReq,
  }, { status: 201 })
}
