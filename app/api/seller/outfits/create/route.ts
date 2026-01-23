import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      sellerId,
      name,
      description,
      season,
      occasion,
      styleTags,
      coverImageData, // Base64 image data
      coverImageName,
      productIds
    } = body

    // Validate seller ownership
    if (sellerId !== session.user.id) {
      const { data: seller } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('id', sellerId)
        .single()

      if (!seller) {
        return NextResponse.json({ error: 'Not authorized for this seller' }, { status: 403 })
      }
    }

    // Validate inputs
    if (!name || !productIds || productIds.length < 2) {
      return NextResponse.json(
        { error: 'Name and at least 2 products are required' },
        { status: 400 }
      )
    }

    // Verify all products belong to this seller
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id')
      .eq('seller_id', sellerId)
      .in('id', productIds)

    if (productsError || !products || products.length !== productIds.length) {
      return NextResponse.json(
        { error: 'All products must belong to your store' },
        { status: 400 }
      )
    }

    // Upload cover image to Supabase Storage
    let coverImageUrl = null
    if (coverImageData && coverImageName) {
      try {
        // Convert base64 to buffer
        const base64Data = coverImageData.replace(/^data:image\/\w+;base64,/, '')
        const buffer = Buffer.from(base64Data, 'base64')

        const fileName = `${sellerId}/${Date.now()}_${coverImageName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('outfit-images')
          .upload(fileName, buffer, {
            contentType: 'image/jpeg',
            upsert: false
          })

        if (uploadError) {
          console.error('Cover image upload error:', uploadError)
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('outfit-images')
            .getPublicUrl(fileName)
          coverImageUrl = publicUrl
        }
      } catch (uploadError) {
        console.error('Image processing error:', uploadError)
        // Continue without cover image
      }
    }

    // Create outfit collection
    const { data: outfit, error: outfitError } = await supabase
      .from('outfit_collections')
      .insert({
        seller_id: sellerId,
        name,
        description: description || null,
        season: season || 'All Season',
        occasion: occasion || 'Casual',
        style_tags: styleTags || [],
        cover_image_url: coverImageUrl,
        is_active: true,
        display_order: 0
      })
      .select()
      .single()

    if (outfitError) {
      console.error('Outfit creation error:', outfitError)
      return NextResponse.json({ error: 'Failed to create outfit' }, { status: 500 })
    }

    // Add products to outfit
    const outfitItems = productIds.map((productId: string, index: number) => ({
      outfit_id: outfit.id,
      product_id: productId,
      display_order: index,
      is_required: true
    }))

    const { error: itemsError } = await supabase
      .from('outfit_items')
      .insert(outfitItems)

    if (itemsError) {
      console.error('Outfit items creation error:', itemsError)
      // Rollback: delete the outfit
      await supabase.from('outfit_collections').delete().eq('id', outfit.id)
      return NextResponse.json({ error: 'Failed to add products to outfit' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      outfit: {
        id: outfit.id,
        name: outfit.name,
        productsCount: productIds.length
      }
    })

  } catch (error) {
    console.error('Create outfit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
