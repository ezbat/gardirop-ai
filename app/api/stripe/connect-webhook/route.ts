import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkStripeAccountStatus } from '@/lib/stripe-connect'
import { restoreStockForOrder } from '@/lib/inventory'
import { claimWebhookEvent, completeWebhookEvent, failWebhookEvent } from '@/lib/webhook-idempotency'
import { createRequestLogger } from '@/lib/logger'

/**
 * Stripe Connect Webhook Handler
 * Persistent idempotency via webhook_events table.
 * Atomic balance operations via PostgreSQL RPC functions.
 */
export async function POST(request: NextRequest) {
  const reqLog = createRequestLogger(request)

  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET

    if (!webhookSecret) {
      reqLog.error('STRIPE_CONNECT_WEBHOOK_SECRET not configured')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      reqLog.error('Webhook signature verification failed', { error: err.message })
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    // Persistent idempotency check
    const claim = await claimWebhookEvent(event.id, event.type, 'stripe-connect')

    if (claim.duplicate) {
      reqLog.info('Duplicate webhook event skipped', { eventId: event.id, eventType: event.type })
      return NextResponse.json({ received: true, duplicate: true })
    }

    reqLog.info('Processing webhook', { eventType: event.type, eventId: event.id })

    try {
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
          reqLog.info('Payout created', { payoutId: (event.data.object as Stripe.Payout).id })
          break

        case 'payout.failed':
          await handlePayoutFailed(event.data.object as Stripe.Payout)
          break

        case 'payout.paid':
          reqLog.info('Payout paid', { payoutId: (event.data.object as Stripe.Payout).id })
          break

        // ─── Refund Events ──────────────────────────────
        case 'charge.refunded':
          await handleChargeRefunded(event.data.object as Stripe.Charge)
          break

        case 'charge.refund.updated':
          reqLog.info('Refund updated', { refundId: (event.data.object as any).id })
          break

        // ─── Dispute Events ─────────────────────────────
        case 'charge.dispute.created':
          await handleDisputeCreated(event.data.object as Stripe.Dispute)
          break

        case 'charge.dispute.closed':
          await handleDisputeClosed(event.data.object as Stripe.Dispute)
          break

        default:
          reqLog.info('Unhandled event type', { eventType: event.type })
      }

      // Mark event as completed
      await completeWebhookEvent(event.id)
    } catch (handlerError) {
      const errorMsg = handlerError instanceof Error ? handlerError.message : String(handlerError)
      await failWebhookEvent(event.id, errorMsg)
      throw handlerError
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    reqLog.error('Webhook handler error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

// ─── Account Handlers ───────────────────────────────────────

async function handleAccountUpdated(account: Stripe.Account) {
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

  if (error) logger.error('Failed to update seller account', { error: error.message, accountId: account.id })
}

async function handleAccountDeauthorized(data: any) {
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
}

async function handleCapabilityUpdated(capability: Stripe.Capability) {
  await checkStripeAccountStatus(capability.account as string)
}

// ─── Payment Handlers ───────────────────────────────────────

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata?.order_id
  if (!orderId) return

  await supabaseAdmin
    .from('orders')
    .update({
      payment_status: 'paid',
      status: 'PAID',
      stripe_payment_intent_id: paymentIntent.id,
      paid_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (paymentIntent.application_fee_amount) {
    const platformFee = paymentIntent.application_fee_amount / 100
    await supabaseAdmin
      .from('orders')
      .update({ platform_fee: platformFee })
      .eq('id', orderId)
  }

  logger.info('Payment succeeded', { orderId, paymentIntentId: paymentIntent.id })
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata?.order_id
  if (!orderId) return

  await supabaseAdmin
    .from('orders')
    .update({
      payment_status: 'failed',
      payment_error: paymentIntent.last_payment_error?.message || 'Payment failed',
    })
    .eq('id', orderId)

  logger.error('Payment failed', { orderId, error: paymentIntent.last_payment_error?.message })
}

// ─── Transfer Handlers ──────────────────────────────────────

async function handleTransferCreated(transfer: Stripe.Transfer) {
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
}

async function handleTransferReversed(transfer: Stripe.Transfer) {
  const sellerId = transfer.metadata?.seller_id

  // Update payout status
  await supabaseAdmin
    .from('seller_payouts')
    .update({
      status: 'reversed',
      error_message: 'Transfer was reversed',
    })
    .eq('stripe_transfer_id', transfer.id)

  // Atomic balance restore: add back to pending
  if (sellerId) {
    const amount = transfer.amount / 100
    const { data, error } = await supabaseAdmin.rpc('balance_add', {
      p_seller_id: sellerId,
      p_amount: amount,
      p_target: 'pending',
      p_ref_type: 'transfer_reversal',
      p_description: `Transfer reversed: ${transfer.id}`,
      p_idempotency_key: `reversal_${transfer.id}`,
    })

    if (error) {
      logger.error('balance_add RPC failed on transfer reversal', { sellerId, error: error.message })
    } else {
      const result = data as { success: boolean; duplicate?: boolean }
      if (result.duplicate) {
        logger.info('Transfer reversal balance already processed', { transferId: transfer.id })
      }
    }
  }
}

// ─── Payout Handler ─────────────────────────────────────────

async function handlePayoutFailed(payout: Stripe.Payout) {
  logger.error('Payout failed', { payoutId: payout.id, message: payout.failure_message })

  const accountId = (payout as any).account
  if (accountId) {
    const { data: seller } = await supabaseAdmin
      .from('sellers')
      .select('id, user_id')
      .eq('stripe_account_id', accountId)
      .single()

    if (seller) {
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: seller.user_id,
          type: 'payout_failed',
          title: 'Auszahlung fehlgeschlagen',
          message: `Auszahlung fehlgeschlagen: ${payout.failure_message || 'Unbekannter Fehler'}`,
        })
        .then(({ error }) => {
          if (error) logger.warn('Notification insert skipped', { error: error.message })
        })
    }
  }
}

// ─── Refund Handler ─────────────────────────────────────────

async function handleChargeRefunded(charge: Stripe.Charge) {
  const orderId = charge.metadata?.order_id
  if (!orderId) return

  const refundAmount = (charge.amount_refunded || 0) / 100
  const isFullRefund = charge.refunded

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

  // Atomic balance deduction for seller refund
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('seller_id, platform_fee')
    .eq('id', orderId)
    .single()

  if (order?.seller_id) {
    const sellerRefund = refundAmount - (parseFloat(order.platform_fee || '0'))

    if (sellerRefund > 0) {
      const { error } = await supabaseAdmin.rpc('balance_deduct', {
        p_seller_id: order.seller_id,
        p_amount: sellerRefund,
        p_ref_type: 'refund',
        p_ref_id: orderId,
        p_description: `Refund for order ${orderId}`,
        p_idempotency_key: `refund_${orderId}_${charge.id}`,
      })

      if (error) {
        logger.error('balance_deduct RPC failed on refund', {
          sellerId: order.seller_id,
          orderId,
          error: error.message,
        })
      }
    }
  }

  logger.info('Refund processed', { orderId, amount: refundAmount, fullRefund: isFullRefund })
}

// ─── Dispute Handlers ───────────────────────────────────────

async function handleDisputeCreated(dispute: Stripe.Dispute) {
  const charge = dispute.charge as string
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, seller_id, user_id')
    .eq('stripe_charge_id', charge)
    .single()

  if (!order) {
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

  // Atomic balance freeze: move available → pending
  if (order.seller_id) {
    const disputeAmount = dispute.amount / 100

    const { data, error } = await supabaseAdmin.rpc('balance_freeze', {
      p_seller_id: order.seller_id,
      p_amount: disputeAmount,
      p_reason: `dispute:${dispute.reason}`,
      p_ref_id: order.id,
    })

    if (error) {
      logger.error('balance_freeze RPC failed', {
        sellerId: order.seller_id,
        orderId: order.id,
        error: error.message,
      })
    } else {
      logger.info('Balance frozen for dispute', {
        orderId: order.id,
        frozen: (data as any)?.frozen,
      })
    }
  }

  logger.info('Dispute opened', {
    orderId: order.id,
    reason: dispute.reason,
    amount: dispute.amount / 100,
  })

  // Audit
  await supabaseAdmin.from('audit_logs').insert({
    actor_type: 'webhook',
    action: 'dispute.created',
    resource_type: 'order',
    resource_id: order.id,
    severity: 'warning',
    details: {
      dispute_id: dispute.id,
      reason: dispute.reason,
      amount: dispute.amount / 100,
      seller_id: order.seller_id,
    },
  })
}

async function handleDisputeClosed(dispute: Stripe.Dispute) {
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

    // Atomic unfreeze: move pending → available
    if (sellerId) {
      const disputeAmount = dispute.amount / 100

      const { error } = await supabaseAdmin.rpc('balance_unfreeze', {
        p_seller_id: sellerId,
        p_amount: disputeAmount,
        p_reason: 'dispute_won',
        p_ref_id: orderId,
      })

      if (error) {
        logger.error('balance_unfreeze RPC failed', { sellerId, orderId, error: error.message })
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

    // Atomic deduct pending: remove frozen funds permanently
    if (sellerId) {
      const disputeAmount = dispute.amount / 100

      const { error } = await supabaseAdmin.rpc('balance_deduct_pending', {
        p_seller_id: sellerId,
        p_amount: disputeAmount,
        p_reason: 'dispute_lost',
      })

      if (error) {
        logger.error('balance_deduct_pending RPC failed', { sellerId, orderId, error: error.message })
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

  logger.info('Dispute closed', { orderId, result: isWon ? 'won' : 'lost' })

  // Audit
  await supabaseAdmin.from('audit_logs').insert({
    actor_type: 'webhook',
    action: 'dispute.closed',
    resource_type: 'order',
    resource_id: orderId,
    severity: isWon ? 'info' : 'warning',
    details: {
      dispute_id: dispute.id,
      result: isWon ? 'won' : 'lost',
      amount: dispute.amount / 100,
      seller_id: sellerId,
    },
  })
}

// Import logger for standalone use in handler functions
import { logger } from '@/lib/logger'
