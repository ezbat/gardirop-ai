'use client'

/**
 * /admin/login — Admin authentication page.
 *
 * Minimal login form. No security implementation details leaked.
 * Validates credentials server-side only.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { setAdminToken } from '@/lib/admin-fetch'

export default function AdminLoginPage() {
  const router = useRouter()
  const [step, setStep]           = useState(1)
  const [username, setUsername]   = useState('')
  const [password, setPassword]   = useState('')
  const [code, setCode]           = useState('')
  const [pin, setPin]             = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  // ── Step 1: Credentials (server-side validation) ────────────────────────
  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError('Anmeldung fehlgeschlagen')
        setLoading(false)
        return
      }

      // If login returns a token directly (simple mode), skip other steps
      if (data.token) {
        setAdminToken(data.token)
        // Register device as trusted so layout doesn't show 404
        try {
          await fetch('/api/admin/device-trust', {
            method: 'POST',
            headers: { 'x-admin-token': data.token },
          })
        } catch {}
        router.push('/admin')
        return
      }

      // Trigger verification code
      const codeRes = await fetch('/api/admin/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })

      if (!codeRes.ok) {
        setError('Anmeldung fehlgeschlagen')
        setLoading(false)
        return
      }

      setStep(2)
    } catch {
      setError('Verbindungsfehler')
    }
    setLoading(false)
  }

  // ── Step 2: Code verification ───────────────────────────────────────────
  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, code }),
      })

      if (!res.ok) {
        setError('Verifizierung fehlgeschlagen')
        setLoading(false)
        return
      }
      setStep(3)
    } catch {
      setError('Verbindungsfehler')
    }
    setLoading(false)
  }

  // ── Step 3: PIN verification ────────────────────────────────────────────
  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError('Verifizierung fehlgeschlagen')
        setLoading(false)
        return
      }

      // Store token from server
      if (data.token) {
        setAdminToken(data.token)
      }

      router.push('/admin')
    } catch {
      setError('Verbindungsfehler')
    }
    setLoading(false)
  }

  // ── Design tokens (dark, matches admin layout) ──────────────────────────
  const BG   = '#0B0D14'
  const SURF = '#111520'
  const ELEV = '#1A1E2E'
  const BDR  = '#2E3448'
  const T1   = '#F0F2F8'
  const T3   = '#7B83A0'
  const ACC  = '#6366F1'

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: BG }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          width: 400,
          background: SURF,
          border: `1px solid ${BDR}`,
          borderRadius: 16,
          padding: 36,
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-7">
          <div
            className="w-10 h-10 rounded-[10px] flex items-center justify-center"
            style={{ background: `${ACC}22` }}
          >
            <Lock size={20} color={ACC} />
          </div>
          <div>
            <p className="font-bold text-lg m-0" style={{ color: T1 }}>
              Anmeldung
            </p>
            <p className="text-xs m-0" style={{ color: T3 }}>
              {step === 1 && 'Zugangsdaten eingeben'}
              {step === 2 && 'Code eingeben'}
              {step === 3 && 'Bestätigung'}
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1.5 mb-6">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{ background: s <= step ? ACC : BDR }}
            />
          ))}
        </div>

        {/* ── Step 1 ────────────────────────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-4">
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Benutzername"
              required
              autoComplete="off"
              className="w-full text-sm outline-none"
              style={{
                background: ELEV,
                border: `1px solid ${BDR}`,
                borderRadius: 8,
                padding: '11px 14px',
                color: T1,
              }}
              autoFocus
            />
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Passwort"
                required
                autoComplete="off"
                className="w-full text-sm outline-none"
                style={{
                  background: ELEV,
                  border: `1px solid ${BDR}`,
                  borderRadius: 8,
                  padding: '11px 14px',
                  color: T1,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: T3 }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && <ErrorBanner msg={error} />}
            <SubmitBtn loading={loading} label="Weiter" acc={ACC} />
          </form>
        )}

        {/* ── Step 2 ────────────────────────────────────────────────── */}
        {step === 2 && (
          <form onSubmit={handleStep2} className="space-y-4">
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Verifizierungscode"
              required
              maxLength={6}
              autoComplete="off"
              className="w-full text-sm outline-none text-center tracking-[0.3em]"
              style={{
                background: ELEV,
                border: `1px solid ${BDR}`,
                borderRadius: 8,
                padding: '11px 14px',
                color: T1,
                fontSize: 18,
              }}
              autoFocus
            />
            <p className="text-xs text-center" style={{ color: T3 }}>
              Code wurde gesendet
            </p>
            {error && <ErrorBanner msg={error} />}
            <SubmitBtn loading={loading} label="Bestätigen" acc={ACC} />
          </form>
        )}

        {/* ── Step 3 ────────────────────────────────────────────────── */}
        {step === 3 && (
          <form onSubmit={handleStep3} className="space-y-4">
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="PIN"
              required
              maxLength={6}
              autoComplete="off"
              className="w-full text-sm outline-none text-center tracking-[0.3em]"
              style={{
                background: ELEV,
                border: `1px solid ${BDR}`,
                borderRadius: 8,
                padding: '11px 14px',
                color: T1,
                fontSize: 18,
              }}
              autoFocus
            />
            {error && <ErrorBanner msg={error} />}
            <SubmitBtn loading={loading} label="Anmelden" acc={ACC} />
          </form>
        )}
      </motion.div>
    </div>
  )
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-sm text-center py-2 px-3 rounded-lg"
      style={{ background: 'rgba(239,68,68,0.12)', color: '#FCA5A5' }}
    >
      {msg}
    </motion.p>
  )
}

function SubmitBtn({ loading, label, acc }: { loading: boolean; label: string; acc: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full text-sm font-semibold border-none"
      style={{
        background: acc,
        color: '#fff',
        borderRadius: 8,
        padding: '11px 0',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.65 : 1,
        transition: 'opacity 150ms',
      }}
    >
      {loading ? 'Laden...' : label}
    </button>
  )
}
