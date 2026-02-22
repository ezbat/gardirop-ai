import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  getFullFinancialSummary,
  getDailyRevenue,
  getRevenueByCategory,
  getPeriodComparison,
  getPayoutSummary,
  getAdROI,
  getTaxSummary,
  getTodayMetrics,
  getTopProductsByRevenue,
  getOrderStatusBreakdown,
} from '@/lib/financial-engine'

/**
 * GET /api/seller/finances
 *
 * Real Financial Engine endpoint.
 * All data comes from database aggregation - NO hardcoded values.
 *
 * Query params:
 *   - period: '7' | '30' | '90' | '365' (days, default 30)
 *   - section: 'summary' | 'daily' | 'category' | 'comparison' | 'payouts' | 'ads' | 'tax' | 'all'
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const period = parseInt(searchParams.get('period') || '30')
    const section = searchParams.get('section') || 'all'

    // Get seller with commission rate
    const { data: seller, error: sellerError } = await supabaseAdmin
      .from('sellers')
      .select('id, commission_rate, status, stripe_charges_enabled')
      .eq('user_id', userId)
      .single()

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    if (seller.status !== 'approved') {
      return NextResponse.json({ error: 'Seller not approved' }, { status: 403 })
    }

    const sellerId = seller.id
    const commissionRate = parseFloat(seller.commission_rate || '15')

    // Calculate date range
    const endDate = new Date().toISOString()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - period)

    // Build response based on requested section
    const response: Record<string, any> = {}

    if (section === 'all' || section === 'summary') {
      response.summary = await getFullFinancialSummary(sellerId, commissionRate)
    }

    if (section === 'all' || section === 'daily') {
      response.dailyRevenue = await getDailyRevenue(sellerId, period, commissionRate)
    }

    if (section === 'all' || section === 'category') {
      response.revenueByCategory = await getRevenueByCategory(
        sellerId,
        startDate.toISOString(),
        endDate
      )
    }

    if (section === 'all' || section === 'comparison') {
      response.periodComparison = await getPeriodComparison(sellerId, period)
    }

    if (section === 'all' || section === 'payouts') {
      response.payouts = await getPayoutSummary(sellerId)
    }

    if (section === 'all' || section === 'ads') {
      response.adROI = await getAdROI(sellerId)
    }

    if (section === 'all' || section === 'tax') {
      response.tax = await getTaxSummary(sellerId)
    }

    if (section === 'all' || section === 'today') {
      response.today = await getTodayMetrics(sellerId, commissionRate)
    }

    if (section === 'all' || section === 'products') {
      response.topProducts = await getTopProductsByRevenue(
        sellerId,
        10,
        startDate.toISOString(),
        endDate
      )
    }

    if (section === 'all' || section === 'orders') {
      response.orderStatus = await getOrderStatusBreakdown(sellerId)
    }

    return NextResponse.json({
      finances: response,
      meta: {
        sellerId,
        commissionRate,
        period,
        section,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Finance API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}
