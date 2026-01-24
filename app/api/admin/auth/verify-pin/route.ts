import { NextRequest, NextResponse } from 'next/server'

const ADMIN_PIN = process.env.ADMIN_PIN || '9876'
const pinAttempts = new Map<string, number>()
const MAX_PIN_ATTEMPTS = 3

export async function POST(request: NextRequest) {
  try {
    const { username, pin } = await request.json()

    if (username !== 'm3000') {
      return NextResponse.json({ error: 'Invalid user' }, { status: 401 })
    }

    const attempts = pinAttempts.get(username) || 0

    if (attempts >= MAX_PIN_ATTEMPTS) {
      return NextResponse.json({
        error: 'Too many failed PIN attempts. Please login again.'
      }, { status: 429 })
    }

    if (pin !== ADMIN_PIN) {
      pinAttempts.set(username, attempts + 1)
      const remaining = MAX_PIN_ATTEMPTS - attempts - 1

      return NextResponse.json({
        error: `Invalid PIN. ${remaining} attempt(s) remaining.`
      }, { status: 401 })
    }

    // PIN is correct - clear attempts
    pinAttempts.delete(username)

    return NextResponse.json({
      success: true,
      message: 'PIN verified successfully'
    })
  } catch (error) {
    console.error('Verify PIN error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
