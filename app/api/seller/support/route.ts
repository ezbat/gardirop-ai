/**
 * GET  /api/seller/support       — seller: list own tickets
 * POST /api/seller/support       — seller: create a new ticket
 *
 * Auth: getServerSession (NextAuth) → seller lookup
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createAdminNotification } from '@/lib/notifications'
import { sendEmail } from '@/lib/email'
import { getSupportTicketCreatedEmail } from '@/lib/email-templates'

const SCOPE_LABELS: Record<string, string> = {
  order: 'Bestellung', return: 'Rückgabe', payout: 'Auszahlung',
  product: 'Produkt', account: 'Konto', general: 'Allgemein',
}

async function resolveSeller(userId: string) {
  const { data } = await supabaseAdmin
    .from('sellers')
    .select('id, shop_name, user_id')
    .eq('user_id', userId)
    .in('status', ['active', 'approved'])
    .maybeSingle()
  return data
}

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const seller = await resolveSeller(session.user.id)
  if (!seller) return NextResponse.json({ error: 'Seller not found' }, { status: 404 })

  const { data: tickets, error } = await supabaseAdmin
    .from('support_tickets')
    .select('id, subject, scope, scope_id, status, priority, created_at, updated_at, last_message_at')
    .eq('seller_id', seller.id)
    .eq('recipient_type', 'seller')
    .order('last_message_at', { ascending: false })

  if (error) {
    console.error('[api/seller/support GET]', error.message)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ success: true, tickets: tickets ?? [] })
}

// ─── POST ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const seller = await resolveSeller(session.user.id)
  if (!seller) return NextResponse.json({ error: 'Seller not found' }, { status: 404 })

  let body: { subject?: string; scope?: string; scopeId?: string; message?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { subject, scope, scopeId, message } = body

  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Betreff und Nachricht sind erforderlich.' }, { status: 400 })
  }

  const validScopes = ['order', 'return', 'payout', 'product', 'account', 'general']
  const ticketScope = validScopes.includes(scope ?? '') ? scope! : 'general'

  const { data: ticket, error: ticketErr } = await supabaseAdmin
    .from('support_tickets')
    .insert({
      opened_by_user_id: session.user.id,
      seller_id: seller.id,
      recipient_type: 'seller',
      scope: ticketScope,
      scope_id: scopeId || null,
      subject: subject.trim(),
      status: 'open',
      priority: 'normal',
    })
    .select()
    .maybeSingle()

  if (ticketErr) {
    console.error('[api/seller/support POST]', ticketErr.message)
    return NextResponse.json({ error: 'Ticket konnte nicht erstellt werden.' }, { status: 500 })
  }

  await supabaseAdmin.from('support_ticket_messages').insert({
    ticket_id: ticket.id,
    sender_type: 'seller',
    sender_user_id: session.user.id,
    sender_seller_id: seller.id,
    body: message.trim(),
    internal_note: false,
  })

  createAdminNotification('new_message', {
    title: 'Neues Seller-Ticket',
    body: `${seller.shop_name}: ${subject.trim()}`,
    link: '/admin/support/tickets',
  })

  void (async () => {
    try {
      const tpl = getSupportTicketCreatedEmail({
        name: seller.shop_name || session.user?.name || 'Verkäufer',
        ticketId: ticket.id,
        subject: subject.trim(),
        scope: SCOPE_LABELS[ticketScope] || ticketScope,
      })
      if (session.user?.email) {
        await sendEmail({ to: session.user.email, subject: tpl.subject, html: tpl.html, tag: 'support_ticket_created' })
      }
    } catch {}
  })()

  return NextResponse.json({ success: true, ticket }, { status: 201 })
}
