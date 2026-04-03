import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route' // ← YENİ!
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isSellerOperational } from '@/lib/seller-status'

export async function POST(request: Request) {
  try {
    // Next-Auth ile auth kontrolü
    const session = await getServerSession(authOptions) // ← authOptions eklendi!
    
    if (!session?.user?.id) {
      console.log('❌ Unauthorized: No session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    console.log('✅ Authenticated user:', userId)

    const body = await request.json()
    const {
      sellerId,
      title,
      description,
      price,
      originalPrice,
      category,
      brand,
      color,
      sizes,
      stockQuantity,
      images
    } = body

    console.log('📦 Received data:', { sellerId, title, imagesCount: images?.length })

    if (!sellerId || !title || !price || !category || !images || images.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Satıcı kontrolü + Stripe verification enforcement
    const { data: seller, error: sellerError } = await supabaseAdmin
      .from('sellers')
      .select('*')
      .eq('id', sellerId)
      .eq('user_id', userId)
      .maybeSingle()

    if (sellerError || !seller) {
      console.log('❌ Seller not found or unauthorized')
      return NextResponse.json({ error: 'Seller not found' }, { status: 403 })
    }

    if (!isSellerOperational(seller.status)) {
      return NextResponse.json({ error: 'Seller account not approved' }, { status: 403 })
    }

    // Enforce Stripe verification for product listing (production only)
    const isProduction = process.env.NODE_ENV === 'production'
    if (isProduction && (!seller.stripe_account_id || !seller.stripe_charges_enabled || !seller.stripe_payouts_enabled)) {
      return NextResponse.json({
        error: 'Stripe-Verifizierung erforderlich. Bitte schließen Sie die Verifizierung ab, bevor Sie Produkte einstellen.',
        code: 'STRIPE_VERIFICATION_REQUIRED',
        action: 'COMPLETE_ONBOARDING'
      }, { status: 403 })
    }
    if (!isProduction && (!seller.stripe_account_id || !seller.stripe_charges_enabled || !seller.stripe_payouts_enabled)) {
      console.warn('[products/create] Stripe not verified — skipping enforcement in development')
    }

    console.log('✅ Seller verified:', seller.shop_name)

    // ADMIN CLIENT İLE UPLOAD
    const imageUrls: string[] = []
    
    console.log('📸 Starting image upload...')
    
    for (const image of images) {
      try {
        const base64Data = image.data.split(',')[1]
        const buffer = Buffer.from(base64Data, 'base64')
        
        const fileExt = image.name.split('.').pop()
        const fileName = `${sellerId}/${Date.now()}_${Math.random()}.${fileExt}`
        
        console.log(`⬆️ Uploading: ${fileName}`)
        
        const { error: uploadError } = await supabaseAdmin.storage
          .from('products')
          .upload(fileName, buffer, {
            contentType: `image/${fileExt}`,
            cacheControl: '3600',
            upsert: false
          })
        
        if (uploadError) {
          console.error('❌ Upload error:', uploadError)
          throw uploadError
        }
        
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('products')
          .getPublicUrl(fileName)
        
        console.log(`✅ Uploaded: ${publicUrl}`)
        imageUrls.push(publicUrl)
      } catch (uploadError: any) {
        console.error('❌ Image upload failed:', uploadError)
        // Cleanup
        for (const url of imageUrls) {
          const path = url.split('/products/')[1]
          await supabaseAdmin.storage.from('products').remove([path])
        }
        return NextResponse.json({ 
          error: 'Failed to upload images', 
          details: uploadError.message 
        }, { status: 500 })
      }
    }

    console.log('✅ All images uploaded, creating product...')

    // Admin client ile ürün oluştur
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .insert({
        seller_id: sellerId,
        title: title,
        description: description || null,
        price: parseFloat(price),
        original_price: originalPrice ? parseFloat(originalPrice) : null,
        category: category,
        brand: brand || null,
        color: color || null,
        sizes: sizes || [],
        stock_quantity: parseInt(stockQuantity) || 0,
        images: imageUrls,
        status: 'active',
        moderation_status: 'pending'
      })
      .select()
      .maybeSingle()

    if (productError) {
      console.error('❌ Product creation error:', productError)
      // Cleanup
      for (const url of imageUrls) {
        const path = url.split('/products/')[1]
        await supabaseAdmin.storage.from('products').remove([path])
      }
      return NextResponse.json({ 
        error: 'Failed to create product', 
        details: productError.message 
      }, { status: 500 })
    }

    console.log('✅ Product created successfully:', product.id)

    return NextResponse.json({ 
      success: true,
      product: product 
    }, { status: 201 })

  } catch (error: any) {
    console.error('❌ API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error?.message || 'Unknown error' 
    }, { status: 500 })
  }
}