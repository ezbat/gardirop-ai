/**
 * Stripe Connect Verification Script
 * Run: npx tsx scripts/verify-stripe.ts
 */
import Stripe from 'stripe'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Manual env loading
const envPath = resolve(__dirname, '../.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) envVars[match[1].trim()] = match[2].trim()
}

const stripe = new Stripe(envVars.STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-15.clover' as any,
})

async function verify() {
  console.log('═══════════════════════════════════════════════')
  console.log(' WEARO Stripe Connect Verification')
  console.log('═══════════════════════════════════════════════\n')

  // 1. Platform account
  try {
    const account = await stripe.accounts.retrieve()
    console.log('✅ Platform Account:', account.id)
    console.log('   Country:', account.country)
    console.log('   Mode:', envVars.STRIPE_SECRET_KEY?.startsWith('sk_test') ? 'TEST' : 'LIVE')
    console.log('')
  } catch (err: any) {
    console.error('❌ API Key invalid:', err.message)
    return
  }

  // 2. List connected accounts
  try {
    const accounts = await stripe.accounts.list({ limit: 10 })
    console.log(`📋 Connected Accounts: ${accounts.data.length} found`)
    for (const acc of accounts.data) {
      console.log(`\n   Account ID: ${acc.id}`)
      console.log(`   Type: ${acc.type}`)
      console.log(`   Country: ${acc.country}`)
      console.log(`   Business: ${acc.business_profile?.name || 'N/A'}`)
      console.log(`   Charges: ${acc.charges_enabled}`)
      console.log(`   Payouts: ${acc.payouts_enabled}`)
      console.log(`   Submitted: ${acc.details_submitted}`)
      console.log(`   Metadata: ${JSON.stringify(acc.metadata)}`)
      console.log(`   Created: ${acc.created ? new Date(acc.created * 1000).toISOString() : 'N/A'}`)
    }
    if (accounts.data.length === 0) {
      console.log('   (Henüz connected account yok)')
    }
    console.log('')
  } catch (err: any) {
    console.error('❌ List failed:', err.message)
  }

  // 3. Create test account
  try {
    console.log('🔧 Test connected account oluşturuluyor...')
    const testAcc = await stripe.accounts.create({
      type: 'express',
      country: 'DE',
      email: 'audit-test@wearo.de',
      business_type: 'individual',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: 'WEARO Audit Test Shop',
        product_description: 'Fashion marketplace - audit verification',
      },
      metadata: {
        purpose: 'audit_verification',
        timestamp: new Date().toISOString(),
      },
    })

    console.log(`\n✅ TEST ACCOUNT OLUŞTURULDU`)
    console.log(`   Account ID: ${testAcc.id}`)
    console.log(`   Type: ${testAcc.type}`)
    console.log(`   Country: ${testAcc.country}`)
    console.log(`   Charges: ${testAcc.charges_enabled}`)
    console.log(`   Payouts: ${testAcc.payouts_enabled}`)

    // Onboarding link
    const link = await stripe.accountLinks.create({
      account: testAcc.id,
      refresh_url: 'http://localhost:3000/seller/onboarding?refresh=true',
      return_url: 'http://localhost:3000/seller/dashboard?onboarding=complete',
      type: 'account_onboarding',
    })
    console.log(`   Onboarding URL: ${link.url}`)
    console.log(`   Expires: ${new Date(link.expires_at * 1000).toISOString()}`)

    // Temizle
    const del = await stripe.accounts.del(testAcc.id)
    console.log(`\n🧹 Test account silindi: ${del.deleted}`)
  } catch (err: any) {
    console.error('❌ Test account failed:', err.message)
  }

  console.log('\n═══════════════════════════════════════════════')
  console.log(' Verification Complete')
  console.log('═══════════════════════════════════════════════')
}

verify().catch(console.error)
