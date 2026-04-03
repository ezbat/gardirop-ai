import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request)
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabaseAdmin
      .from('seller_requests')
      .select(`
        *,
        seller:sellers(id, shop_name, phone, user_id)
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: requests, error } = await query

    if (error) throw error

    return NextResponse.json({ requests: requests || [] })
  } catch (error) {
    console.error('Get seller requests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = requireAdmin(request)
    if (auth.error) return auth.error

    const { requestId, status, adminResponse } = await request.json()

    if (!requestId || !status) {
      return NextResponse.json({ error: 'Request ID and status required' }, { status: 400 })
    }

    const { data: updatedRequest, error } = await supabaseAdmin
      .from('seller_requests')
      .update({
        status,
        admin_response: adminResponse,
        processed_by: 'admin',
        processed_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, request: updatedRequest })
  } catch (error) {
    console.error('Update seller request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
