/**
 * GET   /api/admin/support/tickets/[id]  — get ticket detail + all messages (including internal)
 * POST  /api/admin/support/tickets/[id]  — reply or internal note
 * PATCH /api/admin/support/tickets/[id]  — update status / priority
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createCustomerNotification, createSellerNotification } from '@/lib/notifications'
import { sendEmail } from '@/lib/email'
import { getSupportTicketReplyEmail, getSupportTicketResolvedEmail } from '@/lib/email-templates'

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { id } = await params

  const { data: ticket, error: tErr } = await supabaseAdmin
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (tErr || !ticket) {
    return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 })
  }

  // Enrich with user + seller
  let user = null
  let seller = null

  if (ticket.opened_by_user_id) {
    const { data } = await supabaseAdmin.from('users').select('id, name, email, full_name').eq('id', ticket.opened_by_user_id).maybeSingle()
    user = data
  }
  if (ticket.seller_id) {
    const { data } = await supabaseAdmin.from('sellers').select('id, shop_name').eq('id', ticket.seller_id).maybeSingle()
    seller = data
  }

  // ALL messages (including internal notes for admin)
  const { data: messages } = await supabaseAdmin
    .from('support_ticket_messages')
    .select('*')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  return NextResponse.json({
    success: true,
    ticket: { ...ticket, user, seller },
    messages: messages ?? [],
  })
}

// ─── POST (reply / internal note) ───────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { id } = await params

  let body: { message?: string; internalNote?: boolean }
  try { body = await request.json() }
  catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }) }

  if (!body.message?.trim()) {
    return NextResponse.json({ success: false, error: 'Message required' }, { status: 400 })
  }

  const { data: ticket } = await supabaseAdmin
    .from('support_tickets')
    .select('id, subject, status, opened_by_user_id, seller_id, recipient_type')
    .eq('id', id)
    .maybeSingle()

  if (!ticket) return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 })

  const isInternal = body.internalNote === true

  const { data: msg, error: msgErr } = await supabaseAdmin
    .from('support_ticket_messages')
    .insert({
      ticket_id: id,
      sender_type: 'admin',
      body: body.message.trim(),
      internal_note: isInternal,
    })
    .select()
    .single()

  if (msgErr) return NextResponse.json({ success: false, error: msgErr.message }, { status: 500 })

  // Update ticket timestamps + status
  const statusUpdate: Record<string, any> = { last_message_at: new Date().toISOString() }
  if (!isInternal && ticket.status === 'open') {
    statusUpdate.status = 'in_progress'
  }
  if (!isInternal && ticket.recipient_type === 'customer') {
    statusUpdate.status = 'waiting_customer'
  }
  if (!isInternal && ticket.recipient_type === 'seller') {
    statusUpdate.status = 'waiting_seller'
  }

  await supabaseAdmin.from('support_tickets').update(statusUpdate).eq('id', id)

  // Notify user (only for non-internal replies)
  if (!isInternal) {
    notifyTicketReply(ticket)
  }

  return NextResponse.json({ success: true, message: msg })
}

// ─── PATCH (update status / priority) ───────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { id } = await params

  let body: { status?: string; priority?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }) }

  const update: Record<string, any> = {}

  const validStatuses = ['open', 'in_progress', 'waiting_customer', 'waiting_seller', 'resolved', 'closed']
  const validPriorities = ['low', 'normal', 'high', 'urgent']

  if (body.status && validStatuses.includes(body.status)) update.status = body.status
  if (body.priority && validPriorities.includes(body.priority)) update.priority = body.priority

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ success: false, error: 'Nothing to update' }, { status: 400 })
  }

  const { data: ticket } = await supabaseAdmin
    .from('support_tickets')
    .select('id, subject, opened_by_user_id, seller_id, recipient_type')
    .eq('id', id)
    .maybeSingle()

  if (!ticket) return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 })

  const { error } = await supabaseAdmin
    .from('support_tickets')
    .update(update)
    .eq('id', id)

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  // Notify on resolved
  if (update.status === 'resolved') {
    notifyTicketResolved(ticket)
  }

  return NextResponse.json({ success: true, updated: update })
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function notifyTicketReply(ticket: any) {
  void (async () => {
    try {
      const shortId = ticket.id.slice(0, 8).toUpperCase()

      if (ticket.recipient_type === 'customer' && ticket.opened_by_user_id) {
        createCustomerNotification(ticket.opened_by_user_id, 'new_message', {
          title: 'Support-Antwort',
          body: `Neue Antwort auf Ticket #${shortId}`,
          link: '/support',
        })

        const { data: user } = await supabaseAdmin.from('users').select('email, name, full_name').eq('id', ticket.opened_by_user_id).maybeSingle()
        if ((user as any)?.email) {
          const tpl = getSupportTicketReplyEmail({
            name: (user as any).full_name || (user as any).name || 'Kunde',
            ticketId: ticket.id,
            ticketSubject: ticket.subject,
          })
          await sendEmail({ to: (user as any).email, subject: tpl.subject, html: tpl.html, tag: 'support_reply' })
        }
      }

      if (ticket.recipient_type === 'seller' && ticket.seller_id) {
        createSellerNotification(ticket.seller_id, 'new_message', {
          title: 'Support-Antwort',
          body: `Neue Antwort auf Ticket #${shortId}`,
          link: '/seller/support',
        })

        const { data: seller } = await supabaseAdmin.from('sellers').select('user_id').eq('id', ticket.seller_id).maybeSingle()
        if ((seller as any)?.user_id) {
          const { data: user } = await supabaseAdmin.from('users').select('email, name').eq('id', (seller as any).user_id).maybeSingle()
          if ((user as any)?.email) {
            const tpl = getSupportTicketReplyEmail({
              name: (user as any).name || 'Verkäufer',
              ticketId: ticket.id,
              ticketSubject: ticket.subject,
            })
            await sendEmail({ to: (user as any).email, subject: tpl.subject, html: tpl.html, tag: 'support_reply' })
          }
        }
      }
    } catch {}
  })()
}

function notifyTicketResolved(ticket: any) {
  void (async () => {
    try {
      const userId = ticket.opened_by_user_id
      if (!userId) return

      const { data: user } = await supabaseAdmin.from('users').select('email, name, full_name').eq('id', userId).maybeSingle()
      if (!(user as any)?.email) return

      if (ticket.recipient_type === 'customer') {
        createCustomerNotification(userId, 'new_message', {
          title: 'Ticket gelöst',
          body: `Dein Support-Ticket #${ticket.id.slice(0, 8).toUpperCase()} wurde gelöst.`,
          link: '/support',
        })
      }

      const tpl = getSupportTicketResolvedEmail({
        name: (user as any).full_name || (user as any).name || 'Kunde',
        ticketId: ticket.id,
        ticketSubject: ticket.subject,
      })
      await sendEmail({ to: (user as any).email, subject: tpl.subject, html: tpl.html, tag: 'support_resolved' })
    } catch {}
  })()
}
