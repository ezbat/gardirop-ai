/**
 * POST /api/seller/onboarding-status
 *
 * Resolves the current onboarding state for a seller/applicant.
 * Uses the service-role client so it works regardless of RLS policies.
 *
 * Request body: { userId: string }
 *
 * Response:
 * {
 *   success: true,
 *   state: OnboardingState,
 *   checklist: OnboardingChecklist | null,
 *   seller: SellerRow | null,
 *   application: ApplicationRow | null,
 * }
 *
 * States:
 *   no_application       — no seller record, no application found
 *   submitted            — application.status = 'submitted'
 *   under_review         — application.status = 'under_review'
 *   needs_info           — application.status = 'needs_info'
 *   rejected             — application.status = 'rejected'
 *   approved_incomplete  — seller record exists, but setup not complete
 *   active_seller        — seller record exists, profile + products done
 *
 * Checklist completion rules:
 *   applicationApproved  — seller record exists in sellers table
 *   profileComplete      — shop_description is non-empty
 *   hasProducts          — at least one product with seller_id = seller.id
 *   payoutReady          — stripe_charges_enabled = true (null if Stripe not started)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export type OnboardingState =
  | 'no_application'
  | 'submitted'
  | 'under_review'
  | 'needs_info'
  | 'rejected'
  | 'approved_incomplete'
  | 'active_seller'

export interface OnboardingChecklist {
  applicationApproved: boolean
  profileComplete: boolean
  hasProducts: boolean
  payoutReady: boolean | null   // null = Stripe not started ("coming soon")
}

function applicationStatusToState(appStatus: string): OnboardingState {
  switch (appStatus) {
    case 'submitted':    return 'submitted'
    case 'under_review': return 'under_review'
    case 'needs_info':   return 'needs_info'
    case 'rejected':     return 'rejected'
    case 'approved':     return 'approved_incomplete'  // edge: approved but no seller row yet
    default:             return 'submitted'
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const userId = (body?.userId as string | undefined)?.trim()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 },
      )
    }

    // ─── 1. Sellers table ────────────────────────────────────────────────────

    const { data: sellerRaw, error: sellerErr } = await supabaseAdmin
      .from('sellers')
      .select(
        'id, shop_name, shop_slug, shop_description, phone, country, status, ' +
        'stripe_account_id, stripe_charges_enabled, stripe_onboarding_complete, ' +
        'stripe_details_submitted, created_at',
      )
      .eq('user_id', userId)
      .maybeSingle()

    if (sellerErr) {
      console.error('[onboarding-status] sellers error:', sellerErr.message)
    }

    // ─── 2. Seller applications (most recent) ────────────────────────────────

    const { data: applicationRaw, error: appErr } = await supabaseAdmin
      .from('seller_applications')
      .select(
        'id, status, store_name, full_name, email, ' +
        'reviewer_notes, rejection_reason, reviewed_at, created_at, updated_at',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (appErr) {
      console.error('[onboarding-status] applications error:', appErr.message)
    }

    // Cast to `any` to avoid Supabase generated-type mismatches
    const seller = sellerRaw as any
    const application = applicationRaw as any

    // ─── No records at all ───────────────────────────────────────────────────

    if (!seller && !application) {
      return NextResponse.json({
        success: true,
        state: 'no_application' as OnboardingState,
        checklist: null,
        seller: null,
        application: null,
      })
    }

    // ─── Application-only (not yet a seller) ─────────────────────────────────

    if (!seller && application) {
      return NextResponse.json({
        success: true,
        state: applicationStatusToState(application.status),
        checklist: null,
        seller: null,
        application,
      })
    }

    // ─── Seller record exists — build checklist ───────────────────────────────

    // Profile: description must be present and non-empty
    const profileComplete =
      typeof seller!.shop_description === 'string' &&
      seller!.shop_description.trim().length > 0

    // Products: count rows with seller_id
    const { count: productCount, error: prodErr } = await supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', seller!.id)

    if (prodErr) {
      console.error('[onboarding-status] products count error:', prodErr.message)
    }

    const hasProducts = (productCount ?? 0) > 0

    // Payout: Stripe Connect readiness
    // null  → not started at all (no stripe_account_id)
    // true  → charges enabled (ready to receive payments)
    // false → Stripe connected but not yet verified/enabled
    const payoutReady: boolean | null = seller!.stripe_account_id
      ? (seller!.stripe_charges_enabled === true || seller!.stripe_onboarding_complete === true)
      : null

    const checklist: OnboardingChecklist = {
      applicationApproved: true,
      profileComplete,
      hasProducts,
      payoutReady,
    }

    // State: active if the two core tasks are done (payout is optional for launch)
    const state: OnboardingState =
      profileComplete && hasProducts ? 'active_seller' : 'approved_incomplete'

    return NextResponse.json({
      success: true,
      state,
      checklist,
      seller,
      application,
    })
  } catch (error) {
    console.error('[seller/onboarding-status] unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}
