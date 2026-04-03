import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'
import { queryRiskScores } from '@/lib/risk-engine'
import { queryFraudSignals } from '@/lib/anti-fraud'
import type { RiskLevel, RiskAction, EntityType } from '@/lib/risk-engine'

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view') || 'risk_scores'

  if (view === 'fraud_signals') {
    const result = await queryFraudSignals({
      signal_type: searchParams.get('signal_type') as any || undefined,
      severity: searchParams.get('severity') as any || undefined,
      status: searchParams.get('status') || undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    })

    return NextResponse.json(result)
  }

  // Default: risk scores
  const result = await queryRiskScores({
    entity_type: searchParams.get('entity_type') as EntityType || undefined,
    level: searchParams.get('level') as RiskLevel || undefined,
    action: searchParams.get('action') as RiskAction || undefined,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
    limit: parseInt(searchParams.get('limit') || '50'),
    offset: parseInt(searchParams.get('offset') || '0'),
  })

  return NextResponse.json(result)
}

// Review/override a risk score
export async function PATCH(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { scoreId, action, notes } = await request.json()

  if (!scoreId || !action) {
    return NextResponse.json({ error: 'scoreId and action required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('risk_scores')
    .update({
      action_taken: action,
      reviewed_by: 'admin',
      reviewed_at: new Date().toISOString(),
      review_notes: notes || null,
    })
    .eq('id', scoreId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, score: data })
}
