import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { queryAuditLogs } from '@/lib/logger'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

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
