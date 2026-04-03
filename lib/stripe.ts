import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
}

// ── Production safety: prevent test keys in production ──────────────────────────
const stripeKey = process.env.STRIPE_SECRET_KEY
if (process.env.NODE_ENV === 'production' && stripeKey.startsWith('sk_test_')) {
  throw new Error(
    '[Stripe] FATAL: Test secret key detected in production environment! ' +
    'Set STRIPE_SECRET_KEY to a live key (sk_live_…) before deploying.'
  )
}

// Initialize Stripe with the secret key (server-side only)
export const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
})

// Dev-only: log the connected platform account ID once at module load to verify correct account
if (process.env.NODE_ENV === 'development') {
  stripe.accounts.retrieve().then(account => {
    console.log(`[Stripe] Connected to platform account: ${account.id}`)
  }).catch(err => {
    console.warn('[Stripe] Could not retrieve platform account ID:', err.message)
  })
}

// Stripe publishable key for client-side (optional, for reference)
export const getStripePublishableKey = () => {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
}
