"use client"

/**
 * Seller Sidebar — Simplified MVP Navigation
 *
 * 7 focused items matching the storefront SaaS model:
 *   Übersicht, Bestellungen, Produkte, Mein Shop,
 *   Statistiken, Auszahlungen, Einstellungen
 *
 * Bottom: Support, Logout, Collapse
 */

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutGrid, PackageSearch, Truck, Store,
  Wallet, ChevronLeft, ChevronRight,
  LogOut, Headphones, Settings, ExternalLink,
  FileText, Palette, Megaphone,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  icon: LucideIcon
  label: string
  href: string
  external?: boolean
}

export default function SellerSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id

  const [isExpanded, setIsExpanded] = useState(true)
  const [shopName, setShopName] = useState('Mein Shop')
  const [shopSlug, setShopSlug] = useState<string | null>(null)
  const [isApprovedSeller, setIsApprovedSeller] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('wearo-sidebar-expanded')
      if (saved !== null) setIsExpanded(saved === 'true')
    } catch {}
  }, [])

  useEffect(() => {
    if (userId) checkSellerStatus()
    else setCheckingAuth(false)
  }, [userId])

  const checkSellerStatus = async () => {
    try {
      const response = await fetch('/api/seller/settings')
      const data = await response.json()
      const isOk = response.ok && data.seller &&
        ['active', 'approved'].includes(data.seller.status)
      if (isOk) {
        setIsApprovedSeller(true)
        setShopName(data.seller.shop_name || 'Mein Shop')
        setShopSlug(data.seller.shop_slug || null)
      } else {
        setIsApprovedSeller(false)
      }
    } catch {
      setIsApprovedSeller(false)
    } finally {
      setCheckingAuth(false)
    }
  }

  const toggleSidebar = () => {
    const next = !isExpanded
    setIsExpanded(next)
    try { localStorage.setItem('wearo-sidebar-expanded', String(next)) } catch {}
    window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { expanded: next } }))
  }

  const checkActive = (href: string) => {
    if (href.startsWith('http') || href.startsWith('/')) {
      // For external links or storefront links, never active
      if (!href.startsWith('/seller')) return false
    }
    return pathname === href || (pathname?.startsWith(href + '/') && href !== '/seller/dashboard')
  }

  if (checkingAuth || !isApprovedSeller) return null

  // Build nav items — "Mein Shop" links to the storefront
  const storeHref = shopSlug ? `/${shopSlug}` : `/shop/${userId}`

  const NAV_ITEMS: NavItem[] = [
    { icon: LayoutGrid, label: 'Übersicht', href: '/seller/dashboard' },
    { icon: PackageSearch, label: 'Produkte', href: '/seller/products' },
    { icon: Truck, label: 'Bestellungen', href: '/seller/orders' },
    { icon: FileText, label: 'Inhalte', href: '/seller/posts' },
    { icon: Palette, label: 'Design', href: '/seller/settings' },
    { icon: Megaphone, label: 'Marketing', href: '/seller/ads' },
    { icon: Wallet, label: 'Auszahlungen', href: '/seller/payouts' },
    { icon: Settings, label: 'Einstellungen', href: '/seller/settings' },
  ]

  return (
    <aside
      className="fixed left-0 top-0 h-screen z-50 flex flex-col transition-all duration-300 ease-in-out"
      style={{
        width: isExpanded ? '240px' : '72px',
        background: '#131921',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* ── Shop Header ──────────────────────────────────────── */}
      <div
        className={`flex items-center gap-3 p-4 ${isExpanded ? '' : 'justify-center'}`}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#D97706' }}>
            <span className="text-white font-bold text-sm">{shopName.charAt(0).toUpperCase()}</span>
          </div>
          <div
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
            style={{ border: '2px solid #131921', background: '#22C55E' }}
          />
        </div>
        {isExpanded && (
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[13px] truncate" style={{ color: '#FFFFFF' }}>{shopName}</p>
            <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>Aktiver Händler</p>
          </div>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5 hide-scrollbar">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = checkActive(item.href)
          const isSettings = item.href === '/seller/settings'

          const handleClick = (e: React.MouseEvent) => {
            if (isSettings) {
              e.preventDefault()
              window.dispatchEvent(new CustomEvent('open-settings-drawer'))
            }
          }

          const linkProps = item.external
            ? { target: '_blank' as const, rel: 'noopener noreferrer' }
            : {}

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleClick}
              {...linkProps}
              className={`group relative flex items-center gap-3 rounded-lg transition-all duration-200 ${
                isExpanded ? 'px-3 py-2.5' : 'p-2.5 justify-center'
              }`}
              style={active ? {
                background: 'rgba(217,119,6,0.12)',
                borderLeft: '3px solid #D97706',
              } : undefined}
              title={isExpanded ? undefined : item.label}
            >
              <Icon
                className="w-[18px] h-[18px] flex-shrink-0"
                style={{ color: active ? '#D97706' : 'rgba(255,255,255,0.5)' }}
              />
              {isExpanded && (
                <span
                  className="text-[13px] truncate flex-1"
                  style={{ color: active ? '#FFFFFF' : 'rgba(255,255,255,0.6)', fontWeight: active ? 600 : 400 }}
                >
                  {item.label}
                </span>
              )}
              {isExpanded && item.external && (
                <ExternalLink className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }} />
              )}
              {/* Tooltip for collapsed state */}
              {!isExpanded && (
                <span
                  className="absolute left-full ml-3 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60]"
                  style={{ background: '#232F3E', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── Bottom Items ─────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="p-2 space-y-0.5">
        {/* Support */}
        <Link
          href="/seller/support"
          className={`flex items-center gap-3 rounded-lg transition-all ${
            isExpanded ? 'px-3 py-2' : 'p-2.5 justify-center'
          }`}
          style={{ color: checkActive('/seller/support') ? '#D97706' : 'rgba(255,255,255,0.4)' }}
        >
          <Headphones className="w-[16px] h-[16px]" />
          {isExpanded && <span className="text-[12px]">Support</span>}
        </Link>

        {/* Logout */}
        <button
          onClick={() => router.push('/api/auth/signout')}
          className={`w-full flex items-center gap-3 rounded-lg transition-all ${
            isExpanded ? 'px-3 py-2' : 'p-2.5 justify-center'
          }`}
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          <LogOut className="w-[16px] h-[16px]" />
          {isExpanded && <span className="text-[12px]">Abmelden</span>}
        </button>

        {/* Collapse */}
        <button
          onClick={toggleSidebar}
          className={`w-full flex items-center gap-3 rounded-lg transition-all ${
            isExpanded ? 'px-3 py-2' : 'p-2.5 justify-center'
          }`}
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          {isExpanded ? <ChevronLeft className="w-[16px] h-[16px]" /> : <ChevronRight className="w-[16px] h-[16px]" />}
          {isExpanded && <span className="text-[12px]">Einklappen</span>}
        </button>
      </div>
    </aside>
  )
}
