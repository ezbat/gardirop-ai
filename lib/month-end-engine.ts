/**
 * MONTH-END CLOSING ENGINE
 *
 * Handles accounting period management:
 *   1. Open/close accounting periods
 *   2. Generate financial snapshots (trial balance, income statement, balance sheet)
 *   3. Lock tables to prevent writes to closed periods
 *   4. Support period reopening (with audit trail)
 *   5. Release due rolling reserves
 *
 * Called by admin or cron at month-end.
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTrialBalance, getPlatformFinancials, getDueReserves, releaseRollingReserve } from '@/lib/ledger-engine'

// ─── Types ──────────────────────────────────────────────────────────

interface AccountingPeriod {
  id: string
  periodYear: number
  periodMonth: number
  periodLabel: string
  status: 'open' | 'closing' | 'closed' | 'reopened'
  openedAt: string
  closedAt: string | null
  closedBy: string | null
}

interface MonthEndResult {
  periodId: string
  periodLabel: string
  trialBalanceSnapshot: boolean
  incomeStatementSnapshot: boolean
  balanceSheetSnapshot: boolean
  reservesReleased: number
  tablesLocked: string[]
  errors: string[]
}

// ─── Period Management ──────────────────────────────────────────────

/**
 * Get or create an accounting period for a given year/month.
 */
export async function getOrCreatePeriod(
  year: number,
  month: number
): Promise<AccountingPeriod> {
  const { data: existing } = await supabaseAdmin
    .from('accounting_periods')
    .select('*')
    .eq('period_year', year)
    .eq('period_month', month)
    .maybeSingle()

  if (existing) {
    return {
      id: existing.id,
      periodYear: existing.period_year,
      periodMonth: existing.period_month,
      periodLabel: existing.period_label,
      status: existing.status,
      openedAt: existing.opened_at,
      closedAt: existing.closed_at,
      closedBy: existing.closed_by,
    }
  }

  const { data: created, error } = await supabaseAdmin
    .from('accounting_periods')
    .insert({ period_year: year, period_month: month, status: 'open' })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create period: ${error.message}`)

  return {
    id: created.id,
    periodYear: created.period_year,
    periodMonth: created.period_month,
    periodLabel: created.period_label,
    status: created.status,
    openedAt: created.opened_at,
    closedAt: created.closed_at,
    closedBy: created.closed_by,
  }
}

/**
 * Get all accounting periods ordered by date
 */
export async function getAccountingPeriods(
  limit: number = 24
): Promise<AccountingPeriod[]> {
  const { data } = await supabaseAdmin
    .from('accounting_periods')
    .select('*')
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })
    .limit(limit)

  return (data || []).map(p => ({
    id: p.id,
    periodYear: p.period_year,
    periodMonth: p.period_month,
    periodLabel: p.period_label,
    status: p.status,
    openedAt: p.opened_at,
    closedAt: p.closed_at,
    closedBy: p.closed_by,
  }))
}

/**
 * Get the current open period
 */
export async function getCurrentPeriod(): Promise<AccountingPeriod | null> {
  const now = new Date()
  return getOrCreatePeriod(now.getFullYear(), now.getMonth() + 1)
}

// ─── Month-End Closing Process ──────────────────────────────────────

/**
 * Run the full month-end closing process for a period.
 *
 * Steps:
 *   1. Validate the period is open
 *   2. Mark period as "closing"
 *   3. Release due rolling reserves
 *   4. Run FX revaluation (if applicable)
 *   5. Generate trial balance snapshot
 *   6. Generate income statement snapshot
 *   7. Generate balance sheet snapshot
 *   8. Lock tables for this period
 *   9. Mark period as "closed"
 */
export async function runMonthEndClose(
  year: number,
  month: number,
  closedBy: string
): Promise<MonthEndResult> {
  const errors: string[] = []
  const period = await getOrCreatePeriod(year, month)

  if (period.status === 'closed') {
    return {
      periodId: period.id,
      periodLabel: period.periodLabel,
      trialBalanceSnapshot: false,
      incomeStatementSnapshot: false,
      balanceSheetSnapshot: false,
      reservesReleased: 0,
      tablesLocked: [],
      errors: ['Period is already closed'],
    }
  }

  // 1. Mark as closing
  await supabaseAdmin
    .from('accounting_periods')
    .update({ status: 'closing' })
    .eq('id', period.id)

  // 2. Release due rolling reserves
  let reservesReleased = 0
  try {
    const dueReserves = await getDueReserves()
    for (const reserve of dueReserves) {
      const result = await releaseRollingReserve(reserve.id)
      if (result.success) reservesReleased++
    }
  } catch (err: any) {
    errors.push(`Reserve release error: ${err.message}`)
  }

  // 3. Generate trial balance snapshot
  let trialBalanceSnapshot = false
  try {
    const trialBalance = await getTrialBalance()
    await supabaseAdmin.from('financial_snapshots').upsert({
      period_id: period.id,
      snapshot_type: 'trial_balance',
      data: trialBalance,
      currency: 'EUR',
    }, { onConflict: 'period_id,snapshot_type,currency' })
    trialBalanceSnapshot = true
  } catch (err: any) {
    errors.push(`Trial balance snapshot error: ${err.message}`)
  }

  // 4. Generate income statement snapshot
  let incomeStatementSnapshot = false
  try {
    const financials = await getPlatformFinancials()
    const periodStart = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`
    const periodEnd = new Date(year, month, 0, 23, 59, 59, 999).toISOString()

    // Get period-specific revenue and expenses from ledger
    const { data: periodTxs } = await supabaseAdmin
      .from('ledger_transactions')
      .select('type, metadata')
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)

    const periodRevenue = (periodTxs || [])
      .filter(t => t.type === 'delivery_confirmed')
      .reduce((sum, t) => sum + parseFloat(String((t.metadata as any)?.commission || 0)), 0)

    const periodFees = (periodTxs || [])
      .filter(t => t.type === 'fee_collected')
      .reduce((sum, t) => {
        const entries = (t.metadata as any)?.entries || []
        return sum + entries.reduce((s: number, e: any) => s + parseFloat(String(e.debit_amount || 0)), 0)
      }, 0)

    await supabaseAdmin.from('financial_snapshots').upsert({
      period_id: period.id,
      snapshot_type: 'income_statement',
      data: {
        ...financials,
        periodRevenue: Math.round(periodRevenue * 100) / 100,
        periodFees: Math.round(periodFees * 100) / 100,
        periodLabel: period.periodLabel,
      },
      currency: 'EUR',
    }, { onConflict: 'period_id,snapshot_type,currency' })
    incomeStatementSnapshot = true
  } catch (err: any) {
    errors.push(`Income statement snapshot error: ${err.message}`)
  }

  // 5. Generate balance sheet snapshot
  let balanceSheetSnapshot = false
  try {
    const financials = await getPlatformFinancials()
    await supabaseAdmin.from('financial_snapshots').upsert({
      period_id: period.id,
      snapshot_type: 'balance_sheet',
      data: {
        assets: {
          platformCash: financials.totalEscrow,
          escrow: financials.totalEscrow,
        },
        liabilities: {
          sellerBalance: financials.totalSellerLiability,
          refundLiability: financials.refundExposure,
          taxLiability: financials.taxCollected,
          reserves: financials.totalReserves,
        },
        equity: {
          commissionRevenue: financials.platformRevenue,
          fxGainLoss: financials.fxRealizedGainLoss,
          paymentFeeLoss: financials.paymentFeeLoss,
        },
        periodLabel: period.periodLabel,
      },
      currency: 'EUR',
    }, { onConflict: 'period_id,snapshot_type,currency' })
    balanceSheetSnapshot = true
  } catch (err: any) {
    errors.push(`Balance sheet snapshot error: ${err.message}`)
  }

  // 6. Lock tables for this period
  const lockTables = ['ledger_transactions', 'ledger_entries', 'payment_transactions', 'order_tax_breakdown']
  const tablesLocked: string[] = []

  for (const table of lockTables) {
    try {
      await supabaseAdmin.from('period_lock_flags').upsert({
        table_name: table,
        period_id: period.id,
        locked: true,
        locked_by: closedBy,
        locked_at: new Date().toISOString(),
      }, { onConflict: 'table_name,period_id' })
      tablesLocked.push(table)
    } catch (err: any) {
      errors.push(`Lock table ${table} error: ${err.message}`)
    }
  }

  // 7. Mark period as closed
  await supabaseAdmin
    .from('accounting_periods')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_by: closedBy,
    })
    .eq('id', period.id)

  // 8. Audit log
  await supabaseAdmin.from('audit_logs').insert({
    actor_id: closedBy,
    actor_type: 'admin',
    action: 'month_end_close',
    resource_type: 'accounting_period',
    resource_id: period.id,
    details: {
      period_label: period.periodLabel,
      reserves_released: reservesReleased,
      tables_locked: tablesLocked,
      snapshots: { trialBalanceSnapshot, incomeStatementSnapshot, balanceSheetSnapshot },
      errors,
    },
    severity: errors.length > 0 ? 'warning' : 'info',
  })

  return {
    periodId: period.id,
    periodLabel: period.periodLabel,
    trialBalanceSnapshot,
    incomeStatementSnapshot,
    balanceSheetSnapshot,
    reservesReleased,
    tablesLocked,
    errors,
  }
}

/**
 * Reopen a closed period (requires strong justification).
 */
export async function reopenPeriod(
  periodId: string,
  reason: string,
  reopenedBy: string
): Promise<{ success: boolean; error?: string }> {
  const { data: period } = await supabaseAdmin
    .from('accounting_periods')
    .select('*')
    .eq('id', periodId)
    .single()

  if (!period) return { success: false, error: 'Period not found' }
  if (period.status !== 'closed') return { success: false, error: 'Period is not closed' }

  // Unlock tables
  await supabaseAdmin
    .from('period_lock_flags')
    .update({ locked: false })
    .eq('period_id', periodId)

  // Reopen period
  const { error } = await supabaseAdmin
    .from('accounting_periods')
    .update({
      status: 'reopened',
      reopened_at: new Date().toISOString(),
      reopened_by: reopenedBy,
      reopen_reason: reason,
    })
    .eq('id', periodId)

  if (error) return { success: false, error: error.message }

  // Audit log (critical severity — reopening a closed period is serious)
  await supabaseAdmin.from('audit_logs').insert({
    actor_id: reopenedBy,
    actor_type: 'admin',
    action: 'period_reopened',
    resource_type: 'accounting_period',
    resource_id: periodId,
    details: { reason, period_label: period.period_label },
    severity: 'critical',
  })

  return { success: true }
}

/**
 * Get financial snapshot for a period
 */
export async function getFinancialSnapshot(
  periodId: string,
  snapshotType: 'trial_balance' | 'income_statement' | 'balance_sheet' | 'cash_flow'
): Promise<any | null> {
  const { data } = await supabaseAdmin
    .from('financial_snapshots')
    .select('data, created_at')
    .eq('period_id', periodId)
    .eq('snapshot_type', snapshotType)
    .maybeSingle()

  return data ? { ...data.data, snapshotCreatedAt: data.created_at } : null
}

/**
 * Get all snapshots for a period
 */
export async function getPeriodSnapshots(
  periodId: string
): Promise<Record<string, any>> {
  const { data } = await supabaseAdmin
    .from('financial_snapshots')
    .select('snapshot_type, data, created_at')
    .eq('period_id', periodId)

  const result: Record<string, any> = {}
  for (const s of data || []) {
    result[s.snapshot_type] = { ...s.data, snapshotCreatedAt: s.created_at }
  }
  return result
}

/**
 * Check if a period is locked (for write guards)
 */
export async function isPeriodLocked(
  tableName: string,
  date: Date
): Promise<boolean> {
  const year = date.getFullYear()
  const month = date.getMonth() + 1

  const { data } = await supabaseAdmin
    .from('accounting_periods')
    .select('id, status')
    .eq('period_year', year)
    .eq('period_month', month)
    .maybeSingle()

  if (!data || data.status !== 'closed') return false

  const { data: lock } = await supabaseAdmin
    .from('period_lock_flags')
    .select('locked')
    .eq('period_id', data.id)
    .eq('table_name', tableName)
    .eq('locked', true)
    .maybeSingle()

  return !!lock
}
