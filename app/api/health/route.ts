import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * Health check endpoint
 * Checks API, Database and external services status
 */
export async function GET() {
  const startTime = Date.now()
  const checks: Record<string, any> = {}

  // Check Database Connection
  try {
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single()

    checks.database = {
      status: error ? 'unhealthy' : 'healthy',
      responseTime: Date.now() - startTime
    }
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      error: 'Connection failed'
    }
  }

  // Check Environment Variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXTAUTH_SECRET',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY'
  ]

  const missingEnvVars = requiredEnvVars.filter(
    envVar => !process.env[envVar]
  )

  checks.environment = {
    status: missingEnvVars.length === 0 ? 'healthy' : 'unhealthy',
    missing: missingEnvVars
  }

  // Overall status
  const isHealthy = Object.values(checks).every(
    (check: any) => check.status === 'healthy'
  )

  const response = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime ? process.uptime() : null,
    checks,
    version: process.env.npm_package_version || '1.0.0'
  }

  return NextResponse.json(response, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  })
}
