import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getActiveChargebacks, getChargebackRate } from '@/lib/reconciliation-engine'

/**
 * GET /api/admin/finances/chargebacks
 * Returns active chargebacks with details and overall rate.
 *
 * POST /api/admin/finances/chargebacks
 * Update chargeback status (submit evidence, resolve).
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

    const [chargebacks, rate] = await Promise.all([
      getActiveChargebacks(30),
      getChargebackRate(30),
    ])

    return NextResponse.json({
      chargebacks,
      stats: rate,
    })
  } catch (error: any) {
    console.error('Admin chargebacks error:', error)
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
    const { chargebackId, action, notes } = body

    if (!chargebackId || !action) {
      return NextResponse.json({ error: 'chargebackId and action required' }, { status: 400 })
    }

    switch (action) {
      case 'submit_evidence': {
        const { error } = await supabaseAdmin
          .from('chargebacks')
          .update({
            status: 'evidence_submitted',
            evidence_submitted: true,
            admin_notes: notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', chargebackId)
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        break
      }

      case 'resolve_won': {
        const { data: cb } = await supabaseAdmin
          .from('chargebacks')
          .select('seller_id, amount')
          .eq('id', chargebackId)
          .single()

        const { error } = await supabaseAdmin
          .from('chargebacks')
          .update({
            status: 'won',
            admin_notes: notes,
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', chargebackId)
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })

        // Reverse the chargeback in ledger
        if (cb) {
          const { recordChargebackReversed } = await import('@/lib/ledger-engine')
          await recordChargebackReversed(
            cb.seller_id || '',
            cb.seller_id || '',
            parseFloat(String(cb.amount)),
          )
        }
        break
      }

      case 'resolve_lost': {
        const { data: cb } = await supabaseAdmin
          .from('chargebacks')
          .select('seller_id, amount')
          .eq('id', chargebackId)
          .single()

        const { error } = await supabaseAdmin
          .from('chargebacks')
          .update({
            status: 'lost',
            seller_deduction: cb?.amount || 0,
            admin_notes: notes,
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', chargebackId)
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        break
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: userId,
      actor_type: 'admin',
      action: `chargeback_${action}`,
      resource_type: 'chargeback',
      resource_id: chargebackId,
      details: { notes },
      severity: action === 'resolve_lost' ? 'warning' : 'info',
    })

    return NextResponse.json({ success: true, action })
  } catch (error: any) {
    console.error('Admin chargeback action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
