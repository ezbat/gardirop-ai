import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET - Check if product is in wishlist (guest-safe: returns false)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ inWishlist: false })
    }

    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('wishlists')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('product_id', productId)
      .maybeSingle()

    if (error) {
      console.error('Wishlist check error:', error)
      return NextResponse.json({ inWishlist: false })
    }

    return NextResponse.json({ inWishlist: !!data })
  } catch (error) {
    console.error('Wishlist check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
