import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Check if user is already a seller (using admin client to bypass RLS)
    const { data: seller, error: sellerError } = await supabaseAdmin
      .from('sellers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (sellerError) {
      console.error('Seller query error:', sellerError)
    }

    if (seller) {
      return NextResponse.json({
        isSeller: true,
        seller,
        application: null
      })
    }

    // Check for pending/rejected application
    const { data: application, error: appError } = await supabaseAdmin
      .from('seller_applications')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (appError) {
      console.error('Application query error:', appError)
    }

    return NextResponse.json({
      isSeller: false,
      seller: null,
      application
    })
  } catch (error) {
    console.error('Seller status error:', error)
    return NextResponse.json({
      isSeller: false,
      seller: null,
      application: null
    })
  }
}