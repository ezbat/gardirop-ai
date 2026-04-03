import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isSellerOperational } from '@/lib/seller-status'

export async function POST(request: Request) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    // 2. Verify seller
    const { data: seller } = await supabaseAdmin
      .from('sellers')
      .select('id, status')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (!seller || !isSellerOperational(seller.status)) {
      return NextResponse.json({ error: 'Kein aktives Verkäuferkonto' }, { status: 403 })
    }

    const { orderId, status } = await request.json()

    if (!orderId || !status) {
      return NextResponse.json({ error: 'orderId and status required' }, { status: 400 })
    }

    // 3. Verify the seller owns this order (through order_items → products)
    const { data: orderItem } = await supabaseAdmin
      .from('order_items')
      .select('id, product:products!inner(seller_id)')
      .eq('order_id', orderId)
      .eq('products.seller_id', seller.id)
      .limit(1)
      .maybeSingle()

    if (!orderItem) {
      return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 })
    }

    // 4. Update order status
    const { error } = await supabaseAdmin
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update status error:', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}
