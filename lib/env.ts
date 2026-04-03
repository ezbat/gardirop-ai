/**
 * Environment variable validation and access.
 *
 * Call `validateEnv()` once at startup (e.g. instrumentation.ts or first API hit).
 * Use `env` for typed, validated access throughout server-side code.
 *
 * RULES:
 *  - NEVER expose SUPABASE_SERVICE_ROLE_KEY or STRIPE_SECRET_KEY to the client
 *  - NEVER log secret values — only log key names on failure
 *  - All required vars throw at startup so deploys fail fast
 */

// ─── Required server-side env vars ──────────────────────────────────────────────
const REQUIRED_SERVER = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'ADMIN_TOKEN',
  'NEXTAUTH_SECRET',
] as const

// ─── Optional but recommended ───────────────────────────────────────────────────
const OPTIONAL = [
  'APP_ENV',           // development | staging | production
  'LOG_LEVEL',         // debug | info | warn | error
  'SENTRY_DSN',        // Sentry error tracking
  'CRON_SECRET',       // Protects /api/cron/* endpoints
  'RESEND_API_KEY',    // Email service
] as const

type AppEnv = 'development' | 'staging' | 'production'
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

let _validated = false

/**
 * Validate all required environment variables.
 * Throws on first missing required var — ensures deploy fails fast.
 */
export function validateEnv(): void {
  if (_validated) return

  const missing: string[] = []

  for (const key of REQUIRED_SERVER) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    const msg = `[env] Missing required environment variables: ${missing.join(', ')}`
    // In development, warn but don't crash (some vars may be optional during local dev)
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg)
    } else {
      console.warn(`\x1b[33m${msg}\x1b[0m`)
    }
  }

  // Stripe key mode validation
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? ''
  if (process.env.NODE_ENV === 'production' && stripeKey.startsWith('sk_test_')) {
    throw new Error('[env] FATAL: Stripe TEST key detected in production! Use a live key.')
  }

  const stripePub = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''
  if (process.env.NODE_ENV === 'production' && stripePub.startsWith('pk_test_')) {
    throw new Error('[env] FATAL: Stripe TEST publishable key detected in production!')
  }

  _validated = true
}

/**
 * Typed, validated environment accessor.
 * Safe to use after `validateEnv()` has been called.
 */
export const env = {
  get nodeEnv(): string {
    return process.env.NODE_ENV ?? 'development'
  },
  get appEnv(): AppEnv {
    return (process.env.APP_ENV as AppEnv) ?? 'development'
  },
  get logLevel(): LogLevel {
    return (process.env.LOG_LEVEL as LogLevel) ?? (process.env.NODE_ENV === 'production' ? 'warn' : 'debug')
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === 'production'
  },
  get isDevelopment(): boolean {
    return process.env.NODE_ENV !== 'production'
  },

  // Supabase
  get supabaseUrl(): string {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  },
  get supabaseAnonKey(): string {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  },
  get supabaseServiceRoleKey(): string {
    return process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  },

  // Stripe
  get stripeSecretKey(): string {
    return process.env.STRIPE_SECRET_KEY ?? ''
  },
  get stripeWebhookSecret(): string {
    return process.env.STRIPE_WEBHOOK_SECRET ?? ''
  },

  // Admin
  get adminToken(): string {
    return process.env.ADMIN_TOKEN ?? ''
  },
  get cronSecret(): string {
    return process.env.CRON_SECRET ?? ''
  },

  // Optional services
  get sentryDsn(): string | undefined {
    return process.env.SENTRY_DSN
  },
  get resendApiKey(): string | undefined {
    return process.env.RESEND_API_KEY
  },
} as const
