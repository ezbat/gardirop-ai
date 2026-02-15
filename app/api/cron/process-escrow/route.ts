import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { transitionOrderState } from '@/lib/orderStateMachine'
import { processOrderPayout } from '@/lib/stripe-connect'

/**
 * Cron Job: Process Escrow Releases
 *
 * Runs every 6 hours to:
 * 1. Find orders in DELIVERED state past 7-day escrow period
 * 2. Transfer funds to sellers via Stripe Connect
 * 3. Transition orders to COMPLETED state
 *
 * Authentication: Requires CRON_SECRET in Authorization header
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('❌ CRON_SECRET not configured')
      return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🕐 Starting escrow release cron job...')

    // Find orders ready for escrow release
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        total_amount,
        state,
        escrow_release_at,
        delivered_at,
        order_items (
          id,
          seller_id,
          product_id,
          quantity,
          price,
          seller_payout_amount,
          platform_commission,
          seller_payout_status
        )
      `)
      .eq('state', 'DELIVERED')
      .not('escrow_release_at', 'is', null)
      .lte('escrow_release_at', new Date().toISOString())

    if (fetchError) {
      console.error('❌ Failed to fetch orders:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    if (!orders || orders.length === 0) {
      console.log('✅ No orders ready for escrow release')
      return NextResponse.json({
        processed: 0,
        message: 'No orders ready for release',
      })
    }

    console.log(`📦 Found ${orders.length} orders ready for escrow release`)

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as any[],
    }

    // Process each order
    for (const order of orders) {
      try {
        console.log(`💰 Processing escrow for order ${order.id}`)

        // Process payout for all sellers in this order
        const payouts = await processOrderPayout(order.id)

        if (payouts && payouts.length > 0) {
          // Transition order to COMPLETED
          await transitionOrderState(order.id, 'COMPLETED', {
            completed_at: new Date().toISOString(),
          })

          console.log(`✅ Order ${order.id} completed - ${payouts.length} payout(s) processed`)
          results.succeeded++
        } else {
          console.log(`⚠️ Order ${order.id} - no payouts processed`)
          results.failed++
          results.errors.push({
            orderId: order.id,
            error: 'No payouts processed',
          })
        }

        results.processed++
      } catch (error: any) {
        console.error(`❌ Failed to process order ${order.id}:`, error)
        results.failed++
        results.errors.push({
          orderId: order.id,
          error: error.message || 'Unknown error',
        })

        // Record failed payout attempt
        try {
          await supabase
            .from('seller_payouts')
            .insert({
              seller_id: order.order_items[0]?.seller_id,
              order_id: order.id,
              amount: order.total_amount,
              commission: 0,
              net_amount: order.total_amount,
              status: 'failed',
              error_message: error.message || 'Escrow release failed',
            })
        } catch (logError) {
          console.error('Failed to log error:', logError)
        }
      }
    }

    console.log('🏁 Escrow release cron job completed')
    console.log(`📊 Results: ${results.succeeded} succeeded, ${results.failed} failed`)

    return NextResponse.json({
      processed: results.processed,
      succeeded: results.succeeded,
      failed: results.failed,
      errors: results.errors,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('❌ Cron job error:', error)
    return NextResponse.json(
      { error: error.message || 'Cron job failed' },
      { status: 500 }
    )
  }
}
