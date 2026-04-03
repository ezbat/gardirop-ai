/**
 * POST /api/stripe/create-subscription
 *
 * Creates a Stripe Billing subscription for a seller plan upgrade.
 *
 * Body: { planId: 'creator' | 'pro' | 'brand', interval: 'monthly' | 'yearly' }
 *
 * Flow:
 *   1. Authenticate seller via session
 *   2. Validate plan
 *   3. Create/retrieve Stripe customer
 *   4. Create Stripe Checkout Session in subscription mode
 *   5. Return checkout URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { PLANS, isPaidPlan, type PlanId } from '@/lib/plans'

// Stripe Price IDs — set these in env or create them via Stripe Dashboard
// Format: STRIPE_PRICE_{PLAN}_{INTERVAL}
function getStripePriceId(planId: PlanId, interval: 'monthly' | 'yearly'): string | null {
  const key = `STRIPE_PRICE_${planId.toUpperCase()}_${interval.toUpperCase()}`
  return process.env[key] ?? null
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { planId, interval = 'monthly' } = await request.json()

    // Validate plan
    if (!planId || !(planId in PLANS) || !isPaidPlan(planId)) {
      return NextResponse.json({ error: 'Ungültiger Plan' }, { status: 400 })
    }

    if (!['monthly', 'yearly'].includes(interval)) {
      return NextResponse.json({ error: 'Ungültiges Intervall' }, { status: 400 })
    }

    // Get seller
    const { data: seller, error: sellerError } = await supabaseAdmin
      .from('sellers')
      .select('id, shop_name, user_id')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Seller-Profil nicht gefunden' }, { status: 404 })
    }

    // Check for existing subscription
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, status')
      .eq('seller_id', seller.id)
      .eq('status', 'active')
      .maybeSingle()

    // Get or create Stripe customer
    let stripeCustomerId = existingSub?.stripe_customer_id

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: session.user.email ?? undefined,
        name: seller.shop_name,
        metadata: {
          sellerId: seller.id,
          userId: session.user.id,
        },
      })
      stripeCustomerId = customer.id
    }

    // Get Stripe price ID
    const priceId = getStripePriceId(planId as PlanId, interval)

    if (!priceId) {
      // If no Stripe price configured, return info for manual setup
      return NextResponse.json({
        error: 'Plan-Preis nicht konfiguriert. Bitte kontaktiere den Support.',
        plan: PLANS[planId as PlanId],
      }, { status: 422 })
    }

    // If seller has an active subscription, create a portal session instead
    if (existingSub?.stripe_subscription_id) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${process.env.NEXTAUTH_URL}/seller/settings`,
      })
      return NextResponse.json({ url: portalSession.url, type: 'portal' })
    }

    // Create Stripe Checkout Session for subscription
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/seller/settings?subscription=success&plan=${planId}`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
      metadata: {
        sellerId: seller.id,
        planId,
        interval,
      },
      subscription_data: {
        metadata: {
          sellerId: seller.id,
          planId,
        },
      },
    })

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
      type: 'checkout',
    })
  } catch (error: any) {
    console.error('[subscription] Create error:', error?.message || error)
    return NextResponse.json(
      { error: 'Interner Serverfehler', details: error?.message },
      { status: 500 },
    )
  }
}
