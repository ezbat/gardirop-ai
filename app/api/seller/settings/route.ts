import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: seller, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    return NextResponse.json({ seller })
  } catch (error) {
    console.error('Get seller settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const body = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      shop_name,
      description, // this will map to shop_description
      phone,
      address,
      city,
      postal_code,
      country,
      bank_name,
      account_holder,
      iban,
      paypal_email
    } = body

    const { data: seller, error: findError } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (findError || !seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    const { data: updatedSeller, error: updateError } = await supabase
      .from('sellers')
      .update({
        shop_name,
        shop_description: description,
        phone,
        address,
        city,
        postal_code,
        country,
        bank_name,
        account_holder,
        iban,
        paypal_email,
        updated_at: new Date().toISOString()
      })
      .eq('id', seller.id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ seller: updatedSeller })
  } catch (error) {
    console.error('Update seller settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
