"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import {
  Banknote, Clock, ShoppingCart, TrendingUp,
  Package, AlertTriangle, RefreshCw, Zap,
  ChevronRight, ExternalLink, ShoppingBag, BarChart3,
  Loader2, AlertCircle,
} from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts"

// ─── Types ───────────────────────────────────────────────────────────────────

interface SellerMetrics {
  seller: { id: string; shopName: string; commissionRate: number; score: number | null }
  period: number
  kpis: {
    revenue: number
    sellerEarnings: number
    paidOrders: number
    pendingOrders: number
    refundedOrders: number
    avgOrderValue: number
    todayRevenue: number
    todayOrders: number
    stateCounts: Record<string, number>
    totalProducts: number
    activeProducts: number
    lowStockCount: number
  }
  balance: {
    available: number
    pending: number
    totalWithdrawn: number
    totalSales: number
  }
  charts: {
    revenueByDay: Array<{ date: string; revenue: number; orders: number }>
  }
  recent: {
    orders: Array<{
      id: string; totalAmount: number; sellerEarnings: number
      state: string; paymentStatus: string; createdAt: string; customerName: string
    }>
    lowStockProducts: Array<{
      id: string; title: string; stock_quantity: number
      low_stock_threshold: number; price: number; image: string | null
    }>
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  `€${v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { month: "short", day: "numeric" })
}

const STATE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  PAID:            { bg: "#DCFCE7", color: "#16A34A", label: "Bezahlt"       },
  DELIVERED:       { bg: "#DCFCE7", color: "#16A34A", label: "Geliefert"     },
  COMPLETED:       { bg: "#DCFCE7", color: "#16A34A", label: "Abgeschlossen" },
  SHIPPED:         { bg: "#DBEAFE", color: "#2563EB", label: "Versandt"      },
  PAYMENT_PENDING: { bg: "#FEF3C7", color: "#D97706", label: "Ausstehend"    },
  CREATED:         { bg: "#F3F4F6", color: "#6B7280", label: "Erstellt"      },
  REFUNDED:        { bg: "#FEE2E2", color: "#DC2626", label: "Erstattet"     },
  CANCELLED:       { bg: "#FEE2E2", color: "#DC2626", label: "Storniert"     },
}

function StateBadge({ state }: { state: string }) {
  const s = STATE_BADGE[state] ?? { bg: "#F3F4F6", color: "#6B7280", label: state }
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg p-2 text-[11px]"
      style={{ background: "#FFF", border: "1px solid #E5E5E5", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <p className="mb-1" style={{ color: "#999" }}>{shortDate(label)}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-medium" style={{ color: p.color }}>
          {p.name}: {p.dataKey === "revenue" ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SellerDashboardPage() {
  // ── Auth ───────────────────────────────────────────────────────────────────
  // Use status to distinguish loading / authenticated / unauthenticated.
  // Do NOT use router.push inside fetch callbacks — that causes redirect loops
  // when the API returns 401 transiently (session race condition on cold start).
  const { data: session, status: sessionStatus } = useSession()
  const userId = session?.user?.id

  // ── State ──────────────────────────────────────────────────────────────────
  // `loading` starts true; goes to false exactly once (after first fetch).
  // `refreshing` = true during subsequent period-change or manual refresh.
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [metrics, setMetrics]       = useState<SellerMetrics | null>(null)
  const [period, setPeriod]         = useState<7 | 30 | 90>(30)
  const [error, setError]           = useState<string | null>(null)

  // Ref tracks whether we've received data at least once.
  // Used to decide between "initial loading skeleton" vs "refresh spinner".
  const hasDataRef = useRef(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  // Single unified effect — watches sessionStatus + userId + period.
  // Returns an AbortController cleanup so React Strict Mode double-invocation
  // (dev only) doesn't result in two concurrent inflight requests.
  useEffect(() => {
    // Wait for NextAuth to finish loading before attempting any fetch.
    if (sessionStatus === "loading") return

    // If the user is not logged in at all, show an error (do NOT router.push
    // here because it can interact badly with middleware redirects).
    if (sessionStatus === "unauthenticated" || !userId) {
      setLoading(false)
      setError("Nicht eingeloggt. Bitte melde dich an.")
      return
    }

    const controller = new AbortController()
    const isRefresh = hasDataRef.current

    setError(null)
    if (isRefresh) setRefreshing(true)

    fetch(`/api/seller/metrics?period=${period}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (controller.signal.aborted) return

        if (res.status === 401 || res.status === 403) {
          // Session exists but no seller account or not authorized.
          // Show inline error — do NOT navigate (avoids redirect loops).
          setError("Kein Seller-Account gefunden. Bitte bewerbe dich als Seller.")
          return
        }
        if (res.status === 404) {
          setError("Seller-Profil nicht gefunden.")
          return
        }
        if (!res.ok) {
          setError(`Serverfehler (${res.status})`)
          return
        }

        const data = await res.json()
        if (data.success) {
          setMetrics(data)
          hasDataRef.current = true
          setError(null)
        } else {
          setError(data.error ?? "Unbekannter Fehler")
        }
      })
      .catch((e: Error) => {
        // AbortError is expected (cleanup on period change / Strict Mode) — ignore it.
        if (e.name !== "AbortError") {
          setError(e.message || "Netzwerkfehler")
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
          setRefreshing(false)
        }
      })

    // Cleanup: abort the fetch when:
    //   - period changes (new fetch will start)
    //   - component unmounts
    //   - React Strict Mode double-fires (aborts the first run so second starts fresh)
    return () => controller.abort()

  // Deliberately exclude `metrics` and `hasDataRef` — adding metrics would
  // create an infinite loop (fetch sets metrics → metrics changes → fetch again).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, userId, period])

  // ── Manual refresh ─────────────────────────────────────────────────────────
  // Separate from the effect; does not change `period` (avoids effect re-run).
  const handleRefresh = useCallback(() => {
    if (!userId || refreshing) return
    setRefreshing(true)
    setError(null)

    fetch(`/api/seller/metrics?period=${period}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return
        const data = await res.json()
        if (data.success) {
          setMetrics(data)
          setError(null)
        }
      })
      .catch(() => { /* silent on manual refresh */ })
      .finally(() => setRefreshing(false))
  }, [userId, period, refreshing])

  // ── Derived ────────────────────────────────────────────────────────────────
  const k = metrics?.kpis
  const b = metrics?.balance

  const kpiCards = k ? [
    {
      label: "Heute Umsatz",
      value: fmt(k.todayRevenue),
      sub: `${k.todayOrders} Bestellungen heute`,
      icon: Banknote, color: "#22C55E", live: true,
    },
    {
      label: `${period}T Umsatz`,
      value: fmt(k.revenue),
      sub: `${k.paidOrders} bezahlte Bestellungen`,
      icon: BarChart3, color: "#3B82F6",
    },
    {
      label: "Meine Einnahmen",
      value: fmt(k.sellerEarnings),
      sub: `nach ${metrics!.seller.commissionRate}% Provision`,
      icon: TrendingUp, color: "#D97706",
    },
    {
      label: "Ø Warenkorbwert",
      value: fmt(k.avgOrderValue),
      sub: `aus ${k.paidOrders} Bestellungen`,
      icon: ShoppingBag, color: "#8B5CF6",
    },
    {
      label: "Ausstehend",
      value: String(k.pendingOrders),
      sub: "Bestellungen in Bearbeitung",
      icon: Clock, color: "#F59E0B",
    },
  ] : []

  const chartData = (metrics?.charts.revenueByDay ?? []).map(d => ({
    ...d,
    label: shortDate(d.date),
  }))

  // ── Render: Session loading ────────────────────────────────────────────────
  // Stable skeleton — does NOT flicker or re-mount.
  if (sessionStatus === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F5F5F5" }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#D97706" }} />
          <p className="text-sm" style={{ color: "#999" }}>Dashboard wird geladen...</p>
        </div>
      </div>
    )
  }

  // ── Render: Error ─────────────────────────────────────────────────────────
  if (error && !metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F5F5F5" }}>
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "#DC2626" }} />
          <p className="text-[14px] font-medium mb-1" style={{ color: "#DC2626" }}>{error}</p>
          {error.includes("Seller") && (
            <Link href="/seller-application"
              className="inline-block mt-3 px-5 py-2 rounded-lg text-[13px] font-semibold"
              style={{ background: "#D97706", color: "#FFF" }}>
              Als Seller bewerben
            </Link>
          )}
          <button onClick={handleRefresh}
            className="block mx-auto mt-2 px-4 py-2 rounded-lg text-[12px]"
            style={{ color: "#999" }}>
            Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  // ── Render: Dashboard ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-6" style={{ background: "#F5F5F5" }}>
      <div className="max-w-[1400px] mx-auto">

        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[24px] font-bold" style={{ color: "#1A1A1A" }}>
              {metrics?.seller.shopName ?? "Dashboard"}
            </h1>
            <p className="text-[13px] mt-1" style={{ color: "#999" }}>
              Ihr Business auf einen Blick — alle Daten in Echtzeit
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Non-blocking error banner (after data is loaded) */}
            {error && (
              <span className="text-[11px] px-3 py-1.5 rounded-lg" style={{ background: "#FEE2E2", color: "#DC2626" }}>
                {error}
              </span>
            )}
            <button onClick={handleRefresh} disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium"
              style={{ background: "#FFF", border: "1px solid #E5E5E5", color: "#555" }}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Aktualisieren
            </button>
            <Link href={`/store/${metrics?.seller.id ?? ""}`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium"
              style={{ background: "#D97706", color: "#FFF" }}>
              <ExternalLink className="w-4 h-4" /> Shop ansehen
            </Link>
          </div>
        </div>

        {/* ── NAV SHORTCUTS ────────────────────────────────────────────── */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {([
            { href: "/seller/orders",   label: "Bestellungen", badge: k?.pendingOrders, icon: ShoppingCart },
            { href: "/seller/products", label: "Produkte",     badge: k?.lowStockCount, icon: Package      },
            { href: "/seller/payouts",  label: "Auszahlungen",                          icon: Banknote      },
          ] as const).map(({ href, label, badge, icon: Icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium"
              style={{ background: "#FFF", border: "1px solid #E5E5E5", color: "#1A1A1A" }}>
              <Icon className="w-4 h-4" style={{ color: "#D97706" }} />
              {label}
              {!!badge && badge > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: "#FEF3C7", color: "#D97706" }}>
                  {badge}
                </span>
              )}
              <ChevronRight className="w-3 h-3 ml-1" style={{ color: "#CCC" }} />
            </Link>
          ))}
        </div>

        {/* ── KPI CARDS ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          {kpiCards.map((kpi) => {
            const Icon = kpi.icon
            return (
              <div key={kpi.label} className="rounded-lg p-4"
                style={{ background: "#FFF", border: "1px solid #E5E5E5" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: `${kpi.color}15` }}>
                    <Icon className="w-[18px] h-[18px]" style={{ color: kpi.color }} />
                  </div>
                  {kpi.live && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase"
                      style={{ background: "#DCFCE7", color: "#16A34A" }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ background: "#16A34A" }} />
                      Live
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-medium mb-1" style={{ color: "#999" }}>{kpi.label}</p>
                <p className="text-[20px] font-bold" style={{ color: "#1A1A1A" }}>{kpi.value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "#CCC" }}>{kpi.sub}</p>
              </div>
            )
          })}
        </div>

        {/* ── BALANCE STRIP ────────────────────────────────────────────── */}
        {b && (
          <div className="rounded-lg p-4 mb-6 flex items-center gap-6 flex-wrap"
            style={{ background: "#FFF", border: "1px solid #E5E5E5" }}>
            <div>
              <p className="text-[10px] uppercase font-bold mb-1" style={{ color: "#999" }}>Verfügbar</p>
              <p className="text-[18px] font-black" style={{ color: "#22C55E" }}>{fmt(b.available)}</p>
            </div>
            <div className="h-8 w-px" style={{ background: "#F0F0F0" }} />
            <div>
              <p className="text-[10px] uppercase font-bold mb-1" style={{ color: "#999" }}>In Bearbeitung</p>
              <p className="text-[18px] font-bold" style={{ color: "#D97706" }}>{fmt(b.pending)}</p>
            </div>
            <div className="h-8 w-px" style={{ background: "#F0F0F0" }} />
            <div>
              <p className="text-[10px] uppercase font-bold mb-1" style={{ color: "#999" }}>Ausgezahlt</p>
              <p className="text-[18px] font-bold" style={{ color: "#1A1A1A" }}>{fmt(b.totalWithdrawn)}</p>
            </div>
            <div className="ml-auto">
              <Link href="/seller/payouts"
                className="px-4 py-2 rounded-lg text-[12px] font-bold"
                style={{ background: "#D97706", color: "#FFF" }}>
                Auszahlung anfordern →
              </Link>
            </div>
          </div>
        )}

        {/* ── CHARTS ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-6 mb-6">

          {/* Revenue Area Chart */}
          <div className="rounded-lg p-6" style={{ background: "#FFF", border: "1px solid #E5E5E5" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[15px] font-bold" style={{ color: "#1A1A1A" }}>Umsatz Trend</h2>
                <p className="text-[11px]" style={{ color: "#999" }}>Täglich, nur bezahlte Bestellungen</p>
              </div>
              <div className="flex gap-1 p-1 rounded-lg" style={{ background: "#F5F5F5" }}>
                {([7, 30, 90] as const).map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className="px-3 py-1.5 rounded-md text-[11px] font-medium"
                    style={{
                      background: period === p ? "#FFF" : "transparent",
                      color:      period === p ? "#1A1A1A" : "#999",
                      boxShadow:  period === p ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    }}>
                    {p}T
                  </button>
                ))}
              </div>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#D97706" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#D97706" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="date" tickFormatter={shortDate} stroke="#CCC" fontSize={10}
                    interval="preserveStartEnd" />
                  <YAxis stroke="#CCC" fontSize={10} tickFormatter={v => `€${v}`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="revenue" stroke="#D97706" strokeWidth={2}
                    fill="url(#revGrad)" name="Umsatz" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center">
                <p className="text-[13px]" style={{ color: "#999" }}>Noch keine Verkaufsdaten</p>
              </div>
            )}
          </div>

          {/* Orders Bar Chart */}
          <div className="rounded-lg p-6" style={{ background: "#FFF", border: "1px solid #E5E5E5" }}>
            <div className="mb-4">
              <h2 className="text-[15px] font-bold" style={{ color: "#1A1A1A" }}>Bestellungen pro Tag</h2>
              <p className="text-[11px]" style={{ color: "#999" }}>Täglich, letzten {period} Tage</p>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="date" tickFormatter={shortDate} stroke="#CCC" fontSize={10}
                    interval="preserveStartEnd" />
                  <YAxis stroke="#CCC" fontSize={10} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="orders" fill="#3B82F6" radius={[3, 3, 0, 0]} name="Bestellungen" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center">
                <p className="text-[13px]" style={{ color: "#999" }}>Noch keine Bestellungsdaten</p>
              </div>
            )}
          </div>
        </div>

        {/* ── TABLES ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-6">

          {/* Recent Orders */}
          <div className="rounded-lg p-6" style={{ background: "#FFF", border: "1px solid #E5E5E5" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-bold" style={{ color: "#1A1A1A" }}>Aktuelle Bestellungen</h3>
              <Link href="/seller/orders"
                className="text-[12px] font-medium flex items-center gap-1"
                style={{ color: "#D97706" }}>
                Alle <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {metrics?.recent.orders.length ? (
              <div className="space-y-2">
                {metrics.recent.orders.map(order => (
                  <div key={order.id} className="flex items-center gap-3 p-2 rounded-lg"
                    style={{ border: "1px solid #F0F0F0" }}>
                    <div className="w-8 h-8 rounded-md flex items-center justify-center"
                      style={{ background: "#F5F5F5" }}>
                      <Package className="w-4 h-4" style={{ color: "#CCC" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium truncate" style={{ color: "#1A1A1A" }}>
                        {order.customerName}
                      </p>
                      <p className="text-[10px]" style={{ color: "#999" }}>
                        {new Date(order.createdAt).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <p className="text-[12px] font-bold" style={{ color: "#1A1A1A" }}>
                        {fmt(order.totalAmount)}
                      </p>
                      <StateBadge state={order.state} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2" style={{ color: "#E5E5E5" }} />
                <p className="text-[12px]" style={{ color: "#999" }}>Noch keine Bestellungen</p>
              </div>
            )}
          </div>

          {/* Low Stock */}
          <div className="rounded-lg p-6" style={{ background: "#FFF", border: "1px solid #E5E5E5" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-bold flex items-center gap-2" style={{ color: "#1A1A1A" }}>
                <AlertTriangle className="w-4 h-4" style={{ color: "#D97706" }} />
                Niedrige Bestände
              </h3>
              <Link href="/seller/products"
                className="text-[12px] font-medium flex items-center gap-1"
                style={{ color: "#D97706" }}>
                Alle Produkte <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {metrics?.recent.lowStockProducts.length ? (
              <div className="space-y-2">
                {metrics.recent.lowStockProducts.map(p => {
                  const urgent = p.stock_quantity <= 3
                  const color = urgent ? "#DC2626" : "#D97706"
                  return (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg"
                      style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                      <div className="flex items-center gap-3 min-w-0">
                        {p.image ? (
                          <img src={p.image} alt="" className="w-8 h-8 rounded-md object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-md" style={{ background: "#F5F5F5" }} />
                        )}
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium truncate" style={{ color: "#1A1A1A" }}>
                            {p.title}
                          </p>
                          <p className="text-[10px]" style={{ color: "#999" }}>{fmt(p.price)}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-1 rounded-md flex-shrink-0 ml-3"
                        style={{ background: `${color}15`, color }}>
                        {p.stock_quantity} Stk.
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-10 text-center">
                <Zap className="w-8 h-8 mx-auto mb-2" style={{ color: "#E5E5E5" }} />
                <p className="text-[12px]" style={{ color: "#999" }}>Alle Bestände ausreichend</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
