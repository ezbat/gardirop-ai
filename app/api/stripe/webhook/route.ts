import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Resend } from 'resend'
import { getOrderConfirmationEmail } from '@/lib/email-templates'
import { claimWebhookEvent, completeWebhookEvent, failWebhookEvent } from '@/lib/webhook-idempotency'
import { createRequestLogger } from '@/lib/logger'
import { recordPaymentReceived, recordTaxCollected } from '@/lib/ledger-engine'
import { recordPaymentTransaction } from '@/lib/reconciliation-engine'
import type Stripe from 'stripe'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const reqLog = createRequestLogger(request)
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    reqLog.error('Webhook signature verification failed', { error: err.message })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Persistent idempotency check
  const claim = await claimWebhookEvent(event.id, event.type, 'stripe')

  if (claim.duplicate) {
    reqLog.info('Duplicate webhook event skipped', { eventId: event.id, eventType: event.type })
    return NextResponse.json({ received: true, duplicate: true })
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const result = await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
          event.id,
          event.type,
        )
        if (result?.notFound) {
          await completeWebhookEvent(event.id)
          return NextResponse.json({ received: true, not_found: true })
        }
        break
      }

      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session)
        break

      case 'payment_intent.succeeded':
        reqLog.info('PaymentIntent succeeded', { id: (event.data.object as any).id })
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break

      default:
        reqLog.info('Unhandled event type', { eventType: event.type })
    }

    await completeWebhookEvent(event.id)
    return NextResponse.json({ received: true })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    await failWebhookEvent(event.id, errorMsg)
    reqLog.error('Webhook handler error', { error: errorMsg })
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  eventId: string,
  eventType: string,
): Promise<{ notFound: boolean } | void> {

  // ─── 1. Entry log ─────────────────────────────────────────────────
  console.log('[Webhook] checkout.session.completed received', {
    eventId,
    eventType,
    sessionId: session.id,
    metadataKeys: Object.keys(session.metadata ?? {}),
    metadataOrderId: session.metadata?.orderId ?? null,
    paymentIntentId: session.payment_intent ?? null,
  })

  let orderId = session.metadata?.orderId

  // ─── 2. Resolve orderId (metadata or DB fallback) ──────────────────
  if (!orderId) {
    console.error('[Webhook] Missing metadata.orderId', {
      sessionId: session.id,
      eventId,
      eventType,
      metadataKeys: Object.keys(session.metadata ?? {}),
    })

    // Fallback: find order by stripe_checkout_session_id
    const { data: fallbackOrder, error: fallbackError } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('stripe_checkout_session_id', session.id)
      .maybeSingle()

    if (fallbackError) {
      console.error('[Webhook] Fallback lookup DB error', {
        sessionId: session.id,
        eventId,
        error: fallbackError.message,
      })
    }

    if (fallbackOrder?.id) {
      console.warn('[Webhook] Recovered order via stripe_checkout_session_id fallback', {
        sessionId: session.id,
        recoveredOrderId: fallbackOrder.id,
        eventId,
      })
      orderId = fallbackOrder.id
    } else {
      console.error('[Webhook] CRITICAL: Cannot find order for session — no metadata and no DB match', {
        sessionId: session.id,
        eventId,
        eventType,
      })
      return { notFound: true }
    }
  }

  // ─── 3. Update order to PAID ────────────────────────────────────────
  // The state machine trigger (019_order_state_machine.sql) enforces the path
  // CREATED → PAYMENT_PENDING → PAID. We do this in two steps so that the
  // non-state fields update succeeds even if the order somehow missed the
  // PAYMENT_PENDING transition (e.g. legacy orders or race conditions).

  // Step 3a: Update payment fields — does NOT touch `state` so no trigger fires.
  // Also defensively writes stripe_checkout_session_id in case it was missing.
  const { data: updatedRows, error: updateError } = await supabaseAdmin
    .from('orders')
    .update({
      payment_status: 'paid',
      status: 'PAID',
      stripe_payment_intent_id: session.payment_intent as string,
      stripe_checkout_session_id: session.id,
      paid_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select('id')

  if (updateError) {
    throw new Error(`Failed to update order payment fields: ${updateError.message}`)
  }

  if (!updatedRows || updatedRows.length === 0) {
    console.error('[Webhook] CRITICAL: Order payment update wrote 0 rows', {
      orderId,
      sessionId: session.id,
      eventId,
    })
    throw new Error(`Order payment update wrote 0 rows for orderId=${orderId}`)
  }

  // Step 3b: Advance state machine. Bridge CREATED → PAYMENT_PENDING first
  // (no-op if already PAYMENT_PENDING). Then PAYMENT_PENDING → PAID.
  const { error: bridgeError } = await supabaseAdmin
    .from('orders')
    .update({ state: 'PAYMENT_PENDING' })
    .eq('id', orderId)
    .eq('state', 'CREATED')

  if (bridgeError) {
    // Not fatal — state may already be PAYMENT_PENDING
    console.warn('[Webhook] State bridge CREATED→PAYMENT_PENDING skipped or failed', {
      orderId, eventId, error: bridgeError.message,
    })
  }

  const { error: stateError } = await supabaseAdmin
    .from('orders')
    .update({ state: 'PAID' })
    .eq('id', orderId)

  if (stateError) {
    // Log CRITICAL but don't throw — payment fields are already updated.
    // Manual reconciliation can fix state if needed.
    console.error('[Webhook] CRITICAL: State transition to PAID failed', {
      orderId, sessionId: session.id, eventId, error: stateError.message,
    })
  }

  console.log('[Webhook] Order updated to PAID', {
    orderId,
    rowsUpdated: updatedRows.length,
    sessionId: session.id,
    eventId,
    paymentIntentId: session.payment_intent,
  })

  // ─── 4. LEDGER: Record payment received ────────────────────────────
  try {
    // Only select columns that exist on the orders table.
    // orders.tax_amount and orders.platform_fee do NOT exist.
    const { data: orderForLedger, error: ledgerReadError } = await supabaseAdmin
      .from('orders')
      .select('total_amount, shipping_cost, discount_amount, currency')
      .eq('id', orderId)
      .single()

    if (ledgerReadError) {
      throw new Error(`Could not read order for ledger: ${ledgerReadError.message}`)
    }

    if (orderForLedger) {
      const totalAmount = Number(orderForLedger.total_amount || 0)
      const currency = orderForLedger.currency || 'EUR'
      // orders.tax_amount does not exist — tax ledger entry is skipped
      const taxAmount = 0

      console.log('[Webhook] Ledger: order fields', {
        orderId,
        totalAmount,
        currency,
        shipping_cost: orderForLedger.shipping_cost,
        discount_amount: orderForLedger.discount_amount,
        eventId,
      })

      // Double-entry: Debit platform_cash, Credit escrow
      await recordPaymentReceived(orderId, totalAmount, currency)
      console.log('[Webhook] Ledger: recordPaymentReceived OK', { orderId, totalAmount, currency, eventId })

      // taxAmount is always 0 since orders.tax_amount column does not exist
      if (taxAmount > 0) {
        await recordTaxCollected(orderId, taxAmount, currency, 'DE')
        console.log('[Webhook] Ledger: recordTaxCollected OK', { orderId, taxAmount, eventId })
      }

      // Reconciliation record (with actual Stripe fee if available)
      const paymentIntentId = session.payment_intent as string
      if (paymentIntentId) {
        try {
          const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ['charges.data.balance_transaction'],
          })
          const charge = pi.latest_charge as any
          const balanceTx = charge?.balance_transaction as any
          const stripeFee = balanceTx?.fee ? balanceTx.fee / 100 : 0
          await recordPaymentTransaction(orderId, 'stripe', paymentIntentId, totalAmount, stripeFee)
          console.log('[Webhook] Ledger: reconciliation recorded', { orderId, paymentIntentId, stripeFee, eventId })
        } catch (feeErr) {
          // Fallback: record without fee detail so reconciliation is not skipped
          await recordPaymentTransaction(orderId, 'stripe', paymentIntentId, totalAmount, 0)
          console.log('[Webhook] Ledger: reconciliation recorded (no fee detail)', {
            orderId,
            paymentIntentId,
            eventId,
            feeError: feeErr instanceof Error ? feeErr.message : String(feeErr),
          })
        }
      }
    }
  } catch (ledgerError) {
    // Ledger failure must not fail the webhook — order is already marked PAID
    console.error('[Webhook] Ledger recording error', {
      orderId,
      eventId,
      error: ledgerError instanceof Error ? ledgerError.message : String(ledgerError),
    })
  }

  // ─── 5. Email: send order confirmation ─────────────────────────────
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      user:users(email, full_name),
      items:order_items(
        quantity,
        size,
        product:products(title, price, images)
      )
    `)
    .eq('id', orderId)
    .single()

  if (!order || !order.user) {
    return
  }

  try {
    const emailTemplate = getOrderConfirmationEmail(order as any)

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Wearo <orders@wearo.com>',
      to: order.user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    })
  } catch (emailError) {
    const { logger } = await import('@/lib/logger')
    logger.warn('Failed to send order confirmation email', {
      orderId,
      error: emailError instanceof Error ? emailError.message : String(emailError),
    })
  }
}

async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId
  if (!orderId) return

  await supabaseAdmin
    .from('orders')
    .update({
      payment_status: 'failed',
      status: 'CANCELLED',
      state: 'CANCELLED',
    })
    .eq('id', orderId)
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single()

  if (order) {
    await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'failed',
        status: 'CANCELLED',
        state: 'CANCELLED',
      })
      .eq('id', order.id)
  }
}
