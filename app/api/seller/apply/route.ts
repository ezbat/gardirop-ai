import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { 
      userId, 
      shopName, 
      shopDescription, 
      businessType,
      taxNumber,
      phone,
      address,
      city
    } = await request.json()
    
    if (!userId || !shopName || !phone) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
    }

    // Check if user already has an application
    const { data: existingApp } = await supabase
      .from('seller_applications')
      .select('id, status')
      .eq('user_id', userId)
      .single()

    if (existingApp) {
      if (existingApp.status === 'pending') {
        return NextResponse.json({ error: 'Başvurunuz zaten inceleniyor' }, { status: 400 })
      }
      if (existingApp.status === 'approved') {
        return NextResponse.json({ error: 'Zaten satıcısınız' }, { status: 400 })
      }
    }

    // Check if user is already a seller
    const { data: existingSeller } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (existingSeller) {
      return NextResponse.json({ error: 'Zaten satıcısınız' }, { status: 400 })
    }

    // Create application
    const { data: application, error } = await supabase
      .from('seller_applications')
      .upsert({
        user_id: userId,
        shop_name: shopName,
        shop_description: shopDescription || null,
        business_type: businessType || 'individual',
        tax_number: taxNumber || null,
        phone,
        address: address || null,
        city: city || null,
        status: 'pending'
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ success: true, application })
  } catch (error) {
    console.error('Seller application error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}