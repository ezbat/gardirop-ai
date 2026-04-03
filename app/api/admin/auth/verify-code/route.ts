import { NextRequest, NextResponse } from 'next/server'
import { verificationCodes } from '../send-code/route'

const MAX_ATTEMPTS = 3
const CODE_EXPIRY = 5 * 60 * 1000 // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const { username, code } = await request.json()

    // Verify admin user exists in DB (no hardcoded usernames)
    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    const { data: adminUser } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('name', username)
      .eq('role', 'admin')
      .maybeSingle()

    if (!adminUser) {
      await new Promise(r => setTimeout(r, 200 + Math.random() * 300))
      return NextResponse.json({ error: 'Invalid user' }, { status: 401 })
    }

    const storedData = verificationCodes.get(username)

    if (!storedData) {
      return NextResponse.json({ error: 'No verification code found. Please request a new one.' }, { status: 400 })
    }

    // Check if code expired
    if (Date.now() - storedData.timestamp > CODE_EXPIRY) {
      verificationCodes.delete(username)
      return NextResponse.json({ error: 'Verification code expired. Please request a new one.' }, { status: 400 })
    }

    // Check attempts
    if (storedData.attempts >= MAX_ATTEMPTS) {
      verificationCodes.delete(username)
      return NextResponse.json({ error: 'Too many failed attempts. Please request a new code.' }, { status: 429 })
    }

    // Verify code
    if (storedData.code !== code) {
      storedData.attempts++
      const remainingAttempts = MAX_ATTEMPTS - storedData.attempts

      return NextResponse.json({
        error: `Invalid code. ${remainingAttempts} attempt(s) remaining.`
      }, { status: 401 })
    }

    // Code is valid - remove it
    verificationCodes.delete(username)

    return NextResponse.json({
      success: true,
      message: 'Verification successful'
    })
  } catch (error) {
    console.error('Verify code error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
