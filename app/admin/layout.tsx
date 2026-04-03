'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Shield } from 'lucide-react'
import { getAdminToken, setAdminToken, clearAdminToken } from '@/lib/admin-fetch'

/**
 * Admin layout.
 *
 * Auth gate: validates ADMIN_TOKEN via x-admin-token header.
 * Stores validated token in localStorage as 'adminToken'.
 * All child pages read it via getAdminToken() from lib/admin-fetch.
 */

const BG   = '#0B0D14'
const SURF = '#111520'
const ELEV = '#1A1E2E'
const BDR  = '#2E3448'
const T1   = '#F0F2F8'
const T2   = '#9EA5BB'
const T3   = '#7B83A0'
const ACC  = '#6366F1'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [authed,       setAuthed]       = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [deviceTrusted, setDeviceTrusted] = useState<boolean | null>(null) // null = checking

  // Auth gate state
  const [tokenInput, setTokenInput] = useState('')
  const [authErr,    setAuthErr]    = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  useEffect(() => {
    if (pathname === '/admin/login') {
      setLoading(false)
      setAuthed(true)
      setDeviceTrusted(true)
      return
    }
    checkDeviceAndToken()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const checkDeviceAndToken = async () => {
    // Step 1: Check device trust first
    try {
      const dtRes = await fetch('/api/admin/device-trust')
      const dtData = await dtRes.json()
      if (!dtData.trusted) {
        // Unknown device — show nothing useful
        setDeviceTrusted(false)
        setLoading(false)
        return
      }
      setDeviceTrusted(true)
    } catch {
      // On network error in dev, allow through
      setDeviceTrusted(true)
    }

    // Step 2: Check admin token
    const token = getAdminToken()
    if (!token) {
      setLoading(false)
      setAuthed(false)
      return
    }
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-admin-token': token },
      })
      if (res.ok) {
        setAuthed(true)
      } else {
        clearAdminToken()
        setAuthed(false)
      }
    } catch {
      setAuthed(true)
    }
    setLoading(false)
  }

  const registerDeviceTrust = async (token: string) => {
    try {
      await fetch('/api/admin/device-trust', {
        method: 'POST',
        headers: { 'x-admin-token': token },
      })
    } catch {
      // Best effort
    }
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const tok = tokenInput.trim()
    if (!tok) return
    setAuthLoading(true)
    setAuthErr('')
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-admin-token': tok },
      })
      if (res.status === 401) {
        setAuthErr('Zugriff verweigert')
        setAuthLoading(false)
        return
      }
      if (!res.ok) {
        setAuthErr('Fehler — erneut versuchen')
        setAuthLoading(false)
        return
      }
      // Token is valid — register device trust + store token
      setAdminToken(tok)
      await registerDeviceTrust(tok)
      setAuthed(true)
    } catch {
      setAuthErr('Verbindungsfehler')
    }
    setAuthLoading(false)
  }

  const handleLogout = () => {
    clearAdminToken()
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    setAuthed(false)
    setTokenInput('')
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div
          className="h-9 w-9 rounded-full animate-spin"
          style={{ border: `2px solid ${BDR}`, borderTopColor: ACC }}
        />
      </div>
    )
  }

  // ── Untrusted device — show generic 404-like page ───────────────────────
  if (deviceTrusted === false) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="text-center">
          <p className="text-6xl font-bold mb-4" style={{ color: T3 }}>404</p>
          <p className="text-sm" style={{ color: T3 }}>Seite nicht gefunden</p>
        </div>
      </div>
    )
  }

  // ── Auth gate ────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: BG }}
      >
        <div style={{
          width: 420, background: SURF,
          border: `1px solid ${BDR}`, borderRadius: 16, padding: 40,
        }}>
          <div className="flex items-center gap-3.5 mb-8">
            <div
              className="w-11 h-11 rounded-[10px] flex items-center justify-center shrink-0"
              style={{ background: 'rgba(99,102,241,0.2)' }}
            >
              <Shield size={22} color={ACC} />
            </div>
            <div>
              <p className="font-bold text-[19px] m-0" style={{ color: T1 }}>Anmeldung</p>
              <p className="text-[13px] m-0" style={{ color: T3 }}>Zugangstoken eingeben</p>
            </div>
          </div>

          <form onSubmit={handleAuthSubmit}>
            <input
              type="password"
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              placeholder="Token"
              className="w-full text-sm outline-none"
              style={{
                background: ELEV,
                border: `1px solid ${authErr ? 'rgba(239,68,68,0.5)' : BDR}`,
                borderRadius: 8, padding: '11px 14px',
                color: T1, marginBottom: authErr ? 8 : 16,
                boxSizing: 'border-box',
              }}
              autoFocus
            />
            {authErr && (
              <p className="text-[13px] m-0 mb-3.5" style={{ color: '#FCA5A5' }}>{authErr}</p>
            )}
            <button
              type="submit"
              disabled={authLoading || !tokenInput.trim()}
              className="w-full text-sm font-semibold border-none"
              style={{
                background: ACC, color: '#fff',
                borderRadius: 8, padding: '11px 0',
                cursor: authLoading || !tokenInput.trim() ? 'not-allowed' : 'pointer',
                opacity: authLoading || !tokenInput.trim() ? 0.65 : 1,
              }}
            >
              {authLoading ? 'Laden...' : 'Anmelden'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Nav links ────────────────────────────────────────────────────────────
  const navLinks = [
    { href: '/admin',            label: 'Overview'     },
    { href: '/admin/dashboard',  label: 'Dashboard'    },
    { href: '/admin/features',   label: 'Features', accent: true },
    { href: '/admin/sellers',    label: 'Sellers'      },
    { href: '/admin/products',   label: 'Products'     },
    { href: '/admin/outfits',    label: 'Outfits'      },
    { href: '/admin/users',      label: 'Users'        },
    { href: '/admin/returns',    label: 'Returns'      },
    { href: '/admin/support/tickets', label: 'Support' },
    { href: '/admin/finances',   label: 'Finances'     },
    { href: '/admin/payouts',    label: 'Payouts'      },
    { href: '/admin/withdrawals',label: 'Withdrawals'  },
    { href: '/admin/requests',   label: 'Requests'     },
    { href: '/admin/ads',        label: 'Ads'          },
  ]

  return (
    <div className="min-h-screen" style={{ background: BG }}>

      {/* ── Navigation bar ─────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-30"
        style={{ background: SURF, borderBottom: '1px solid #1E2235' }}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-[52px]">

            {/* Left: brand + links */}
            <div className="flex items-center gap-[20px]">
              <Link
                href="/admin"
                className="flex-shrink-0 text-[14px] font-extrabold tracking-tight
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-sm"
                style={{ color: '#818CF8' }}
              >
                Admin
              </Link>

              {/* Desktop nav */}
              <div className="hidden md:flex items-center gap-[2px]">
                {navLinks.map(({ href, label, accent }) => {
                  const active = pathname === href || (href !== '/admin' && pathname.startsWith(href + '/'))
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={[
                        'px-[9px] py-[5px] rounded-[6px] text-[11px] font-medium whitespace-nowrap',
                        'transition-colors duration-100',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                        accent
                          ? active
                            ? 'bg-indigo-600 text-white'
                            : 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/35 hover:text-indigo-100'
                          : active
                          ? 'bg-[#1A1E2E] text-[#F0F2F8]'
                          : 'text-[#8B92A8] hover:text-[#F0F2F8] hover:bg-[#1A1E2E]',
                      ].join(' ')}
                    >
                      {label}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Right: back + logout */}
            <div className="flex items-center gap-[6px]">
              <Link
                href="/"
                className="px-[9px] py-[5px] rounded-[6px] text-[11px] font-medium
                  text-[#8B92A8] hover:text-[#F0F2F8] hover:bg-[#1A1E2E] transition-colors
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Site
              </Link>
              {pathname !== '/admin/login' && (
                <button
                  onClick={handleLogout}
                  className="px-[9px] py-[5px] rounded-[6px] text-[11px] font-semibold
                    bg-red-700 hover:bg-red-600 active:bg-red-800 text-white transition-colors
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  Logout
                </button>
              )}
            </div>

          </div>
        </div>
      </nav>

      {/* ── Page content ───────────────────────────────────────────── */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

    </div>
  )
}
