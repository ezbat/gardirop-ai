import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { data: seller, error } = await supabaseAdmin
      .from('sellers')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()

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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const body = await request.json()

    const {
      shop_name,
      description,
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

    const { data: seller, error: findError } = await supabaseAdmin
      .from('sellers')
      .select('id')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (findError || !seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    const { data: updatedSeller, error: updateError } = await supabaseAdmin
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
      .maybeSingle()

    if (updateError) throw updateError

    return NextResponse.json({ seller: updatedSeller })
  } catch (error) {
    console.error('Update seller settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
