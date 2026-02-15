import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabase } from '@/lib/supabase'

// GET: Fetch messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const conversationId = id
    const userId = session.user.id

    // Verify user is part of this conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('customer_id, seller:sellers(user_id)')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const isCustomer = conversation.customer_id === userId
    const sellerData = Array.isArray(conversation.seller) ? conversation.seller[0] : conversation.seller
    const isSeller = sellerData?.user_id === userId

    if (!isCustomer && !isSeller) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get messages
    const { data: messages, error } = await supabase
      .from('conversation_messages')
      .select(`
        id,
        sender_id,
        sender_type,
        message,
        is_read,
        created_at
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Mark messages as read
    const readerType = isCustomer ? 'customer' : 'seller'
    await supabase.rpc('mark_messages_read', {
      p_conversation_id: conversationId,
      p_reader_type: readerType
    })

    return NextResponse.json({ messages: messages || [] })
  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const conversationId = id
    const userId = session.user.id
    const { message } = await request.json()

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
    }

    // Verify user is part of this conversation and determine sender type
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('customer_id, seller:sellers(user_id)')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const isCustomer = conversation.customer_id === userId
    const sellerData = Array.isArray(conversation.seller) ? conversation.seller[0] : conversation.seller
    const isSeller = sellerData?.user_id === userId

    if (!isCustomer && !isSeller) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const senderType = isCustomer ? 'customer' : 'seller'

    // Send message
    const { data: newMessage, error } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        sender_type: senderType,
        message: message.trim()
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ message: newMessage })
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
