/**
 * GET  /api/seller/support/[id]  — seller: get ticket detail + messages
 * POST /api/seller/support/[id]  — seller: reply to ticket
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createAdminNotification } from '@/lib/notifications'

async function resolveSeller(userId: string) {
  const { data } = await supabaseAdmin
    .from('sellers')
    .select('id, shop_name')
    .eq('user_id', userId)
    .in('status', ['active', 'approved'])
    .maybeSingle()
  return data
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const seller = await resolveSeller(session.user.id)
  if (!seller) return NextResponse.json({ error: 'Seller not found' }, { status: 404 })

  const { id } = await params

  const { data: ticket } = await supabaseAdmin
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .eq('seller_id', seller.id)
    .maybeSingle()

  if (!ticket) return NextResponse.json({ error: 'Ticket nicht gefunden.' }, { status: 404 })

  const { data: messages } = await supabaseAdmin
    .from('support_ticket_messages')
    .select('id, created_at, sender_type, body')
    .eq('ticket_id', id)
    .eq('internal_note', false)
    .order('created_at', { ascending: true })

  return NextResponse.json({ success: true, ticket, messages: messages ?? [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const seller = await resolveSeller(session.user.id)
  if (!seller) return NextResponse.json({ error: 'Seller not found' }, { status: 404 })

  const { id } = await params

  let body: { message?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (!body.message?.trim()) {
    return NextResponse.json({ error: 'Nachricht ist erforderlich.' }, { status: 400 })
  }

  const { data: ticket } = await supabaseAdmin
    .from('support_tickets')
    .select('id, subject, status')
    .eq('id', id)
    .eq('seller_id', seller.id)
    .maybeSingle()

  if (!ticket) return NextResponse.json({ error: 'Ticket nicht gefunden.' }, { status: 404 })
  if (ticket.status === 'closed') return NextResponse.json({ error: 'Ticket ist geschlossen.' }, { status: 400 })

  const { data: msg, error: msgErr } = await supabaseAdmin
    .from('support_ticket_messages')
    .insert({
      ticket_id: id,
      sender_type: 'seller',
      sender_user_id: session.user.id,
      sender_seller_id: seller.id,
      body: body.message.trim(),
      internal_note: false,
    })
    .select()
    .maybeSingle()

  if (msgErr) return NextResponse.json({ error: 'Senden fehlgeschlagen.' }, { status: 500 })

  await supabaseAdmin
    .from('support_tickets')
    .update({
      last_message_at: new Date().toISOString(),
      status: ticket.status === 'waiting_seller' ? 'open' : ticket.status,
    })
    .eq('id', id)

  createAdminNotification('new_message', {
    title: 'Seller-Ticket Antwort',
    body: `${seller.shop_name} hat auf Ticket #${id.slice(0, 8).toUpperCase()} geantwortet`,
    link: '/admin/support/tickets',
  })

  return NextResponse.json({ success: true, message: msg })
}
