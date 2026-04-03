import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET: Fetch all conversations for current user
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  const { searchParams } = new URL(request.url)
  const userType = searchParams.get('type') // 'customer' or 'seller'

  // Check if user is a seller (maybeSingle — not every user is a seller)
  const { data: sellerData } = await supabaseAdmin
    .from('sellers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  let conversations: unknown[] = []

  if (userType === 'seller' && sellerData) {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select(`
        id,
        product_id,
        last_message,
        last_message_at,
        seller_unread_count,
        created_at,
        customer:users!conversations_customer_id_fkey(id, name, username, avatar_url, email),
        product:products(id, title, images)
      `)
      .eq('seller_id', sellerData.id)
      .order('last_message_at', { ascending: false })

    if (error) {
      console.error('[api/conversations GET seller]', error.message)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
    conversations = data ?? []

  } else {
    const { data, error } = await supabaseAdmin
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

    if (error) {
      console.error('[api/conversations GET customer]', error.message)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
    conversations = data ?? []
  }

  return NextResponse.json({ conversations, userType: userType ?? 'customer' })
}

// POST: Create or get existing conversation
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  const body   = await request.json().catch(() => null)
  const { sellerId, productId } = (body ?? {}) as { sellerId?: string; productId?: string }

  if (!sellerId) {
    return NextResponse.json({ error: 'Seller ID required' }, { status: 400 })
  }

  // Check if conversation already exists (maybeSingle — may be 0 or 1 rows)
  let query = supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('customer_id', userId)
    .eq('seller_id', sellerId)

  if (productId) {
    query = query.eq('product_id', productId)
  } else {
    query = query.is('product_id', null)
  }

  const { data: existing } = await query.maybeSingle()

  if (existing) {
    return NextResponse.json({ conversation: existing })
  }

  // Create new conversation — German default last_message
  const { data: newConversation, error } = await supabaseAdmin
    .from('conversations')
    .insert({
      customer_id:     userId,
      seller_id:       sellerId,
      product_id:      productId ?? null,
      last_message:    'Neues Gespräch',
      last_message_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[api/conversations POST]', error.message)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ conversation: newConversation })
}
