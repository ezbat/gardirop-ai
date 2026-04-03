import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import bcrypt from 'bcryptjs'
import { createSession } from '@/lib/admin-sessions'

// Rate limiting: Track failed login attempts
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_TIME = 15 * 60 * 1000 // 15 minutes

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
    }

    // Rate limiting check
    const attempts = loginAttempts.get(ip)
    if (attempts) {
      const timeSinceLastAttempt = Date.now() - attempts.lastAttempt

      if (attempts.count >= MAX_ATTEMPTS && timeSinceLastAttempt < LOCKOUT_TIME) {
        const remainingTime = Math.ceil((LOCKOUT_TIME - timeSinceLastAttempt) / 60000)
        return NextResponse.json(
          { error: `Too many failed attempts. Try again in ${remainingTime} minutes.` },
          { status: 429 }
        )
      }

      // Reset if lockout time has passed
      if (timeSinceLastAttempt >= LOCKOUT_TIME) {
        loginAttempts.delete(ip)
      }
    }

    // Look up admin user in database
    const { data: adminUser, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role, password')
      .eq('name', username)
      .eq('role', 'admin')
      .maybeSingle()

    if (error || !adminUser) {
      incrementFailedAttempts(ip)
      // Constant-time delay to prevent username enumeration
      await new Promise(r => setTimeout(r, 200 + Math.random() * 300))
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Verify password via bcrypt ONLY — no fallbacks
    if (!adminUser.password) {
      incrementFailedAttempts(ip)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const isValidPassword = await bcrypt.compare(password, adminUser.password)

    if (!isValidPassword) {
      incrementFailedAttempts(ip)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Clear failed attempts on successful login
    loginAttempts.delete(ip)

    // Create session via shared session store
    const sessionToken = createSession(adminUser.id, adminUser.name ?? username)

    return NextResponse.json({
      success: true,
      token: sessionToken,
      user: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
      },
    })
  } catch (error) {
    console.error('[admin/auth/login] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function incrementFailedAttempts(ip: string) {
  const current = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 }
  loginAttempts.set(ip, {
    count: current.count + 1,
    lastAttempt: Date.now(),
  })
}
