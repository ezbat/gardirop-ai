/**
 * GET /api/seller/plan
 *
 * Returns the current seller's plan, subscription status, and feature entitlements.
 * Used by the seller dashboard and feature-gated UI components.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getPlan, type PlanId } from '@/lib/plans'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    // Get seller with plan_id
    const { data: seller, error: sellerError } = await supabaseAdmin
      .from('sellers')
      .select('id, plan_id, is_verified')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Seller nicht gefunden' }, { status: 404 })
    }

    const planId = (seller.plan_id || 'starter') as PlanId
    const plan = getPlan(planId)

    // Get active subscription if any
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id, plan_id, status, billing_interval, current_period_start, current_period_end, cancel_at_period_end')
      .eq('seller_id', seller.id)
      .in('status', ['active', 'trialing', 'past_due'])
      .maybeSingle()

    // Get current usage counts for limit checking
    const [productCount, outfitCount] = await Promise.all([
      supabaseAdmin
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', seller.id),
      supabaseAdmin
        .from('outfits')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', seller.id),
    ])

    return NextResponse.json({
      plan: {
        id: plan.id,
        name: plan.name,
        tagline: plan.tagline,
        badge: plan.badge,
        commissionRate: plan.commissionRate,
      },
      features: plan.features,
      limits: plan.limits,
      usage: {
        products: productCount.count ?? 0,
        outfits: outfitCount.count ?? 0,
      },
      subscription: subscription
        ? {
            status: subscription.status,
            interval: subscription.billing_interval,
            currentPeriodEnd: subscription.current_period_end,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          }
        : null,
      isVerified: seller.is_verified ?? false,
    })
  } catch (error: any) {
    console.error('[seller/plan] Error:', error?.message || error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
