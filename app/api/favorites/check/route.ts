import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET: Check if products are favorited (for displaying heart icons)
// Guest-safe: returns empty map if not authenticated
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const productIds = searchParams.get('productIds')?.split(',').filter(Boolean) ?? []

  if (productIds.length === 0) {
    return NextResponse.json({ favorites: {} })
  }

  const session = await getServerSession(authOptions)
  const userId  = session?.user?.id

  if (!userId) {
    // Guest: no favorites, but don't 401
    return NextResponse.json({ favorites: {} })
  }

  const { data: favorites, error } = await supabaseAdmin
    .from('product_favorites')
    .select('product_id')
    .eq('user_id', userId)
    .in('product_id', productIds)

  if (error) {
    console.error('[api/favorites/check]', error.message)
    return NextResponse.json({ favorites: {} })
  }

  const favoritesMap = (favorites ?? []).reduce(
    (acc, fav) => { acc[fav.product_id] = true; return acc },
    {} as Record<string, boolean>,
  )

  return NextResponse.json({ favorites: favoritesMap })
}
