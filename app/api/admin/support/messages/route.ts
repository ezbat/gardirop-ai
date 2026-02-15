import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - Tüm mesajları getir (Admin)
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin kontrolü (m3000 için basitleştirilmiş)
    if (userId !== 'm3000') {
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 })
      }
    }

    // Mesajları satıcı bilgileriyle getir
    const { data: messages, error } = await supabase
      .from('seller_messages')
      .select(`
        *,
        seller:sellers(id, shop_name, phone)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ messages: messages || [] })
  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Mesaja yanıt ver (Admin)
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const { messageId, adminReply, status } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!messageId || !adminReply || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Admin kontrolü (m3000 için basitleştirilmiş)
    if (userId !== 'm3000') {
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 })
      }
    }

    // Mesajı güncelle
    const { data: updatedMessage, error } = await supabase
      .from('seller_messages')
      .update({
        admin_reply: adminReply,
        status,
        updated_at: new Date().toISOString(),
        resolved_by: userId,
        resolved_at: status === 'resolved' || status === 'closed' ? new Date().toISOString() : null
      })
      .eq('id', messageId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, message: updatedMessage })
  } catch (error) {
    console.error('Update message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
