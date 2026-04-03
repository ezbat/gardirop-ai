/**
 * WEARO — Canonical Seller Status Logic
 *
 * Single source of truth for "is this seller allowed to operate?"
 *
 * Historical context:
 * - Legacy sellers may have status = 'approved' (from old onboarding flow)
 * - New sellers get status = 'active' (current canonical value)
 * - Both values mean "seller can operate normally"
 *
 * Usage:
 *   import { isSellerOperational, SELLER_ACTIVE_STATUSES } from '@/lib/seller-status'
 *
 *   if (isSellerOperational(seller.status)) { ... }
 *   .in('status', SELLER_ACTIVE_STATUSES)
 */

/** The canonical active status for new sellers */
export const SELLER_CANONICAL_STATUS = 'active' as const

/** All status values that mean "seller can operate" */
export const SELLER_ACTIVE_STATUSES = ['active', 'approved'] as const

/** All possible seller status values */
export type SellerStatus = 'active' | 'approved' | 'pending' | 'suspended' | 'rejected'

/**
 * Check if a seller status means "seller can operate normally"
 * This is THE canonical check — use this everywhere instead of inline comparisons
 */
export function isSellerOperational(status: string | null | undefined): boolean {
  if (!status) return false
  return (SELLER_ACTIVE_STATUSES as readonly string[]).includes(status)
}

/**
 * Check if a seller is explicitly suspended
 */
export function isSellerSuspended(status: string | null | undefined): boolean {
  return status === 'suspended'
}
