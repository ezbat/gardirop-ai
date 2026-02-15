import Stripe from 'stripe'
import { supabase } from './supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
})

/**
 * Create a Stripe Connect Express account for a seller
 *
 * @param sellerId - Seller UUID
 * @param shopName - Shop name for the account
 * @returns Onboarding URL for seller to complete setup
 */
export async function createSellerConnectAccount(
  sellerId: string,
  shopName: string
): Promise<string> {
  try {
    // Check if seller already has a Stripe account
    const { data: seller } = await supabase
      .from('sellers')
      .select('stripe_account_id, user_id')
      .eq('id', sellerId)
      .single()

    if (!seller) {
      throw new Error('Seller not found')
    }

    // If account exists, just refresh the onboarding link
    if (seller.stripe_account_id) {
      return await refreshOnboardingLink(seller.stripe_account_id)
    }

    // Get user email from users table
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', seller.user_id)
      .single()

    const email = user?.email || undefined

    // Create new Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'DE',
      email,
      business_type: 'individual',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: shopName,
        product_description: 'Fashion marketplace seller',
      },
      metadata: {
        seller_id: sellerId,
        shop_name: shopName,
      },
    })

    // Generate onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/seller/onboarding?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/seller/dashboard?onboarding=complete`,
      type: 'account_onboarding',
    })

    // Save to database
    await supabase
      .from('sellers')
      .update({
        stripe_account_id: account.id,
        stripe_onboarding_link: accountLink.url,
        stripe_onboarding_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
      })
      .eq('id', sellerId)

    return accountLink.url
  } catch (error) {
    console.error('Create Stripe Connect account error:', error)
    throw error
  }
}

/**
 * Refresh onboarding link for existing account
 *
 * @param stripeAccountId - Stripe Account ID
 * @returns New onboarding URL
 */
export async function refreshOnboardingLink(stripeAccountId: string): Promise<string> {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/seller/onboarding?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/seller/dashboard?onboarding=complete`,
      type: 'account_onboarding',
    })

    // Update expiry in database
    await supabase
      .from('sellers')
      .update({
        stripe_onboarding_link: accountLink.url,
        stripe_onboarding_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
      .eq('stripe_account_id', stripeAccountId)

    return accountLink.url
  } catch (error) {
    console.error('Refresh onboarding link error:', error)
    throw error
  }
}

/**
 * Check Stripe account status and update database
 *
 * @param stripeAccountId - Stripe Account ID
 * @returns Account status object
 */
export async function checkStripeAccountStatus(stripeAccountId: string) {
  try {
    const account = await stripe.accounts.retrieve(stripeAccountId)

    const status = {
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      requirements: account.requirements,
      disabled_reason: account.requirements?.disabled_reason || null,
      currently_due: account.requirements?.currently_due || [],
    }

    // Update seller record
    await supabase
      .from('sellers')
      .update({
        stripe_charges_enabled: status.charges_enabled,
        stripe_payouts_enabled: status.payouts_enabled,
        stripe_onboarding_complete: status.details_submitted,
        stripe_verification_status: status.disabled_reason || 'verified',
        stripe_requirements_currently_due: status.currently_due,
      })
      .eq('stripe_account_id', stripeAccountId)

    return status
  } catch (error) {
    console.error('Check Stripe account status error:', error)
    throw error
  }
}

/**
 * Create a transfer to seller's Stripe account
 *
 * @param sellerId - Seller UUID
 * @param amount - Amount in EUR (e.g., 50.00)
 * @param orderId - Order UUID for reference
 * @returns Stripe Transfer object
 */
export async function createSellerTransfer(
  sellerId: string,
  amount: number,
  orderId: string
): Promise<Stripe.Transfer> {
  try {
    // Get seller's Stripe account
    const { data: seller } = await supabase
      .from('sellers')
      .select('stripe_account_id, shop_name, stripe_payouts_enabled')
      .eq('id', sellerId)
      .single()

    if (!seller?.stripe_account_id) {
      throw new Error('Seller does not have a Stripe Connect account')
    }

    if (!seller.stripe_payouts_enabled) {
      throw new Error('Seller payouts not enabled')
    }

    // Create transfer
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'eur',
      destination: seller.stripe_account_id,
      description: `Payout for order ${orderId}`,
      metadata: {
        order_id: orderId,
        seller_id: sellerId,
        shop_name: seller.shop_name,
      },
    })

    return transfer
  } catch (error) {
    console.error('Create seller transfer error:', error)
    throw error
  }
}

/**
 * Calculate platform commission and seller payout
 *
 * @param totalAmount - Total order amount
 * @param commissionRate - Commission percentage (e.g., 15 for 15%)
 * @returns Object with commission and seller payout
 */
export function calculateCommission(totalAmount: number, commissionRate: number = 15) {
  const commission = (totalAmount * commissionRate) / 100
  const sellerPayout = totalAmount - commission

  return {
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    commission: parseFloat(commission.toFixed(2)),
    sellerPayout: parseFloat(sellerPayout.toFixed(2)),
    commissionRate,
  }
}

/**
 * Get Stripe dashboard login link for seller
 *
 * @param stripeAccountId - Stripe Account ID
 * @returns Dashboard login URL
 */
export async function getSellerDashboardLink(stripeAccountId: string): Promise<string> {
  try {
    const loginLink = await stripe.accounts.createLoginLink(stripeAccountId)
    return loginLink.url
  } catch (error) {
    console.error('Get seller dashboard link error:', error)
    throw error
  }
}

/**
 * Process payout for completed order
 * Records payout in seller_payouts table and creates Stripe transfer
 *
 * @param orderId - Order UUID
 * @returns Array of payout records
 */
export async function processOrderPayout(orderId: string) {
  try {
    // Get order items with seller info
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('*, orders!inner(id, state)')
      .eq('order_id', orderId)
      .eq('seller_payout_status', 'pending')

    if (!orderItems || orderItems.length === 0) {
      return []
    }

    // Check order is in DELIVERED or COMPLETED state
    const order = orderItems[0].orders
    if (!['DELIVERED', 'COMPLETED'].includes(order.state)) {
      throw new Error('Order must be delivered or completed before payout')
    }

    // Group by seller
    const sellerGroups = orderItems.reduce((acc, item) => {
      if (!acc[item.seller_id]) {
        acc[item.seller_id] = []
      }
      acc[item.seller_id].push(item)
      return acc
    }, {} as Record<string, any[]>)

    const payouts = []

    // Process each seller
    for (const [sellerId, items] of Object.entries(sellerGroups) as [string, any[]][]) {
      const totalAmount = items.reduce((sum: number, item: any) => sum + parseFloat(item.seller_payout_amount || 0), 0)
      const totalCommission = items.reduce((sum: number, item: any) => sum + parseFloat(item.platform_commission || 0), 0)

      try {
        // Create Stripe transfer
        const transfer = await createSellerTransfer(sellerId, totalAmount, orderId)

        // Record payout
        const { data: payout } = await supabase
          .from('seller_payouts')
          .insert({
            seller_id: sellerId,
            order_id: orderId,
            amount: totalAmount + totalCommission,
            commission: totalCommission,
            net_amount: totalAmount,
            stripe_transfer_id: transfer.id,
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .select()
          .single()

        // Update order items
        await supabase
          .from('order_items')
          .update({
            seller_payout_status: 'completed',
            stripe_transfer_id: transfer.id,
            payout_date: new Date().toISOString(),
          })
          .in('id', items.map(i => i.id))

        // Update seller balance
        const { data: balance } = await supabase
          .from('seller_balances')
          .select('pending_balance, total_withdrawn')
          .eq('seller_id', sellerId)
          .single()

        if (balance) {
          await supabase
            .from('seller_balances')
            .update({
              pending_balance: (balance.pending_balance || 0) - totalAmount,
              total_withdrawn: (balance.total_withdrawn || 0) + totalAmount,
            })
            .eq('seller_id', sellerId)
        }

        payouts.push(payout)
      } catch (error) {
        // Record failed payout
        await supabase
          .from('seller_payouts')
          .insert({
            seller_id: sellerId,
            order_id: orderId,
            amount: totalAmount + totalCommission,
            commission: totalCommission,
            net_amount: totalAmount,
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })

        console.error(`Failed to process payout for seller ${sellerId}:`, error)
      }
    }

    return payouts
  } catch (error) {
    console.error('Process order payout error:', error)
    throw error
  }
}
