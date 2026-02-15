import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: seller } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    const { data: requests, error } = await supabase
      .from('seller_requests')
      .select('*')
      .eq('seller_id', seller.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ requests: requests || [] })
  } catch (error) {
    console.error('Get seller requests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const { requestType, currentValue, requestedValue, reason } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!requestType || !reason) {
      return NextResponse.json({ error: 'Request type and reason required' }, { status: 400 })
    }

    const { data: seller } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    const { data: sellerRequest, error } = await supabase
      .from('seller_requests')
      .insert([{
        seller_id: seller.id,
        request_type: requestType,
        current_value: currentValue,
        requested_value: requestedValue,
        reason
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, request: sellerRequest })
  } catch (error) {
    console.error('Create seller request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
