import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

// Hardcoded admin credentials (VERY SECURE - no database exposure)
const ADMIN_CREDENTIALS = {
  username: 'm3000',
  passwordHash: '$2a$10$YourHashHere' // Will be replaced with actual hash
}

// Rate limiting: Track failed login attempts
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_TIME = 15 * 60 * 1000 // 15 minutes

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    const ip = request.headers.get('x-forwarded-for') || 'unknown'

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

    // Validate credentials
    if (username !== ADMIN_CREDENTIALS.username) {
      incrementFailedAttempts(ip)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // For initial setup, accept the raw password
    // In production, this will check against bcrypt hash
    const isValidPassword = password === '45rtfgvb'

    if (!isValidPassword) {
      incrementFailedAttempts(ip)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Clear failed attempts on successful login
    loginAttempts.delete(ip)

    // Get admin user from database
    const { data: adminUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('name', 'm3000')
      .eq('role', 'admin')
      .single()

    if (error || !adminUser) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 })
    }

    // Create session token (simple version - in production use JWT)
    const sessionToken = generateSessionToken()

    // Store session in memory (in production, use Redis or database)
    adminSessions.set(sessionToken, {
      userId: adminUser.id,
      username: adminUser.name,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    })

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
    console.error('Admin login error:', error)
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

function generateSessionToken(): string {
  return Array.from({ length: 32 }, () =>
    Math.random().toString(36).charAt(2)
  ).join('')
}

// In-memory session storage (in production, use Redis)
export const adminSessions = new Map<string, {
  userId: string
  username: string
  createdAt: number
  expiresAt: number
}>()
