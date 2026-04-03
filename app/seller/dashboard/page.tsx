"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import {
  Banknote, ShoppingCart, TrendingUp, Package,
  RefreshCw, ExternalLink, Loader2, AlertCircle,
  Store, Copy, Check, Share2, Plus, FileText,
  Palette, Eye, ChevronRight, CheckCircle2, Circle,
} from "lucide-react"

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
      low_stock_threshold: number
      price: number; image: string | null
    }>
  }
  analytics: {
    productViews: number
    addToCarts: number
    checkouts: number
    conversionRate: number | null
    addToCartRate: number | null
    uniqueSessions: number
    refundTotal: number
    forecastRevenue: number | null
  } | null
  bestSellers: Array<{
    productId: string; title: string; qty: number; revenue: number
  }>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  `€${v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SellerDashboardPage() {
  const { data: session, status: sessionStatus } = useSession()
  const userId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [metrics, setMetrics] = useState<SellerMetrics | null>(null)
  const [period] = useState<7 | 30 | 90>(30)
  const [error, setError] = useState<string | null>(null)
  const [shopSlug, setShopSlug] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [onboarding, setOnboarding] = useState<{
    profileComplete: boolean
    hasProducts: boolean
    paymentsConnected: boolean
  } | null>(null)

  const hasDataRef = useRef(false)

  // ── Fetch metrics ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (sessionStatus === "loading") return
    if (sessionStatus === "unauthenticated" || !userId) {
      setLoading(false)
      setError("Nicht eingeloggt. Bitte melde dich an.")
      return
    }

    const controller = new AbortController()
    const isRefresh = hasDataRef.current
    setError(null)
    if (isRefresh) setRefreshing(true)

    fetch(`/api/seller/metrics?period=${period}`, { cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        if (controller.signal.aborted) return
        if (res.status === 401 || res.status === 403) {
          if (!hasDataRef.current) {
            await new Promise(resolve => setTimeout(resolve, 1500))
            try {
              const retry = await fetch(`/api/seller/metrics?period=${period}`, { cache: "no-store" })
              if (retry.ok) {
                const retryData = await retry.json()
                if (retryData.success) {
                  setMetrics(retryData)
                  hasDataRef.current = true
                  setError(null)
                  return
                }
              }
            } catch { /* fall through */ }
          }
          setError("Authentifizierungsfehler. Bitte Seite neu laden.")
          return
        }
        if (!res.ok) { setError(`Serverfehler (${res.status})`); return }
        const data = await res.json()
        if (data.success) {
          setMetrics(data)
          hasDataRef.current = true
          setError(null)
          setOnboarding(prev => ({
            profileComplete: prev?.profileComplete ?? false,
            hasProducts: (data.kpis?.totalProducts ?? 0) > 0,
            paymentsConnected: prev?.paymentsConnected ?? false,
          }))
        } else {
          setError(data.error ?? "Unbekannter Fehler")
        }
      })
      .catch((e: Error) => { if (e.name !== "AbortError") setError(e.message || "Netzwerkfehler") })
      .finally(() => { if (!controller.signal.aborted) { setLoading(false); setRefreshing(false) } })

    return () => controller.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, userId, period])

  // ── Fetch seller settings ─────────────────────────────────────────────────
  useEffect(() => {
    if (sessionStatus !== "authenticated" || !userId) return
    fetch("/api/seller/settings")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.seller) return
        setShopSlug(data.seller.shop_slug || null)
        const profileComplete = !!(data.seller.shop_name && data.seller.shop_description)
        const paymentsConnected = !!(data.seller.stripe_account_id)
        setOnboarding(prev => ({
          profileComplete,
          hasProducts: prev?.hasProducts ?? false,
          paymentsConnected,
        }))
      })
      .catch(() => {})
  }, [sessionStatus, userId])

  // ── Manual refresh ────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    if (!userId || refreshing) return
    setRefreshing(true)
    setError(null)
    fetch(`/api/seller/metrics?period=${period}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return
        const data = await res.json()
        if (data.success) { setMetrics(data); setError(null) }
      })
      .catch(() => {})
      .finally(() => setRefreshing(false))
  }, [userId, period, refreshing])

  // ── Derived ───────────────────────────────────────────────────────────────
  const k = metrics?.kpis
  const storeUrl = shopSlug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/${shopSlug}`
    : null
  const storeHref = shopSlug ? `/${shopSlug}` : `/seller/${metrics?.seller.id ?? ""}`

  const handleCopyStoreLink = () => {
    if (!storeUrl) return
    navigator.clipboard.writeText(storeUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  const handleShareStoreLink = () => {
    if (!storeUrl) return
    if (navigator.share) {
      navigator.share({ title: metrics?.seller.shopName ?? "Mein Shop", url: storeUrl }).catch(() => {})
    } else {
      handleCopyStoreLink()
    }
  }

  // ── Onboarding checklist ──────────────────────────────────────────────────
  const checklistItems = onboarding ? [
    { label: "Profil vervollständigen", done: onboarding.profileComplete, href: "/seller/settings" },
    { label: "Erstes Produkt erstellen", done: onboarding.hasProducts, href: "/seller/products/create" },
    { label: "Zahlungen verbinden", done: onboarding.paymentsConnected, href: "/seller/payouts" },
  ] : []
  const checklistDone = checklistItems.filter(i => i.done).length
  const showOnboarding = onboarding && checklistDone < 3

  // ── Loading state ─────────────────────────────────────────────────────────
  if (sessionStatus === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0E0E10" }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#D97706" }} />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Dashboard wird geladen...</p>
        </div>
      </div>
    )
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error && !metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0E0E10" }}>
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "#EF4444" }} />
          <p className="text-[15px] font-semibold mb-1 text-white">Dashboard konnte nicht geladen werden</p>
          <p className="text-[13px] mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>{error}</p>
          <button onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold"
            style={{ background: "#D97706", color: "#FFF" }}>
            <RefreshCw className="w-4 h-4" /> Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ background: "#0E0E10" }}>
      <div className="max-w-[1200px] mx-auto">

        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">
              {metrics?.seller.shopName ?? "Dashboard"}
            </h1>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              Willkommen zurück — hier ist dein Store-Überblick
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleRefresh} disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <a href={storeHref} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}>
              <Eye className="w-3.5 h-3.5" /> Store ansehen
            </a>
            {storeUrl && (
              <>
                <button onClick={handleCopyStoreLink}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors hover:bg-white/10"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: copied ? "#22C55E" : "rgba(255,255,255,0.6)" }}>
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Kopiert" : "Link kopieren"}
                </button>
                <button onClick={handleShareStoreLink}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors hover:bg-white/10"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── KPI STRIP ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            {
              label: "Umsatz",
              value: fmt(k?.revenue ?? 0),
              sub: `${period} Tage`,
              icon: Banknote,
              accent: "#22C55E",
            },
            {
              label: "Bestellungen",
              value: String(k?.paidOrders ?? 0),
              sub: `${k?.pendingOrders ?? 0} ausstehend`,
              icon: ShoppingCart,
              accent: "#3B82F6",
            },
            {
              label: "Konversionsrate",
              value: metrics?.analytics?.conversionRate != null
                ? `${metrics.analytics.conversionRate}%` : "—",
              sub: `${metrics?.analytics?.uniqueSessions ?? 0} Besucher`,
              icon: TrendingUp,
              accent: "#D97706",
            },
            {
              label: "Besucher",
              value: metrics?.analytics?.uniqueSessions != null
                ? metrics.analytics.uniqueSessions.toLocaleString("de-DE") : "—",
              sub: `${metrics?.analytics?.productViews ?? 0} Aufrufe`,
              icon: Eye,
              accent: "#8B5CF6",
            },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${kpi.accent}12` }}>
                  <kpi.icon className="w-4 h-4" style={{ color: kpi.accent }} />
                </div>
                <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {kpi.label}
                </span>
              </div>
              <p className="text-xl font-bold text-white">{kpi.value}</p>
              <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* ── QUICK ACTIONS ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Plus, label: "Produkt hinzufügen", href: "/seller/products/create", accent: "#D97706" },
            { icon: FileText, label: "Post erstellen", href: "/seller/posts/create", accent: "#3B82F6" },
            { icon: Palette, label: "Store anpassen", href: "/seller/settings", accent: "#8B5CF6" },
            { icon: ShoppingCart, label: "Bestellungen", href: "/seller/orders", accent: "#22C55E" },
          ].map((action) => (
            <Link key={action.href} href={action.href}
              className="group flex items-center gap-3 rounded-2xl p-4 transition-all duration-200 hover:scale-[1.02]"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                style={{ background: `${action.accent}12` }}>
                <action.icon className="w-4.5 h-4.5" style={{ color: action.accent }} />
              </div>
              <span className="text-xs font-semibold text-white/70 group-hover:text-white transition-colors">
                {action.label}
              </span>
            </Link>
          ))}
        </div>

        {/* ── STORE PREVIEW + ONBOARDING ROW ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

          {/* Store Preview Card */}
          <div className="lg:col-span-2 rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4" style={{ color: "#D97706" }} />
                <span className="text-xs font-semibold text-white/70">Store Vorschau</span>
              </div>
              <a href={storeHref} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-medium transition-opacity hover:opacity-70"
                style={{ color: "#D97706" }}>
                Öffnen <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative" style={{ height: 280 }}>
              {/* Mock store preview */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "#D97706" }}>
                  <span className="text-white font-bold text-xl">
                    {(metrics?.seller.shopName ?? "S").charAt(0).toUpperCase()}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  {metrics?.seller.shopName ?? "Dein Store"}
                </h3>
                {storeUrl && (
                  <p className="text-[11px] mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {storeUrl.replace(/^https?:\/\//, "")}
                  </p>
                )}
                <div className="flex items-center gap-3 text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                  <span>{k?.activeProducts ?? 0} Produkte</span>
                  <span className="w-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
                  <span>{k?.paidOrders ?? 0} Verkäufe</span>
                </div>
                <a href={storeHref} target="_blank" rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold transition-all hover:brightness-110"
                  style={{ background: "#D97706", color: "#FFF" }}>
                  Store besuchen <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Onboarding Checklist */}
          <div className="rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Setup</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: checklistDone === 3 ? "rgba(34,197,94,0.12)" : "rgba(217,119,6,0.12)",
                  color: checklistDone === 3 ? "#22C55E" : "#D97706",
                }}>
                {checklistDone}/3
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 rounded-full mb-5" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(checklistDone / 3) * 100}%`,
                  background: checklistDone === 3 ? "#22C55E" : "#D97706",
                }} />
            </div>

            <div className="space-y-3">
              {checklistItems.map((item) => (
                <Link key={item.label} href={item.href}
                  className="group flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/[0.03]"
                  style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
                  {item.done ? (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: "#22C55E" }} />
                  ) : (
                    <Circle className="w-5 h-5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.15)" }} />
                  )}
                  <span className={`text-xs font-medium flex-1 ${item.done ? "line-through" : ""}`}
                    style={{ color: item.done ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.7)" }}>
                    {item.label}
                  </span>
                  {!item.done && (
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "#D97706" }} />
                  )}
                </Link>
              ))}
            </div>

            {showOnboarding && (
              <p className="text-[10px] mt-4 leading-relaxed" style={{ color: "rgba(255,255,255,0.25)" }}>
                Vervollständige alle Schritte, um deinen Store optimal zu starten.
              </p>
            )}
          </div>
        </div>

        {/* ── RECENT ORDERS ──────────────────────────────────────────── */}
        <div className="rounded-2xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <h3 className="text-sm font-semibold text-white">Letzte Bestellungen</h3>
            <Link href="/seller/orders"
              className="text-[11px] font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
              style={{ color: "#D97706" }}>
              Alle ansehen <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {metrics?.recent.orders.length ? (
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
              {metrics.recent.orders.slice(0, 5).map(order => {
                const stateMap: Record<string, { color: string; label: string }> = {
                  PAID: { color: "#22C55E", label: "Bezahlt" },
                  DELIVERED: { color: "#22C55E", label: "Geliefert" },
                  COMPLETED: { color: "#22C55E", label: "Abgeschlossen" },
                  SHIPPED: { color: "#3B82F6", label: "Versandt" },
                  PAYMENT_PENDING: { color: "#D97706", label: "Ausstehend" },
                  CREATED: { color: "#6B7280", label: "Erstellt" },
                  REFUNDED: { color: "#EF4444", label: "Erstattet" },
                  CANCELLED: { color: "#EF4444", label: "Storniert" },
                }
                const s = stateMap[order.state] ?? { color: "#6B7280", label: order.state }
                return (
                  <div key={order.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(255,255,255,0.04)" }}>
                      <Package className="w-4 h-4" style={{ color: "rgba(255,255,255,0.25)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white/80 truncate">{order.customerName}</p>
                      <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                        {new Date(order.createdAt).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span className="text-xs font-bold text-white">{fmt(order.totalAmount)}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: `${s.color}15`, color: s.color }}>
                        {s.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-12 text-center">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2" style={{ color: "rgba(255,255,255,0.08)" }} />
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                Noch keine Bestellungen
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
