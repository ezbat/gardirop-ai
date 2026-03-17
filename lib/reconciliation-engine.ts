/**
 * RECONCILIATION ENGINE — Ledger vs Payment Provider Verification
 *
 * Daily process:
 * 1. Sum all ledger entries (platform_cash debits) for a date
 * 2. Sum all payment_transactions (net_settlement) for same date
 * 3. Compare — flag mismatches
 * 4. Admin reviews and resolves
 */

import { supabaseAdmin } from '@/lib/supabase-admin'

// ─── Types ──────────────────────────────────────────────────────────

interface ReconciliationResult {
  runDate: string
  totalLedger: number
  totalProvider: number
  variance: number
  status: 'matched' | 'mismatch' | 'pending'
  matchedCount: number
  mismatchedCount: number
  mismatchedTransactions: Array<{
    orderId: string
    ledgerAmount: number
    providerAmount: number
    difference: number
  }>
}

// ─── Payment Transaction Recording ──────────────────────────────────

/**
 * Record a Stripe payment transaction for reconciliation.
 * Called after successful payment webhook.
 */
export async function recordPaymentTransaction(
  orderId: string,
  provider: string = 'stripe',
  providerTransactionId: string,
  grossAmount: number,
  feeAmount: number,
  currency: string = 'EUR'
): Promise<{ success: boolean; error?: string }> {
  const netSettlement = Math.round((grossAmount - feeAmount) * 100) / 100

  const { error } = await supabaseAdmin
    .from('payment_transactions')
    .insert({
      order_id: orderId,
      provider,
      provider_transaction_id: providerTransactionId,
      gross_amount: grossAmount,
      fee_amount: feeAmount,
      net_settlement: netSettlement,
      currency,
      status: 'settled',
      settled_at: new Date().toISOString(),
    })

  if (error) {
    console.error('[Reconciliation] Record payment error:', error.message)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Mark a payment transaction as disputed (chargeback)
 */
export async function markTransactionDisputed(
  providerTransactionId: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  const { data, error } = await supabaseAdmin
    .from('payment_transactions')
    .update({
      status: 'disputed',
      chargeback_flag: true,
    })
    .eq('provider_transaction_id', providerTransactionId)
    .select('id')
    .maybeSingle()

  if (error) return { success: false, error: error.message }
  return { success: true, transactionId: data?.id }
}

// ─── Reconciliation ─────────────────────────────────────────────────

/**
 * Run daily reconciliation.
 * Compares ledger "payment_received" transactions vs payment_transactions for a date.
 */
export async function runReconciliation(
  date: string // YYYY-MM-DD
): Promise<ReconciliationResult> {
  const startOfDay = `${date}T00:00:00.000Z`
  const endOfDay = `${date}T23:59:59.999Z`

  // 1. Get all payment_received ledger transactions for the day
  const { data: ledgerTxs } = await supabaseAdmin
    .from('ledger_transactions')
    .select('id, reference_id, metadata')
    .eq('type', 'payment_received')
    .eq('reference_type', 'order')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)

  // 2. Get all payment_transactions for the day
  const { data: paymentTxs } = await supabaseAdmin
    .from('payment_transactions')
    .select('order_id, gross_amount, fee_amount, net_settlement')
    .eq('status', 'settled')
    .gte('settled_at', startOfDay)
    .lte('settled_at', endOfDay)

  // 3. Build maps by order_id
  const ledgerMap = new Map<string, number>()
  for (const tx of ledgerTxs || []) {
    const amount = (tx.metadata as any)?.amount || 0
    ledgerMap.set(tx.reference_id, parseFloat(String(amount)))
  }

  const providerMap = new Map<string, number>()
  for (const tx of paymentTxs || []) {
    providerMap.set(tx.order_id, parseFloat(String(tx.gross_amount)))
  }

  // 4. Compare
  const allOrderIds = new Set([...ledgerMap.keys(), ...providerMap.keys()])
  let totalLedger = 0
  let totalProvider = 0
  let matchedCount = 0
  let mismatchedCount = 0
  const mismatches: Array<{ orderId: string; ledgerAmount: number; providerAmount: number; difference: number }> = []

  for (const orderId of allOrderIds) {
    const ledgerAmount = ledgerMap.get(orderId) || 0
    const providerAmount = providerMap.get(orderId) || 0
    totalLedger += ledgerAmount
    totalProvider += providerAmount

    const diff = Math.abs(ledgerAmount - providerAmount)
    if (diff < 0.01) {
      matchedCount++
    } else {
      mismatchedCount++
      mismatches.push({
        orderId,
        ledgerAmount,
        providerAmount,
        difference: Math.round(diff * 100) / 100,
      })
    }
  }

  totalLedger = Math.round(totalLedger * 100) / 100
  totalProvider = Math.round(totalProvider * 100) / 100
  const variance = Math.round(Math.abs(totalLedger - totalProvider) * 100) / 100
  const status: 'matched' | 'mismatch' = mismatchedCount === 0 ? 'matched' : 'mismatch'

  // 5. Store the result
  const { error } = await supabaseAdmin
    .from('reconciliation_runs')
    .insert({
      run_date: date,
      total_ledger: totalLedger,
      total_provider: totalProvider,
      variance,
      status,
      matched_count: matchedCount,
      mismatched_count: mismatchedCount,
      mismatched_transactions: mismatches,
    })

  if (error) {
    console.error('[Reconciliation] Save run error:', error.message)
  }

  return {
    runDate: date,
    totalLedger,
    totalProvider,
    variance,
    status,
    matchedCount,
    mismatchedCount,
    mismatchedTransactions: mismatches,
  }
}

/**
 * Get latest reconciliation results
 */
export async function getReconciliationHistory(
  limit: number = 30
): Promise<Array<{
  id: string
  runDate: string
  totalLedger: number
  totalProvider: number
  variance: number
  status: string
  matchedCount: number
  mismatchedCount: number
  createdAt: string
}>> {
  const { data } = await supabaseAdmin
    .from('reconciliation_runs')
    .select('*')
    .order('run_date', { ascending: false })
    .limit(limit)

  return (data || []).map(r => ({
    id: r.id,
    runDate: r.run_date,
    totalLedger: parseFloat(String(r.total_ledger)),
    totalProvider: parseFloat(String(r.total_provider)),
    variance: parseFloat(String(r.variance)),
    status: r.status,
    matchedCount: r.matched_count,
    mismatchedCount: r.mismatched_count,
    createdAt: r.created_at,
  }))
}

/**
 * Get reconciliation status for a specific date
 */
export async function getReconciliationForDate(
  date: string
): Promise<ReconciliationResult | null> {
  const { data } = await supabaseAdmin
    .from('reconciliation_runs')
    .select('*')
    .eq('run_date', date)
    .maybeSingle()

  if (!data) return null

  return {
    runDate: data.run_date,
    totalLedger: parseFloat(String(data.total_ledger)),
    totalProvider: parseFloat(String(data.total_provider)),
    variance: parseFloat(String(data.variance)),
    status: data.status,
    matchedCount: data.matched_count,
    mismatchedCount: data.mismatched_count,
    mismatchedTransactions: data.mismatched_transactions || [],
  }
}

// ─── Chargeback Recording ───────────────────────────────────────────

/**
 * Record a chargeback from Stripe dispute webhook
 */
export async function recordChargeback(
  orderId: string,
  sellerId: string,
  stripeDisputeId: string,
  amount: number,
  reasonCode: string,
  currency: string = 'EUR'
): Promise<{ success: boolean; chargebackId?: string; error?: string }> {
  // Find the payment_transaction
  const { data: paymentTx } = await supabaseAdmin
    .from('payment_transactions')
    .select('id')
    .eq('order_id', orderId)
    .maybeSingle()

  // Calculate evidence deadline (typically 7-21 days from Stripe)
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + 14) // 14 day default

  const { data, error } = await supabaseAdmin
    .from('chargebacks')
    .insert({
      order_id: orderId,
      payment_transaction_id: paymentTx?.id || null,
      stripe_dispute_id: stripeDisputeId,
      reason_code: reasonCode,
      amount,
      currency,
      status: 'open',
      seller_id: sellerId,
      evidence_deadline: deadline.toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('[Chargeback] Record error:', error.message)
    return { success: false, error: error.message }
  }

  // Mark payment_transaction as disputed
  if (paymentTx) {
    await markTransactionDisputed(stripeDisputeId)
  }

  // Increase seller risk score (best-effort, RPC may not exist)
  try {
    await supabaseAdmin.rpc('increment_risk_score_for_chargeback', {
      p_seller_id: sellerId,
    })
  } catch {
    // RPC may not exist yet, that's fine
  }

  return { success: true, chargebackId: data.id }
}

/**
 * Get active chargebacks for admin overview
 */
export async function getActiveChargebacks(
  limit: number = 20
): Promise<Array<{
  id: string
  orderId: string
  sellerId: string
  amount: number
  currency: string
  reasonCode: string
  status: string
  evidenceDeadline: string | null
  createdAt: string
}>> {
  const { data } = await supabaseAdmin
    .from('chargebacks')
    .select('*')
    .in('status', ['open', 'evidence_submitted', 'under_review'])
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data || []).map(c => ({
    id: c.id,
    orderId: c.order_id,
    sellerId: c.seller_id || '',
    amount: parseFloat(String(c.amount)),
    currency: c.currency,
    reasonCode: c.reason_code || '',
    status: c.status,
    evidenceDeadline: c.evidence_deadline,
    createdAt: c.created_at,
  }))
}

/**
 * Get chargeback rate for admin dashboard
 */
export async function getChargebackRate(days: number = 30): Promise<{
  totalOrders: number
  totalChargebacks: number
  rate: number // percentage
  totalAmount: number
}> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString()

  const [ordersResult, chargebacksResult] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'paid')
      .gte('created_at', sinceStr),
    supabaseAdmin
      .from('chargebacks')
      .select('amount')
      .gte('created_at', sinceStr),
  ])

  const totalOrders = ordersResult.count || 0
  const chargebacks = chargebacksResult.data || []
  const totalChargebacks = chargebacks.length
  const totalAmount = chargebacks.reduce((sum, c) => sum + parseFloat(String(c.amount || 0)), 0)
  const rate = totalOrders > 0 ? (totalChargebacks / totalOrders) * 100 : 0

  return {
    totalOrders,
    totalChargebacks,
    rate: Math.round(rate * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  }
}
