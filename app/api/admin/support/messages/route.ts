import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'

// GET - Tüm mesajları getir (Admin)
export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request)
    if (auth.error) return auth.error

    // Mesajları satıcı bilgileriyle getir
    const { data: messages, error } = await supabaseAdmin
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
    const auth = requireAdmin(request)
    if (auth.error) return auth.error

    const { messageId, adminReply, status } = await request.json()

    if (!messageId || !adminReply || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Mesajı güncelle
    const { data: updatedMessage, error } = await supabaseAdmin
      .from('seller_messages')
      .update({
        admin_reply: adminReply,
        status,
        updated_at: new Date().toISOString(),
        resolved_by: 'admin',
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
