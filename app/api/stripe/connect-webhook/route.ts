import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkStripeAccountStatus } from '@/lib/stripe-connect'
import { restoreStockForOrder } from '@/lib/inventory'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
})

// ─── Idempotency: Prevent duplicate webhook processing ─────
const processedEvents = new Map<string, number>()
const DEDUP_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

function isDuplicateEvent(eventId: string): boolean {
  const now = Date.now()

  // Cleanup old entries
  if (processedEvents.size > 10000) {
    for (const [key, timestamp] of processedEvents) {
      if (now - timestamp > DEDUP_WINDOW_MS) processedEvents.delete(key)
    }
  }

  if (processedEvents.has(eventId)) return true
  processedEvents.set(eventId, now)
  return false
}

/**
 * Stripe Connect Webhook Handler
 * Handles events from seller Connect accounts and platform
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
      console.error('STRIPE_CONNECT_WEBHOOK_SECRET not configured')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    // Duplicate event prevention
    if (isDuplicateEvent(event.id)) {
      console.log(`Duplicate event skipped: ${event.id}`)
      return NextResponse.json({ received: true, duplicate: true })
    }

    console.log('Stripe webhook:', event.type, event.id)

    // Handle different event types
    switch (event.type) {
      // ─── Account Events ─────────────────────────────
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account)
        break

      case 'account.application.deauthorized':
        await handleAccountDeauthorized(event.data.object as any)
        break

      case 'capability.updated':
        await handleCapabilityUpdated(event.data.object as Stripe.Capability)
        break

      // ─── Payment Events ─────────────────────────────
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break

      // ─── Transfer Events ────────────────────────────
      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer)
        break

      case 'transfer.reversed':
        await handleTransferReversed(event.data.object as Stripe.Transfer)
        break

      // ─── Payout Events ──────────────────────────────
      case 'payout.created':
        console.log('Payout created:', (event.data.object as Stripe.Payout).id)
        break

      case 'payout.failed':
        await handlePayoutFailed(event.data.object as Stripe.Payout)
        break

      case 'payout.paid':
        console.log('Payout paid:', (event.data.object as Stripe.Payout).id)
        break

      // ─── Refund Events ──────────────────────────────
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge)
        break

      case 'charge.refund.updated':
        console.log('Refund updated:', (event.data.object as any).id)
        break

      // ─── Dispute Events ─────────────────────────────
      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object as Stripe.Dispute)
        break

      case 'charge.dispute.closed':
        await handleDisputeClosed(event.data.object as Stripe.Dispute)
        break

      default:
        console.log(`Unhandled event: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

// ─── Account Handlers ───────────────────────────────────────

async function handleAccountUpdated(account: Stripe.Account) {
  try {
    const { error } = await supabaseAdmin
      .from('sellers')
      .update({
        stripe_charges_enabled: account.charges_enabled,
        stripe_payouts_enabled: account.payouts_enabled,
        stripe_onboarding_complete: account.details_submitted,
        stripe_verification_status: account.requirements?.disabled_reason || 'verified',
        stripe_requirements_currently_due: account.requirements?.currently_due || [],
      })
      .eq('stripe_account_id', account.id)

    if (error) console.error('Failed to update seller account:', error)
  } catch (error) {
    console.error('handleAccountUpdated error:', error)
  }
}

async function handleAccountDeauthorized(data: any) {
  try {
    const accountId = data.account
    await supabaseAdmin
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

async function handleCapabilityUpdated(capability: Stripe.Capability) {
  try {
    await checkStripeAccountStatus(capability.account as string)
  } catch (error) {
    console.error('handleCapabilityUpdated error:', error)
  }
}

// ─── Payment Handlers ───────────────────────────────────────

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    const orderId = paymentIntent.metadata?.order_id
    if (!orderId) return

    // Update order payment status
    await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'PAID',
        stripe_payment_intent_id: paymentIntent.id,
        paid_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    // Calculate and store platform fee from application_fee
    if (paymentIntent.application_fee_amount) {
      const platformFee = paymentIntent.application_fee_amount / 100
      await supabaseAdmin
        .from('orders')
        .update({ platform_fee: platformFee })
        .eq('id', orderId)
    }

    console.log(`Payment succeeded for order ${orderId}:`, paymentIntent.id)
  } catch (error) {
    console.error('handlePaymentSucceeded error:', error)
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    const orderId = paymentIntent.metadata?.order_id
    if (!orderId) return

    await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'failed',
        payment_error: paymentIntent.last_payment_error?.message || 'Payment failed',
      })
      .eq('id', orderId)

    console.error(`Payment failed for order ${orderId}:`, paymentIntent.last_payment_error?.message)
  } catch (error) {
    console.error('handlePaymentFailed error:', error)
  }
}

// ─── Transfer Handlers ──────────────────────────────────────

async function handleTransferCreated(transfer: Stripe.Transfer) {
  try {
    const orderId = transfer.metadata?.order_id
    const sellerId = transfer.metadata?.seller_id

    if (orderId && sellerId) {
      await supabaseAdmin
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

async function handleTransferReversed(transfer: Stripe.Transfer) {
  try {
    const sellerId = transfer.metadata?.seller_id

    // Update payout status
    await supabaseAdmin
      .from('seller_payouts')
      .update({
        status: 'reversed',
        error_message: 'Transfer was reversed',
      })
      .eq('stripe_transfer_id', transfer.id)

    // Restore seller balance
    if (sellerId) {
      const amount = transfer.amount / 100
      const { data: balance } = await supabaseAdmin
        .from('seller_balances')
        .select('pending_balance, total_withdrawn')
        .eq('seller_id', sellerId)
        .single()

      if (balance) {
        await supabaseAdmin
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

// ─── Payout Handler ─────────────────────────────────────────

async function handlePayoutFailed(payout: Stripe.Payout) {
  try {
    console.error('Payout failed:', payout.id, payout.failure_message)

    // Find seller by Stripe account (payout.destination = bank account within Connect account)
    const accountId = (payout as any).account
    if (accountId) {
      const { data: seller } = await supabaseAdmin
        .from('sellers')
        .select('id, user_id')
        .eq('stripe_account_id', accountId)
        .single()

      if (seller) {
        // Record failed payout notification
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: seller.user_id,
            type: 'payout_failed',
            title: 'Auszahlung fehlgeschlagen',
            message: `Auszahlung fehlgeschlagen: ${payout.failure_message || 'Unbekannter Fehler'}`,
          })
          .then(({ error }) => {
            if (error) console.warn('Notification insert skipped:', error.message)
          })
      }
    }
  } catch (error) {
    console.error('handlePayoutFailed error:', error)
  }
}

// ─── Refund Handler ─────────────────────────────────────────

async function handleChargeRefunded(charge: Stripe.Charge) {
  try {
    const orderId = charge.metadata?.order_id
    if (!orderId) return

    const refundAmount = (charge.amount_refunded || 0) / 100
    const isFullRefund = charge.refunded // true if fully refunded

    // Update order
    await supabaseAdmin
      .from('orders')
      .update({
        status: isFullRefund ? 'REFUNDED' : 'PARTIAL_REFUND',
        payment_status: isFullRefund ? 'refunded' : 'partially_refunded',
        refund_amount: refundAmount,
        refunded_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    // Restore stock on full refund
    if (isFullRefund) {
      const { data: orderItems } = await supabaseAdmin
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId)

      if (orderItems && orderItems.length > 0) {
        await restoreStockForOrder(
          orderId,
          orderItems.map(item => ({
            productId: item.product_id,
            quantity: item.quantity,
          })),
          'return'
        )
      }
    }

    // Reverse seller payout if already paid
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('seller_id, platform_fee')
      .eq('id', orderId)
      .single()

    if (order?.seller_id) {
      // Update seller balance
      const { data: balance } = await supabaseAdmin
        .from('seller_balances')
        .select('available_balance, pending_balance')
        .eq('seller_id', order.seller_id)
        .single()

      if (balance) {
        const sellerRefund = refundAmount - (parseFloat(order.platform_fee || '0'))
        await supabaseAdmin
          .from('seller_balances')
          .update({
            available_balance: Math.max(0, (balance.available_balance || 0) - sellerRefund),
          })
          .eq('seller_id', order.seller_id)
      }
    }

    console.log(`Refund processed for order ${orderId}: ${refundAmount} EUR (full: ${isFullRefund})`)
  } catch (error) {
    console.error('handleChargeRefunded error:', error)
  }
}

// ─── Dispute Handlers ───────────────────────────────────────

async function handleDisputeCreated(dispute: Stripe.Dispute) {
  try {
    const charge = dispute.charge as string
    // Find order by charge
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, seller_id, user_id')
      .eq('stripe_charge_id', charge)
      .single()

    if (!order) {
      // Try finding by payment_intent
      const paymentIntentId = (dispute as any).payment_intent
      if (paymentIntentId) {
        const { data: orderByPI } = await supabaseAdmin
          .from('orders')
          .select('id, seller_id, user_id')
          .eq('stripe_payment_intent_id', paymentIntentId)
          .single()

        if (orderByPI) {
          await processDispute(orderByPI, dispute)
        }
      }
      return
    }

    await processDispute(order, dispute)
  } catch (error) {
    console.error('handleDisputeCreated error:', error)
  }
}

async function processDispute(
  order: { id: string; seller_id: string; user_id: string },
  dispute: Stripe.Dispute
) {
  // Transition order to dispute state
  await supabaseAdmin
    .from('orders')
    .update({
      status: 'DISPUTE_OPENED',
      dispute_id: dispute.id,
      dispute_reason: dispute.reason,
      dispute_amount: dispute.amount / 100,
      dispute_opened_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  // Freeze seller funds
  if (order.seller_id) {
    const disputeAmount = dispute.amount / 100
    const { data: balance } = await supabaseAdmin
      .from('seller_balances')
      .select('available_balance, pending_balance')
      .eq('seller_id', order.seller_id)
      .single()

    if (balance) {
      await supabaseAdmin
        .from('seller_balances')
        .update({
          available_balance: Math.max(0, (balance.available_balance || 0) - disputeAmount),
          pending_balance: (balance.pending_balance || 0) + disputeAmount,
        })
        .eq('seller_id', order.seller_id)
    }
  }

  console.log(`Dispute opened for order ${order.id}: ${dispute.reason}, ${dispute.amount / 100} EUR`)
}

async function handleDisputeClosed(dispute: Stripe.Dispute) {
  try {
    const isWon = dispute.status === 'won'
    const paymentIntentId = (dispute as any).payment_intent

    // Find order
    let orderId: string | null = null
    let sellerId: string | null = null

    if (paymentIntentId) {
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('id, seller_id')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single()

      if (order) {
        orderId = order.id
        sellerId = order.seller_id
      }
    }

    if (!orderId) {
      // Try by dispute_id
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('id, seller_id')
        .eq('dispute_id', dispute.id)
        .single()

      if (order) {
        orderId = order.id
        sellerId = order.seller_id
      }
    }

    if (!orderId) return

    if (isWon) {
      // Dispute won - restore order and unfreeze funds
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'COMPLETED',
          dispute_resolved_at: new Date().toISOString(),
          dispute_result: 'won',
        })
        .eq('id', orderId)

      // Unfreeze seller funds
      if (sellerId) {
        const disputeAmount = dispute.amount / 100
        const { data: balance } = await supabaseAdmin
          .from('seller_balances')
          .select('available_balance, pending_balance')
          .eq('seller_id', sellerId)
          .single()

        if (balance) {
          await supabaseAdmin
            .from('seller_balances')
            .update({
              available_balance: (balance.available_balance || 0) + disputeAmount,
              pending_balance: Math.max(0, (balance.pending_balance || 0) - disputeAmount),
            })
            .eq('seller_id', sellerId)
        }
      }
    } else {
      // Dispute lost - refund customer, debit seller
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'REFUNDED',
          payment_status: 'refunded',
          dispute_resolved_at: new Date().toISOString(),
          dispute_result: 'lost',
          refund_amount: dispute.amount / 100,
        })
        .eq('id', orderId)

      // Debit seller: remove frozen funds permanently
      if (sellerId) {
        const disputeAmount = dispute.amount / 100
        const { data: balance } = await supabaseAdmin
          .from('seller_balances')
          .select('pending_balance, total_withdrawn')
          .eq('seller_id', sellerId)
          .single()

        if (balance) {
          await supabaseAdmin
            .from('seller_balances')
            .update({
              pending_balance: Math.max(0, (balance.pending_balance || 0) - disputeAmount),
            })
            .eq('seller_id', sellerId)
        }
      }

      // Restore stock
      const { data: orderItems } = await supabaseAdmin
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId)

      if (orderItems && orderItems.length > 0) {
        await restoreStockForOrder(
          orderId,
          orderItems.map(item => ({
            productId: item.product_id,
            quantity: item.quantity,
          })),
          'return'
        )
      }
    }

    console.log(`Dispute closed for order ${orderId}: ${isWon ? 'WON' : 'LOST'}`)
  } catch (error) {
    console.error('handleDisputeClosed error:', error)
  }
}
