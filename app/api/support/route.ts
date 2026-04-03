/**
 * GET  /api/support  — customer: list own tickets
 * POST /api/support  — customer: create a new ticket
 *
 * Auth: getServerSession (NextAuth)
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

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: tickets, error } = await supabaseAdmin
    .from('support_tickets')
    .select('id, subject, scope, scope_id, status, priority, created_at, updated_at, last_message_at')
    .eq('opened_by_user_id', session.user.id)
    .eq('recipient_type', 'customer')
    .order('last_message_at', { ascending: false })

  if (error) {
    console.error('[api/support GET]', error.message)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ success: true, tickets: tickets ?? [] })
}

// ─── POST ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { subject?: string; scope?: string; scopeId?: string; message?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { subject, scope, scopeId, message } = body

  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Betreff und Nachricht sind erforderlich.' }, { status: 400 })
  }

  const validScopes = ['order', 'return', 'payout', 'product', 'account', 'general']
  const ticketScope = validScopes.includes(scope ?? '') ? scope! : 'general'

  // Create ticket
  const { data: ticket, error: ticketErr } = await supabaseAdmin
    .from('support_tickets')
    .insert({
      opened_by_user_id: session.user.id,
      recipient_type: 'customer',
      scope: ticketScope,
      scope_id: scopeId || null,
      subject: subject.trim(),
      status: 'open',
      priority: 'normal',
    })
    .select()
    .single()

  if (ticketErr) {
    console.error('[api/support POST] ticket:', ticketErr.message)
    return NextResponse.json({ error: 'Ticket konnte nicht erstellt werden.' }, { status: 500 })
  }

  // Create first message
  await supabaseAdmin.from('support_ticket_messages').insert({
    ticket_id: ticket.id,
    sender_type: 'customer',
    sender_user_id: session.user.id,
    body: message.trim(),
    internal_note: false,
  })

  // Admin notification
  createAdminNotification('new_message', {
    title: 'Neues Support-Ticket',
    body: `${subject.trim()} (${SCOPE_LABELS[ticketScope] || ticketScope})`,
    link: '/admin/support/tickets',
  })

  // Customer email
  void (async () => {
    try {
      const tpl = getSupportTicketCreatedEmail({
        name: session.user?.name || 'Kunde',
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
