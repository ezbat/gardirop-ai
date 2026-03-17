/**
 * FX REVALUATION ENGINE
 *
 * Month-end process to revalue non-EUR balances at current FX rates.
 *
 * Steps:
 *   1. Get all non-EUR ledger accounts with balances
 *   2. Fetch current FX rates (from fx_rates table)
 *   3. Compare balance at current rate vs. original booking rate
 *   4. Record unrealized FX gain/loss entries in ledger
 *   5. Store revaluation run summary
 *
 * Only runs on non-functional-currency accounts (functional = EUR).
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAccountBalance, recordUnrealizedFxGainLoss } from '@/lib/ledger-engine'

// ─── Types ──────────────────────────────────────────────────────────

interface RevaluationResult {
  runId: string
  runDate: string
  periodId: string | null
  baseCurrency: string
  accountsProcessed: number
  totalUnrealizedGain: number
  totalUnrealizedLoss: number
  netImpact: number
  details: RevaluationDetail[]
  errors: string[]
}

interface RevaluationDetail {
  accountId: string
  accountType: string
  ownerId: string
  currency: string
  balance: number
  previousEurValue: number
  currentEurValue: number
  fxRate: number
  gainLoss: number
}

// ─── FX Rate Lookup ─────────────────────────────────────────────────

/**
 * Get the latest FX rate for a currency pair
 */
export async function getLatestFxRate(
  baseCurrency: string,
  quoteCurrency: string
): Promise<{ rate: number; provider: string; fetchedAt: string } | null> {
  const { data } = await supabaseAdmin
    .from('fx_rates')
    .select('rate, provider, fetched_at')
    .eq('base_currency', baseCurrency.toUpperCase())
    .eq('quote_currency', quoteCurrency.toUpperCase())
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null

  return {
    rate: parseFloat(String(data.rate)),
    provider: data.provider,
    fetchedAt: data.fetched_at,
  }
}

/**
 * Update or insert a FX rate
 */
export async function upsertFxRate(
  baseCurrency: string,
  quoteCurrency: string,
  rate: number,
  provider: string = 'manual'
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin.from('fx_rates').insert({
    base_currency: baseCurrency.toUpperCase(),
    quote_currency: quoteCurrency.toUpperCase(),
    rate,
    provider,
    fetched_at: new Date().toISOString(),
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── Revaluation Process ────────────────────────────────────────────

/**
 * Run FX revaluation for all non-EUR accounts.
 *
 * @param periodId - Optional accounting period ID (for month-end)
 * @param baseCurrency - Functional currency (default EUR)
 */
export async function runFxRevaluation(
  periodId?: string,
  baseCurrency: string = 'EUR'
): Promise<RevaluationResult> {
  const errors: string[] = []
  const details: RevaluationDetail[] = []
  let totalUnrealizedGain = 0
  let totalUnrealizedLoss = 0
  const runDate = new Date().toISOString().split('T')[0]

  // 1. Get all non-EUR accounts with activity
  const { data: nonEurAccounts } = await supabaseAdmin
    .from('ledger_accounts')
    .select('id, account_type, owner_id, currency')
    .neq('currency', baseCurrency)

  if (!nonEurAccounts || nonEurAccounts.length === 0) {
    // Store empty run
    const { data: run } = await supabaseAdmin
      .from('fx_revaluation_runs')
      .insert({
        period_id: periodId || null,
        run_date: runDate,
        base_currency: baseCurrency,
        accounts_processed: 0,
      })
      .select('id')
      .single()

    return {
      runId: run?.id || '',
      runDate,
      periodId: periodId || null,
      baseCurrency,
      accountsProcessed: 0,
      totalUnrealizedGain: 0,
      totalUnrealizedLoss: 0,
      netImpact: 0,
      details: [],
      errors: [],
    }
  }

  // 2. Process each non-EUR account
  for (const account of nonEurAccounts) {
    try {
      // Get account balance in original currency
      const balance = await getAccountBalance(account.id)
      if (Math.abs(balance) < 0.01) continue // Skip zero balances

      // Get current FX rate (currency -> EUR)
      const fxData = await getLatestFxRate(account.currency, baseCurrency)
      if (!fxData) {
        errors.push(`No FX rate found for ${account.currency}/${baseCurrency}`)
        continue
      }

      const currentEurValue = Math.round(balance * fxData.rate * 100) / 100

      // Get previous EUR value (sum of all entries converted at their booking rates)
      // For simplicity, we use the account balance times the rate at last revaluation
      // or the original rate if never revalued
      const { data: lastReval } = await supabaseAdmin
        .from('ledger_entries')
        .select('debit_amount, credit_amount')
        .eq('account_id', account.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Previous EUR value = balance at the original booking rate
      // Use a simplified approach: book value = balance in original currency / original rate
      const previousFx = await getPreviousRate(account.currency, baseCurrency)
      const previousEurValue = previousFx
        ? Math.round(balance * previousFx * 100) / 100
        : currentEurValue

      const gainLoss = Math.round((currentEurValue - previousEurValue) * 100) / 100

      if (Math.abs(gainLoss) < 0.01) continue // No material difference

      // Record unrealized gain/loss in ledger
      const periodLabel = periodId
        ? runDate.substring(0, 7)
        : runDate

      await recordUnrealizedFxGainLoss(periodLabel, account.id, gainLoss, baseCurrency)

      if (gainLoss > 0) {
        totalUnrealizedGain += gainLoss
      } else {
        totalUnrealizedLoss += Math.abs(gainLoss)
      }

      details.push({
        accountId: account.id,
        accountType: account.account_type,
        ownerId: account.owner_id,
        currency: account.currency,
        balance,
        previousEurValue,
        currentEurValue,
        fxRate: fxData.rate,
        gainLoss,
      })
    } catch (err: any) {
      errors.push(`Account ${account.id} (${account.currency}): ${err.message}`)
    }
  }

  const netImpact = Math.round((totalUnrealizedGain - totalUnrealizedLoss) * 100) / 100

  // 3. Store revaluation run
  const { data: run } = await supabaseAdmin
    .from('fx_revaluation_runs')
    .insert({
      period_id: periodId || null,
      run_date: runDate,
      base_currency: baseCurrency,
      total_unrealized_gain: Math.round(totalUnrealizedGain * 100) / 100,
      total_unrealized_loss: Math.round(totalUnrealizedLoss * 100) / 100,
      net_impact: netImpact,
      accounts_processed: details.length,
    })
    .select('id')
    .single()

  return {
    runId: run?.id || '',
    runDate,
    periodId: periodId || null,
    baseCurrency,
    accountsProcessed: details.length,
    totalUnrealizedGain: Math.round(totalUnrealizedGain * 100) / 100,
    totalUnrealizedLoss: Math.round(totalUnrealizedLoss * 100) / 100,
    netImpact,
    details,
    errors,
  }
}

/**
 * Get the second-latest FX rate (for comparison)
 */
async function getPreviousRate(
  currency: string,
  baseCurrency: string
): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from('fx_rates')
    .select('rate')
    .eq('base_currency', currency.toUpperCase())
    .eq('quote_currency', baseCurrency.toUpperCase())
    .order('fetched_at', { ascending: false })
    .limit(2)

  if (!data || data.length < 2) return null
  return parseFloat(String(data[1].rate))
}

/**
 * Get FX revaluation history
 */
export async function getFxRevaluationHistory(
  limit: number = 12
): Promise<Array<{
  id: string
  runDate: string
  baseCurrency: string
  accountsProcessed: number
  totalGain: number
  totalLoss: number
  netImpact: number
  createdAt: string
}>> {
  const { data } = await supabaseAdmin
    .from('fx_revaluation_runs')
    .select('*')
    .order('run_date', { ascending: false })
    .limit(limit)

  return (data || []).map(r => ({
    id: r.id,
    runDate: r.run_date,
    baseCurrency: r.base_currency,
    accountsProcessed: r.accounts_processed,
    totalGain: parseFloat(String(r.total_unrealized_gain || 0)),
    totalLoss: parseFloat(String(r.total_unrealized_loss || 0)),
    netImpact: parseFloat(String(r.net_impact || 0)),
    createdAt: r.created_at,
  }))
}
