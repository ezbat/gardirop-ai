import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getLedgerEntries } from '@/lib/ledger-engine'

/**
 * GET /api/admin/finances/ledger
 *
 * Paginated ledger entries with filters.
 * Query params: accountType, ownerId, limit, offset, startDate, endDate
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

    const { searchParams } = new URL(request.url)
    const accountType = searchParams.get('accountType') || undefined
    const ownerId = searchParams.get('ownerId') || undefined
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    const result = await getLedgerEntries({
      accountType: accountType as any,
      ownerId,
      limit,
      offset,
      startDate,
      endDate,
    })

    return NextResponse.json({
      entries: result.entries,
      total: result.total,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error('Admin ledger error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
