import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { holdPayout, releasePayout, processPayoutBatch, getDuePayouts } from '@/lib/payout-engine'
import { createSellerNotification } from '@/lib/notifications'
import { requireAdmin } from '@/lib/admin-auth'

/**
 * GET /api/admin/finances/payout-approve
 * Lists pending, held, and approved payout batches.
 *
 * POST /api/admin/finances/payout-approve
 * Actions: hold, release, process
 */
export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request)
    if (auth.error) return auth.error

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
    const auth = requireAdmin(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { action, batchId, reason } = body

    if (!batchId || !action) {
      return NextResponse.json({ error: 'batchId and action required' }, { status: 400 })
    }

    let result: { success: boolean; error?: string }

    switch (action) {
      case 'hold':
        result = await holdPayout(batchId, reason || 'Admin hold', 'admin')
        break
      case 'release':
        result = await releasePayout(batchId, 'admin')
        break
      case 'process':
        result = await processPayoutBatch(batchId)
        break
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    // Best-effort seller notification for process action
    if (action === 'process') {
      const { data: batch } = await supabaseAdmin
        .from('payout_batches')
        .select('seller_id, net_amount')
        .eq('id', batchId)
        .maybeSingle()

      if (batch?.seller_id) {
        if (result.success) {
          createSellerNotification(batch.seller_id, 'payout_paid', {
            body: batch.net_amount
              ? `€${Number(batch.net_amount).toFixed(2)} wurde erfolgreich überwiesen.`
              : 'Deine Auszahlung wurde erfolgreich überwiesen.',
            link: '/seller/payouts',
          })
        } else {
          createSellerNotification(batch.seller_id, 'payout_failed', {
            body: result.error ?? 'Bei deiner Auszahlung ist ein Fehler aufgetreten.',
            link: '/seller/payouts',
          })
        }
      }
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
