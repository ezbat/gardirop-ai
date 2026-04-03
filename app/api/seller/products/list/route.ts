import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isSellerOperational } from '@/lib/seller-status'

export async function GET(request: NextRequest) {
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

    // 3. Get products for this seller (scoped to their own seller_id)
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('seller_id', seller.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Load products error:', error)
      return NextResponse.json({ error: 'Load failed' }, { status: 500 })
    }

    return NextResponse.json({ products: products || [] })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
