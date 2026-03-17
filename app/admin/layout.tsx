'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

/**
 * Admin layout.
 *
 * Design tokens (hardcoded, no CSS vars):
 *   page bg     #0B0D14
 *   surface     #111520
 *   elevated    #1A1E2E
 *   border      #252A3C
 *   border-l    #1E2235
 *   text-1      #F0F2F8
 *   text-2      #8B92A8
 *   text-3      #515A72
 *   accent      indigo-500 / #6366F1
 */

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [isAdmin,  setIsAdmin]  = useState(false)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (pathname === '/admin/login') {
      setLoading(false)
      setIsAdmin(true)
      return
    }
    checkAdminAccess()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const checkAdminAccess = async () => {
    try {
      const adminToken = localStorage.getItem('admin_token')
      const adminUser  = localStorage.getItem('admin_user')

      if (!adminToken || !adminUser) {
        router.push('/admin/login')
        return
      }

      try {
        const tokenData = JSON.parse(atob(adminToken))
        if (Date.now() - tokenData.timestamp > 24 * 60 * 60 * 1000) {
          localStorage.removeItem('admin_token')
          localStorage.removeItem('admin_user')
          alert('Session expired. Please login again.')
          router.push('/admin/login')
          return
        }

        const user = JSON.parse(adminUser)
        if (user.role !== 'admin' || user.username !== 'm3000') {
          throw new Error('Invalid admin user')
        }

        setIsAdmin(true)
      } catch (err) {
        console.error('Invalid token:', err)
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user')
        router.push('/admin/login')
      }
    } catch (err) {
      console.error('Admin check error:', err)
      router.push('/admin/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    router.push('/admin/login')
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B0D14' }}>
        <div
          className="h-9 w-9 rounded-full animate-spin"
          style={{ border: '2px solid #252A3C', borderTopColor: '#6366F1' }}
        />
      </div>
    )
  }

  if (!isAdmin) return null

  // ── Nav links ────────────────────────────────────────────────────────────
  const navLinks = [
    { href: '/admin/dashboard',   label: 'Dashboard'   },
    { href: '/admin/features',    label: '⭐ Features', accent: true },
    { href: '/admin/sellers',     label: 'Sellers'     },
    { href: '/admin/products',    label: 'Products'    },
    { href: '/admin/outfits',     label: 'Outfits'     },
    { href: '/admin/users',       label: 'Users'       },
    { href: '/admin/support',     label: 'Support'     },
    { href: '/admin/finances',    label: 'Finances'    },
    { href: '/admin/payouts',     label: 'Payouts'     },
    { href: '/admin/withdrawals', label: 'Withdrawals' },
    { href: '/admin/requests',    label: 'Requests'    },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#0B0D14' }}>

      {/* ── Navigation bar ─────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-30"
        style={{ background: '#111520', borderBottom: '1px solid #1E2235' }}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-[52px]">

            {/* Left: brand + links */}
            <div className="flex items-center gap-[20px]">
              <Link
                href="/admin/dashboard"
                className="flex-shrink-0 text-[14px] font-extrabold tracking-tight
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-sm"
                style={{ color: '#818CF8' }}
              >
                ⚡ Admin
              </Link>

              {/* Desktop nav */}
              <div className="hidden md:flex items-center gap-[2px]">
                {navLinks.map(({ href, label, accent }) => {
                  const active = pathname === href || pathname.startsWith(href + '/')
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
                ← Site
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
