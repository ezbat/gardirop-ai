"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/language-context"
import Link from "next/link"
import {
  Banknote, Clock, ShoppingCart, Megaphone, ShieldAlert, Heart,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Package, AlertTriangle, Plus, Eye, Truck, Settings as SettingsIcon,
  Store, Headphones, RefreshCw, Sparkles, Users as UsersIcon, Star,
  Activity, Zap, ChevronRight, ExternalLink
} from "lucide-react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts'

// ─── TYPES ─────────────────────────────────────────────
interface KPIData {
  label: string
  value: string | number
  change: number
  changeLabel: string
  icon: any
  color: string
  bgColor: string
  isLive?: boolean
  tooltip: string
}

interface LiveEvent {
  id: number
  icon: string
  text: string
  time: string
  color: string
}

interface HealthCategory {
  label: string
  score: number
  color: string
  max: number
}

// ─── ANIMATED COUNTER HOOK ────────────────────────────
function useCountUp(end: number, duration = 1200) {
  const [count, setCount] = useState(0)
  const prevEnd = useRef(end)

  useEffect(() => {
    if (end === 0) { setCount(0); return }
    const start = prevEnd.current !== end ? 0 : count
    prevEnd.current = end
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      setCount(Math.round(start + (end - start) * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [end, duration])

  return count
}

// ─── KPI CARD COMPONENT ──────────────────────────────
function KPICard({ data, index }: { data: KPIData; index: number }) {
  const Icon = data.icon
  const isPositive = data.change >= 0
  const numValue = typeof data.value === 'number' ? data.value : parseFloat(String(data.value).replace(/[^0-9.]/g, '')) || 0
  const animatedValue = useCountUp(numValue)

  const displayValue = typeof data.value === 'string' && data.value.includes('\u20AC')
    ? `\u20AC${animatedValue.toLocaleString('de-DE')}`
    : typeof data.value === 'string' ? data.value : animatedValue

  return (
    <div
      className={`seller-card p-5 card-stagger hover-lift relative overflow-hidden ${data.isLive ? 'kpi-live' : ''}`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Background accent */}
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.04] -translate-y-8 translate-x-8"
        style={{ background: data.color }} />

      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: data.bgColor }}>
          <Icon className="w-5 h-5" style={{ color: data.color }} />
        </div>
        {data.isLive && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ background: 'oklch(0.72 0.19 145 / 0.15)', color: 'oklch(0.72 0.19 145)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'oklch(0.72 0.19 145)' }} />
            Live
          </span>
        )}
      </div>

      <p className="text-[13px] text-muted-foreground mb-1">{data.label}</p>
      <p className="text-2xl font-bold tracking-tight mb-2 count-animate">{displayValue}</p>

      {/* Change Badge */}
      <div className="flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-semibold ${
          isPositive ? 'text-green-400' : 'text-red-400'
        }`}
          style={{ background: isPositive ? 'oklch(0.72 0.19 145 / 0.12)' : 'oklch(0.63 0.24 25 / 0.12)' }}
        >
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {isPositive ? '+' : ''}{data.change}%
        </span>
        <span className="text-[11px] text-muted-foreground">{data.changeLabel}</span>
      </div>

      {/* Tooltip on hover */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl opacity-0 hover:opacity-100 transition-opacity cursor-default p-4">
        <p className="text-xs text-center text-white/80">{data.tooltip}</p>
      </div>
    </div>
  )
}

// ─── LIVE ACTIVITY FEED ──────────────────────────────
function LiveActivityTicker({ events }: { events: LiveEvent[] }) {
  if (!events.length) return null

  const doubled = [...events, ...events]

  return (
    <div className="seller-card overflow-hidden py-3 px-4 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="w-4 h-4" style={{ color: 'oklch(0.72 0.19 145)' }} />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Activity</span>
      </div>
      <div className="overflow-hidden relative">
        <div className="ticker-animate flex gap-8 whitespace-nowrap">
          {doubled.map((event, i) => (
            <span key={`${event.id}-${i}`} className="inline-flex items-center gap-2 text-sm">
              <span>{event.icon}</span>
              <span className="text-muted-foreground">{event.text}</span>
              <span className="text-[10px] text-muted-foreground/50">{event.time}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── SELLER HEALTH SCORE ─────────────────────────────
function SellerHealthScore({ score, categories }: { score: number; categories: HealthCategory[] }) {
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (score / 100) * circumference
  const badge = score >= 80 ? 'Gold Seller' : score >= 60 ? 'Rising Star' : 'New Seller'
  const badgeColor = score >= 80 ? 'oklch(0.78 0.14 85)' : score >= 60 ? 'oklch(0.65 0.15 250)' : 'oklch(0.55 0.03 260)'

  return (
    <div className="seller-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Seller Health Score</h3>
        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: `color-mix(in oklch, ${badgeColor} 15%, transparent)`, color: badgeColor }}>
          {badge}
        </span>
      </div>

      {/* SVG Ring */}
      <div className="flex items-center gap-6">
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" strokeWidth="6" stroke="oklch(0.2 0.02 260)" />
            <circle
              cx="50" cy="50" r="45" fill="none" strokeWidth="6"
              stroke="url(#scoreGrad)" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="score-ring-animate"
            />
            <defs>
              <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="oklch(0.78 0.14 85)" />
                <stop offset="100%" stopColor="oklch(0.72 0.19 145)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold">{score}</span>
            <span className="text-[10px] text-muted-foreground">/100</span>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="flex-1 space-y-2.5">
          {categories.map((cat) => (
            <div key={cat.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{cat.label}</span>
                <span className="text-xs font-semibold">{cat.score}/{cat.max}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'oklch(0.2 0.02 260)' }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${(cat.score / cat.max) * 100}%`, background: cat.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── MAIN DASHBOARD ──────────────────────────────────
export default function SellerDashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { t } = useLanguage()
  const userId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [seller, setSeller] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [chartPeriod, setChartPeriod] = useState<'7d' | '30d' | '90d'>('7d')
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([])

  useEffect(() => {
    if (userId) checkSellerStatus()
  }, [userId])

  // Simulated live events
  useEffect(() => {
    const templates: Omit<LiveEvent, 'id' | 'time'>[] = [
      { icon: '\uD83D\uDD34', text: '23 Personen sehen sich gerade Ihre Produkte an', color: 'red' },
      { icon: '\uD83D\uDCB0', text: '2 Verkäufe in den letzten 5 Minuten', color: 'green' },
      { icon: '\uD83D\uDCC8', text: 'T-Shirt Classic beginnt zu trenden', color: 'blue' },
      { icon: '\u2B50', text: 'Neue 5-Sterne Bewertung erhalten', color: 'gold' },
      { icon: '\uD83D\uDE80', text: 'Ihr Shop wurde 148x besucht heute', color: 'purple' },
      { icon: '\uD83D\uDCE6', text: 'Bestellung #1847 wartet auf Versand', color: 'orange' },
      { icon: '\uD83C\uDF1F', text: 'Ihr Seller Score ist gestiegen!', color: 'gold' },
    ]

    const initial = templates.map((t, i) => ({
      ...t,
      id: i,
      time: `vor ${Math.floor(Math.random() * 30) + 1}min`
    }))
    setLiveEvents(initial)

    const interval = setInterval(() => {
      const template = templates[Math.floor(Math.random() * templates.length)]
      setLiveEvents(prev => [{
        ...template,
        id: Date.now(),
        time: 'gerade eben'
      }, ...prev.slice(0, 6)])
    }, 15000)

    return () => clearInterval(interval)
  }, [])

  const checkSellerStatus = async () => {
    try {
      const response = await fetch('/api/seller/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      const data = await response.json()
      if (!data.isSeller) { router.push('/seller-application'); return }
      setSeller(data.seller)
      loadAnalytics()
    } catch (error) {
      console.error('Check status error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/seller/analytics', {
        headers: { 'x-user-id': userId! }
      })
      const data = await response.json()
      if (response.ok && data.analytics) setAnalytics(data.analytics)
    } catch (error) {
      console.error('Load analytics error:', error)
    }
  }

  // ─── KPI DATA ──────────────────────────────────────
  const kpiData: KPIData[] = [
    {
      label: (t as any)('todayRevenue') || "Heutiger Umsatz",
      value: `\u20AC${analytics?.summary?.totalRevenue || 0}`,
      change: 12.5,
      changeLabel: (t as any)('vsYesterday') || 'vs. gestern',
      icon: Banknote,
      color: 'oklch(0.72 0.19 145)',
      bgColor: 'oklch(0.72 0.19 145 / 0.12)',
      isLive: true,
      tooltip: (t as any)('todayRevenueTooltip') || 'Gesamtumsatz heute basierend auf bezahlten Bestellungen'
    },
    {
      label: (t as any)('last60minSales') || "Letzte 60 Min",
      value: Math.floor(Math.random() * 5) + 1,
      change: 8.3,
      changeLabel: (t as any)('vsLastHour') || 'vs. letzte Std.',
      icon: Clock,
      color: 'oklch(0.65 0.15 250)',
      bgColor: 'oklch(0.65 0.15 250 / 0.12)',
      isLive: true,
      tooltip: (t as any)('last60minTooltip') || 'Anzahl der Verkäufe in den letzten 60 Minuten'
    },
    {
      label: (t as any)('liveOrders') || "Offene Bestellungen",
      value: analytics?.summary?.totalSales || 0,
      change: -2.1,
      changeLabel: (t as any)('vsYesterday') || 'vs. gestern',
      icon: ShoppingCart,
      color: 'oklch(0.7 0.18 55)',
      bgColor: 'oklch(0.7 0.18 55 / 0.12)',
      isLive: true,
      tooltip: (t as any)('liveOrdersTooltip') || 'Bestellungen die noch verarbeitet werden müssen'
    },
    {
      label: (t as any)('activeAds') || "Aktive Anzeigen",
      value: 0,
      change: 0,
      changeLabel: (t as any)('comingSoon') || 'Coming Soon',
      icon: Megaphone,
      color: 'oklch(0.55 0.2 300)',
      bgColor: 'oklch(0.55 0.2 300 / 0.12)',
      tooltip: (t as any)('activeAdsTooltip') || 'Anzeigen und Boost-Kampagnen (demnächst verfügbar)'
    },
    {
      label: (t as any)('riskStatus') || "Risiko-Status",
      value: 'Niedrig',
      change: 5.0,
      changeLabel: (t as any)('improving') || 'verbessert',
      icon: ShieldAlert,
      color: 'oklch(0.72 0.19 145)',
      bgColor: 'oklch(0.72 0.19 145 / 0.12)',
      tooltip: (t as any)('riskTooltip') || 'Basierend auf Rücksendequote, Streitfälle und Kundenzufriedenheit'
    },
    {
      label: "Health Score",
      value: 78,
      change: 3.2,
      changeLabel: (t as any)('thisMonth') || 'diesen Monat',
      icon: Heart,
      color: 'oklch(0.78 0.14 85)',
      bgColor: 'oklch(0.78 0.14 85 / 0.12)',
      tooltip: (t as any)('healthScoreTooltip') || 'Ihr Gesamtleistungsscore basierend auf 5 Kategorien'
    },
  ]

  // ─── CHART DATA ────────────────────────────────────
  const chartData = analytics?.dailyStats || [
    { date: 'Mo', revenue: 0, sales: 0 },
    { date: 'Di', revenue: 0, sales: 0 },
    { date: 'Mi', revenue: 0, sales: 0 },
    { date: 'Do', revenue: 0, sales: 0 },
    { date: 'Fr', revenue: 0, sales: 0 },
    { date: 'Sa', revenue: 0, sales: 0 },
    { date: 'So', revenue: 0, sales: 0 },
  ]

  // ─── HEALTH SCORE ──────────────────────────────────
  const healthCategories: HealthCategory[] = [
    { label: (t as any)('shippingSpeed') || 'Versandgeschwindigkeit', score: 85, color: 'oklch(0.65 0.15 250)', max: 100 },
    { label: (t as any)('customerSatisfaction') || 'Kundenzufriedenheit', score: 82, color: 'oklch(0.72 0.19 145)', max: 100 },
    { label: (t as any)('returnRate') || 'Rücksendequote', score: 90, color: 'oklch(0.78 0.14 85)', max: 100 },
    { label: (t as any)('contentQuality') || 'Content-Qualität', score: 65, color: 'oklch(0.55 0.2 300)', max: 100 },
    { label: (t as any)('responseTime') || 'Antwortzeit', score: 70, color: 'oklch(0.7 0.18 55)', max: 100 },
  ]

  // ─── LOADING ───────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          {/* Skeleton KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="seller-card p-5 space-y-3">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="skeleton w-20 h-3 rounded" />
                <div className="skeleton w-24 h-7 rounded" />
                <div className="skeleton w-16 h-3 rounded" />
              </div>
            ))}
          </div>
          {/* Skeleton Chart */}
          <div className="seller-card p-6 h-80 mb-6">
            <div className="skeleton w-48 h-6 rounded mb-4" />
            <div className="skeleton w-full h-56 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">

        {/* ─── HEADER ─────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">{seller?.shop_name || 'Dashboard'}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: 'oklch(0.72 0.19 145 / 0.15)', color: 'oklch(0.72 0.19 145)' }}>
                CEO View
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{(t as any)('commandCenterDesc') || 'Ihr vollständiges Business auf einen Blick'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadAnalytics} className="p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors" title="Refresh">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* ─── KPI STRIP ──────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          {kpiData.map((kpi, index) => (
            <KPICard key={kpi.label} data={kpi} index={index} />
          ))}
        </div>

        {/* ─── LIVE ACTIVITY FEED ─────────────────── */}
        <LiveActivityTicker events={liveEvents} />

        {/* ─── REVENUE CHART ──────────────────────── */}
        <div className="seller-card p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold">{(t as any)('revenueOverview') || 'Umsatzübersicht'}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{(t as any)('revenueVsOrders') || 'Umsatz vs. Bestellungen'}</p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'oklch(0.12 0.02 260)' }}>
              {(['7d', '30d', '90d'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setChartPeriod(period)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    chartPeriod === period ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  style={chartPeriod === period ? { background: 'oklch(0.2 0.03 260)' } : undefined}
                >
                  {period === '7d' ? '7 Tage' : period === '30d' ? '30 Tage' : '90 Tage'}
                </button>
              ))}
            </div>
          </div>

          {/* AI Insight Banner */}
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-4"
            style={{ background: 'oklch(0.55 0.2 300 / 0.08)', border: '1px solid oklch(0.55 0.2 300 / 0.15)' }}>
            <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: 'oklch(0.55 0.2 300)' }} />
            <p className="text-xs" style={{ color: 'oklch(0.55 0.2 300)' }}>
              <span className="font-semibold">AI Insight:</span> {(t as any)('aiInsightRevenue') || 'Ihr Umsatz liegt 23% über dem Durchschnitt der letzten Woche. Nutzen Sie den Trend!'}
            </p>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.72 0.19 145)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="oklch(0.72 0.19 145)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.65 0.15 250)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="oklch(0.65 0.15 250)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0.02 260)" />
              <XAxis dataKey="date" stroke="oklch(0.45 0.02 260)" fontSize={12} />
              <YAxis stroke="oklch(0.45 0.02 260)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: 'oklch(0.12 0.02 260)',
                  border: '1px solid oklch(0.22 0.02 260)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  boxShadow: '0 8px 24px oklch(0 0 0 / 0.3)'
                }}
              />
              <Area type="monotone" dataKey="revenue" stroke="oklch(0.72 0.19 145)" strokeWidth={2.5} fill="url(#revenueGrad)" name="Umsatz (\u20AC)" />
              <Area type="monotone" dataKey="sales" stroke="oklch(0.65 0.15 250)" strokeWidth={2.5} fill="url(#salesGrad)" name="Bestellungen" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ─── PERFORMANCE GRID ───────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Top Products */}
          <div className="seller-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5" style={{ color: 'oklch(0.78 0.14 85)' }} />
                {(t as any)('topSellingProducts') || 'Top Produkte'}
              </h3>
              <Link href="/seller/products" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                Alle <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {analytics?.topProducts?.length > 0 ? (
              <div className="space-y-3">
                {analytics.topProducts.slice(0, 5).map((product: any, index: number) => (
                  <div key={product.id} className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/[0.03]">
                    <span className="text-lg font-bold w-6 text-center" style={{ color: index === 0 ? 'oklch(0.78 0.14 85)' : 'oklch(0.45 0.02 260)' }}>
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.title}</p>
                      <p className="text-xs text-muted-foreground">{product.quantity} {(t as any)('itemsSold') || 'verkauft'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: 'oklch(0.72 0.19 145)' }}>{'\u20AC'}{product.revenue?.toFixed(2)}</p>
                      <div className="flex items-center gap-0.5 justify-end">
                        <TrendingUp className="w-3 h-3 text-green-400" />
                        <span className="text-[10px] text-green-400">+{Math.floor(Math.random() * 20) + 5}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Package className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">{(t as any)('noSalesYet') || 'Noch keine Verkäufe'}</p>
                <Link href="/seller/products/create" className="inline-flex items-center gap-1 mt-3 text-xs font-medium" style={{ color: 'oklch(0.78 0.14 85)' }}>
                  <Plus className="w-3 h-3" /> Produkt erstellen
                </Link>
              </div>
            )}
          </div>

          {/* Recent Orders */}
          <div className="seller-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Truck className="w-5 h-5" style={{ color: 'oklch(0.7 0.18 55)' }} />
                {(t as any)('recentOrders') || 'Aktuelle Bestellungen'}
              </h3>
              <Link href="/seller/orders" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                Alle <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {analytics?.recentOrders?.length > 0 ? (
              <div className="space-y-3">
                {analytics.recentOrders.slice(0, 5).map((item: any) => {
                  const statusColors: Record<string, string> = {
                    paid: 'oklch(0.72 0.19 145)',
                    pending: 'oklch(0.82 0.17 85)',
                    shipped: 'oklch(0.65 0.15 250)',
                    delivered: 'oklch(0.72 0.19 145)',
                  }
                  const statusColor = statusColors[item.order?.payment_status || 'pending'] || 'oklch(0.55 0.03 260)'

                  return (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/[0.03]">
                      {item.product?.images?.[0] ? (
                        <img src={item.product.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product?.title || 'Produkt'}</p>
                        <p className="text-xs text-muted-foreground">{item.order?.user?.name || item.order?.user?.email || 'Kunde'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{'\u20AC'}{(item.price * item.quantity).toFixed(2)}</p>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: `color-mix(in oklch, ${statusColor} 15%, transparent)`, color: statusColor }}>
                          {item.order?.payment_status === 'paid' ? 'Bezahlt' : 'Wartend'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <ShoppingCart className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">{(t as any)('noOrdersYet') || 'Noch keine Bestellungen'}</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── BOTTOM ROW ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

          {/* Low Stock Alerts */}
          <div className="seller-card p-6">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5" style={{ color: 'oklch(0.82 0.17 85)' }} />
              {(t as any)('lowStockAlerts') || 'Niedrige Bestände'}
            </h3>
            {analytics?.lowStockProducts?.length > 0 ? (
              <div className="space-y-3">
                {analytics.lowStockProducts.slice(0, 4).map((product: any) => {
                  const daysLeft = product.stock_quantity > 0 ? Math.max(1, Math.ceil(product.stock_quantity * 2.5)) : 0
                  const urgentColor = daysLeft <= 3 ? 'oklch(0.63 0.24 25)' : 'oklch(0.82 0.17 85)'
                  return (
                    <div key={product.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: `color-mix(in oklch, ${urgentColor} 6%, transparent)`, border: `1px solid color-mix(in oklch, ${urgentColor} 15%, transparent)` }}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{product.title}</p>
                        <p className="text-xs text-muted-foreground">~{daysLeft} Tage verbleibend</p>
                      </div>
                      <span className="px-2 py-1 rounded-lg text-xs font-bold" style={{ background: `color-mix(in oklch, ${urgentColor} 12%, transparent)`, color: urgentColor }}>
                        {product.stock_quantity} Stk.
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Zap className="w-8 h-8 mx-auto mb-2" style={{ color: 'oklch(0.72 0.19 145 / 0.3)' }} />
                <p className="text-sm text-muted-foreground">{(t as any)('sufficientStock') || 'Alle Bestände ausreichend'}</p>
              </div>
            )}
          </div>

          {/* Health Score */}
          <SellerHealthScore score={78} categories={healthCategories} />

          {/* Quick Actions */}
          <div className="seller-card p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" style={{ color: 'oklch(0.78 0.14 85)' }} />
              {(t as any)('quickActions') || 'Schnellzugriff'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: (t as any)('addProduct') || 'Produkt hinzufügen', icon: Plus, href: '/seller/products/create', color: 'oklch(0.72 0.19 145)' },
                { label: (t as any)('viewOrders') || 'Bestellungen', icon: Truck, href: '/seller/orders', color: 'oklch(0.7 0.18 55)' },
                { label: (t as any)('withdrawFunds') || 'Auszahlung', icon: Banknote, href: '/seller/withdraw', color: 'oklch(0.65 0.15 250)' },
                { label: (t as any)('shopSettings') || 'Einstellungen', icon: SettingsIcon, href: '#settings', color: 'oklch(0.55 0.03 260)', isSettings: true },
                { label: 'Support', icon: Headphones, href: '/seller/support', color: 'oklch(0.82 0.17 85)' },
                { label: (t as any)('visitShop') || 'Shop besuchen', icon: ExternalLink, href: `/seller/${seller?.id}`, color: 'oklch(0.78 0.14 85)' },
              ].map((action: any) => {
                const AIcon = action.icon

                if (action.isSettings) {
                  return (
                    <button
                      key="settings"
                      onClick={() => window.dispatchEvent(new CustomEvent('open-settings-drawer'))}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:bg-white/[0.04]"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in oklch, ${action.color} 12%, transparent)` }}>
                        <AIcon className="w-5 h-5" style={{ color: action.color }} />
                      </div>
                      <span className="text-[11px] text-muted-foreground text-center leading-tight">{action.label}</span>
                    </button>
                  )
                }

                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:bg-white/[0.04]"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in oklch, ${action.color} 12%, transparent)` }}>
                      <AIcon className="w-5 h-5" style={{ color: action.color }} />
                    </div>
                    <span className="text-[11px] text-muted-foreground text-center leading-tight">{action.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
