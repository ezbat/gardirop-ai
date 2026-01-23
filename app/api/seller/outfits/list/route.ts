import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const sellerId = searchParams.get('sellerId')

    if (!sellerId) {
      return NextResponse.json({ error: 'Seller ID required' }, { status: 400 })
    }

    // Verify seller ownership
    const { data: seller } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('id', sellerId)
      .single()

    if (!seller) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Get all outfits for this seller with product counts
    const { data: outfits, error } = await supabase
      .from('outfit_collections')
      .select(`
        id,
        name,
        description,
        season,
        occasion,
        cover_image_url,
        is_active,
        created_at,
        outfit_items(count)
      `)
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('List outfits error:', error)
      return NextResponse.json({ error: 'Failed to fetch outfits' }, { status: 500 })
    }

    // Format response
    const formattedOutfits = outfits.map(outfit => ({
      id: outfit.id,
      name: outfit.name,
      description: outfit.description,
      season: outfit.season,
      occasion: outfit.occasion,
      coverImageUrl: outfit.cover_image_url,
      isActive: outfit.is_active,
      productsCount: Array.isArray(outfit.outfit_items) ? outfit.outfit_items[0]?.count || 0 : 0,
      createdAt: outfit.created_at
    }))

    return NextResponse.json({ outfits: formattedOutfits })

  } catch (error) {
    console.error('List outfits error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
