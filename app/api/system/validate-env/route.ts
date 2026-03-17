import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { stripe } from '@/lib/stripe'

interface ServiceStatus {
  name: string
  status: 'ok' | 'error' | 'missing' | 'placeholder'
  detail?: string
}

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

  const services: ServiceStatus[] = []

  // 1. Supabase
  try {
    const { error } = await supabaseAdmin.from('users').select('id').limit(1)
    services.push({
      name: 'Supabase',
      status: error ? 'error' : 'ok',
      detail: error ? error.message : 'Connected',
    })
  } catch (e) {
    services.push({ name: 'Supabase', status: 'error', detail: e instanceof Error ? e.message : 'Unknown error' })
  }

  // 2. Stripe
  try {
    await stripe.balance.retrieve()
    services.push({ name: 'Stripe', status: 'ok', detail: 'Connected' })
  } catch (e) {
    services.push({ name: 'Stripe', status: 'error', detail: e instanceof Error ? e.message : 'Connection failed' })
  }

  // 3. Stripe Connect
  const connectClientId = process.env.STRIPE_CONNECT_CLIENT_ID
  if (!connectClientId || connectClientId.includes('YOUR_CLIENT_ID')) {
    services.push({ name: 'Stripe Connect', status: 'placeholder', detail: 'STRIPE_CONNECT_CLIENT_ID is a placeholder' })
  } else {
    services.push({ name: 'Stripe Connect', status: 'ok', detail: `Client ID: ${connectClientId.substring(0, 10)}...` })
  }

  // 4. Stripe Webhook Secrets
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const connectWebhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET
  services.push({
    name: 'Stripe Webhooks',
    status: webhookSecret && connectWebhookSecret ? 'ok' : 'missing',
    detail: [
      webhookSecret ? 'Main: configured' : 'Main: MISSING',
      connectWebhookSecret ? 'Connect: configured' : 'Connect: MISSING',
    ].join(', '),
  })

  // 5. Resend Email
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    services.push({ name: 'Resend Email', status: 'missing', detail: 'RESEND_API_KEY not set' })
  } else {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(resendKey)
      await resend.domains.list()
      services.push({ name: 'Resend Email', status: 'ok', detail: 'Connected' })
    } catch (e) {
      services.push({ name: 'Resend Email', status: 'error', detail: e instanceof Error ? e.message : 'Connection failed' })
    }
  }

  // 6. Google OAuth
  const googleId = process.env.GOOGLE_CLIENT_ID
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET
  services.push({
    name: 'Google OAuth',
    status: googleId && googleSecret ? 'ok' : 'missing',
    detail: googleId && googleSecret ? 'Configured' : 'Missing credentials',
  })

  // 7. NextAuth
  const nextAuthSecret = process.env.NEXTAUTH_SECRET
  const nextAuthUrl = process.env.NEXTAUTH_URL
  services.push({
    name: 'NextAuth',
    status: nextAuthSecret && nextAuthUrl ? 'ok' : 'missing',
    detail: [
      nextAuthSecret ? 'Secret: set' : 'Secret: MISSING',
      nextAuthUrl ? `URL: ${nextAuthUrl}` : 'URL: MISSING',
    ].join(', '),
  })

  // 8. n8n Webhook
  const n8nUrl = process.env.N8N_WEBHOOK_URL
  services.push({
    name: 'n8n Support Chat',
    status: n8nUrl ? 'ok' : 'missing',
    detail: n8nUrl ? 'Webhook URL configured' : 'N8N_WEBHOOK_URL not set',
  })

  // 9. Sendcloud
  const sendcloudKey = process.env.SENDCLOUD_API_KEY
  const sendcloudSecret = process.env.SENDCLOUD_API_SECRET
  if (!sendcloudKey || !sendcloudSecret || sendcloudKey.includes('YOUR_')) {
    services.push({ name: 'Sendcloud Shipping', status: 'placeholder', detail: 'API keys are placeholders' })
  } else {
    services.push({ name: 'Sendcloud Shipping', status: 'ok', detail: 'Configured' })
  }

  // Summary
  const allOk = services.every(s => s.status === 'ok')
  const criticalErrors = services.filter(s => s.status === 'error')
  const missingServices = services.filter(s => s.status === 'missing' || s.status === 'placeholder')

  return NextResponse.json({
    healthy: criticalErrors.length === 0,
    allConfigured: allOk,
    services,
    summary: {
      total: services.length,
      ok: services.filter(s => s.status === 'ok').length,
      errors: criticalErrors.length,
      missing: missingServices.length,
    },
    timestamp: new Date().toISOString(),
  })
}
