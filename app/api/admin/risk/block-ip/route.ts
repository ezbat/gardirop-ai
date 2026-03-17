import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { blockIP, unblockIP, queryBlockedIPs } from '@/lib/anti-fraud'
import { logger } from '@/lib/logger'

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

  const blockedIPs = await queryBlockedIPs()
  return NextResponse.json({ blocked_ips: blockedIPs })
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')

  if (!userId || !(await verifyAdmin(userId))) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { ip, reason, durationHours } = await request.json()

  if (!ip || !reason) {
    return NextResponse.json({ error: 'IP and reason required' }, { status: 400 })
  }

  await blockIP(ip, reason, userId, durationHours)

  logger.audit({
    actor_id: userId,
    actor_type: 'admin',
    action: 'ip.blocked',
    resource_type: 'blocked_ip',
    resource_id: ip,
    severity: 'warning',
    details: { reason, durationHours },
  })

  return NextResponse.json({ success: true, ip, reason })
}

export async function DELETE(request: NextRequest) {
  const userId = request.headers.get('x-user-id')

  if (!userId || !(await verifyAdmin(userId))) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { ip } = await request.json()

  if (!ip) {
    return NextResponse.json({ error: 'IP required' }, { status: 400 })
  }

  await unblockIP(ip)

  logger.audit({
    actor_id: userId,
    actor_type: 'admin',
    action: 'ip.unblocked',
    resource_type: 'blocked_ip',
    resource_id: ip,
    severity: 'info',
  })

  return NextResponse.json({ success: true, ip })
}
