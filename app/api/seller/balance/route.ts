import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getFullFinancialSummary, getPayoutSummary } from '@/lib/financial-engine'

/**
 * GET /api/seller/balance
 *
 * Returns seller's real balance from seller_balances table,
 * enriched with financial engine calculations.
 */
export async function GET(request: NextRequest) {
  try {
    // Support both auth methods
    let userId: string | null = null

    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      userId = session.user.id
    } else {
      userId = request.headers.get('x-user-id')
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: seller, error: sellerError } = await supabaseAdmin
      .from('sellers')
      .select('id, commission_rate')
      .eq('user_id', userId)
      .single()

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    const commissionRate = parseFloat(seller.commission_rate || '15')

    // Get or create balance record
    let { data: balance, error: balanceError } = await supabaseAdmin
      .from('seller_balances')
      .select('*')
      .eq('seller_id', seller.id)
      .single()

    if (balanceError || !balance) {
      // Create initial balance record
      const { data: newBalance } = await supabaseAdmin
        .from('seller_balances')
        .insert([{
          seller_id: seller.id,
          available_balance: 0,
          pending_balance: 0,
          total_withdrawn: 0,
          total_sales: 0,
          commission_rate: commissionRate,
        }])
        .select()
        .single()

      balance = newBalance
    }

    // Enrich with financial engine data
    const [financialSummary, payoutSummary] = await Promise.all([
      getFullFinancialSummary(seller.id, commissionRate),
      getPayoutSummary(seller.id),
    ])

    return NextResponse.json({
      balance: {
        available_balance: parseFloat(balance?.available_balance || '0'),
        pending_balance: parseFloat(balance?.pending_balance || '0'),
        total_withdrawn: parseFloat(balance?.total_withdrawn || '0'),
        total_sales: parseFloat(balance?.total_sales || '0'),
        commission_rate: commissionRate,
        // Enriched financial data
        total_revenue: financialSummary.totalRevenue,
        total_platform_fees: financialSummary.totalPlatformFees,
        seller_earnings: financialSummary.sellerEarnings,
        order_count: financialSummary.orderCount,
        average_order_value: financialSummary.averageOrderValue,
        // Payout info
        last_payout_date: payoutSummary.lastPayoutDate,
        last_payout_amount: payoutSummary.lastPayoutAmount,
        next_payout_estimate: payoutSummary.nextPayoutEstimate,
      },
    })
  } catch (error: any) {
    console.error('Get balance error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}
