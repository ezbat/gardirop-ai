import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createCustomerNotification, createSellerNotification } from '@/lib/notifications'

// GET: Fetch messages for a conversation
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: conversationId } = params instanceof Promise ? await params : params
  const userId = session.user.id

  // Verify user is part of this conversation (maybeSingle — may not exist)
  const { data: conversation, error: convError } = await supabaseAdmin
    .from('conversations')
    .select('customer_id, seller:sellers(user_id)')
    .eq('id', conversationId)
    .maybeSingle()

  if (convError) {
    console.error('[api/conversations/[id]/messages GET]', convError.message)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const isCustomer = conversation.customer_id === userId
  const sellerData = Array.isArray(conversation.seller) ? conversation.seller[0] : conversation.seller
  const isSeller   = (sellerData as any)?.user_id === userId

  if (!isCustomer && !isSeller) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: messages, error } = await supabaseAdmin
    .from('conversation_messages')
    .select('id, sender_id, sender_type, message, is_read, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[api/conversations/[id]/messages GET messages]', error.message)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // Mark messages as read (best-effort; ignore RPC errors)
  const readerType = isCustomer ? 'customer' : 'seller'
  await supabaseAdmin.rpc('mark_messages_read', {
    p_conversation_id: conversationId,
    p_reader_type:     readerType,
  }).then(({ error: rpcErr }) => {
    if (rpcErr) console.warn('[api/conversations mark_messages_read]', rpcErr.message)
  })

  return NextResponse.json({ messages: messages ?? [] })
}

// POST: Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: conversationId } = params instanceof Promise ? await params : params
  const userId = session.user.id

  const body = await request.json().catch(() => null)
  const message: string = (body?.message ?? '').trim()
  if (!message) {
    return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
  }

  // Verify sender belongs to this conversation
  const { data: conversation, error: convError } = await supabaseAdmin
    .from('conversations')
    .select('customer_id, seller_id, seller:sellers(user_id)')
    .eq('id', conversationId)
    .maybeSingle()

  if (convError) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const isCustomer = conversation.customer_id === userId
  const sellerData = Array.isArray(conversation.seller) ? conversation.seller[0] : conversation.seller
  const isSeller   = (sellerData as any)?.user_id === userId

  if (!isCustomer && !isSeller) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const senderType = isCustomer ? 'customer' : 'seller'

  const { data: newMessage, error } = await supabaseAdmin
    .from('conversation_messages')
    .insert({
      conversation_id: conversationId,
      sender_id:       userId,
      sender_type:     senderType,
      message,
    })
    .select()
    .single()

  if (error) {
    console.error('[api/conversations/[id]/messages POST]', error.message)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // Update last_message on conversation (best-effort, ignore errors)
  await supabaseAdmin
    .from('conversations')
    .update({
      last_message:    message.slice(0, 200),
      last_message_at: new Date().toISOString(),
    })
    .eq('id', conversationId)

  // Best-effort new_message notification to the OTHER party
  const snippet = message.length > 80 ? message.slice(0, 77) + '…' : message
  if (isCustomer) {
    // Customer sent → notify seller
    if ((conversation as any).seller_id) {
      createSellerNotification((conversation as any).seller_id, 'new_message', {
        body: snippet,
        link: `/seller/messages?conversationId=${conversationId}`,
      })
    }
  } else {
    // Seller sent → notify customer
    if (conversation.customer_id) {
      createCustomerNotification(conversation.customer_id, 'new_message', {
        body: snippet,
        link: `/messages?conversationId=${conversationId}`,
      })
    }
  }

  return NextResponse.json({ message: newMessage })
}
