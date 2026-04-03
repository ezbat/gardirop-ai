import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createSellerNotification } from '@/lib/notifications'
import { requireAdmin } from '@/lib/admin-auth'

// GET: Fetch all products with moderation status filter
export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request)
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // pending, approved, rejected

    let query = supabaseAdmin
      .from('products')
      .select(`
        *,
        seller:sellers(id, shop_name, phone)
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('moderation_status', status)
    }

    const { data: products, error } = await query

    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH: Update product moderation status
export async function PATCH(request: NextRequest) {
  try {
    const auth = requireAdmin(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { productId, action, notes } = body

    if (!productId || !action) {
      return NextResponse.json({ error: 'productId and action are required' }, { status: 400 })
    }

    // Map action to status
    const status = action === 'approve' ? 'approved' : 'rejected'

    // Update product moderation status
    const updateData: any = {
      moderation_status: status,
      moderated_by: 'admin',
      moderated_at: new Date().toISOString(),
    }

    if (notes) {
      updateData.moderation_notes = notes
    }

    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single()

    if (productError) {
      console.error('Error updating product:', productError)
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
    }

    // Log admin action
    await supabaseAdmin.from('admin_actions').insert({
      admin_id: 'admin',
      action_type: `${status}_product`,
      target_type: 'product',
      target_id: productId,
      details: { status, notes },
    })

    // Best-effort seller notification
    if (product?.seller_id) {
      if (action === 'approve') {
        createSellerNotification(product.seller_id, 'product_approved', {
          body: `"${product.title ?? 'Dein Produkt'}" ist jetzt im Shop sichtbar.`,
          link: `/seller/products/${productId}`,
        })
      } else {
        createSellerNotification(product.seller_id, 'product_rejected', {
          body: notes
            ? `"${product.title ?? 'Dein Produkt'}" wurde abgelehnt. Grund: ${notes}`
            : `"${product.title ?? 'Dein Produkt'}" wurde leider nicht genehmigt.`,
          link: `/seller/products/${productId}`,
        })
      }
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Product moderation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
