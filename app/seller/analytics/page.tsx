"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useLanguage } from "@/lib/language-context"
import {
  BarChart3, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  DollarSign, ShoppingCart, Percent, Receipt, Download, RefreshCw,
  Package, Globe, Smartphone, Monitor, Share2, Search, Mail,
  ChevronRight, Eye, Users as UsersIcon, ArrowRight
} from "lucide-react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  Legend
} from "recharts"

// ─── TYPES ─────────────────────────────────────────────
type Period = "7d" | "30d" | "90d" | "all"

interface MetricCard {
  label: string
  value: string
  change: number
  changeLabel: string
  icon: any
  color: string
  bgColor: string
}

// ─── ANIMATED COUNTER HOOK ─────────────────────────────
function useCountUp(end: number, duration = 1000) {
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
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(start + (end - start) * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [end, duration])

  return count
}

// ─── MOCK DATA GENERATORS ──────────────────────────────
function generateRevenueData(period: Period) {
  const now = new Date()

  if (period === "7d") {
    const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
    return days.map((day, i) => ({
      date: day,
      revenue: Math.floor(Math.random() * 800) + 200,
      orders: Math.floor(Math.random() * 20) + 5,
    }))
  }

  if (period === "30d") {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - 29 + i)
      return {
        date: `${d.getDate()}.${d.getMonth() + 1}`,
        revenue: Math.floor(Math.random() * 1200) + 300,
        orders: Math.floor(Math.random() * 30) + 8,
      }
    })
  }

  if (period === "90d") {
    return Array.from({ length: 12 }, (_, i) => {
      const weekNum = i + 1
      return {
        date: `KW ${weekNum}`,
        revenue: Math.floor(Math.random() * 5000) + 1500,
        orders: Math.floor(Math.random() * 100) + 30,
      }
    })
  }

  // all
  const months = ["Jan", "Feb", "Mar", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]
  return months.map((month) => ({
    date: month,
    revenue: Math.floor(Math.random() * 15000) + 5000,
    orders: Math.floor(Math.random() * 300) + 80,
  }))
}

const CATEGORY_DATA = [
  { name: "Oberteile", value: 3240, color: "oklch(0.78 0.14 85)" },
  { name: "Hosen", value: 2180, color: "oklch(0.72 0.19 145)" },
  { name: "Schuhe", value: 1950, color: "oklch(0.65 0.15 250)" },
  { name: "Accessoires", value: 1420, color: "oklch(0.7 0.18 55)" },
  { name: "Kleider", value: 1100, color: "oklch(0.55 0.2 300)" },
  { name: "Jacken", value: 890, color: "oklch(0.63 0.24 25)" },
]

const TRAFFIC_SOURCES = [
  { source: "Organische Suche", visitors: 4230, percentage: 38, icon: Search, color: "oklch(0.72 0.19 145)" },
  { source: "Social Media", visitors: 2870, percentage: 26, icon: Share2, color: "oklch(0.65 0.15 250)" },
  { source: "Direktzugriff", visitors: 1950, percentage: 18, icon: Globe, color: "oklch(0.78 0.14 85)" },
  { source: "E-Mail", visitors: 1100, percentage: 10, icon: Mail, color: "oklch(0.7 0.18 55)" },
  { source: "Mobil App", visitors: 890, percentage: 8, icon: Smartphone, color: "oklch(0.55 0.2 300)" },
]

const TOP_PRODUCTS = [
  { id: 1, name: "Classic White Tee", sold: 142, revenue: 4260, trend: 15.3, image: null },
  { id: 2, name: "Slim Fit Jeans Dark", sold: 98, revenue: 5880, trend: 8.7, image: null },
  { id: 3, name: "Sneaker Urban Pro", sold: 87, revenue: 8700, trend: 22.1, image: null },
  { id: 4, name: "Oversized Hoodie Gray", sold: 76, revenue: 3040, trend: -3.2, image: null },
  { id: 5, name: "Leather Belt Premium", sold: 65, revenue: 1950, trend: 5.6, image: null },
  { id: 6, name: "Cotton Dress Summer", sold: 54, revenue: 3240, trend: 12.4, image: null },
  { id: 7, name: "Wool Scarf Winter", sold: 43, revenue: 1290, trend: -1.8, image: null },
  { id: 8, name: "Canvas Backpack", sold: 38, revenue: 2280, trend: 9.5, image: null },
]

// ─── METRIC CARD COMPONENT ────────────────────────────
function MetricCardComponent({ data, index }: { data: MetricCard; index: number }) {
  const Icon = data.icon
  const isPositive = data.change >= 0
  const numValue = parseFloat(String(data.value).replace(/[^0-9.]/g, "")) || 0
  const animatedValue = useCountUp(numValue)

  const displayValue = data.value.includes("\u20AC")
    ? `\u20AC${animatedValue.toLocaleString("de-DE")}`
    : data.value.includes("%")
    ? `${(animatedValue / 10).toFixed(1)}%`
    : data.value

  return (
    <div
      className="seller-card p-5 relative overflow-hidden transition-all duration-300"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      {/* Background accent */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.04] -translate-y-8 translate-x-8"
        style={{ background: data.color }}
      />

      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: data.bgColor }}
        >
          <Icon className="w-5 h-5" style={{ color: data.color }} />
        </div>
      </div>

      <p className="text-[13px] text-muted-foreground mb-1">{data.label}</p>
      <p className="text-2xl font-bold tracking-tight mb-2">{displayValue}</p>

      <div className="flex items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-semibold ${
            isPositive ? "text-green-400" : "text-red-400"
          }`}
          style={{
            background: isPositive
              ? "oklch(0.72 0.19 145 / 0.12)"
              : "oklch(0.63 0.24 25 / 0.12)",
          }}
        >
          {isPositive ? (
            <ArrowUpRight className="w-3 h-3" />
          ) : (
            <ArrowDownRight className="w-3 h-3" />
          )}
          {isPositive ? "+" : ""}
          {data.change}%
        </span>
        <span className="text-[11px] text-muted-foreground">{data.changeLabel}</span>
      </div>
    </div>
  )
}

// ─── CUSTOM TOOLTIP ────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: "oklch(0.12 0.02 260)",
        border: "1px solid oklch(0.22 0.02 260)",
        borderRadius: "12px",
        padding: "12px 16px",
        fontSize: "12px",
        boxShadow: "0 8px 24px oklch(0 0 0 / 0.3)",
      }}
    >
      <p className="font-semibold mb-1" style={{ color: "oklch(0.85 0 0)" }}>
        {label}
      </p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="text-xs">
          {entry.name}: {entry.name.includes("Umsatz") ? `\u20AC${entry.value.toLocaleString("de-DE")}` : entry.value}
        </p>
      ))}
    </div>
  )
}

// ─── PIE CHART CUSTOM LABEL ────────────────────────────
function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  if (percent < 0.08) return null

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// ─── MAIN PAGE ─────────────────────────────────────────
export default function SalesAnalyticsPage() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const userId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>("30d")
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)

  // Load data
  useEffect(() => {
    loadData()
  }, [userId])

  // Update chart when period changes
  useEffect(() => {
    setRevenueData(generateRevenueData(period))
  }, [period])

  const loadData = async () => {
    setLoading(true)
    try {
      if (userId) {
        const response = await fetch("/api/seller/analytics", {
          headers: { "x-user-id": userId },
        })
        if (response.ok) {
          const data = await response.json()
          if (data.analytics) setAnalytics(data.analytics)
        }
      }
    } catch (error) {
      console.error("Analytics load error:", error)
    } finally {
      // Use mock data as fallback
      setRevenueData(generateRevenueData(period))
      setLoading(false)
    }
  }

  // ─── METRIC CARDS DATA ───────────────────────────────
  const totalRevenue = analytics?.summary?.totalRevenue || 12480
  const totalOrders = analytics?.summary?.totalSales || 247
  const conversionRate = 3.8
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 50

  const metrics: MetricCard[] = [
    {
      label: "Gesamtumsatz",
      value: `\u20AC${totalRevenue}`,
      change: 18.5,
      changeLabel: "vs. Vorperiode",
      icon: DollarSign,
      color: "oklch(0.72 0.19 145)",
      bgColor: "oklch(0.72 0.19 145 / 0.12)",
    },
    {
      label: "Bestellungen",
      value: `${totalOrders}`,
      change: 12.3,
      changeLabel: "vs. Vorperiode",
      icon: ShoppingCart,
      color: "oklch(0.65 0.15 250)",
      bgColor: "oklch(0.65 0.15 250 / 0.12)",
    },
    {
      label: "Konversionsrate",
      value: `${conversionRate}%`,
      change: 0.4,
      changeLabel: "vs. Vorperiode",
      icon: Percent,
      color: "oklch(0.78 0.14 85)",
      bgColor: "oklch(0.78 0.14 85 / 0.12)",
    },
    {
      label: "Durchschn. Bestellwert",
      value: `\u20AC${avgOrderValue}`,
      change: -2.1,
      changeLabel: "vs. Vorperiode",
      icon: Receipt,
      color: "oklch(0.7 0.18 55)",
      bgColor: "oklch(0.7 0.18 55 / 0.12)",
    },
  ]

  // ─── CATEGORY BAR DATA ───────────────────────────────
  const categoryBarData = CATEGORY_DATA.map((c) => ({
    name: c.name,
    value: c.value,
  }))

  // ─── LOADING STATE ──────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          {/* Skeleton header */}
          <div className="mb-8">
            <div className="skeleton w-56 h-8 rounded mb-2" />
            <div className="skeleton w-80 h-4 rounded" />
          </div>
          {/* Skeleton metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="seller-card p-5 space-y-3">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="skeleton w-20 h-3 rounded" />
                <div className="skeleton w-28 h-7 rounded" />
                <div className="skeleton w-16 h-3 rounded" />
              </div>
            ))}
          </div>
          {/* Skeleton chart */}
          <div className="seller-card p-6 h-96 mb-6">
            <div className="skeleton w-48 h-6 rounded mb-4" />
            <div className="skeleton w-full h-72 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* ─── HEADER ──────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">Sales Analytics</h1>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background: "oklch(0.65 0.15 250 / 0.15)",
                  color: "oklch(0.65 0.15 250)",
                }}
              >
                Insights
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Detaillierte Verkaufsanalysen und Performance-Metriken
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
              style={{
                background: "oklch(0.65 0.15 250 / 0.15)",
                color: "oklch(0.65 0.15 250)",
                border: "1px solid oklch(0.65 0.15 250 / 0.25)",
              }}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* ─── PERIOD SELECTOR ─────────────────────── */}
        <div className="flex items-center gap-1 p-1 rounded-xl mb-6 w-fit" style={{ background: "oklch(0.12 0.02 260)" }}>
          {(["7d", "30d", "90d", "all"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                period === p ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              style={period === p ? { background: "oklch(0.2 0.03 260)" } : undefined}
            >
              {p === "7d" ? "7 Tage" : p === "30d" ? "30 Tage" : p === "90d" ? "90 Tage" : "Gesamt"}
            </button>
          ))}
        </div>

        {/* ─── KEY METRICS ─────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {metrics.map((metric, index) => (
            <MetricCardComponent key={metric.label} data={metric} index={index} />
          ))}
        </div>

        {/* ─── REVENUE CHART ───────────────────────── */}
        <div className="seller-card p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5" style={{ color: "oklch(0.72 0.19 145)" }} />
                Umsatzentwicklung
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Umsatz und Bestellungen im Zeitverlauf
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ background: "oklch(0.72 0.19 145)" }} />
                <span className="text-muted-foreground">Umsatz</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ background: "oklch(0.65 0.15 250)" }} />
                <span className="text-muted-foreground">Bestellungen</span>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="analyticsRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.72 0.19 145)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="oklch(0.72 0.19 145)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="analyticsOrdersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.65 0.15 250)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="oklch(0.65 0.15 250)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0.02 260)" />
              <XAxis dataKey="date" stroke="oklch(0.45 0.02 260)" fontSize={12} tickLine={false} />
              <YAxis
                yAxisId="left"
                stroke="oklch(0.45 0.02 260)"
                fontSize={12}
                tickLine={false}
                tickFormatter={(v) => `\u20AC${v}`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="oklch(0.45 0.02 260)"
                fontSize={12}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke="oklch(0.72 0.19 145)"
                strokeWidth={2.5}
                fill="url(#analyticsRevenueGrad)"
                name="Umsatz (\u20AC)"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="orders"
                stroke="oklch(0.65 0.15 250)"
                strokeWidth={2.5}
                fill="url(#analyticsOrdersGrad)"
                name="Bestellungen"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ─── CATEGORY + TRAFFIC ROW ──────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Sales by Category - Pie Chart */}
          <div className="seller-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" style={{ color: "oklch(0.78 0.14 85)" }} />
                  Umsatz nach Kategorie
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Verteilung der Verkaufskategorien</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={CATEGORY_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomLabel}
                  >
                    {CATEGORY_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.12 0.02 260)",
                      border: "1px solid oklch(0.22 0.02 260)",
                      borderRadius: "12px",
                      fontSize: "12px",
                      boxShadow: "0 8px 24px oklch(0 0 0 / 0.3)",
                    }}
                    formatter={(value: number) => [`\u20AC${value.toLocaleString("de-DE")}`, "Umsatz"]}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="w-full md:w-auto space-y-2 min-w-[160px]">
                {CATEGORY_DATA.map((cat) => (
                  <div key={cat.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                    <span className="text-xs text-muted-foreground flex-1">{cat.name}</span>
                    <span className="text-xs font-semibold">{`\u20AC${cat.value.toLocaleString("de-DE")}`}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Traffic Sources */}
          <div className="seller-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Globe className="w-5 h-5" style={{ color: "oklch(0.65 0.15 250)" }} />
                  Traffic-Quellen
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Woher Ihre Besucher kommen</p>
              </div>
              <span className="text-xs text-muted-foreground">
                {TRAFFIC_SOURCES.reduce((sum, s) => sum + s.visitors, 0).toLocaleString("de-DE")} Besucher
              </span>
            </div>

            <div className="space-y-4">
              {TRAFFIC_SOURCES.map((source) => {
                const SIcon = source.icon
                return (
                  <div key={source.source}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: `color-mix(in oklch, ${source.color} 12%, transparent)` }}
                        >
                          <SIcon className="w-4 h-4" style={{ color: source.color }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{source.source}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {source.visitors.toLocaleString("de-DE")} Besucher
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-bold" style={{ color: source.color }}>
                        {source.percentage}%
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: "oklch(0.2 0.02 260)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${source.percentage}%`,
                          background: source.color,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ─── CATEGORY BAR CHART ──────────────────── */}
        <div className="seller-card p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5" style={{ color: "oklch(0.7 0.18 55)" }} />
                Kategorie-Vergleich
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Umsatz pro Kategorie als Balkendiagramm</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryBarData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0.02 260)" />
              <XAxis dataKey="name" stroke="oklch(0.45 0.02 260)" fontSize={12} tickLine={false} />
              <YAxis
                stroke="oklch(0.45 0.02 260)"
                fontSize={12}
                tickLine={false}
                tickFormatter={(v) => `\u20AC${v}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.14 85)" stopOpacity={1} />
                  <stop offset="100%" stopColor="oklch(0.78 0.14 85)" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <Bar
                dataKey="value"
                fill="url(#barGradient)"
                radius={[6, 6, 0, 0]}
                name="Umsatz (\u20AC)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ─── TOP SELLING PRODUCTS TABLE ──────────── */}
        <div className="seller-card p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Package className="w-5 h-5" style={{ color: "oklch(0.72 0.19 145)" }} />
                Top Produkte
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Meistverkaufte Produkte nach Umsatz</p>
            </div>
            <span
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{
                background: "oklch(0.72 0.19 145 / 0.1)",
                color: "oklch(0.72 0.19 145)",
              }}
            >
              {TOP_PRODUCTS.length} Produkte
            </span>
          </div>

          {/* Table Header */}
          <div
            className="grid grid-cols-12 gap-4 px-4 py-3 rounded-xl mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            style={{ background: "oklch(0.12 0.02 260)" }}
          >
            <div className="col-span-1">#</div>
            <div className="col-span-4">Produkt</div>
            <div className="col-span-2 text-right">Verkauft</div>
            <div className="col-span-3 text-right">Umsatz</div>
            <div className="col-span-2 text-right">Trend</div>
          </div>

          {/* Table Rows */}
          <div className="space-y-1">
            {TOP_PRODUCTS.map((product, index) => {
              const isPositive = product.trend >= 0
              return (
                <div
                  key={product.id}
                  className="grid grid-cols-12 gap-4 px-4 py-3 rounded-xl transition-colors hover:bg-white/[0.03] items-center"
                >
                  <div className="col-span-1">
                    <span
                      className="text-sm font-bold"
                      style={{
                        color:
                          index === 0
                            ? "oklch(0.78 0.14 85)"
                            : index === 1
                            ? "oklch(0.72 0.19 145)"
                            : index === 2
                            ? "oklch(0.65 0.15 250)"
                            : "oklch(0.45 0.02 260)",
                      }}
                    >
                      {index + 1}
                    </span>
                  </div>
                  <div className="col-span-4 flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "oklch(0.15 0.02 260)" }}
                    >
                      <Package className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium truncate">{product.name}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm text-muted-foreground">{product.sold}</span>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className="text-sm font-bold" style={{ color: "oklch(0.72 0.19 145)" }}>
                      {`\u20AC${product.revenue.toLocaleString("de-DE")}`}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                        isPositive ? "text-green-400" : "text-red-400"
                      }`}
                      style={{
                        background: isPositive
                          ? "oklch(0.72 0.19 145 / 0.12)"
                          : "oklch(0.63 0.24 25 / 0.12)",
                      }}
                    >
                      {isPositive ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {isPositive ? "+" : ""}
                      {product.trend}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ─── QUICK STATS FOOTER ──────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: "Seitenaufrufe",
              value: "24.8K",
              icon: Eye,
              color: "oklch(0.65 0.15 250)",
            },
            {
              label: "Einzigartige Besucher",
              value: "11.0K",
              icon: UsersIcon,
              color: "oklch(0.72 0.19 145)",
            },
            {
              label: "Absprungrate",
              value: "32.4%",
              icon: ArrowRight,
              color: "oklch(0.7 0.18 55)",
            },
            {
              label: "Durchschn. Verweildauer",
              value: "4m 23s",
              icon: Monitor,
              color: "oklch(0.78 0.14 85)",
            },
          ].map((stat) => {
            const SIcon = stat.icon
            return (
              <div key={stat.label} className="seller-card p-4 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `color-mix(in oklch, ${stat.color} 12%, transparent)` }}
                >
                  <SIcon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold">{stat.value}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
