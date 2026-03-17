/**
 * LEDGER ENGINE — Double-Entry Accounting Core (FAZ B Enhanced)
 *
 * Every money movement produces balanced debit/credit entries.
 * All ledger data is immutable — never update, only append.
 *
 * FAZ B additions:
 *   - Multi-currency support (currency_code, fx_rate on transactions)
 *   - Rolling reserve withhold/release
 *   - FX gain/loss recording
 *   - Payment fee revenue loss on refunds
 *   - Idempotent transactions (external_reference_id)
 *   - Tax dimension on entries (tax_country_code, tax_type)
 *   - Period lock awareness
 *
 * Account types:
 *   platform_cash             — money received from payments
 *   escrow                    — held until delivery confirmed
 *   seller_balance            — payable to seller
 *   commission_revenue        — platform earnings
 *   refund_liability          — pending refund obligations
 *   payment_fee_expense       — Stripe processing fees
 *   tax_collected             — VAT/tax to remit to authorities
 *   fx_unrealized_gain_loss   — unrealized FX gains/losses
 *   fx_realized_gain_loss     — realized FX gains/losses
 *   seller_rolling_reserve    — per-seller rolling reserve
 *   chargeback_reserve        — platform chargeback reserve pool
 *   payment_fee_revenue_loss  — non-refundable Stripe fees on refunds
 */

import { supabaseAdmin } from '@/lib/supabase-admin'

// ─── Types ──────────────────────────────────────────────────────────

type AccountType =
  | 'platform_cash'
  | 'seller_balance'
  | 'escrow'
  | 'commission_revenue'
  | 'refund_liability'
  | 'payment_fee_expense'
  | 'tax_collected'
  | 'fx_unrealized_gain_loss'
  | 'fx_realized_gain_loss'
  | 'seller_rolling_reserve'
  | 'chargeback_reserve'
  | 'payment_fee_revenue_loss'

type TransactionType =
  | 'payment_received'
  | 'delivery_confirmed'
  | 'refund_issued'
  | 'chargeback_received'
  | 'chargeback_reversed'
  | 'payout_processed'
  | 'fee_collected'
  | 'tax_collected'
  | 'adjustment'
  | 'fx_revaluation'
  | 'reserve_withheld'
  | 'reserve_released'
  | 'month_end_closing'
  | 'payment_fee_loss'

type ReferenceType = 'order' | 'refund' | 'chargeback' | 'payout' | 'adjustment' | 'fx_revaluation' | 'reserve' | 'period_close'

interface LedgerEntry {
  account_id: string
  debit_amount: number
  credit_amount: number
  currency?: string
  description?: string
  tax_country_code?: string
  tax_type?: string
}

interface AccountBalance {
  accountId: string
  accountType: AccountType
  ownerId: string
  ownerType: string
  currency: string
  debitTotal: number
  creditTotal: number
  balance: number
}

interface TrialBalance {
  accounts: AccountBalance[]
  totalDebit: number
  totalCredit: number
  balanced: boolean
}

interface TransactionOptions {
  externalReferenceId?: string
  currencyCode?: string
  fxRate?: number
  fxSource?: string
}

// ─── Account Management ─────────────────────────────────────────────

/**
 * Get or create a ledger account. Idempotent.
 */
export async function getOrCreateAccount(
  accountType: AccountType,
  ownerId: string,
  ownerType: 'platform' | 'seller' = 'platform',
  currency: string = 'EUR'
): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from('ledger_accounts')
    .select('id')
    .eq('account_type', accountType)
    .eq('owner_id', ownerId)
    .eq('currency', currency)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created, error } = await supabaseAdmin
    .from('ledger_accounts')
    .insert({
      account_type: accountType,
      owner_id: ownerId,
      owner_type: ownerType,
      currency,
      description: `${accountType} for ${ownerType}:${ownerId}`,
    })
    .select('id')
    .single()

  if (error) {
    // Race condition: another request created it
    const { data: retry } = await supabaseAdmin
      .from('ledger_accounts')
      .select('id')
      .eq('account_type', accountType)
      .eq('owner_id', ownerId)
      .eq('currency', currency)
      .single()
    if (retry) return retry.id
    throw new Error(`Failed to create ledger account: ${error.message}`)
  }

  return created.id
}

async function getPlatformAccount(type: AccountType, currency: string = 'EUR'): Promise<string> {
  return getOrCreateAccount(type, 'platform', 'platform', currency)
}

async function getSellerAccount(sellerId: string, type: AccountType = 'seller_balance', currency: string = 'EUR'): Promise<string> {
  return getOrCreateAccount(type, sellerId, 'seller', currency)
}

// ─── Core Transaction Recording ─────────────────────────────────────

/**
 * Record a balanced ledger transaction via RPC.
 * Now supports idempotency (external_reference_id), multi-currency, and FX.
 */
async function recordTransaction(
  type: TransactionType,
  referenceType: ReferenceType,
  referenceId: string,
  entries: LedgerEntry[],
  description?: string,
  metadata?: Record<string, any>,
  options?: TransactionOptions
): Promise<{ success: boolean; transactionId?: string; duplicate?: boolean; error?: string }> {
  // Try the FAZ B version (with idempotency + multi-currency params) first,
  // fall back to original 6-param version if migration 007 hasn't been applied yet.
  let data: any
  let error: any

  // Strip non-standard fields from entries for the old RPC (only account_id, debit_amount, credit_amount, currency, description)
  const cleanEntries = entries.map(e => ({
    account_id: e.account_id,
    debit_amount: e.debit_amount,
    credit_amount: e.credit_amount,
    currency: e.currency || 'EUR',
    description: e.description || null,
    ...(e.tax_country_code ? { tax_country_code: e.tax_country_code } : {}),
    ...(e.tax_type ? { tax_type: e.tax_type } : {}),
  }))

  const fazBParams = {
    p_type: type,
    p_reference_type: referenceType,
    p_reference_id: referenceId,
    p_entries: cleanEntries,
    p_description: description || null,
    p_metadata: metadata || {},
    p_external_reference_id: options?.externalReferenceId || null,
    p_currency_code: options?.currencyCode || 'EUR',
    p_fx_rate: options?.fxRate || null,
    p_fx_source: options?.fxSource || null,
  }

  const result1 = await supabaseAdmin.rpc('ledger_record_transaction', fazBParams)
  data = result1.data
  error = result1.error

  // Fallback: if the function signature doesn't match, try the original 6-param version
  if (error && error.message?.includes('Could not find the function')) {
    const result2 = await supabaseAdmin.rpc('ledger_record_transaction', {
      p_type: type,
      p_reference_type: referenceType,
      p_reference_id: referenceId,
      p_entries: cleanEntries,
      p_description: description || null,
      p_metadata: metadata || {},
    })
    data = result2.data
    error = result2.error
  }

  if (error) {
    console.error('[Ledger] RPC error:', error.message)
    return { success: false, error: error.message }
  }

  const result = data as any
  if (!result?.success) {
    console.error('[Ledger] Transaction failed:', result?.error)
    return { success: false, error: result?.error }
  }

  return {
    success: true,
    transactionId: result.transaction_id,
    duplicate: result.duplicate || false,
  }
}

// ─── Business Transaction Functions ─────────────────────────────────

/**
 * 1. PAYMENT RECEIVED — Customer pays for an order
 *
 * Debit:  platform_cash  (money in)
 * Credit: escrow         (held until delivery)
 *
 * Optional: record Stripe fee
 * Debit:  payment_fee_expense  (fee)
 * Credit: platform_cash        (fee deducted)
 */
export async function recordPaymentReceived(
  orderId: string,
  amount: number,
  currency: string = 'EUR',
  stripeFee?: number
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  const platformCash = await getPlatformAccount('platform_cash', currency)
  const escrow = await getPlatformAccount('escrow', currency)

  const entries: LedgerEntry[] = [
    { account_id: platformCash, debit_amount: amount, credit_amount: 0, currency, description: 'Payment received' },
    { account_id: escrow, debit_amount: 0, credit_amount: amount, currency, description: 'Held in escrow' },
  ]

  const result = await recordTransaction(
    'payment_received',
    'order',
    orderId,
    entries,
    `Payment received for order ${orderId}: ${currency} ${amount.toFixed(2)}`,
    { amount, currency, stripe_fee: stripeFee },
    { externalReferenceId: `payment_received_${orderId}`, currencyCode: currency }
  )

  // If Stripe fee is known, record it separately
  if (result.success && !result.duplicate && stripeFee && stripeFee > 0) {
    const feeAccount = await getPlatformAccount('payment_fee_expense', currency)
    await recordTransaction(
      'fee_collected',
      'order',
      orderId,
      [
        { account_id: feeAccount, debit_amount: stripeFee, credit_amount: 0, currency, description: 'Stripe processing fee' },
        { account_id: platformCash, debit_amount: 0, credit_amount: stripeFee, currency, description: 'Fee deducted from cash' },
      ],
      `Stripe fee for order ${orderId}: ${currency} ${stripeFee.toFixed(2)}`,
      undefined,
      { externalReferenceId: `fee_${orderId}`, currencyCode: currency }
    )
  }

  return result
}

/**
 * 2. DELIVERY CONFIRMED — Order delivered, release escrow
 *
 * Debit:  escrow              (release held funds)
 * Credit: seller_balance      (seller gets their share)
 * Credit: commission_revenue  (platform gets commission)
 */
export async function recordDeliveryConfirmed(
  orderId: string,
  sellerId: string,
  amount: number,
  commission: number,
  currency: string = 'EUR'
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  const escrow = await getPlatformAccount('escrow', currency)
  const sellerAccount = await getSellerAccount(sellerId, 'seller_balance', currency)
  const commissionAccount = await getPlatformAccount('commission_revenue', currency)

  const sellerAmount = amount - commission

  const entries: LedgerEntry[] = [
    { account_id: escrow, debit_amount: amount, credit_amount: 0, currency, description: 'Released from escrow' },
    { account_id: sellerAccount, debit_amount: 0, credit_amount: sellerAmount, currency, description: `Seller earnings (${sellerId})` },
    { account_id: commissionAccount, debit_amount: 0, credit_amount: commission, currency, description: `Commission ${((commission / amount) * 100).toFixed(1)}%` },
  ]

  const result = await recordTransaction(
    'delivery_confirmed',
    'order',
    orderId,
    entries,
    `Delivery confirmed for order ${orderId}: seller ${currency} ${sellerAmount.toFixed(2)}, commission ${currency} ${commission.toFixed(2)}`,
    { seller_id: sellerId, seller_amount: sellerAmount, commission },
    { externalReferenceId: `delivery_${orderId}`, currencyCode: currency }
  )

  // Auto-withhold rolling reserve if seller has reserve configured
  if (result.success && !result.duplicate) {
    await withholdRollingReserve(sellerId, orderId, sellerAmount, currency)
  }

  return result
}

/**
 * 3. REFUND ISSUED — Refund to customer
 *
 * Debit:  seller_balance      (seller returns their portion)
 * Debit:  commission_revenue  (platform returns commission)
 * Credit: refund_liability    (obligation to pay customer)
 *
 * NEW: Record non-refundable Stripe fee as payment_fee_revenue_loss
 */
export async function recordRefundIssued(
  orderId: string,
  sellerId: string,
  amount: number,
  commission: number,
  currency: string = 'EUR',
  nonRefundableStripeFee?: number
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  const sellerAccount = await getSellerAccount(sellerId, 'seller_balance', currency)
  const commissionAccount = await getPlatformAccount('commission_revenue', currency)
  const refundLiability = await getPlatformAccount('refund_liability', currency)

  const sellerAmount = amount - commission

  const entries: LedgerEntry[] = [
    { account_id: sellerAccount, debit_amount: sellerAmount, credit_amount: 0, currency, description: 'Refund: seller deduction' },
    { account_id: commissionAccount, debit_amount: commission, credit_amount: 0, currency, description: 'Refund: commission returned' },
    { account_id: refundLiability, debit_amount: 0, credit_amount: amount, currency, description: 'Refund liability created' },
  ]

  const result = await recordTransaction(
    'refund_issued',
    'refund',
    orderId,
    entries,
    `Refund issued for order ${orderId}: ${currency} ${amount.toFixed(2)}`,
    { seller_id: sellerId, seller_deduction: sellerAmount, commission_returned: commission },
    { externalReferenceId: `refund_${orderId}`, currencyCode: currency }
  )

  // Record non-refundable Stripe fee as revenue loss
  if (result.success && !result.duplicate && nonRefundableStripeFee && nonRefundableStripeFee > 0) {
    await recordPaymentFeeLoss(orderId, nonRefundableStripeFee, currency)
  }

  return result
}

/**
 * 3b. PAYMENT FEE LOSS — Non-refundable Stripe fee on refund
 *
 * Debit:  payment_fee_revenue_loss  (permanent loss)
 * Credit: payment_fee_expense       (offset the original fee recording)
 */
export async function recordPaymentFeeLoss(
  orderId: string,
  feeAmount: number,
  currency: string = 'EUR'
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  const feeLossAccount = await getPlatformAccount('payment_fee_revenue_loss', currency)
  const feeExpense = await getPlatformAccount('payment_fee_expense', currency)

  return recordTransaction(
    'payment_fee_loss',
    'refund',
    orderId,
    [
      { account_id: feeLossAccount, debit_amount: feeAmount, credit_amount: 0, currency, description: 'Non-refundable Stripe fee' },
      { account_id: feeExpense, debit_amount: 0, credit_amount: feeAmount, currency, description: 'Fee loss offset' },
    ],
    `Non-refundable Stripe fee on refund for ${orderId}: ${currency} ${feeAmount.toFixed(2)}`,
    undefined,
    { externalReferenceId: `fee_loss_${orderId}`, currencyCode: currency }
  )
}

/**
 * 4. CHARGEBACK RECEIVED — Stripe dispute filed
 *
 * Debit:  seller_balance  (seller covers the loss)
 * Credit: refund_liability (platform must pay back)
 */
export async function recordChargebackReceived(
  orderId: string,
  sellerId: string,
  amount: number,
  currency: string = 'EUR',
  disputeId?: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  const sellerAccount = await getSellerAccount(sellerId, 'seller_balance', currency)
  const refundLiability = await getPlatformAccount('refund_liability', currency)

  const entries: LedgerEntry[] = [
    { account_id: sellerAccount, debit_amount: amount, credit_amount: 0, currency, description: 'Chargeback: seller deduction' },
    { account_id: refundLiability, debit_amount: 0, credit_amount: amount, currency, description: 'Chargeback liability' },
  ]

  return recordTransaction(
    'chargeback_received',
    'chargeback',
    orderId,
    entries,
    `Chargeback received for order ${orderId}: ${currency} ${amount.toFixed(2)}`,
    { seller_id: sellerId, dispute_id: disputeId },
    { externalReferenceId: `chargeback_${disputeId || orderId}`, currencyCode: currency }
  )
}

/**
 * 5. CHARGEBACK REVERSED — Dispute won, seller gets money back
 *
 * Debit:  refund_liability  (remove obligation)
 * Credit: seller_balance    (return to seller)
 */
export async function recordChargebackReversed(
  orderId: string,
  sellerId: string,
  amount: number,
  currency: string = 'EUR'
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  const refundLiability = await getPlatformAccount('refund_liability', currency)
  const sellerAccount = await getSellerAccount(sellerId, 'seller_balance', currency)

  const entries: LedgerEntry[] = [
    { account_id: refundLiability, debit_amount: amount, credit_amount: 0, currency, description: 'Chargeback reversed' },
    { account_id: sellerAccount, debit_amount: 0, credit_amount: amount, currency, description: 'Chargeback reversal: funds returned' },
  ]

  return recordTransaction(
    'chargeback_reversed',
    'chargeback',
    orderId,
    entries,
    `Chargeback reversed for order ${orderId}: ${currency} ${amount.toFixed(2)} returned to seller`,
    { seller_id: sellerId },
    { externalReferenceId: `chargeback_reversed_${orderId}`, currencyCode: currency }
  )
}

/**
 * 6. PAYOUT PROCESSED — Money sent to seller via Stripe
 *
 * Debit:  seller_balance  (reduce seller's balance)
 * Credit: platform_cash   (money leaves platform)
 */
export async function recordPayoutProcessed(
  sellerId: string,
  amount: number,
  payoutBatchId: string,
  currency: string = 'EUR'
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  const sellerAccount = await getSellerAccount(sellerId, 'seller_balance', currency)
  const platformCash = await getPlatformAccount('platform_cash', currency)

  const entries: LedgerEntry[] = [
    { account_id: sellerAccount, debit_amount: amount, credit_amount: 0, currency, description: `Payout to seller ${sellerId}` },
    { account_id: platformCash, debit_amount: 0, credit_amount: amount, currency, description: 'Payout cash outflow' },
  ]

  return recordTransaction(
    'payout_processed',
    'payout',
    payoutBatchId,
    entries,
    `Payout processed for seller ${sellerId}: ${currency} ${amount.toFixed(2)}`,
    { seller_id: sellerId, batch_id: payoutBatchId },
    { externalReferenceId: `payout_${payoutBatchId}`, currencyCode: currency }
  )
}

/**
 * 7. TAX COLLECTED — Record tax portion of payment
 *
 * Debit:  platform_cash   (tax is included in payment)
 * Credit: tax_collected   (obligation to remit to authority)
 */
export async function recordTaxCollected(
  orderId: string,
  taxAmount: number,
  currency: string = 'EUR',
  taxCountry?: string,
  taxType?: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  if (taxAmount <= 0) return { success: true }

  const platformCash = await getPlatformAccount('platform_cash', currency)
  const taxAccount = await getPlatformAccount('tax_collected', currency)

  const entries: LedgerEntry[] = [
    {
      account_id: platformCash, debit_amount: taxAmount, credit_amount: 0, currency,
      description: `Tax collected (${taxCountry || 'EU'})`,
      tax_country_code: taxCountry,
      tax_type: taxType || 'VAT',
    },
    {
      account_id: taxAccount, debit_amount: 0, credit_amount: taxAmount, currency,
      description: `Tax liability (${taxCountry || 'EU'})`,
      tax_country_code: taxCountry,
      tax_type: taxType || 'VAT',
    },
  ]

  return recordTransaction(
    'tax_collected',
    'order',
    orderId,
    entries,
    `Tax collected for order ${orderId}: ${currency} ${taxAmount.toFixed(2)}`,
    { tax_country: taxCountry, tax_type: taxType },
    { externalReferenceId: `tax_${orderId}`, currencyCode: currency }
  )
}

// ─── Rolling Reserve Functions ───────────────────────────────────────

/**
 * Withhold rolling reserve from seller earnings after delivery.
 * Only activates if seller has rolling_reserve_percent > 0 in their risk profile.
 */
export async function withholdRollingReserve(
  sellerId: string,
  orderId: string,
  sellerEarnings: number,
  currency: string = 'EUR'
): Promise<{ success: boolean; withheld?: number; error?: string }> {
  // Get seller's reserve config
  const { data: riskData } = await supabaseAdmin
    .from('seller_risk_scores')
    .select('rolling_reserve_percent, rolling_reserve_days')
    .eq('seller_id', sellerId)
    .maybeSingle()

  const reservePercent = riskData?.rolling_reserve_percent || 0
  if (reservePercent <= 0) return { success: true, withheld: 0 }

  const reserveAmount = Math.round(sellerEarnings * reservePercent / 100 * 100) / 100
  if (reserveAmount <= 0) return { success: true, withheld: 0 }

  const reserveDays = riskData?.rolling_reserve_days || 90
  const releaseDate = new Date()
  releaseDate.setDate(releaseDate.getDate() + reserveDays)

  // Record in ledger
  const sellerAccount = await getSellerAccount(sellerId, 'seller_balance', currency)
  const reserveAccount = await getSellerAccount(sellerId, 'seller_rolling_reserve', currency)

  const result = await recordTransaction(
    'reserve_withheld',
    'reserve',
    orderId,
    [
      { account_id: sellerAccount, debit_amount: reserveAmount, credit_amount: 0, currency, description: `Rolling reserve ${reservePercent}%` },
      { account_id: reserveAccount, debit_amount: 0, credit_amount: reserveAmount, currency, description: `Reserve held for ${reserveDays}d` },
    ],
    `Rolling reserve withheld for seller ${sellerId}: ${currency} ${reserveAmount.toFixed(2)} (${reservePercent}%)`,
    { seller_id: sellerId, order_id: orderId, reserve_percent: reservePercent, reserve_days: reserveDays },
    { externalReferenceId: `reserve_withhold_${orderId}`, currencyCode: currency }
  )

  // Track in seller_reserves table
  if (result.success && !result.duplicate) {
    await supabaseAdmin.from('seller_reserves').insert({
      seller_id: sellerId,
      reserve_type: 'rolling',
      amount: reserveAmount,
      currency,
      release_at: releaseDate.toISOString(),
      source_order_id: orderId,
    })
  }

  return { success: result.success, withheld: reserveAmount, error: result.error }
}

/**
 * Release a rolling reserve back to seller balance.
 * Called by cron or admin when release_at date has passed.
 */
export async function releaseRollingReserve(
  reserveId: string
): Promise<{ success: boolean; released?: number; error?: string }> {
  const { data: reserve } = await supabaseAdmin
    .from('seller_reserves')
    .select('*')
    .eq('id', reserveId)
    .eq('released', false)
    .single()

  if (!reserve) return { success: false, error: 'Reserve not found or already released' }

  const currency = reserve.currency || 'EUR'
  const reserveAccount = await getSellerAccount(reserve.seller_id, 'seller_rolling_reserve', currency)
  const sellerAccount = await getSellerAccount(reserve.seller_id, 'seller_balance', currency)

  const result = await recordTransaction(
    'reserve_released',
    'reserve',
    reserveId,
    [
      { account_id: reserveAccount, debit_amount: parseFloat(reserve.amount), credit_amount: 0, currency, description: 'Rolling reserve released' },
      { account_id: sellerAccount, debit_amount: 0, credit_amount: parseFloat(reserve.amount), currency, description: 'Reserve returned to balance' },
    ],
    `Rolling reserve released for seller ${reserve.seller_id}: ${currency} ${parseFloat(reserve.amount).toFixed(2)}`,
    { seller_id: reserve.seller_id, reserve_id: reserveId },
    { externalReferenceId: `reserve_release_${reserveId}`, currencyCode: currency }
  )

  if (result.success) {
    await supabaseAdmin
      .from('seller_reserves')
      .update({ released: true, released_at: new Date().toISOString() })
      .eq('id', reserveId)
  }

  return { success: result.success, released: parseFloat(reserve.amount), error: result.error }
}

/**
 * Get all due reserves (past release_at, not yet released)
 */
export async function getDueReserves(): Promise<Array<{
  id: string; sellerId: string; amount: number; currency: string
  reserveType: string; releaseAt: string; sourceOrderId: string | null
}>> {
  const { data } = await supabaseAdmin
    .from('seller_reserves')
    .select('*')
    .eq('released', false)
    .lte('release_at', new Date().toISOString())
    .order('release_at', { ascending: true })
    .limit(100)

  return (data || []).map(r => ({
    id: r.id,
    sellerId: r.seller_id,
    amount: parseFloat(r.amount),
    currency: r.currency,
    reserveType: r.reserve_type,
    releaseAt: r.release_at,
    sourceOrderId: r.source_order_id,
  }))
}

// ─── FX Recording ───────────────────────────────────────────────────

/**
 * Record FX gain or loss (realized).
 * Called when a multi-currency transaction settles at a different rate.
 */
export async function recordFxGainLoss(
  referenceId: string,
  amount: number, // positive = gain, negative = loss
  currency: string = 'EUR',
  fxRate?: number,
  fxSource?: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  const fxAccount = await getPlatformAccount('fx_realized_gain_loss', currency)
  const platformCash = await getPlatformAccount('platform_cash', currency)

  const absAmount = Math.abs(amount)

  const entries: LedgerEntry[] = amount >= 0
    ? [
        // Gain: Cash up, FX account credit
        { account_id: platformCash, debit_amount: absAmount, credit_amount: 0, currency, description: 'FX gain: cash increase' },
        { account_id: fxAccount, debit_amount: 0, credit_amount: absAmount, currency, description: 'FX realized gain' },
      ]
    : [
        // Loss: FX account debit, cash down
        { account_id: fxAccount, debit_amount: absAmount, credit_amount: 0, currency, description: 'FX realized loss' },
        { account_id: platformCash, debit_amount: 0, credit_amount: absAmount, currency, description: 'FX loss: cash decrease' },
      ]

  return recordTransaction(
    'fx_revaluation',
    'fx_revaluation',
    referenceId,
    entries,
    `FX ${amount >= 0 ? 'gain' : 'loss'} of ${currency} ${absAmount.toFixed(2)}`,
    { fx_rate: fxRate, fx_source: fxSource },
    { externalReferenceId: `fx_${referenceId}`, currencyCode: currency, fxRate, fxSource }
  )
}

/**
 * Record unrealized FX gain/loss (month-end revaluation)
 */
export async function recordUnrealizedFxGainLoss(
  periodLabel: string,
  accountId: string,
  amount: number,
  currency: string = 'EUR'
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  const fxUnrealized = await getPlatformAccount('fx_unrealized_gain_loss', currency)
  const absAmount = Math.abs(amount)

  const entries: LedgerEntry[] = amount >= 0
    ? [
        { account_id: accountId, debit_amount: absAmount, credit_amount: 0, currency, description: 'Unrealized FX gain' },
        { account_id: fxUnrealized, debit_amount: 0, credit_amount: absAmount, currency, description: `Unrealized FX gain (${periodLabel})` },
      ]
    : [
        { account_id: fxUnrealized, debit_amount: absAmount, credit_amount: 0, currency, description: `Unrealized FX loss (${periodLabel})` },
        { account_id: accountId, debit_amount: 0, credit_amount: absAmount, currency, description: 'Unrealized FX loss' },
      ]

  return recordTransaction(
    'fx_revaluation',
    'fx_revaluation',
    `period_${periodLabel}`,
    entries,
    `Unrealized FX ${amount >= 0 ? 'gain' : 'loss'}: ${currency} ${absAmount.toFixed(2)} for ${periodLabel}`,
    undefined,
    { externalReferenceId: `fx_unrealized_${periodLabel}_${accountId}`, currencyCode: currency }
  )
}

// ─── Query Functions ────────────────────────────────────────────────

/**
 * Get balance for a specific account
 */
export async function getAccountBalance(accountId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('ledger_entries')
    .select('debit_amount, credit_amount')
    .eq('account_id', accountId)

  if (!data) return 0

  const totalDebit = data.reduce((sum, e) => sum + parseFloat(String(e.debit_amount || 0)), 0)
  const totalCredit = data.reduce((sum, e) => sum + parseFloat(String(e.credit_amount || 0)), 0)

  return totalDebit - totalCredit
}

/**
 * Get trial balance — all accounts with their balances.
 */
export async function getTrialBalance(): Promise<TrialBalance> {
  const { data: accounts } = await supabaseAdmin
    .from('ledger_accounts')
    .select('id, account_type, owner_id, owner_type, currency')

  if (!accounts || accounts.length === 0) {
    return { accounts: [], totalDebit: 0, totalCredit: 0, balanced: true }
  }

  const balances: AccountBalance[] = []
  let totalDebit = 0
  let totalCredit = 0

  for (const account of accounts) {
    const { data: entries } = await supabaseAdmin
      .from('ledger_entries')
      .select('debit_amount, credit_amount')
      .eq('account_id', account.id)

    const debitTotal = (entries || []).reduce((sum, e) => sum + parseFloat(String(e.debit_amount || 0)), 0)
    const creditTotal = (entries || []).reduce((sum, e) => sum + parseFloat(String(e.credit_amount || 0)), 0)

    totalDebit += debitTotal
    totalCredit += creditTotal

    balances.push({
      accountId: account.id,
      accountType: account.account_type as AccountType,
      ownerId: account.owner_id,
      ownerType: account.owner_type,
      currency: account.currency,
      debitTotal: Math.round(debitTotal * 100) / 100,
      creditTotal: Math.round(creditTotal * 100) / 100,
      balance: Math.round((debitTotal - creditTotal) * 100) / 100,
    })
  }

  return {
    accounts: balances,
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    balanced: Math.abs(totalDebit - totalCredit) < 0.01,
  }
}

/**
 * Get all transactions for a specific order/refund/payout
 */
export async function getTransactionHistory(
  referenceType: ReferenceType,
  referenceId: string
): Promise<Array<{
  id: string
  type: string
  description: string
  entries: Array<{ accountType: string; debit: number; credit: number }>
  createdAt: string
}>> {
  const { data: transactions } = await supabaseAdmin
    .from('ledger_transactions')
    .select('id, type, description, created_at')
    .eq('reference_type', referenceType)
    .eq('reference_id', referenceId)
    .order('created_at', { ascending: true })

  if (!transactions) return []

  const result = []
  for (const tx of transactions) {
    const { data: entries } = await supabaseAdmin
      .from('ledger_entries')
      .select('account_id, debit_amount, credit_amount')
      .eq('transaction_id', tx.id)

    const accountIds = (entries || []).map(e => e.account_id)
    const { data: accounts } = await supabaseAdmin
      .from('ledger_accounts')
      .select('id, account_type')
      .in('id', accountIds)

    const accountMap = new Map((accounts || []).map(a => [a.id, a.account_type]))

    result.push({
      id: tx.id,
      type: tx.type,
      description: tx.description || '',
      entries: (entries || []).map(e => ({
        accountType: accountMap.get(e.account_id) || 'unknown',
        debit: parseFloat(String(e.debit_amount || 0)),
        credit: parseFloat(String(e.credit_amount || 0)),
      })),
      createdAt: tx.created_at,
    })
  }

  return result
}

/**
 * Get platform financial summary from ledger
 */
export async function getPlatformFinancials(): Promise<{
  totalEscrow: number
  totalSellerLiability: number
  platformRevenue: number
  refundExposure: number
  paymentFees: number
  taxCollected: number
  fxUnrealizedGainLoss: number
  fxRealizedGainLoss: number
  totalReserves: number
  paymentFeeLoss: number
}> {
  const { data: accounts } = await supabaseAdmin
    .from('ledger_accounts')
    .select('id, account_type')
    .eq('owner_id', 'platform')

  if (!accounts) {
    return {
      totalEscrow: 0, totalSellerLiability: 0, platformRevenue: 0,
      refundExposure: 0, paymentFees: 0, taxCollected: 0,
      fxUnrealizedGainLoss: 0, fxRealizedGainLoss: 0, totalReserves: 0, paymentFeeLoss: 0,
    }
  }

  const balanceMap: Record<string, number> = {}
  for (const account of accounts) {
    const balance = await getAccountBalance(account.id)
    balanceMap[account.account_type] = (balanceMap[account.account_type] || 0) + balance
  }

  // Sum all seller_balance accounts
  const { data: sellerAccounts } = await supabaseAdmin
    .from('ledger_accounts')
    .select('id')
    .eq('account_type', 'seller_balance')

  let totalSellerLiability = 0
  for (const sa of sellerAccounts || []) {
    const bal = await getAccountBalance(sa.id)
    totalSellerLiability += Math.abs(bal)
  }

  // Sum all seller rolling reserves
  const { data: reserveAccounts } = await supabaseAdmin
    .from('ledger_accounts')
    .select('id')
    .eq('account_type', 'seller_rolling_reserve')

  let totalReserves = 0
  for (const ra of reserveAccounts || []) {
    const bal = await getAccountBalance(ra.id)
    totalReserves += Math.abs(bal)
  }

  return {
    totalEscrow: Math.abs(balanceMap['escrow'] || 0),
    totalSellerLiability,
    platformRevenue: Math.abs(balanceMap['commission_revenue'] || 0),
    refundExposure: Math.abs(balanceMap['refund_liability'] || 0),
    paymentFees: Math.abs(balanceMap['payment_fee_expense'] || 0),
    taxCollected: Math.abs(balanceMap['tax_collected'] || 0),
    fxUnrealizedGainLoss: balanceMap['fx_unrealized_gain_loss'] || 0,
    fxRealizedGainLoss: balanceMap['fx_realized_gain_loss'] || 0,
    totalReserves,
    paymentFeeLoss: Math.abs(balanceMap['payment_fee_revenue_loss'] || 0),
  }
}

/**
 * Get paginated ledger entries with filters
 */
export async function getLedgerEntries(options: {
  accountType?: AccountType
  ownerId?: string
  limit?: number
  offset?: number
  startDate?: string
  endDate?: string
  taxCountry?: string
}): Promise<{ entries: any[]; total: number }> {
  const { accountType, ownerId, limit = 50, offset = 0, startDate, endDate, taxCountry } = options

  let accountQuery = supabaseAdmin.from('ledger_accounts').select('id')
  if (accountType) accountQuery = accountQuery.eq('account_type', accountType)
  if (ownerId) accountQuery = accountQuery.eq('owner_id', ownerId)
  const { data: accounts } = await accountQuery

  if (!accounts || accounts.length === 0) return { entries: [], total: 0 }

  const accountIds = accounts.map(a => a.id)

  let query = supabaseAdmin
    .from('ledger_entries')
    .select('*, ledger_transactions(type, reference_type, reference_id, description, currency_code, fx_rate_used)', { count: 'exact' })
    .in('account_id', accountIds)
    .order('created_at', { ascending: false })

  if (startDate) query = query.gte('created_at', startDate)
  if (endDate) query = query.lte('created_at', endDate)
  if (taxCountry) query = query.eq('tax_country_code', taxCountry)

  const { data, count } = await query.range(offset, offset + limit - 1)

  return { entries: data || [], total: count || 0 }
}

/**
 * Get seller reserve summary
 */
export async function getSellerReserveSummary(sellerId: string): Promise<{
  rollingReserveHeld: number
  rollingReservePending: number
  reservePercent: number
  reserveDays: number
}> {
  const { data: reserves } = await supabaseAdmin
    .from('seller_reserves')
    .select('amount, released')
    .eq('seller_id', sellerId)

  const held = (reserves || [])
    .filter(r => !r.released)
    .reduce((sum, r) => sum + parseFloat(r.amount), 0)
  const total = (reserves || [])
    .reduce((sum, r) => sum + parseFloat(r.amount), 0)

  const { data: riskData } = await supabaseAdmin
    .from('seller_risk_scores')
    .select('rolling_reserve_percent, rolling_reserve_days')
    .eq('seller_id', sellerId)
    .maybeSingle()

  return {
    rollingReserveHeld: Math.round(held * 100) / 100,
    rollingReservePending: Math.round(total * 100) / 100,
    reservePercent: riskData?.rolling_reserve_percent || 0,
    reserveDays: riskData?.rolling_reserve_days || 0,
  }
}
