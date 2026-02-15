import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: outfitId } = await params

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
        .sort((a: any, b: any) => a.display_order - b.display_order)
        .map((item: any) => {
          const product = Array.isArray(item.products) ? item.products[0] : item.products
          return {
            productId: product?.id,
            title: product?.title,
            description: product?.description,
            price: product?.price,
            originalPrice: product?.original_price,
            images: product?.images || [],
            category: product?.category,
            brand: product?.brand,
            stockQuantity: product?.stock_quantity,
            sizes: product?.sizes || [],
            isRequired: item.is_required
          }
        }),
      seller: {
        id: (Array.isArray(outfit.sellers) ? outfit.sellers[0] : outfit.sellers)?.id,
        shopName: (Array.isArray(outfit.sellers) ? outfit.sellers[0] : outfit.sellers)?.shop_name,
        logoUrl: (Array.isArray(outfit.sellers) ? outfit.sellers[0] : outfit.sellers)?.logo_url
      },
      totalPrice: outfit.outfit_items.reduce((sum: number, item: any) => {
        const product = Array.isArray(item.products) ? item.products[0] : item.products
        return sum + (product?.price || 0)
      }, 0)
    }

    return NextResponse.json({ outfit: formattedOutfit })

  } catch (error) {
    console.error('Outfit detail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
