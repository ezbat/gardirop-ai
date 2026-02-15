import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET: Fetch all products with moderation status filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // pending, approved, rejected
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin check (simplified for m3000)
    if (userId !== 'm3000') {
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (user?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
      }
    }

    let query = supabase
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
    const userId = request.headers.get('x-user-id')
    const body = await request.json()
    const { productId, action, notes } = body

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin check (simplified for m3000)
    if (userId !== 'm3000') {
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (user?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
      }
    }

    if (!productId || !action) {
      return NextResponse.json({ error: 'productId and action are required' }, { status: 400 })
    }

    // Map action to status
    const status = action === 'approve' ? 'approved' : 'rejected'

    // Update product moderation status
    const updateData: any = {
      moderation_status: status,
      moderated_by: userId,
      moderated_at: new Date().toISOString(),
    }

    if (notes) {
      updateData.moderation_notes = notes
    }

    const { data: product, error: productError } = await supabase
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
    await supabase.from('admin_actions').insert({
      admin_id: userId,
      action_type: `${status}_product`,
      target_type: 'product',
      target_id: productId,
      details: { status, notes },
    })

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Product moderation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
