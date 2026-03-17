import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { runReconciliation, getReconciliationHistory } from '@/lib/reconciliation-engine'

/**
 * GET /api/admin/finances/reconciliation
 * Returns reconciliation run history.
 *
 * POST /api/admin/finances/reconciliation
 * Triggers a reconciliation run for a specific date.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (userId !== 'm3000') {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()
      if (user?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const history = await getReconciliationHistory(30)

    return NextResponse.json({ runs: history })
  } catch (error: any) {
    console.error('Admin reconciliation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (userId !== 'm3000') {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()
      if (user?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

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
