import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - Satıcının mesajlarını getir
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Satıcı ID'sini bul
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    // Mesajları getir (Tablo yoksa boş array dön)
    const { data: messages, error } = await supabase
      .from('seller_messages')
      .select('*')
      .eq('seller_id', seller.id)
      .order('created_at', { ascending: false })

    if (error) {
      // Tablo yoksa veya başka bir hata varsa boş array dön
      console.log('Seller messages table may not exist yet:', error.message)
      return NextResponse.json({ messages: [] })
    }

    return NextResponse.json({ messages: messages || [] })
  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Yeni mesaj gönder
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const { subject, message } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message required' }, { status: 400 })
    }

    // Satıcı ID'sini bul
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    // Mesajı oluştur (Tablo yoksa hata mesajı dön)
    const { data: newMessage, error } = await supabase
      .from('seller_messages')
      .insert([{
        seller_id: seller.id,
        subject,
        message,
        status: 'pending'
      }])
      .select()
      .single()

    if (error) {
      // Tablo yoksa veya başka bir hata varsa kullanıcıya bildir
      console.error('Create message error:', error.message)
      return NextResponse.json({
        error: 'Destek sistemi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin veya doğrudan admin ile iletişime geçin.'
      }, { status: 503 })
    }

    return NextResponse.json({ success: true, message: newMessage })
  } catch (error) {
    console.error('Create message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
