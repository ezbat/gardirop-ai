/**
 * GET  /api/support/[id]  — customer: get ticket detail + messages
 * POST /api/support/[id]  — customer: reply to ticket
 *
 * Auth: getServerSession (NextAuth) — only own tickets
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createAdminNotification } from '@/lib/notifications'

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Verify ownership
  const { data: ticket, error: tErr } = await supabaseAdmin
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .eq('opened_by_user_id', session.user.id)
    .maybeSingle()

  if (tErr || !ticket) {
    return NextResponse.json({ error: 'Ticket nicht gefunden.' }, { status: 404 })
  }

  // Get messages (exclude internal notes)
  const { data: messages } = await supabaseAdmin
    .from('support_ticket_messages')
    .select('id, created_at, sender_type, body')
    .eq('ticket_id', id)
    .eq('internal_note', false)
    .order('created_at', { ascending: true })

  return NextResponse.json({ success: true, ticket, messages: messages ?? [] })
}

// ─── POST (reply) ───────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let body: { message?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (!body.message?.trim()) {
    return NextResponse.json({ error: 'Nachricht ist erforderlich.' }, { status: 400 })
  }

  // Verify ownership
  const { data: ticket } = await supabaseAdmin
    .from('support_tickets')
    .select('id, subject, status')
    .eq('id', id)
    .eq('opened_by_user_id', session.user.id)
    .maybeSingle()

  if (!ticket) {
    return NextResponse.json({ error: 'Ticket nicht gefunden.' }, { status: 404 })
  }

  if (['closed'].includes(ticket.status)) {
    return NextResponse.json({ error: 'Dieses Ticket ist geschlossen.' }, { status: 400 })
  }

  // Insert message
  const { data: msg, error: msgErr } = await supabaseAdmin
    .from('support_ticket_messages')
    .insert({
      ticket_id: id,
      sender_type: 'customer',
      sender_user_id: session.user.id,
      body: body.message.trim(),
      internal_note: false,
    })
    .select()
    .single()

  if (msgErr) {
    return NextResponse.json({ error: 'Nachricht konnte nicht gesendet werden.' }, { status: 500 })
  }

  // Update ticket
  const now = new Date().toISOString()
  await supabaseAdmin
    .from('support_tickets')
    .update({
      last_message_at: now,
      status: ticket.status === 'waiting_customer' ? 'open' : ticket.status,
    })
    .eq('id', id)

  // Admin notification
  createAdminNotification('new_message', {
    title: 'Ticket-Antwort',
    body: `Kunde hat auf Ticket #${id.slice(0, 8).toUpperCase()} geantwortet`,
    link: '/admin/support/tickets',
  })

  return NextResponse.json({ success: true, message: msg })
}
