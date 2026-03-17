/**
 * PAYOUT ENGINE — Risk-Weighted Seller Payouts (FAZ B Enhanced)
 *
 * Payout timing based on seller risk score:
 *   0-30  -> 3 day hold
 *   31-60 -> 7 day hold
 *   61-80 -> 14 day hold
 *   81-100 -> manual review required
 *
 * FAZ B additions:
 *   - Fraud-adjusted reserve auto-tier (chargeback rate -> reserve %)
 *   - Rolling reserve deduction from payable amount
 *   - Idempotency key on payout batches
 *   - Payout block flag from risk engine
 *   - Negative balance limit enforcement
 *
 * Payable = available_balance - pending_refunds - chargeback_reserve
 *         - pending_payouts - rolling_reserves
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import { recordPayoutProcessed } from '@/lib/ledger-engine'

// ─── Types ──────────────────────────────────────────────────────────

interface PayoutBatch {
  id: string
  sellerId: string
  amount: number
  currency: string
  status: string
  scheduledDate: string
  holdReason: string | null
  riskScore: number
  createdAt: string
}

interface PayableAmount {
  availableBalance: number
  pendingRefunds: number
  chargebackReserve: number
  pendingPayouts: number
  rollingReserveHeld: number
  payableAmount: number
  payoutBlocked: boolean
  blockReason: string | null
}

// ─── Risk -> Hold Period Mapping ────────────────────────────────────

function getHoldDays(riskScore: number): { days: number; holdReason: string | null } {
  if (riskScore <= 30) return { days: 3, holdReason: null }
  if (riskScore <= 60) return { days: 7, holdReason: 'Medium risk score' }
  if (riskScore <= 80) return { days: 14, holdReason: 'High risk score - extended hold' }
  return { days: -1, holdReason: 'Critical risk score - manual review required' }
}

// ─── Core Functions ─────────────────────────────────────────────────

/**
 * Calculate the payable amount for a seller (balance minus all reserves).
 * Now includes rolling reserve and payout block checks.
 */
export async function calculatePayableAmount(sellerId: string): Promise<PayableAmount> {
  // Base calculation from RPC
  const { data, error } = await supabaseAdmin.rpc('calculate_seller_payout', {
    p_seller_id: sellerId,
  })

  if (error || !data) {
    console.error('[Payout] Calculate payable error:', error?.message)
    return {
      availableBalance: 0, pendingRefunds: 0, chargebackReserve: 0,
      pendingPayouts: 0, rollingReserveHeld: 0, payableAmount: 0,
      payoutBlocked: false, blockReason: null,
    }
  }

  // Get rolling reserve held
  const { data: reserves } = await supabaseAdmin
    .from('seller_reserves')
    .select('amount')
    .eq('seller_id', sellerId)
    .eq('released', false)

  const rollingReserveHeld = (reserves || [])
    .reduce((sum, r) => sum + parseFloat(String(r.amount || 0)), 0)

  // Check payout block flag
  const { data: riskData } = await supabaseAdmin
    .from('seller_risk_scores')
    .select('payout_block_flag, negative_balance_limit')
    .eq('seller_id', sellerId)
    .maybeSingle()

  const payoutBlocked = riskData?.payout_block_flag || false
  const negativeLimit = parseFloat(String(riskData?.negative_balance_limit || 0))

  const available = parseFloat(data.available_balance || 0)
  const pendingRefunds = parseFloat(data.pending_refunds || 0)
  const chargebackReserve = parseFloat(data.chargeback_reserve || 0)
  const pendingPayouts = parseFloat(data.pending_payouts || 0)

  // Payable = available - all holds - rolling reserve
  let payableAmount = Math.max(
    available - pendingRefunds - chargebackReserve - pendingPayouts - rollingReserveHeld,
    0
  )

  // If negative balance limit is set, enforce it
  if (negativeLimit > 0 && available < 0 && Math.abs(available) > negativeLimit) {
    payableAmount = 0
  }

  let blockReason: string | null = null
  if (payoutBlocked) {
    payableAmount = 0
    blockReason = 'Payout blocked by risk engine'
  }

  return {
    availableBalance: available,
    pendingRefunds,
    chargebackReserve,
    pendingPayouts,
    rollingReserveHeld: Math.round(rollingReserveHeld * 100) / 100,
    payableAmount: Math.round(payableAmount * 100) / 100,
    payoutBlocked,
    blockReason,
  }
}

/**
 * Schedule a payout for a seller.
 * Now with idempotency key and payout block check.
 */
export async function schedulePayout(
  sellerId: string,
  requestedAmount?: number,
  currency: string = 'EUR'
): Promise<{ success: boolean; batch?: PayoutBatch; error?: string }> {
  // 1. Calculate payable
  const payable = await calculatePayableAmount(sellerId)

  if (payable.payoutBlocked) {
    return { success: false, error: payable.blockReason || 'Payout blocked' }
  }

  if (payable.payableAmount <= 0) {
    return { success: false, error: 'No payable balance available' }
  }

  const amount = requestedAmount
    ? Math.min(requestedAmount, payable.payableAmount)
    : payable.payableAmount

  if (amount <= 0) {
    return { success: false, error: 'Requested amount exceeds payable balance' }
  }

  // 2. Get risk score
  const { data: riskData } = await supabaseAdmin
    .from('seller_risk_scores')
    .select('overall_score, payout_delay_days, auto_reserve_tier')
    .eq('seller_id', sellerId)
    .maybeSingle()

  const riskScore = riskData?.overall_score ?? 0
  const customDelay = riskData?.payout_delay_days

  // 3. Determine hold period
  const { days: holdDays, holdReason } = getHoldDays(riskScore)
  const effectiveDelay = customDelay ?? (holdDays >= 0 ? holdDays : 30)

  const scheduledDate = new Date()
  scheduledDate.setDate(scheduledDate.getDate() + effectiveDelay)

  // 4. Determine initial status
  const status = holdDays < 0 ? 'held' : 'pending'

  // 5. Generate idempotency key
  const idempotencyKey = `payout_${sellerId}_${new Date().toISOString().split('T')[0]}_${Date.now()}`

  // 6. Create payout batch
  const { data: batch, error } = await supabaseAdmin
    .from('payout_batches')
    .insert({
      seller_id: sellerId,
      amount,
      currency,
      hold_reason: holdReason,
      scheduled_date: scheduledDate.toISOString(),
      status,
      risk_score: riskScore,
      idempotency_key: idempotencyKey,
    })
    .select()
    .single()

  if (error) {
    console.error('[Payout] Schedule error:', error.message)
    return { success: false, error: error.message }
  }

  return {
    success: true,
    batch: {
      id: batch.id,
      sellerId: batch.seller_id,
      amount: parseFloat(batch.amount),
      currency: batch.currency,
      status: batch.status,
      scheduledDate: batch.scheduled_date,
      holdReason: batch.hold_reason,
      riskScore: batch.risk_score,
      createdAt: batch.created_at,
    },
  }
}

/**
 * Process a payout batch — execute the actual Stripe transfer.
 * Re-verifies payable (including rolling reserves) before processing.
 */
export async function processPayoutBatch(
  batchId: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Get batch
  const { data: batch, error: fetchError } = await supabaseAdmin
    .from('payout_batches')
    .select('*')
    .eq('id', batchId)
    .single()

  if (fetchError || !batch) {
    return { success: false, error: 'Batch not found' }
  }

  if (!['pending', 'approved'].includes(batch.status)) {
    return { success: false, error: `Batch status is '${batch.status}', cannot process` }
  }

  // 2. Re-verify payable amount (including rolling reserve)
  const payable = await calculatePayableAmount(batch.seller_id)
  if (payable.payoutBlocked) {
    await supabaseAdmin
      .from('payout_batches')
      .update({ status: 'failed', error_message: 'Payout blocked by risk engine', updated_at: new Date().toISOString() })
      .eq('id', batchId)
    return { success: false, error: 'Payout blocked by risk engine' }
  }

  if (payable.payableAmount < parseFloat(batch.amount)) {
    await supabaseAdmin
      .from('payout_batches')
      .update({ status: 'failed', error_message: 'Insufficient payable balance at processing time', updated_at: new Date().toISOString() })
      .eq('id', batchId)
    return { success: false, error: 'Insufficient payable balance' }
  }

  // 3. Mark as processing
  await supabaseAdmin
    .from('payout_batches')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', batchId)

  try {
    // 4. Execute Stripe transfer
    const { createSellerTransfer } = await import('@/lib/stripe-connect')
    const transfer = await createSellerTransfer(
      batch.seller_id,
      parseFloat(batch.amount),
      batchId
    )

    // 5. Deduct from seller balance (atomic)
    const { data: deductResult } = await supabaseAdmin.rpc('balance_deduct', {
      p_seller_id: batch.seller_id,
      p_amount: parseFloat(batch.amount),
      p_ref_type: 'payout',
      p_ref_id: batchId,
      p_description: `Payout batch ${batchId}`,
      p_idempotency_key: `payout_${batchId}`,
    })

    if (deductResult && !deductResult.success) {
      throw new Error(deductResult.error || 'Balance deduction failed')
    }

    // 6. Record in ledger
    await recordPayoutProcessed(batch.seller_id, parseFloat(batch.amount), batchId)

    // 7. Mark completed
    await supabaseAdmin
      .from('payout_batches')
      .update({
        status: 'completed',
        stripe_transfer_id: transfer.id,
        released_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', batchId)

    return { success: true }
  } catch (err: any) {
    console.error('[Payout] Process error:', err.message)
    await supabaseAdmin
      .from('payout_batches')
      .update({
        status: 'failed',
        error_message: err.message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', batchId)
    return { success: false, error: err.message }
  }
}

/**
 * Admin: Hold a payout batch
 */
export async function holdPayout(
  batchId: string,
  reason: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from('payout_batches')
    .update({
      status: 'held',
      hold_reason: reason,
      approved_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', batchId)
    .in('status', ['pending', 'approved'])

  if (error) return { success: false, error: error.message }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: adminId,
    actor_type: 'admin',
    action: 'payout_held',
    resource_type: 'payout_batch',
    resource_id: batchId,
    details: { reason },
    severity: 'warning',
  })

  return { success: true }
}

/**
 * Admin: Release/approve a held payout
 */
export async function releasePayout(
  batchId: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from('payout_batches')
    .update({
      status: 'approved',
      approved_by: adminId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', batchId)
    .eq('status', 'held')

  if (error) return { success: false, error: error.message }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: adminId,
    actor_type: 'admin',
    action: 'payout_released',
    resource_type: 'payout_batch',
    resource_id: batchId,
    details: {},
    severity: 'info',
  })

  return { success: true }
}

/**
 * Get payout schedule for a seller
 */
export async function getPayoutSchedule(sellerId: string): Promise<PayoutBatch[]> {
  const { data } = await supabaseAdmin
    .from('payout_batches')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(20)

  return (data || []).map(b => ({
    id: b.id,
    sellerId: b.seller_id,
    amount: parseFloat(b.amount),
    currency: b.currency,
    status: b.status,
    scheduledDate: b.scheduled_date,
    holdReason: b.hold_reason,
    riskScore: b.risk_score,
    createdAt: b.created_at,
  }))
}

/**
 * Get all pending/due payout batches (for cron processing)
 */
export async function getDuePayouts(): Promise<PayoutBatch[]> {
  const now = new Date().toISOString()

  const { data } = await supabaseAdmin
    .from('payout_batches')
    .select('*')
    .in('status', ['pending', 'approved'])
    .lte('scheduled_date', now)
    .order('scheduled_date', { ascending: true })
    .limit(50)

  return (data || []).map(b => ({
    id: b.id,
    sellerId: b.seller_id,
    amount: parseFloat(b.amount),
    currency: b.currency,
    status: b.status,
    scheduledDate: b.scheduled_date,
    holdReason: b.hold_reason,
    riskScore: b.risk_score,
    createdAt: b.created_at,
  }))
}

/**
 * Run fraud-adjusted reserve tier update for all sellers.
 * Calls the DB RPC that recalculates chargeback rates and adjusts reserve tiers.
 */
export async function runFraudAdjustedReserveTiers(): Promise<{
  success: boolean; sellersUpdated?: number; error?: string
}> {
  try {
    const { data, error } = await supabaseAdmin.rpc('auto_adjust_reserve_tiers')
    if (error) return { success: false, error: error.message }
    return { success: true, sellersUpdated: (data as any)?.sellers_updated || 0 }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
