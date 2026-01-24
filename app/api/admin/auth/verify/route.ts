import { NextRequest, NextResponse } from 'next/server'
import { adminSessions } from '../login/route'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const session = adminSessions.get(token)

    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Check if session expired
    if (Date.now() > session.expiresAt) {
      adminSessions.delete(token)
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    return NextResponse.json({
      valid: true,
      user: {
        userId: session.userId,
        username: session.username,
      },
    })
  } catch (error) {
    console.error('Session verify error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
