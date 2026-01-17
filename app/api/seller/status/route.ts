import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Check if user is already a seller
    const { data: seller } = await supabase
      .from('sellers')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (seller) {
      return NextResponse.json({ 
        isSeller: true, 
        seller,
        application: null 
      })
    }

    // Check for pending/rejected application
    const { data: application } = await supabase
      .from('seller_applications')
      .select('*')
      .eq('user_id', userId)
      .single()

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