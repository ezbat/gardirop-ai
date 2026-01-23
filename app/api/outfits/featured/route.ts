import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const season = searchParams.get('season') || 'All Season'
    const occasion = searchParams.get('occasion')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Build query
    let query = supabase
      .from('outfit_collections')
      .select(`
        id,
        name,
        description,
        season,
        occasion,
        cover_image_url,
        sellers!outfit_collections_seller_id_fkey (
          id,
          shop_name
        ),
        outfit_items (
          product_id,
          display_order,
          products (
            id,
            title,
            price,
            images,
            category,
            brand,
            stock_quantity
          )
        )
      `)
      .eq('is_active', true)

    // Filter by season if specified (or All Season)
    if (season && season !== 'All Season') {
      query = query.or(`season.eq.${season},season.eq.All Season`)
    }

    // Filter by occasion if specified
    if (occasion) {
      query = query.eq('occasion', occasion)
    }

    // Order by display_order then created_at
    query = query
      .order('display_order', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    const { data: outfits, error } = await query

    if (error) {
      console.error('Featured outfits error:', error)
      // Return empty array if table doesn't exist yet (migration not run)
      if (error.message?.includes('relation') || error.code === '42P01') {
        console.log('Migration not run yet - outfit_collections table does not exist')
        return NextResponse.json({ outfits: [] })
      }
      return NextResponse.json({ error: 'Failed to fetch outfits' }, { status: 500 })
    }

    if (!outfits || outfits.length === 0) {
      return NextResponse.json({ outfits: [] })
    }

    // Format response
    const formattedOutfits = outfits.map(outfit => ({
      id: outfit.id,
      name: outfit.name,
      description: outfit.description,
      coverImageUrl: outfit.cover_image_url,
      season: outfit.season,
      occasion: outfit.occasion,
      items: outfit.outfit_items
        .sort((a, b) => a.display_order - b.display_order)
        .map(item => ({
          productId: item.products.id,
          title: item.products.title,
          price: item.products.price,
          imageUrl: item.products.images?.[0] || '',
          category: item.products.category,
          brand: item.products.brand,
          stockQuantity: item.products.stock_quantity
        })),
      seller: {
        id: outfit.sellers?.id,
        shopName: outfit.sellers?.shop_name
      }
    }))

    return NextResponse.json({ outfits: formattedOutfits })

  } catch (error) {
    console.error('Featured outfits error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
