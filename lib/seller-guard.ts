import { NextResponse } from 'next/server'
import { supabase } from './supabase'

export interface SellerProfile {
  id: string
  user_id: string
  shop_name: string
  status: string
  stripe_account_id: string | null
  stripe_charges_enabled: boolean
  stripe_payouts_enabled: boolean
  stripe_onboarding_complete: boolean
  stripe_verification_status: string | null
  commission_rate?: number
}

export interface SellerGuardResult {
  seller: SellerProfile
  error: null
}

export interface SellerGuardError {
  seller: null
  error: NextResponse
}

/**
 * Verify seller exists and is associated with the given user.
 * Does NOT check Stripe verification - use requireVerifiedSeller for that.
 */
export async function requireSeller(
  userId: string | null | undefined
): Promise<SellerGuardResult | SellerGuardError> {
  if (!userId) {
    return {
      seller: null,
      error: NextResponse.json(
        { error: 'Nicht authentifiziert', code: 'AUTH_REQUIRED' },
        { status: 401 }
      ),
    }
  }

  const { data: seller, error } = await supabase
    .from('sellers')
    .select(`
      id, user_id, shop_name, status,
      stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled,
      stripe_onboarding_complete, stripe_verification_status
    `)
    .eq('user_id', userId)
    .single()

  if (error || !seller) {
    return {
      seller: null,
      error: NextResponse.json(
        { error: 'Kein Verkäuferkonto gefunden', code: 'SELLER_NOT_FOUND' },
        { status: 403 }
      ),
    }
  }

  if (seller.status === 'suspended') {
    return {
      seller: null,
      error: NextResponse.json(
        { error: 'Verkäuferkonto gesperrt', code: 'SELLER_SUSPENDED' },
        { status: 403 }
      ),
    }
  }

  if (seller.status !== 'approved') {
    return {
      seller: null,
      error: NextResponse.json(
        { error: 'Verkäuferkonto nicht genehmigt', code: 'SELLER_NOT_APPROVED' },
        { status: 403 }
      ),
    }
  }

  return { seller: seller as SellerProfile, error: null }
}

/**
 * Verify seller exists AND has completed Stripe Connect verification.
 * Use this for any action that involves selling or receiving money.
 *
 * Checks:
 * 1. User is authenticated
 * 2. User has an approved seller account
 * 3. Stripe account exists
 * 4. Stripe charges are enabled
 * 5. Stripe payouts are enabled
 */
export async function requireVerifiedSeller(
  userId: string | null | undefined
): Promise<SellerGuardResult | SellerGuardError> {
  const result = await requireSeller(userId)

  if (result.error) return result

  const { seller } = result

  if (!seller.stripe_account_id) {
    return {
      seller: null,
      error: NextResponse.json(
        {
          error: 'Stripe-Konto nicht eingerichtet. Bitte schließen Sie die Verifizierung ab.',
          code: 'STRIPE_NOT_SETUP',
          action: 'SETUP_STRIPE',
        },
        { status: 403 }
      ),
    }
  }

  if (!seller.stripe_charges_enabled) {
    return {
      seller: null,
      error: NextResponse.json(
        {
          error: 'Zahlungsempfang noch nicht aktiviert. Bitte vervollständigen Sie Ihre Stripe-Verifizierung.',
          code: 'CHARGES_NOT_ENABLED',
          action: 'COMPLETE_ONBOARDING',
        },
        { status: 403 }
      ),
    }
  }

  if (!seller.stripe_payouts_enabled) {
    return {
      seller: null,
      error: NextResponse.json(
        {
          error: 'Auszahlungen noch nicht aktiviert. Bitte vervollständigen Sie Ihre Bankdaten bei Stripe.',
          code: 'PAYOUTS_NOT_ENABLED',
          action: 'COMPLETE_ONBOARDING',
        },
        { status: 403 }
      ),
    }
  }

  return { seller, error: null }
}

/**
 * Verify the requesting user owns a specific resource.
 * Used for ownership checks on products, orders, etc.
 */
export async function verifyOwnership(
  table: string,
  resourceId: string,
  sellerId: string,
  sellerIdColumn: string = 'seller_id'
): Promise<boolean> {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('id', resourceId)
    .eq(sellerIdColumn, sellerId)
    .single()

  return !!data && !error
}

/**
 * Check if a user is an admin.
 */
export async function requireAdmin(
  userId: string | null | undefined
): Promise<{ isAdmin: true; error: null } | { isAdmin: false; error: NextResponse }> {
  if (!userId) {
    return {
      isAdmin: false,
      error: NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 }),
    }
  }

  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (!user || user.role !== 'admin') {
    return {
      isAdmin: false,
      error: NextResponse.json({ error: 'Keine Admin-Berechtigung' }, { status: 403 }),
    }
  }

  return { isAdmin: true, error: null }
}
