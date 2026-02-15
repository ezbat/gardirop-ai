"use client"

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutGrid, Radio, Bell,
  PackageSearch, Truck, Brain, Calculator,
  Megaphone, FlaskConical, Radar, Share2,
  BarChart3, Users, Filter, Target,
  Banknote, ArrowDownToLine, Receipt, FileText,
  Star, Trophy, Shield, Scale,
  Palette, UserCog, Plug, Lock,
  ChevronLeft, ChevronRight, LogOut,
  ChevronDown, Moon, Sun
} from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import { useTheme } from 'next-themes'
import type { LucideIcon } from 'lucide-react'

interface MenuItem {
  icon: LucideIcon
  labelKey: string
  fallback: string
  href: string
  color: string
}

interface MenuSection {
  id: string
  titleKey: string
  fallback: string
  items: MenuItem[]
}

const SECTIONS: MenuSection[] = [
  {
    id: 'core',
    titleKey: 'sidebarCore',
    fallback: 'CORE',
    items: [
      { icon: LayoutGrid, labelKey: 'commandCenter', fallback: 'Command Center', href: '/seller/dashboard', color: 'oklch(0.78 0.14 85)' },
      { icon: Radio, labelKey: 'liveOverview', fallback: 'Live Overview', href: '/seller/dashboard#live', color: 'oklch(0.72 0.19 145)' },
      { icon: Bell, labelKey: 'notificationsHub', fallback: 'Notifications', href: '/seller/notifications', color: 'oklch(0.65 0.15 250)' },
    ]
  },
  {
    id: 'business',
    titleKey: 'sidebarBusiness',
    fallback: 'BUSINESS',
    items: [
      { icon: PackageSearch, labelKey: 'productsIntelligence', fallback: 'Products', href: '/seller/products', color: 'oklch(0.55 0.2 300)' },
      { icon: Truck, labelKey: 'ordersFulfillment', fallback: 'Orders', href: '/seller/orders', color: 'oklch(0.7 0.18 55)' },
      { icon: Brain, labelKey: 'inventoryBrain', fallback: 'Inventory', href: '/seller/inventory', color: 'oklch(0.65 0.15 250)' },
      { icon: Calculator, labelKey: 'pricingEngine', fallback: 'Pricing', href: '/seller/pricing', color: 'oklch(0.65 0.15 250)' },
    ]
  },
  {
    id: 'growth',
    titleKey: 'sidebarGrowth',
    fallback: 'GROWTH',
    items: [
      { icon: Megaphone, labelKey: 'adsBoost', fallback: 'Ads & Boost', href: '/seller/ads', color: 'oklch(0.55 0.2 300)' },
      { icon: FlaskConical, labelKey: 'campaignLab', fallback: 'Campaigns', href: '/seller/campaigns', color: 'oklch(0.55 0.2 300)' },
      { icon: Radar, labelKey: 'trendRadar', fallback: 'Trends', href: '/seller/trends', color: 'oklch(0.55 0.2 300)' },
      { icon: Share2, labelKey: 'socialCommerce', fallback: 'Social', href: '/seller/social', color: 'oklch(0.55 0.2 300)' },
    ]
  },
  {
    id: 'insights',
    titleKey: 'sidebarInsights',
    fallback: 'INSIGHTS',
    items: [
      { icon: BarChart3, labelKey: 'salesAnalytics', fallback: 'Analytics', href: '/seller/analytics', color: 'oklch(0.65 0.15 250)' },
      { icon: Users, labelKey: 'customerIntelligence', fallback: 'Customers', href: '/seller/customers', color: 'oklch(0.65 0.15 250)' },
      { icon: Filter, labelKey: 'funnelAnalysis', fallback: 'Funnel', href: '/seller/funnel', color: 'oklch(0.65 0.15 250)' },
      { icon: Target, labelKey: 'marketBenchmark', fallback: 'Benchmark', href: '/seller/benchmark', color: 'oklch(0.65 0.15 250)' },
    ]
  },
  {
    id: 'finance',
    titleKey: 'sidebarFinance',
    fallback: 'FINANCE',
    items: [
      { icon: Banknote, labelKey: 'revenueCenter', fallback: 'Revenue', href: '/seller/finances', color: 'oklch(0.72 0.19 145)' },
      { icon: ArrowDownToLine, labelKey: 'payouts', fallback: 'Payouts', href: '/seller/withdraw', color: 'oklch(0.72 0.19 145)' },
      { icon: Receipt, labelKey: 'feesCommissions', fallback: 'Fees', href: '/seller/fees', color: 'oklch(0.72 0.19 145)' },
      { icon: FileText, labelKey: 'taxInvoices', fallback: 'Tax', href: '/seller/tax', color: 'oklch(0.72 0.19 145)' },
    ]
  },
  {
    id: 'trust',
    titleKey: 'sidebarTrust',
    fallback: 'TRUST & QUALITY',
    items: [
      { icon: Star, labelKey: 'reviewsRatings', fallback: 'Reviews', href: '/seller/reviews', color: 'oklch(0.82 0.17 85)' },
      { icon: Trophy, labelKey: 'sellerScore', fallback: 'Score', href: '/seller/score', color: 'oklch(0.78 0.14 85)' },
      { icon: Shield, labelKey: 'policyCenter', fallback: 'Policies', href: '/seller/policies', color: 'oklch(0.82 0.17 85)' },
      { icon: Scale, labelKey: 'disputeResolution', fallback: 'Disputes', href: '/seller/disputes', color: 'oklch(0.82 0.17 85)' },
    ]
  },
  {
    id: 'settings',
    titleKey: 'sidebarSettings',
    fallback: 'SETTINGS',
    items: [
      { icon: Palette, labelKey: 'brandSettings', fallback: 'Brand', href: '/seller/settings', color: 'oklch(0.55 0.03 260)' },
      { icon: UserCog, labelKey: 'teamRoles', fallback: 'Team', href: '/seller/team', color: 'oklch(0.55 0.03 260)' },
      { icon: Plug, labelKey: 'apiIntegrations', fallback: 'Integrations', href: '/seller/integrations', color: 'oklch(0.55 0.03 260)' },
      { icon: Lock, labelKey: 'securityLabel', fallback: 'Security', href: '/seller/security', color: 'oklch(0.55 0.03 260)' },
    ]
  },
]

export default function SellerSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const router = useRouter()
  const { t } = useLanguage()
  const { theme, setTheme } = useTheme()
  const userId = session?.user?.id

  const [isExpanded, setIsExpanded] = useState(true)
  const [shopName, setShopName] = useState('Mein Shop')
  const [isApprovedSeller, setIsApprovedSeller] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  // Load saved sidebar state
  useEffect(() => {
    try {
      const saved = localStorage.getItem('wearo-sidebar-expanded')
      if (saved !== null) setIsExpanded(saved === 'true')
    } catch {}
  }, [])

  // Check seller status
  useEffect(() => {
    if (userId) {
      checkSellerStatus()
    } else {
      setCheckingAuth(false)
    }
  }, [userId])

  const checkSellerStatus = async () => {
    try {
      const response = await fetch('/api/seller/settings', {
        headers: { 'x-user-id': userId! }
      })
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
      className={`fixed left-0 top-0 h-screen ${isExpanded ? 'w-64' : 'w-20'} seller-sidebar-glass z-50 flex flex-col transition-all duration-300 ease-in-out`}
    >
      {/* Shop Header */}
      <div className={`flex items-center gap-3 p-4 border-b border-white/[0.06] ${isExpanded ? '' : 'justify-center'}`}>
        <div className="relative flex-shrink-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'oklch(0.78 0.14 85)' }}
          >
            <span className="text-white font-bold text-lg">{shopName.charAt(0).toUpperCase()}</span>
          </div>
          <div
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
            style={{ border: '2px solid oklch(0.06 0.02 260)', background: 'oklch(0.72 0.19 145)' }}
          />
        </div>
        {isExpanded && (
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{shopName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{session?.user?.email}</p>
          </div>
        )}
      </div>

      {/* Seller Score Mini Badge */}
      {isExpanded && (
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <Link href="/seller/score" className="flex items-center gap-2 group">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4" style={{ color: 'oklch(0.78 0.14 85)' }} />
              <span className="text-xs font-semibold" style={{ color: 'oklch(0.78 0.14 85)' }}>78</span>
            </div>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'oklch(0.2 0.02 260)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: '78%', background: 'linear-gradient(90deg, oklch(0.78 0.14 85), oklch(0.72 0.19 145))' }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">Gold</span>
          </Link>
        </div>
      )}

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 hide-scrollbar">
        {SECTIONS.map((section) => {
          const isSectionCollapsed = collapsedSections.has(section.id)

          return (
            <div key={section.id} className="mb-1">
              {/* Section Header */}
              {isExpanded ? (
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-4 py-2 group"
                >
                  <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground group-hover:text-foreground/70 transition-colors">
                    {(t as any)(section.titleKey) || section.fallback}
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${isSectionCollapsed ? '-rotate-90' : ''}`}
                  />
                </button>
              ) : (
                <div className="mx-3 my-2 h-px" style={{ background: 'oklch(0.18 0.02 260)' }} />
              )}

              {/* Section Items */}
              {!isSectionCollapsed && (
                <div className="space-y-0.5 px-2">
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const active = checkActive(item.href)
                    const label = (t as any)(item.labelKey) || item.fallback

                    // Settings items open the drawer instead of navigating
                    const isSettingsItem = item.href === '/seller/settings'

                    const handleClick = (e: React.MouseEvent) => {
                      if (isSettingsItem) {
                        e.preventDefault()
                        window.dispatchEvent(new CustomEvent('open-settings-drawer'))
                      }
                    }

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={handleClick}
                        className={`group relative flex items-center gap-3 rounded-xl transition-all duration-200 ${
                          isExpanded ? 'px-3 py-2.5' : 'p-3 justify-center'
                        } ${active ? '' : 'hover:bg-white/[0.04]'}`}
                        style={active ? {
                          background: 'oklch(0.16 0.03 260)',
                          borderLeft: `3px solid ${item.color}`,
                          boxShadow: `inset 4px 0 12px -4px color-mix(in oklch, ${item.color} 40%, transparent)`,
                        } : undefined}
                        title={isExpanded ? undefined : label}
                      >
                        <Icon
                          className="w-[18px] h-[18px] flex-shrink-0 transition-colors"
                          style={{ color: active ? item.color : undefined }}
                        />
                        {isExpanded && (
                          <span className={`text-sm truncate transition-colors ${
                            active ? 'font-semibold text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                          }`}>
                            {label}
                          </span>
                        )}

                        {/* Tooltip for collapsed mode */}
                        {!isExpanded && (
                          <span
                            className="absolute left-full ml-3 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60]"
                            style={{ background: 'oklch(0.14 0.02 260)', color: 'oklch(0.95 0.01 85)', border: '1px solid oklch(0.22 0.02 260)' }}
                          >
                            {label}
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

      {/* Bottom Controls */}
      <div className="border-t border-white/[0.06] p-3 space-y-1">
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`w-full flex items-center gap-3 rounded-xl transition-all hover:bg-white/[0.04] ${isExpanded ? 'px-3 py-2' : 'p-3 justify-center'}`}
        >
          {theme === 'dark' ? (
            <Sun className="w-[18px] h-[18px] text-muted-foreground" />
          ) : (
            <Moon className="w-[18px] h-[18px] text-muted-foreground" />
          )}
          {isExpanded && <span className="text-sm text-muted-foreground">{theme === 'dark' ? 'Light' : 'Dark'}</span>}
        </button>

        {/* Logout */}
        <button
          onClick={() => router.push('/api/auth/signout')}
          className={`w-full flex items-center gap-3 rounded-xl transition-all hover:bg-red-500/10 ${isExpanded ? 'px-3 py-2' : 'p-3 justify-center'}`}
        >
          <LogOut className="w-[18px] h-[18px]" style={{ color: 'oklch(0.63 0.24 25)' }} />
          {isExpanded && <span className="text-sm" style={{ color: 'oklch(0.63 0.24 25)' }}>{(t as any)('logout') || 'Abmelden'}</span>}
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={toggleSidebar}
          className={`w-full flex items-center gap-3 rounded-xl transition-all hover:bg-white/[0.04] ${isExpanded ? 'px-3 py-2' : 'p-3 justify-center'}`}
        >
          {isExpanded ? (
            <>
              <ChevronLeft className="w-[18px] h-[18px] text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{(t as any)('collapseSidebar') || 'Einklappen'}</span>
            </>
          ) : (
            <ChevronRight className="w-[18px] h-[18px] text-muted-foreground" />
          )}
        </button>
      </div>
    </aside>
  )
}
