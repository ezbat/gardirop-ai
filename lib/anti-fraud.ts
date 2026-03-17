import { supabaseAdmin } from './supabase-admin'
import { logger } from './logger'

// ─── Types ───────────────────────────────────────────────

type SignalType = 'ip_velocity' | 'fingerprint_cluster' | 'ctr_anomaly' | 'bot_pattern' |
  'payment_velocity' | 'coupon_abuse' | 'account_takeover' | 'manual_flag'

type Severity = 'low' | 'medium' | 'high' | 'critical'

interface FraudCheckResult {
  blocked: boolean
  signals: { type: SignalType; severity: Severity; detail: string }[]
}

// ─── IP Blocking ─────────────────────────────────────────

export async function isIPBlocked(ip: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('blocked_ips')
    .select('id, expires_at')
    .eq('ip_address', ip)
    .single()

  if (!data) return false

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    // Expired — remove it
    await supabaseAdmin.from('blocked_ips').delete().eq('id', data.id)
    return false
  }

  return true
}

export async function blockIP(
  ip: string,
  reason: string,
  blockedBy?: string,
  durationHours?: number
): Promise<void> {
  const expiresAt = durationHours
    ? new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()
    : null

  await supabaseAdmin.from('blocked_ips').upsert({
    ip_address: ip,
    reason,
    blocked_by: blockedBy || 'system',
    expires_at: expiresAt,
  }, { onConflict: 'ip_address' })

  logger.info('IP blocked', { ip, reason, durationHours })
}

export async function unblockIP(ip: string): Promise<void> {
  await supabaseAdmin.from('blocked_ips').delete().eq('ip_address', ip)
  logger.info('IP unblocked', { ip })
}

// ─── Record Fraud Signal ─────────────────────────────────

export async function recordFraudSignal(params: {
  signal_type: SignalType
  severity: Severity
  ip_address?: string
  fingerprint?: string
  user_id?: string
  seller_id?: string
  campaign_id?: string
  details?: Record<string, unknown>
}): Promise<void> {
  try {
    await supabaseAdmin.from('fraud_signals').insert({
      signal_type: params.signal_type,
      severity: params.severity,
      ip_address: params.ip_address || null,
      fingerprint: params.fingerprint || null,
      user_id: params.user_id || null,
      seller_id: params.seller_id || null,
      campaign_id: params.campaign_id || null,
      details: params.details || null,
      status: 'active',
    })
  } catch (err) {
    logger.error('Failed to record fraud signal', {
      type: params.signal_type,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

// ─── Click Fraud Detection ───────────────────────────────

const IP_VELOCITY_WINDOW_MS = 60 * 1000     // 1 minute
const IP_VELOCITY_THRESHOLD = 20             // max clicks per minute
const FINGERPRINT_IP_THRESHOLD = 3           // max IPs per fingerprint in 5 min
const FINGERPRINT_WINDOW_MS = 5 * 60 * 1000  // 5 minutes
const CTR_ANOMALY_THRESHOLD = 0.50           // 50% CTR is suspicious

// Known bot user-agent patterns
const BOT_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /scrape/i,
  /headless/i, /phantom/i, /selenium/i, /puppeteer/i,
  /curl/i, /wget/i, /python-requests/i, /node-fetch/i,
]

export async function checkClickFraud(params: {
  ip: string
  userAgent: string
  fingerprint?: string
  campaignId?: string
  sellerId?: string
}): Promise<FraudCheckResult> {
  const signals: FraudCheckResult['signals'] = []
  let blocked = false

  // 0. Check if IP is already blocked
  if (await isIPBlocked(params.ip)) {
    return {
      blocked: true,
      signals: [{ type: 'ip_velocity', severity: 'critical', detail: 'IP is blocked' }],
    }
  }

  // 1. Bot pattern detection
  const isBot = BOT_PATTERNS.some(p => p.test(params.userAgent))
  if (isBot) {
    signals.push({
      type: 'bot_pattern',
      severity: 'high',
      detail: `Bot user-agent detected: ${params.userAgent.substring(0, 60)}`,
    })

    await recordFraudSignal({
      signal_type: 'bot_pattern',
      severity: 'high',
      ip_address: params.ip,
      campaign_id: params.campaignId,
      details: { userAgent: params.userAgent },
    })

    blocked = true
  }

  // 2. IP velocity check
  const windowStart = new Date(Date.now() - IP_VELOCITY_WINDOW_MS).toISOString()
  const { count: recentClicks } = await supabaseAdmin
    .from('fraud_signals')
    .select('id', { count: 'exact', head: true })
    .eq('ip_address', params.ip)
    .eq('signal_type', 'ip_velocity')
    .gte('created_at', windowStart)

  // Record this click as ip_velocity signal for tracking
  await recordFraudSignal({
    signal_type: 'ip_velocity',
    severity: 'low',
    ip_address: params.ip,
    campaign_id: params.campaignId,
    details: { userAgent: params.userAgent },
  })

  if ((recentClicks || 0) >= IP_VELOCITY_THRESHOLD) {
    signals.push({
      type: 'ip_velocity',
      severity: 'critical',
      detail: `${recentClicks} clicks from IP ${params.ip} in last minute (threshold: ${IP_VELOCITY_THRESHOLD})`,
    })

    // Auto-block for 1 hour
    await blockIP(params.ip, `IP velocity exceeded: ${recentClicks} clicks/min`, 'anti-fraud', 1)
    blocked = true
  }

  // 3. Fingerprint clustering
  if (params.fingerprint) {
    const fpWindowStart = new Date(Date.now() - FINGERPRINT_WINDOW_MS).toISOString()
    const { data: fpSignals } = await supabaseAdmin
      .from('fraud_signals')
      .select('ip_address')
      .eq('fingerprint', params.fingerprint)
      .gte('created_at', fpWindowStart)

    const uniqueIPs = new Set((fpSignals || []).map(s => s.ip_address).filter(Boolean))

    if (uniqueIPs.size > FINGERPRINT_IP_THRESHOLD) {
      signals.push({
        type: 'fingerprint_cluster',
        severity: 'high',
        detail: `Fingerprint seen from ${uniqueIPs.size} IPs in 5min (threshold: ${FINGERPRINT_IP_THRESHOLD})`,
      })

      await recordFraudSignal({
        signal_type: 'fingerprint_cluster',
        severity: 'high',
        fingerprint: params.fingerprint,
        ip_address: params.ip,
        campaign_id: params.campaignId,
        details: { uniqueIPs: Array.from(uniqueIPs) },
      })
    }
  }

  // 4. CTR anomaly (per campaign)
  if (params.campaignId) {
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('impressions, clicks')
      .eq('id', params.campaignId)
      .single()

    if (campaign && campaign.impressions > 100) {
      const ctr = campaign.clicks / campaign.impressions
      if (ctr > CTR_ANOMALY_THRESHOLD) {
        signals.push({
          type: 'ctr_anomaly',
          severity: 'high',
          detail: `Campaign CTR ${(ctr * 100).toFixed(1)}% exceeds ${CTR_ANOMALY_THRESHOLD * 100}% threshold`,
        })

        await recordFraudSignal({
          signal_type: 'ctr_anomaly',
          severity: 'high',
          campaign_id: params.campaignId,
          seller_id: params.sellerId,
          details: { ctr, impressions: campaign.impressions, clicks: campaign.clicks },
        })
      }
    }
  }

  return { blocked, signals }
}

// ─── Query Fraud Signals ─────────────────────────────────

export async function queryFraudSignals(filters: {
  signal_type?: SignalType
  severity?: Severity
  status?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}) {
  let query = supabaseAdmin
    .from('fraud_signals')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters.signal_type) query = query.eq('signal_type', filters.signal_type)
  if (filters.severity) query = query.eq('severity', filters.severity)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.from) query = query.gte('created_at', filters.from)
  if (filters.to) query = query.lte('created_at', filters.to)

  query = query.range(
    filters.offset || 0,
    (filters.offset || 0) + (filters.limit || 50) - 1
  )

  const { data, error, count } = await query
  if (error) throw error
  return { signals: data || [], total: count || 0 }
}

// ─── Query Blocked IPs ──────────────────────────────────

export async function queryBlockedIPs(limit: number = 100) {
  const { data, error } = await supabaseAdmin
    .from('blocked_ips')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}
