"use client"

import { useState, useEffect, Suspense } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ShoppingBag, User, Heart, Menu, X, MessageCircle, Search, Grid3X3 } from 'lucide-react'
import { usePageTransition } from '@/lib/page-transition-context'
import { SearchOverlay, SearchTrigger } from '@/components/storefront/SearchOverlay'
import { NotificationBell } from '@/components/notifications/NotificationBell'

// ─── Category data ────────────────────────────────────────────────────────────

const navCategories = [
  { id: 'all',              label: 'Neuheiten'    },
  { id: 'bestseller',       label: 'Bestseller'   },
  { id: 'sale',             label: 'Angebote', accent: true },
  { id: 'Oberbekleidung',   label: 'Mode'         },
  { id: 'beauty',           label: 'Beauty'       },
  { id: 'Sportbekleidung',  label: 'Sport'        },
  { id: 'technik',          label: 'Technik'      },
  { id: 'haushalt',         label: 'Haus & Küche' },
]

const allCategories = [
  { group: 'Mode & Schuhe', items: [
    { id: 'Oberbekleidung', label: 'Damen Mode' },
    { id: 'Kleid',          label: 'Kleider & Röcke' },
    { id: 'Schuhe',         label: 'Schuhe & Sneaker' },
    { id: 'Accessoires',    label: 'Schmuck & Uhren' },
  ]},
  { group: 'Technik & Elektronik', items: [
    { id: 'technik', label: 'Smartphones & Tablets' },
    { id: 'technik', label: 'Laptops & Computer' },
    { id: 'technik', label: 'Audio & Kopfhörer' },
    { id: 'technik', label: 'Kameras & Foto' },
  ]},
  { group: 'Haus & Garten', items: [
    { id: 'haushalt', label: 'Küche & Haushalt' },
    { id: 'haushalt', label: 'Möbel & Deko' },
    { id: 'haushalt', label: 'Garten & Outdoor' },
    { id: 'haushalt', label: 'Heimwerken' },
  ]},
  { group: 'Sport & Freizeit', items: [
    { id: 'Sportbekleidung', label: 'Fitness & Training' },
    { id: 'Sportbekleidung', label: 'Outdoor & Camping' },
    { id: 'spielzeug',       label: 'Spielzeug & Spiele' },
    { id: 'auto',            label: 'Auto & Motorrad' },
  ]},
]

// ─── Inner component ──────────────────────────────────────────────────────────

function NavHeaderInner() {
  const pathname    = usePathname()
  const router      = useRouter()
  const { navigateTo } = usePageTransition()
  const { data: session } = useSession()
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [searchOpen,  setSearchOpen]  = useState(false)
  const [unreadMsgs,  setUnreadMsgs]  = useState(0)

  // Poll unread message count for authenticated customers
  useEffect(() => {
    if (!session?.user?.id) { setUnreadMsgs(0); return }

    const fetchUnread = async () => {
      try {
        const res  = await fetch('/api/messages/unread')
        const data = await res.json()
        if (data.success) setUnreadMsgs(data.unreadCount ?? 0)
      } catch {}
    }

    fetchUnread()
    const interval = setInterval(fetchUnread, 30_000)
    const onRead = () => fetchUnread()
    window.addEventListener('messages-read', onRead)
    return () => { clearInterval(interval); window.removeEventListener('messages-read', onRead) }
  }, [session?.user?.id])

  // Keyboard shortcut: "/" to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !searchOpen && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [searchOpen])

  // Hide on auth / seller / onboarding / reels paths
  const hiddenPaths = ['/onboarding', '/auth', '/seller', '/reels', '/admin']
  if (hiddenPaths.some((p) => pathname?.startsWith(p))) return null

  const isOnStore = pathname === '/store' || pathname === '/'

  const handleCategoryClick = (catId: string) => {
    setMenuOpen(false)
    const nonFilterable = ['all', 'bestseller', 'sale', 'technik', 'haushalt', 'beauty', 'spielzeug', 'auto', 'buero']
    const href = nonFilterable.includes(catId) ? '/store' : `/store?cat=${catId}`
    if (isOnStore) { router.push(href) } else { navigateTo(href) }
  }

  const handleNavClick = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    navigateTo(href)
  }

  return (
    <>
      <header className="sticky top-0 z-50 hidden md:block">
        {/* ── Single clean navigation bar ────────────────────── */}
        <div
          className="flex items-center justify-between px-8 lg:px-12"
          style={{
            height: '56px',
            background: '#FFFFFF',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          {/* Left — Logo + category trigger */}
          <div className="flex items-center gap-5 flex-shrink-0">
            <Link href="/" onClick={handleNavClick('/')}>
              <span
                className="text-[20px] font-black tracking-[0.08em]"
                style={{ color: '#1A1A1A' }}
              >
                WEARO
              </span>
            </Link>

            <div className="w-px h-5" style={{ background: 'rgba(0,0,0,0.08)' }} />

            {/* Inline category links */}
            <nav className="flex items-center gap-1">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium
                  transition-colors duration-150 hover:bg-black/[0.04]"
                style={{ color: '#333' }}
              >
                <Menu className="w-3.5 h-3.5" /> Alle
              </button>
              {navCategories.slice(0, 5).map((cat) => (
                <button
                  key={`${cat.id}-${cat.label}`}
                  onClick={() => handleCategoryClick(cat.id)}
                  className="px-2.5 py-1.5 rounded-lg text-[13px] whitespace-nowrap
                    transition-colors duration-150 hover:bg-black/[0.04]"
                  style={{
                    fontWeight: cat.accent ? 600 : 400,
                    color: cat.accent ? '#D97706' : '#666',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Center — Search trigger */}
          <div className="flex-1 flex justify-center mx-4 max-w-[280px]">
            <SearchTrigger onClick={() => setSearchOpen(true)} className="w-full" />
          </div>

          {/* Right — Account, Messages, Wishlist, Cart */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Link
              href={session?.user ? '/profile' : '/auth/signin'}
              onClick={handleNavClick(session?.user ? '/profile' : '/auth/signin')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                transition-colors duration-150 hover:bg-black/[0.04]"
            >
              <User className="w-[18px] h-[18px]" style={{ color: '#666' }} />
              <span className="text-[12px]" style={{ color: '#666' }}>
                {session?.user ? 'Konto' : 'Anmelden'}
              </span>
            </Link>
            {session?.user && (
              <Link
                href="/messages"
                onClick={handleNavClick('/messages')}
                className="relative flex items-center px-2.5 py-1.5 rounded-lg
                  transition-colors duration-150 hover:bg-black/[0.04]"
              >
                <div className="relative">
                  <MessageCircle className="w-[18px] h-[18px]" style={{ color: '#666' }} />
                  {unreadMsgs > 0 && (
                    <div
                      className="absolute flex items-center justify-center text-white font-bold"
                      style={{
                        top: -4, right: -6,
                        minWidth: 14, height: 14, borderRadius: 10,
                        background: '#D97706',
                        fontSize: 8, padding: '0 3px',
                      }}
                    >
                      {unreadMsgs > 99 ? '99+' : unreadMsgs}
                    </div>
                  )}
                </div>
              </Link>
            )}
            {session?.user && (
              <NotificationBell
                apiBase="/api/notifications"
                viewAllHref="/notifications"
                showLabel={false}
                color="#666666"
              />
            )}
            <Link
              href="/wishlist"
              onClick={handleNavClick('/wishlist')}
              className="flex items-center px-2.5 py-1.5 rounded-lg
                transition-colors duration-150 hover:bg-black/[0.04]"
            >
              <Heart className="w-[18px] h-[18px]" style={{ color: '#666' }} />
            </Link>
            <Link
              href="/cart"
              onClick={handleNavClick('/cart')}
              className="relative flex items-center px-2.5 py-1.5 rounded-lg
                transition-colors duration-150 hover:bg-black/[0.04]"
            >
              <div className="relative">
                <ShoppingBag className="w-[18px] h-[18px]" style={{ color: '#666' }} />
                <div
                  className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full
                    flex items-center justify-center text-[8px] font-bold"
                  style={{ background: '#D97706', color: '#FFFFFF' }}
                >
                  0
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* ── Mega menu ───────────────────────────────────── */}
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.2)' }}
              onClick={() => setMenuOpen(false)}
            />
            <div
              className="absolute left-0 right-0 z-50"
              style={{
                background: '#FFFFFF',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
              }}
            >
              <div className="max-w-7xl mx-auto px-12 py-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-bold" style={{ color: '#1A1A1A' }}>
                    Alle Kategorien
                  </h3>
                  <button onClick={() => setMenuOpen(false)} style={{ color: '#999' }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-7">
                  {allCategories.map((group) => (
                    <div key={group.group}>
                      <h4
                        className="text-[10px] font-bold uppercase mb-3"
                        style={{ letterSpacing: '0.08em', color: '#D97706' }}
                      >
                        {group.group}
                      </h4>
                      <div className="space-y-2">
                        {group.items.map((item, i) => (
                          <button
                            key={`${item.id}-${i}`}
                            onClick={() => handleCategoryClick(item.id)}
                            className="block text-[13px] w-full text-left transition-colors duration-150
                              hover:text-[#D97706]"
                            style={{ color: '#555' }}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <Link
                    href="/categories"
                    onClick={(e) => { e.preventDefault(); setMenuOpen(false); navigateTo('/categories') }}
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold
                      transition-opacity hover:opacity-70"
                    style={{ color: '#D97706' }}
                  >
                    <Grid3X3 className="w-3 h-3" />
                    Alle Kategorien entdecken
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Search overlay (portal) */}
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}

// ─── Export (Suspense required for useSearchParams inside child components) ───

export default function NavHeader() {
  return <Suspense fallback={null}><NavHeaderInner /></Suspense>
}
