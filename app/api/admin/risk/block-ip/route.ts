import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { blockIP, unblockIP, queryBlockedIPs } from '@/lib/anti-fraud'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const blockedIPs = await queryBlockedIPs()
  return NextResponse.json({ blocked_ips: blockedIPs })
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { ip, reason, durationHours } = await request.json()

  if (!ip || !reason) {
    return NextResponse.json({ error: 'IP and reason required' }, { status: 400 })
  }

  await blockIP(ip, reason, 'admin', durationHours)

  logger.audit({
    actor_id: 'admin',
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
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { ip } = await request.json()

  if (!ip) {
    return NextResponse.json({ error: 'IP required' }, { status: 400 })
  }

  await unblockIP(ip)

  logger.audit({
    actor_id: 'admin',
    actor_type: 'admin',
    action: 'ip.unblocked',
    resource_type: 'blocked_ip',
    resource_id: ip,
    severity: 'info',
  })

  return NextResponse.json({ success: true, ip })
}
