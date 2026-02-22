import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getGlobalMetrics } from '@/lib/monitoring'

/**
 * GET /api/health
 *
 * Public health-check endpoint. Returns overall system status,
 * individual service checks, and aggregated runtime metrics.
 *
 * Status logic:
 *  - "healthy"   = all checks pass
 *  - "degraded"  = at least one non-critical check failed (e.g. Stripe key missing)
 *  - "unhealthy" = database is unreachable
 */

const startedAt = Date.now()

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const checks: Record<
    string,
    { status: 'up' | 'down'; latencyMs?: number; error?: string }
  > = {}

  // ------------------------------------------------------------------
  // 1. Database check
  // ------------------------------------------------------------------
  const dbStart = Date.now()
  try {
    const { error } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1)

    checks.database = {
      status: error ? 'down' : 'up',
      latencyMs: Date.now() - dbStart,
      ...(error ? { error: error.message } : {}),
    }
  } catch (err) {
    checks.database = {
      status: 'down',
      latencyMs: Date.now() - dbStart,
      error: err instanceof Error ? err.message : 'Connection failed',
    }
  }

  // ------------------------------------------------------------------
  // 2. Stripe check (verify secret key is configured)
  // ------------------------------------------------------------------
  const stripeKeySet = Boolean(process.env.STRIPE_SECRET_KEY)
  checks.stripe = {
    status: stripeKeySet ? 'up' : 'down',
    ...(!stripeKeySet ? { error: 'STRIPE_SECRET_KEY not configured' } : {}),
  }

  // ------------------------------------------------------------------
  // 3. Storage check (Supabase storage URL reachable)
  // ------------------------------------------------------------------
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (supabaseUrl) {
    const storageStart = Date.now()
    try {
      const res = await fetch(`${supabaseUrl}/storage/v1/`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      })
      checks.storage = {
        status: res.ok || res.status === 400 ? 'up' : 'down',
        latencyMs: Date.now() - storageStart,
      }
    } catch {
      checks.storage = {
        status: 'down',
        latencyMs: Date.now() - storageStart,
        error: 'Storage endpoint unreachable',
      }
    }
  } else {
    checks.storage = {
      status: 'down',
      error: 'NEXT_PUBLIC_SUPABASE_URL not configured',
    }
  }

  // ------------------------------------------------------------------
  // Determine overall status
  // ------------------------------------------------------------------
  const dbUp = checks.database.status === 'up'
  const allUp = Object.values(checks).every((c) => c.status === 'up')

  let status: 'healthy' | 'degraded' | 'unhealthy'
  if (allUp) {
    status = 'healthy'
  } else if (dbUp) {
    status = 'degraded'
  } else {
    status = 'unhealthy'
  }

  // ------------------------------------------------------------------
  // Metrics from monitoring library
  // ------------------------------------------------------------------
  const metrics = getGlobalMetrics()

  // ------------------------------------------------------------------
  // Response
  // ------------------------------------------------------------------
  const body = {
    status,
    timestamp: new Date().toISOString(),
    uptime: Math.round((Date.now() - startedAt) / 1000),
    version: process.env.APP_VERSION || process.env.npm_package_version || '0.1.0',
    checks,
    metrics: {
      totalRequests: metrics.totalRequests,
      errorRate: metrics.errorRate,
      avgLatencyMs: metrics.avgLatencyMs,
    },
  }

  return NextResponse.json(body, {
    status: status === 'unhealthy' ? 503 : 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Health-Status': status,
    },
  })
}
