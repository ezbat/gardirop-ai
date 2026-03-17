import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getPlatformFinancials, getTrialBalance } from '@/lib/ledger-engine'
import { getChargebackRate } from '@/lib/reconciliation-engine'
import { getVATByCountry } from '@/lib/tax-engine'

/**
 * GET /api/admin/finances/overview
 *
 * Platform financial overview from the ledger.
 * Returns: escrow, seller liability, revenue, refund exposure, chargeback rate, trial balance.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin check
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

    // Fetch all data in parallel
    const [financials, trialBalance, chargebackStats, vatByCountry, pendingPayouts, riskDistribution] = await Promise.all([
      getPlatformFinancials(),
      getTrialBalance(),
      getChargebackRate(30),
      getVATByCountry(),
      // Pending payouts count & amount
      supabaseAdmin
        .from('payout_batches')
        .select('amount')
        .in('status', ['pending', 'held', 'approved']),
      // Seller risk distribution
      supabaseAdmin
        .from('seller_risk_scores')
        .select('overall_score'),
    ])

    // Calculate pending payout totals
    const pendingPayoutAmount = (pendingPayouts.data || []).reduce(
      (sum, p) => sum + parseFloat(String(p.amount || 0)), 0
    )
    const pendingPayoutCount = (pendingPayouts.data || []).length

    // Risk distribution buckets
    const riskBuckets = { low: 0, medium: 0, high: 0, critical: 0 }
    for (const s of riskDistribution.data || []) {
      const score = s.overall_score || 0
      if (score <= 30) riskBuckets.low++
      else if (score <= 60) riskBuckets.medium++
      else if (score <= 80) riskBuckets.high++
      else riskBuckets.critical++
    }

    return NextResponse.json({
      overview: {
        // Ledger-derived
        totalEscrow: financials.totalEscrow,
        totalSellerLiability: financials.totalSellerLiability,
        platformRevenue: financials.platformRevenue,
        refundExposure: financials.refundExposure,
        paymentFees: financials.paymentFees,
        taxCollected: financials.taxCollected,

        // Chargebacks
        chargebackRate: chargebackStats.rate,
        chargebackCount: chargebackStats.totalChargebacks,
        chargebackAmount: chargebackStats.totalAmount,

        // Payouts
        pendingPayoutAmount,
        pendingPayoutCount,

        // Risk
        riskDistribution: riskBuckets,

        // VAT by country
        vatByCountry,

        // Trial balance
        trialBalance: {
          balanced: trialBalance.balanced,
          totalDebit: trialBalance.totalDebit,
          totalCredit: trialBalance.totalCredit,
          accountCount: trialBalance.accounts.length,
        },
      },
    })
  } catch (error: any) {
    console.error('Admin finances overview error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
