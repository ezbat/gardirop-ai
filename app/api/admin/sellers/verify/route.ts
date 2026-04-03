import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'

/**
 * POST /api/admin/sellers/verify
 * Body: { sellerId: string, action: 'grant' | 'revoke', reason?: string }
 *
 * Toggles is_verified on a seller and logs the action.
 */
export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  try {
    const { sellerId, action, reason } = await request.json()

    if (!sellerId || !['grant', 'revoke'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'sellerId and action (grant|revoke) required' },
        { status: 400 },
      )
    }

    const isVerified = action === 'grant'

    // Update seller
    const { error: updateError } = await supabaseAdmin
      .from('sellers')
      .update({
        is_verified: isVerified,
        verified_at: isVerified ? new Date().toISOString() : null,
        verified_by: isVerified ? 'admin' : null,
      })
      .eq('id', sellerId)

    if (updateError) throw updateError

    // Audit log
    await supabaseAdmin.from('seller_verification_log').insert({
      seller_id: sellerId,
      action: action === 'grant' ? 'granted' : 'revoked',
      reason: reason || null,
      admin_id: 'admin',
    })

    return NextResponse.json({ success: true, is_verified: isVerified })
  } catch (error) {
    console.error('[admin/sellers/verify] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}
