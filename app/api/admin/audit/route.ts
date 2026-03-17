import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { queryAuditLogs } from '@/lib/logger'

async function verifyAdmin(userId: string): Promise<boolean> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  return user?.role === 'admin'
}

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')

  if (!userId || !(await verifyAdmin(userId))) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)

  const result = await queryAuditLogs({
    action: searchParams.get('action') || undefined,
    actor_id: searchParams.get('actor_id') || undefined,
    resource_type: searchParams.get('resource_type') || undefined,
    resource_id: searchParams.get('resource_id') || undefined,
    severity: searchParams.get('severity') as any || undefined,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
    limit: parseInt(searchParams.get('limit') || '50'),
    offset: parseInt(searchParams.get('offset') || '0'),
  })

  return NextResponse.json(result)
}
