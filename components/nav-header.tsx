"use client"

import { useState, Suspense } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShoppingBag, User, Heart, Play, Menu, MapPin, X } from 'lucide-react'
import { usePageTransition } from '@/lib/page-transition-context'
import { SearchExperience } from '@/components/storefront/SearchExperience'

// ─── Category data ────────────────────────────────────────────────────────────

const navCategories = [
  { id: 'all',              label: 'Neuheiten'    },
  { id: 'bestseller',       label: 'Bestseller'   },
  { id: 'sale',             label: 'Angebote', amber: true, fire: true },
  { id: 'technik',          label: 'Technik'      },
  { id: 'haushalt',         label: 'Haus & Küche' },
  { id: 'Oberbekleidung',   label: 'Mode'         },
  { id: 'beauty',           label: 'Beauty'       },
  { id: 'Sportbekleidung',  label: 'Sport'        },
  { id: 'spielzeug',        label: 'Spielzeug'    },
  { id: 'auto',             label: 'Auto'         },
  { id: 'buero',            label: 'Büro'         },
]

const allCategories = [
  { group: 'Technik & Elektronik', items: [
    { id: 'technik', label: 'Smartphones & Tablets' },
    { id: 'technik', label: 'Laptops & Computer' },
    { id: 'technik', label: 'Audio & Kopfhörer' },
    { id: 'technik', label: 'Kameras & Foto' },
  ]},
  { group: 'Mode & Schuhe', items: [
    { id: 'Oberbekleidung', label: 'Damen Mode' },
    { id: 'Kleid',          label: 'Kleider & Röcke' },
    { id: 'Schuhe',         label: 'Schuhe & Sneaker' },
    { id: 'Accessoires',    label: 'Schmuck & Uhren' },
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
  const pathname = usePathname()
  const router = useRouter()
  const { navigateTo } = usePageTransition()
  const [menuOpen, setMenuOpen] = useState(false)

  // Hide on auth / seller / onboarding / reels paths
  const hiddenPaths = ['/onboarding', '/auth', '/seller', '/reels']
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
    <header className="sticky top-0 z-50 hidden md:block">

      {/* ── Layer 1 (56px) — Dark commerce bar ─────────── */}
      <div
        className="flex items-center justify-between px-[32px] lg:px-[48px]"
        style={{ height: '56px', background: '#131921', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Logo + delivery location */}
        <div className="flex items-center gap-[14px] flex-shrink-0">
          <Link href="/" onClick={handleNavClick('/')}>
            <span
              className="text-[20px] uppercase font-bold"
              style={{ letterSpacing: '0.1em', color: '#FFFFFF' }}
            >
              WEARO
            </span>
          </Link>
          <div
            className="flex items-center gap-[5px] cursor-pointer pl-[10px]"
            style={{ borderLeft: '1px solid rgba(255,255,255,0.1)' }}
          >
            <MapPin className="w-[13px] h-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }} />
            <div className="leading-tight">
              <span className="text-[9px] block" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Liefern nach
              </span>
              <span className="text-[11px] font-bold block" style={{ color: '#FFFFFF' }}>
                Deutschland
              </span>
            </div>
          </div>
        </div>

        {/* ── SearchExperience (replaces the old static form) ── */}
        <SearchExperience className="flex-1 mx-[20px] lg:mx-[28px]" />

        {/* Right — Account, Wishlist, Cart */}
        <div className="flex items-center gap-[14px] flex-shrink-0">
          <Link
            href="/profile"
            onClick={handleNavClick('/profile')}
            className="flex flex-col items-center"
            style={{ color: 'rgba(255,255,255,0.65)', transition: 'color 150ms' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
          >
            <User className="w-[20px] h-[20px]" />
            <span className="text-[10px] mt-[1px]">Konto</span>
          </Link>
          <Link
            href="/wishlist"
            onClick={handleNavClick('/wishlist')}
            className="flex flex-col items-center"
            style={{ color: 'rgba(255,255,255,0.65)', transition: 'color 150ms' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
          >
            <Heart className="w-[20px] h-[20px]" />
            <span className="text-[10px] mt-[1px]">Merkliste</span>
          </Link>
          <Link
            href="/cart"
            onClick={handleNavClick('/cart')}
            className="relative flex flex-col items-center"
            style={{ color: 'rgba(255,255,255,0.65)', transition: 'color 150ms' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
          >
            <div className="relative">
              <ShoppingBag className="w-[20px] h-[20px]" />
              <div
                className="absolute -top-[5px] -right-[7px] w-[16px] h-[16px] rounded-full
                  flex items-center justify-center text-[9px] font-bold"
                style={{ background: '#D97706', color: '#FFFFFF' }}
              >
                0
              </div>
            </div>
            <span className="text-[10px] mt-[1px]">Warenkorb</span>
          </Link>
        </div>
      </div>

      {/* ── Layer 2 (36px) — Category nav bar ──────────── */}
      <div
        className="flex items-center px-[32px] lg:px-[48px] overflow-x-auto hide-scrollbar"
        style={{
          height: '36px',
          background: 'rgba(35,47,62,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-[5px] whitespace-nowrap flex-shrink-0 mr-[16px] py-[6px]"
          style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '13px', transition: 'opacity 150ms' }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <Menu className="w-[15px] h-[15px]" /> Alle
        </button>
        <div className="flex gap-[14px] overflow-x-auto hide-scrollbar">
          {navCategories.map((cat) => (
            <button
              key={`${cat.id}-${cat.label}`}
              onClick={() => handleCategoryClick(cat.id)}
              className="text-[13px] whitespace-nowrap py-[8px]"
              style={{
                fontWeight: cat.amber ? 700 : 400,
                color: cat.amber ? '#FEBD69' : 'rgba(255,255,255,0.85)',
                transition: 'color 150ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = cat.amber ? '#FFD89B' : '#FFFFFF'
                e.currentTarget.style.textDecoration = 'underline'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = cat.amber ? '#FEBD69' : 'rgba(255,255,255,0.85)'
                e.currentTarget.style.textDecoration = 'none'
              }}
            >
              {cat.fire && '🔥 '}{cat.label}
            </button>
          ))}
          <button
            onClick={() => navigateTo('/reels')}
            className="flex items-center gap-[3px] whitespace-nowrap text-[12px] py-[8px] ml-[4px]"
            style={{ color: 'rgba(255,255,255,0.35)', transition: 'color 150ms' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
          >
            <Play className="w-[10px] h-[10px]" style={{ fill: 'currentColor' }} /> Reels
          </button>
        </div>
      </div>

      {/* ── Mega menu ───────────────────────────────────── */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="absolute left-0 right-0 z-50"
            style={{
              background: '#FFFFFF',
              borderBottom: '1px solid #E0E0E0',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }}
          >
            <div className="max-w-7xl mx-auto px-[48px] py-[24px]">
              <div className="flex items-center justify-between mb-[18px]">
                <h3 className="text-[15px] font-bold" style={{ color: '#1A1A1A' }}>
                  Alle Kategorien
                </h3>
                <button onClick={() => setMenuOpen(false)} style={{ color: '#999' }}>
                  <X className="w-[16px] h-[16px]" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-[28px]">
                {allCategories.map((group) => (
                  <div key={group.group}>
                    <h4
                      className="text-[11px] font-bold uppercase mb-[12px]"
                      style={{ letterSpacing: '0.06em', color: '#D97706' }}
                    >
                      {group.group}
                    </h4>
                    <div className="space-y-[8px]">
                      {group.items.map((item, i) => (
                        <button
                          key={`${item.id}-${i}`}
                          onClick={() => handleCategoryClick(item.id)}
                          className="block text-[13px] w-full text-left"
                          style={{ color: '#555', transition: 'color 150ms' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#D97706')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  )
}

// ─── Export (Suspense required for useSearchParams inside SearchExperience) ───

export default function NavHeader() {
  return <Suspense fallback={null}><NavHeaderInner /></Suspense>
}
