import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabase } from '@/lib/supabase'
import {
  createSellerConnectAccount,
  refreshOnboardingLink,
  checkStripeAccountStatus,
} from '@/lib/stripe-connect'

/**
 * POST: Create or refresh Stripe Connect onboarding link
 *
 * Body: (optional)
 * - refresh: boolean - Force refresh of existing link
 *
 * Returns:
 * - onboardingUrl: string
 * - accountId: string
 * - expiresAt: string
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json().catch(() => ({}))
    const forceRefresh = body.refresh || false

    // Get seller info
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Satıcı kaydı bulunamadı' }, { status: 404 })
    }

    // Check if seller is approved
    if (seller.status !== 'approved') {
      return NextResponse.json(
        { error: 'Satıcı hesabınız henüz onaylanmamış' },
        { status: 403 }
      )
    }

    let onboardingUrl: string

    // If seller already has Stripe account
    if (seller.stripe_account_id) {
      // Check if already completed
      if (seller.stripe_onboarding_complete && !forceRefresh) {
        return NextResponse.json({
          message: 'Stripe hesabınız zaten tamamlanmış',
          accountId: seller.stripe_account_id,
          onboardingComplete: true,
        })
      }

      // Refresh the link
      onboardingUrl = await refreshOnboardingLink(seller.stripe_account_id)
    } else {
      // Create new account
      onboardingUrl = await createSellerConnectAccount(seller.id, seller.shop_name)
    }

    return NextResponse.json({
      onboardingUrl,
      accountId: seller.stripe_account_id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    })
  } catch (error: any) {
    console.error('Stripe onboarding error:', error)
    return NextResponse.json(
      { error: error.message || 'Stripe onboarding başlatılamadı' },
      { status: 500 }
    )
  }
}

/**
 * GET: Check Stripe account status
 *
 * Returns:
 * - hasAccount: boolean
 * - onboardingComplete: boolean
 * - chargesEnabled: boolean
 * - payoutsEnabled: boolean
 * - requirements: object
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const userId = session.user.id

    // Get seller info
    const { data: seller } = await supabase
      .from('sellers')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!seller) {
      return NextResponse.json({ error: 'Satıcı kaydı bulunamadı' }, { status: 404 })
    }

    // If no Stripe account yet
    if (!seller.stripe_account_id) {
      return NextResponse.json({
        hasAccount: false,
        onboardingComplete: false,
        chargesEnabled: false,
        payoutsEnabled: false,
      })
    }

    // Check latest status from Stripe
    const status = await checkStripeAccountStatus(seller.stripe_account_id)

    return NextResponse.json({
      hasAccount: true,
      onboardingComplete: status.details_submitted,
      chargesEnabled: status.charges_enabled,
      payoutsEnabled: status.payouts_enabled,
      requirements: {
        currentlyDue: status.currently_due,
        disabledReason: status.disabled_reason,
      },
      accountId: seller.stripe_account_id,
    })
  } catch (error: any) {
    console.error('Get Stripe status error:', error)
    return NextResponse.json(
      { error: error.message || 'Stripe durumu alınamadı' },
      { status: 500 }
    )
  }
}
