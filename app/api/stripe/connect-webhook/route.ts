import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase'
import { checkStripeAccountStatus } from '@/lib/stripe-connect'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
})

/**
 * Stripe Connect Webhook Handler
 * Handles events from seller Connect accounts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET

    if (!webhookSecret) {
      console.error('❌ STRIPE_CONNECT_WEBHOOK_SECRET not configured')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('❌ Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    console.log('📨 Stripe Connect webhook received:', event.type)

    // Handle different event types
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account)
        break

      case 'account.application.deauthorized':
        await handleAccountDeauthorized(event.data.object as any)
        break

      case 'capability.updated':
        await handleCapabilityUpdated(event.data.object as Stripe.Capability)
        break

      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer)
        break

      case 'transfer.reversed':
        await handleTransferReversed(event.data.object as Stripe.Transfer)
        break

      case 'payout.created':
        await handlePayoutCreated(event.data.object as Stripe.Payout)
        break

      case 'payout.failed':
        await handlePayoutFailed(event.data.object as Stripe.Payout)
        break

      case 'payout.paid':
        await handlePayoutPaid(event.data.object as Stripe.Payout)
        break

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('❌ Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle account.updated event
 * Updates seller's Stripe account status in database
 */
async function handleAccountUpdated(account: Stripe.Account) {
  try {
    console.log('✅ Account updated:', account.id)

    const { error } = await supabase
      .from('sellers')
      .update({
        stripe_charges_enabled: account.charges_enabled,
        stripe_payouts_enabled: account.payouts_enabled,
        stripe_onboarding_complete: account.details_submitted,
        stripe_verification_status: account.requirements?.disabled_reason || 'verified',
        stripe_requirements_currently_due: account.requirements?.currently_due || [],
      })
      .eq('stripe_account_id', account.id)

    if (error) {
      console.error('Failed to update seller account:', error)
    }
  } catch (error) {
    console.error('handleAccountUpdated error:', error)
  }
}

/**
 * Handle account.application.deauthorized
 * Seller disconnected their account
 */
async function handleAccountDeauthorized(data: any) {
  try {
    const accountId = data.account

    console.log('⚠️ Account deauthorized:', accountId)

    await supabase
      .from('sellers')
      .update({
        stripe_account_id: null,
        stripe_onboarding_complete: false,
        stripe_charges_enabled: false,
        stripe_payouts_enabled: false,
        stripe_verification_status: 'deauthorized',
      })
      .eq('stripe_account_id', accountId)
  } catch (error) {
    console.error('handleAccountDeauthorized error:', error)
  }
}

/**
 * Handle capability.updated
 * Track capability changes (card_payments, transfers, etc.)
 */
async function handleCapabilityUpdated(capability: Stripe.Capability) {
  try {
    console.log('📊 Capability updated:', capability.account, capability.id, capability.status)

    // Refresh account status
    await checkStripeAccountStatus(capability.account as string)
  } catch (error) {
    console.error('handleCapabilityUpdated error:', error)
  }
}

/**
 * Handle transfer.created
 * Log successful transfer to seller
 */
async function handleTransferCreated(transfer: Stripe.Transfer) {
  try {
    console.log('💸 Transfer created:', transfer.id, transfer.amount / 100, 'EUR')

    const orderId = transfer.metadata?.order_id
    const sellerId = transfer.metadata?.seller_id

    if (orderId && sellerId) {
      // Update payout record
      await supabase
        .from('seller_payouts')
        .update({
          status: 'processing',
          stripe_transfer_id: transfer.id,
        })
        .eq('order_id', orderId)
        .eq('seller_id', sellerId)
    }
  } catch (error) {
    console.error('handleTransferCreated error:', error)
  }
}

/**
 * Handle transfer.reversed
 * Transfer was reversed (e.g., due to dispute)
 */
async function handleTransferReversed(transfer: Stripe.Transfer) {
  try {
    console.log('🔄 Transfer reversed:', transfer.id)

    const orderId = transfer.metadata?.order_id
    const sellerId = transfer.metadata?.seller_id

    if (orderId && sellerId) {
      await supabase
        .from('seller_payouts')
        .update({
          status: 'reversed',
          error_message: 'Transfer was reversed',
        })
        .eq('stripe_transfer_id', transfer.id)

      // Update seller balance (add back the reversed amount)
      const amount = transfer.amount / 100
      const { data: balance } = await supabase
        .from('seller_balances')
        .select('pending_balance, total_withdrawn')
        .eq('seller_id', sellerId)
        .single()

      if (balance) {
        await supabase
          .from('seller_balances')
          .update({
            pending_balance: (balance.pending_balance || 0) + amount,
            total_withdrawn: (balance.total_withdrawn || 0) - amount,
          })
          .eq('seller_id', sellerId)
      }
    }
  } catch (error) {
    console.error('handleTransferReversed error:', error)
  }
}

/**
 * Handle payout.created
 * Stripe created payout to seller's bank account
 */
async function handlePayoutCreated(payout: Stripe.Payout) {
  try {
    console.log('💰 Payout created to seller:', payout.destination, payout.amount / 100, 'EUR')
    // Optional: Log this for analytics
  } catch (error) {
    console.error('handlePayoutCreated error:', error)
  }
}

/**
 * Handle payout.failed
 * Payout to seller's bank failed
 */
async function handlePayoutFailed(payout: Stripe.Payout) {
  try {
    console.error('❌ Payout failed:', payout.id, payout.failure_message)
    // Optional: Notify seller about failed payout
  } catch (error) {
    console.error('handlePayoutFailed error:', error)
  }
}

/**
 * Handle payout.paid
 * Payout successfully sent to seller's bank
 */
async function handlePayoutPaid(payout: Stripe.Payout) {
  try {
    console.log('✅ Payout paid:', payout.id, payout.amount / 100, 'EUR')
    // Optional: Send confirmation to seller
  } catch (error) {
    console.error('handlePayoutPaid error:', error)
  }
}
