import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const outfitId = params.id

    if (!outfitId) {
      return NextResponse.json({ error: 'Outfit ID required' }, { status: 400 })
    }

    // Get outfit with all details
    const { data: outfit, error } = await supabase
      .from('outfit_collections')
      .select(`
        id,
        name,
        description,
        season,
        occasion,
        style_tags,
        cover_image_url,
        is_active,
        created_at,
        sellers!outfit_collections_seller_id_fkey (
          id,
          shop_name,
          logo_url
        ),
        outfit_items (
          product_id,
          display_order,
          is_required,
          products (
            id,
            title,
            description,
            price,
            original_price,
            images,
            category,
            brand,
            stock_quantity,
            sizes
          )
        )
      `)
      .eq('id', outfitId)
      .single()

    if (error || !outfit) {
      console.error('Outfit detail error:', error)
      return NextResponse.json({ error: 'Outfit not found' }, { status: 404 })
    }

    // Format response
    const formattedOutfit = {
      id: outfit.id,
      name: outfit.name,
      description: outfit.description,
      coverImageUrl: outfit.cover_image_url,
      season: outfit.season,
      occasion: outfit.occasion,
      styleTags: outfit.style_tags || [],
      isActive: outfit.is_active,
      createdAt: outfit.created_at,
      items: outfit.outfit_items
        .sort((a, b) => a.display_order - b.display_order)
        .map(item => ({
          productId: item.products.id,
          title: item.products.title,
          description: item.products.description,
          price: item.products.price,
          originalPrice: item.products.original_price,
          images: item.products.images || [],
          category: item.products.category,
          brand: item.products.brand,
          stockQuantity: item.products.stock_quantity,
          sizes: item.products.sizes || [],
          isRequired: item.is_required
        })),
      seller: {
        id: outfit.sellers?.id,
        shopName: outfit.sellers?.shop_name,
        logoUrl: outfit.sellers?.logo_url
      },
      totalPrice: outfit.outfit_items.reduce((sum, item) => sum + (item.products.price || 0), 0)
    }

    return NextResponse.json({ outfit: formattedOutfit })

  } catch (error) {
    console.error('Outfit detail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
