"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutGrid, PackageSearch, Truck, Brain, Megaphone, Star,
  BarChart3, Banknote, Palette, ChevronLeft, ChevronRight,
  LogOut, Headphones, FileText, ShieldCheck, Settings,
  ChevronDown
} from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import type { LucideIcon } from 'lucide-react'

interface MenuItem {
  icon: LucideIcon
  label: string
  href: string
}

interface MenuSection {
  id: string
  title: string
  items: MenuItem[]
}

const SECTIONS: MenuSection[] = [
  {
    id: 'main',
    title: 'HAUPTMENÜ',
    items: [
      { icon: LayoutGrid, label: 'Übersicht', href: '/seller/dashboard' },
      { icon: PackageSearch, label: 'Produkte', href: '/seller/products' },
      { icon: Truck, label: 'Bestellungen', href: '/seller/orders' },
      { icon: Brain, label: 'Lagerbestand', href: '/seller/inventory' },
      { icon: Megaphone, label: 'Kampagnen', href: '/seller/campaigns' },
      { icon: Star, label: 'Bewertungen', href: '/seller/reviews' },
    ]
  },
  {
    id: 'analytics',
    title: 'ANALYSE',
    items: [
      { icon: BarChart3, label: 'Performance', href: '/seller/analytics' },
      { icon: Banknote, label: 'Finanzen', href: '/seller/finances' },
      { icon: Palette, label: 'Werbung', href: '/seller/ads' },
    ]
  },
  {
    id: 'settings',
    title: 'EINSTELLUNGEN',
    items: [
      { icon: Settings, label: 'Einstellungen', href: '/seller/settings' },
    ]
  },
]

const bottomItems = [
  { icon: Headphones, label: 'Support', href: '/seller/support' },
  { icon: FileText, label: 'Dokumente', href: '/seller/tax' },
  { icon: ShieldCheck, label: 'Verifizierung', href: '/seller/score' },
]

export default function SellerSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const router = useRouter()
  const { t } = useLanguage()
  const userId = session?.user?.id

  const [isExpanded, setIsExpanded] = useState(true)
  const [shopName, setShopName] = useState('Mein Shop')
  const [isApprovedSeller, setIsApprovedSeller] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

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
      const response = await fetch('/api/seller/settings', { headers: { 'x-user-id': userId! } })
      const data = await response.json()
      if (response.ok && data.seller && data.seller.status === 'approved') {
        setIsApprovedSeller(true)
        setShopName(data.seller.shop_name || 'Mein Shop')
      } else {
        setIsApprovedSeller(false)
        router.push('/')
      }
    } catch {
      setIsApprovedSeller(false)
      router.push('/')
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

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  const checkActive = (href: string) => {
    if (href.includes('#')) return pathname === href.split('#')[0]
    return pathname === href || (pathname?.startsWith(href + '/') && href !== '/seller/dashboard')
  }

  if (checkingAuth || !isApprovedSeller) return null

  return (
    <aside
      className="fixed left-0 top-0 h-screen z-50 flex flex-col transition-all duration-300 ease-in-out"
      style={{
        width: isExpanded ? '240px' : '72px',
        background: '#131921',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Shop Header */}
      <div className={`flex items-center gap-3 p-4 ${isExpanded ? '' : 'justify-center'}`}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#D97706' }}>
            <span className="text-white font-bold text-sm">{shopName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
            style={{ border: '2px solid #131921', background: '#22C55E' }} />
        </div>
        {isExpanded && (
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[13px] truncate" style={{ color: '#FFFFFF' }}>{shopName}</p>
            <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>Aktiver Händler</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 hide-scrollbar">
        {SECTIONS.map((section) => {
          const collapsed = collapsedSections.has(section.id)
          return (
            <div key={section.id} className="mb-1">
              {isExpanded ? (
                <button onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-4 py-2 group">
                  <span className="text-[10px] font-bold tracking-widest uppercase"
                    style={{ color: 'rgba(255,255,255,0.3)' }}>{section.title}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
                    style={{ color: 'rgba(255,255,255,0.2)' }} />
                </button>
              ) : (
                <div className="mx-3 my-2 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              )}

              {!collapsed && (
                <div className="space-y-0.5 px-2">
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const active = checkActive(item.href)
                    const isSettings = item.href === '/seller/settings'

                    const handleClick = (e: React.MouseEvent) => {
                      if (isSettings) {
                        e.preventDefault()
                        window.dispatchEvent(new CustomEvent('open-settings-drawer'))
                      }
                    }

                    return (
                      <Link key={item.href} href={item.href} onClick={handleClick}
                        className={`group relative flex items-center gap-3 rounded-lg transition-all duration-200 ${
                          isExpanded ? 'px-3 py-2' : 'p-2.5 justify-center'
                        }`}
                        style={active ? {
                          background: 'rgba(217,119,6,0.12)',
                          borderLeft: '3px solid #D97706',
                        } : undefined}
                        title={isExpanded ? undefined : item.label}
                      >
                        <Icon className="w-[18px] h-[18px] flex-shrink-0"
                          style={{ color: active ? '#D97706' : 'rgba(255,255,255,0.5)' }} />
                        {isExpanded && (
                          <span className="text-[13px] truncate"
                            style={{ color: active ? '#FFFFFF' : 'rgba(255,255,255,0.6)', fontWeight: active ? 600 : 400 }}>
                            {item.label}
                          </span>
                        )}
                        {!isExpanded && (
                          <span className="absolute left-full ml-3 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60]"
                            style={{ background: '#232F3E', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {item.label}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Bottom Items */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="p-2 space-y-0.5">
        {bottomItems.map((item) => {
          const Icon = item.icon
          const active = checkActive(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 rounded-lg transition-all ${
                isExpanded ? 'px-3 py-2' : 'p-2.5 justify-center'
              }`}
              style={{ color: active ? '#D97706' : 'rgba(255,255,255,0.4)' }}
            >
              <Icon className="w-[16px] h-[16px]" />
              {isExpanded && <span className="text-[12px]">{item.label}</span>}
            </Link>
          )
        })}

        {/* Logout */}
        <button onClick={() => router.push('/api/auth/signout')}
          className={`w-full flex items-center gap-3 rounded-lg transition-all ${
            isExpanded ? 'px-3 py-2' : 'p-2.5 justify-center'
          }`}
          style={{ color: 'rgba(255,255,255,0.3)' }}>
          <LogOut className="w-[16px] h-[16px]" />
          {isExpanded && <span className="text-[12px]">Abmelden</span>}
        </button>

        {/* Collapse */}
        <button onClick={toggleSidebar}
          className={`w-full flex items-center gap-3 rounded-lg transition-all ${
            isExpanded ? 'px-3 py-2' : 'p-2.5 justify-center'
          }`}
          style={{ color: 'rgba(255,255,255,0.3)' }}>
          {isExpanded ? <ChevronLeft className="w-[16px] h-[16px]" /> : <ChevronRight className="w-[16px] h-[16px]" />}
          {isExpanded && <span className="text-[12px]">Einklappen</span>}
        </button>
      </div>
    </aside>
  )
}
