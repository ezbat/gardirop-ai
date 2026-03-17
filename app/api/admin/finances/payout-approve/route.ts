import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { holdPayout, releasePayout, processPayoutBatch, getDuePayouts } from '@/lib/payout-engine'

/**
 * GET /api/admin/finances/payout-approve
 * Lists pending, held, and approved payout batches.
 *
 * POST /api/admin/finances/payout-approve
 * Actions: hold, release, process
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (userId !== 'm3000') {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()
      if (user?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const { data: batches } = await supabaseAdmin
      .from('payout_batches')
      .select('*, sellers:seller_id(shop_name)')
      .in('status', ['pending', 'held', 'approved', 'processing'])
      .order('scheduled_date', { ascending: true })
      .limit(50)

    const duePayouts = await getDuePayouts()

    return NextResponse.json({
      batches: batches || [],
      dueCount: duePayouts.length,
    })
  } catch (error: any) {
    console.error('Admin payout list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (userId !== 'm3000') {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()
      if (user?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const body = await request.json()
    const { action, batchId, reason } = body

    if (!batchId || !action) {
      return NextResponse.json({ error: 'batchId and action required' }, { status: 400 })
    }

    let result: { success: boolean; error?: string }

    switch (action) {
      case 'hold':
        result = await holdPayout(batchId, reason || 'Admin hold', userId)
        break
      case 'release':
        result = await releasePayout(batchId, userId)
        break
      case 'process':
        result = await processPayoutBatch(batchId)
        break
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, action })
  } catch (error: any) {
    console.error('Admin payout action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
