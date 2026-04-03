/**
 * Shared in-memory admin session store.
 * Single module imported by both login route and auth verification.
 * In production, replace with Redis or DB-backed sessions.
 */

export interface AdminSession {
  userId: string
  username: string
  createdAt: number
  expiresAt: number
}

// Global singleton — survives HMR in dev
const globalForSessions = globalThis as unknown as {
  __adminSessions?: Map<string, AdminSession>
}

if (!globalForSessions.__adminSessions) {
  globalForSessions.__adminSessions = new Map()
}

export const adminSessions: Map<string, AdminSession> = globalForSessions.__adminSessions

export function createSession(userId: string, username: string): string {
  const crypto = require('crypto') as typeof import('crypto')
  const token = crypto.randomBytes(32).toString('hex')
  adminSessions.set(token, {
    userId,
    username,
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  })
  return token
}

export function validateSession(token: string): AdminSession | null {
  if (!token) return null
  const session = adminSessions.get(token)
  if (!session) return null
  if (session.expiresAt < Date.now()) {
    adminSessions.delete(token)
    return null
  }
  return session
}

export function clearSession(token: string): void {
  adminSessions.delete(token)
}
