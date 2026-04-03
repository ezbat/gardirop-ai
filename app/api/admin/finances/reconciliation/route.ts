import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { runReconciliation, getReconciliationHistory } from '@/lib/reconciliation-engine'
import { requireAdmin } from '@/lib/admin-auth'

/**
 * GET /api/admin/finances/reconciliation
 * Returns reconciliation run history.
 *
 * POST /api/admin/finances/reconciliation
 * Triggers a reconciliation run for a specific date.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request)
    if (auth.error) return auth.error

    const history = await getReconciliationHistory(30)

    return NextResponse.json({ runs: history })
  } catch (error: any) {
    console.error('Admin reconciliation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAdmin(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { date } = body

    if (!date) {
      // Default to yesterday
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const dateStr = yesterday.toISOString().split('T')[0]
      const result = await runReconciliation(dateStr)
      return NextResponse.json({ result })
    }

    const result = await runReconciliation(date)
    return NextResponse.json({ result })
  } catch (error: any) {
    console.error('Admin reconciliation run error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
