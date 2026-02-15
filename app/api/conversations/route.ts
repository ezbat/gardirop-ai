import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabase } from '@/lib/supabase'

// GET: Fetch all conversations for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const userType = searchParams.get('type') // 'customer' or 'seller'

    // Check if user is a seller
    const { data: sellerData } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', userId)
      .single()

    let conversations: any[] = []

    if (userType === 'seller' && sellerData) {
      // Get conversations where user is the seller
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          product_id,
          last_message,
          last_message_at,
          seller_unread_count,
          created_at,
          customer:users!conversations_customer_id_fkey(id, name, username, avatar_url),
          product:products(id, title, images)
        `)
        .eq('seller_id', sellerData.id)
        .order('last_message_at', { ascending: false })

      if (error) throw error
      conversations = data || []

    } else {
      // Get conversations where user is the customer
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          product_id,
          last_message,
          last_message_at,
          customer_unread_count,
          created_at,
          seller:sellers(id, shop_name, logo_url, user_id),
          product:products(id, title, images)
        `)
        .eq('customer_id', userId)
        .order('last_message_at', { ascending: false })

      if (error) throw error
      conversations = data || []
    }

    return NextResponse.json({ conversations, userType: userType || 'customer' })
  } catch (error) {
    console.error('Get conversations error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Create or get existing conversation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { sellerId, productId } = await request.json()

    if (!sellerId) {
      return NextResponse.json({ error: 'Seller ID required' }, { status: 400 })
    }

    // Check if conversation already exists
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('customer_id', userId)
      .eq('seller_id', sellerId)

    if (productId) {
      query = query.eq('product_id', productId)
    } else {
      query = query.is('product_id', null)
    }

    const { data: existing } = await query.single()

    if (existing) {
      return NextResponse.json({ conversation: existing })
    }

    // Create new conversation
    const { data: newConversation, error } = await supabase
      .from('conversations')
      .insert({
        customer_id: userId,
        seller_id: sellerId,
        product_id: productId || null,
        last_message: 'Yeni sohbet',
        last_message_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ conversation: newConversation })
  } catch (error) {
    console.error('Create conversation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
