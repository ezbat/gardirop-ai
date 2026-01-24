import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET: Check if products are favorited (for displaying heart icons)
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const { searchParams } = new URL(request.url)
    const productIds = searchParams.get('productIds')?.split(',') || []

    if (!userId) {
      return NextResponse.json({ favorites: {} })
    }

    if (productIds.length === 0) {
      return NextResponse.json({ favorites: {} })
    }

    const { data: favorites, error } = await supabase
      .from('product_favorites')
      .select('product_id')
      .eq('user_id', userId)
      .in('product_id', productIds)

    if (error) {
      console.error('Error checking favorites:', error)
      return NextResponse.json({ favorites: {} })
    }

    // Convert to map for easy lookup
    const favoritesMap = favorites.reduce((acc, fav) => {
      acc[fav.product_id] = true
      return acc
    }, {} as Record<string, boolean>)

    return NextResponse.json({ favorites: favoritesMap })
  } catch (error) {
    console.error('Check favorites error:', error)
    return NextResponse.json({ favorites: {} })
  }
}
