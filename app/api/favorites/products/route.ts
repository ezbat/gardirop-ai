import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ─── Shared auth helper ───────────────────────────────────────────────────────
async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  return session?.user?.id ?? null
}

// GET: Get user's favorite products
export async function GET(_request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    // Guest-safe: return empty list instead of 401 spam
    return NextResponse.json({ favorites: [] })
  }

  const { data: favorites, error } = await supabaseAdmin
    .from('product_favorites')
    .select(`
      id, product_id, created_at,
      product:products(
        id, title, price, original_price, images, moderation_status,
        seller:sellers(id, shop_name)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[api/favorites/products GET]', error.message)
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 })
  }

  return NextResponse.json({ favorites: favorites ?? [] })
}

// POST: Add product to favorites
export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Anmeldung erforderlich' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const productId: string | undefined = body?.productId

  if (!productId) {
    return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
  }

  const { data: favorite, error } = await supabaseAdmin
    .from('product_favorites')
    .insert({ user_id: userId, product_id: productId })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already in favorites' }, { status: 409 })
    }
    console.error('[api/favorites/products POST]', error.message)
    return NextResponse.json({ error: 'Failed to add to favorites' }, { status: 500 })
  }

  return NextResponse.json({ favorite })
}

// DELETE: Remove product from favorites
export async function DELETE(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Anmeldung erforderlich' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('productId')

  if (!productId) {
    return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('product_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId)

  if (error) {
    console.error('[api/favorites/products DELETE]', error.message)
    return NextResponse.json({ error: 'Failed to remove from favorites' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
