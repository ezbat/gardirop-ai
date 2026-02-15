"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import {
  Calculator, DollarSign, TrendingUp, TrendingDown, Percent,
  ArrowUpRight, ArrowDownRight, Search, Filter, ChevronDown,
  Check, X, Edit3, Layers, BarChart3, Target, Minus, Plus,
  RefreshCw, ArrowLeft, AlertTriangle, Zap, Tag, Package
} from "lucide-react"
import Link from "next/link"

// ─── TYPES ─────────────────────────────────────────────
interface Product {
  id: string
  title: string
  price: number
  original_price?: number
  cost_price?: number
  stock_quantity: number
  category?: string
  images?: string[]
}

interface PriceAdjustment {
  type: "percentage" | "fixed"
  value: number
  direction: "increase" | "decrease"
}

// ─── HELPERS ───────────────────────────────────────────
function formatCurrency(value: number): string {
  return `€${value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getDiscountPercent(current: number, original: number): number {
  if (!original || original <= 0) return 0
  return Math.round(((original - current) / original) * 100)
}

function getMarginPercent(price: number, cost: number): number {
  if (!price || price <= 0) return 0
  return Math.round(((price - cost) / price) * 100)
}

type CompPosition = "above" | "below" | "at"

function getCompetitivePosition(price: number, avgPrice: number): CompPosition {
  if (!avgPrice) return "at"
  const diff = ((price - avgPrice) / avgPrice) * 100
  if (diff > 5) return "above"
  if (diff < -5) return "below"
  return "at"
}

function getPositionColor(position: CompPosition): string {
  switch (position) {
    case "above": return "oklch(0.63 0.24 25)"
    case "below": return "oklch(0.72 0.19 145)"
    case "at": return "oklch(0.78 0.14 85)"
  }
}

function getPositionLabel(position: CompPosition): string {
  switch (position) {
    case "above": return "Over markedet"
    case "below": return "Under markedet"
    case "at": return "Markedspris"
  }
}

function getPositionIcon(position: CompPosition) {
  switch (position) {
    case "above": return TrendingUp
    case "below": return TrendingDown
    case "at": return Target
  }
}

// ─── OVERVIEW CARD COMPONENT ───────────────────────────
function OverviewCard({ label, value, subtext, icon: Icon, color, index }: {
  label: string
  value: string
  subtext?: string
  icon: any
  color: string
  index: number
}) {
  return (
    <div
      className="seller-card p-5 relative overflow-hidden"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.04] -translate-y-8 translate-x-8"
        style={{ background: color }}
      />
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `color-mix(in oklch, ${color} 12%, transparent)` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <p className="text-[13px] text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold tracking-tight mb-1">{value}</p>
      {subtext && (
        <p className="text-[11px] text-muted-foreground">{subtext}</p>
      )}
    </div>
  )
}

// ─── COMPETITIVE POSITION BADGE ────────────────────────
function CompetitiveBadge({ position }: { position: CompPosition }) {
  const color = getPositionColor(position)
  const label = getPositionLabel(position)
  const Icon = getPositionIcon(position)

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{
        background: `color-mix(in oklch, ${color} 15%, transparent)`,
        color,
      }}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

// ─── MAIN PAGE ─────────────────────────────────────────
export default function PricingEnginePage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"title" | "price" | "margin" | "discount">("title")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  // Quick adjustment state
  const [adjustment, setAdjustment] = useState<PriceAdjustment>({
    type: "percentage",
    value: 10,
    direction: "decrease",
  })
  const [showAdjustPanel, setShowAdjustPanel] = useState(false)
  const [adjusting, setAdjusting] = useState(false)
  const [adjustSuccess, setAdjustSuccess] = useState(false)

  // ─── FETCH PRODUCTS ──────────────────────────────────
  useEffect(() => {
    if (userId) fetchProducts()
  }, [userId])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/seller/products/list", {
        headers: { "x-user-id": userId! },
      })
      if (res.ok) {
        const data = await res.json()
        const list = data.products || data || []
        setProducts(Array.isArray(list) ? list : [])
      } else {
        setProducts([])
      }
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  // ─── COMPUTED VALUES ─────────────────────────────────
  const stats = useMemo(() => {
    if (products.length === 0) {
      return {
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        avgMargin: 0,
        avgDiscount: 0,
        aboveMarket: 0,
        belowMarket: 0,
        atMarket: 0,
      }
    }

    const prices = products.map((p) => p.price).filter((p) => p > 0)
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0

    const margins = products
      .filter((p) => p.cost_price && p.cost_price > 0)
      .map((p) => getMarginPercent(p.price, p.cost_price!))
    const avgMargin = margins.length > 0 ? Math.round(margins.reduce((a, b) => a + b, 0) / margins.length) : 0

    const discounts = products
      .filter((p) => p.original_price && p.original_price > p.price)
      .map((p) => getDiscountPercent(p.price, p.original_price!))
    const avgDiscount = discounts.length > 0 ? Math.round(discounts.reduce((a, b) => a + b, 0) / discounts.length) : 0

    let aboveMarket = 0, belowMarket = 0, atMarket = 0
    products.forEach((p) => {
      const pos = getCompetitivePosition(p.price, avgPrice)
      if (pos === "above") aboveMarket++
      else if (pos === "below") belowMarket++
      else atMarket++
    })

    return { avgPrice, minPrice, maxPrice, avgMargin, avgDiscount, aboveMarket, belowMarket, atMarket }
  }, [products])

  // ─── FILTERED + SORTED PRODUCTS ──────────────────────
  const filteredProducts = useMemo(() => {
    let list = [...products]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((p) => p.title?.toLowerCase().includes(q))
    }

    list.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case "title":
          cmp = (a.title || "").localeCompare(b.title || "")
          break
        case "price":
          cmp = a.price - b.price
          break
        case "margin":
          cmp = getMarginPercent(a.price, a.cost_price || 0) - getMarginPercent(b.price, b.cost_price || 0)
          break
        case "discount":
          cmp = getDiscountPercent(a.price, a.original_price || 0) - getDiscountPercent(b.price, b.original_price || 0)
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })

    return list
  }, [products, searchQuery, sortBy, sortDir])

  // ─── SELECTION ───────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredProducts.map((p) => p.id)))
    }
    setSelectAll(!selectAll)
  }

  // ─── QUICK PRICE ADJUSTMENT ──────────────────────────
  const applyAdjustment = async () => {
    if (selectedIds.size === 0) return
    setAdjusting(true)
    setAdjustSuccess(false)

    // Simulate price adjustment (in real app, this would call an API)
    await new Promise((resolve) => setTimeout(resolve, 1200))

    setProducts((prev) =>
      prev.map((p) => {
        if (!selectedIds.has(p.id)) return p
        let newPrice = p.price
        if (adjustment.type === "percentage") {
          const factor = adjustment.direction === "decrease"
            ? 1 - adjustment.value / 100
            : 1 + adjustment.value / 100
          newPrice = Math.round(p.price * factor * 100) / 100
        } else {
          newPrice = adjustment.direction === "decrease"
            ? p.price - adjustment.value
            : p.price + adjustment.value
        }
        return { ...p, price: Math.max(0.01, newPrice) }
      })
    )

    setAdjusting(false)
    setAdjustSuccess(true)
    setTimeout(() => setAdjustSuccess(false), 3000)
  }

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(col)
      setSortDir("asc")
    }
  }

  // ─── LOADING STATE ──────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="skeleton w-48 h-8 rounded mb-2" />
            <div className="skeleton w-72 h-4 rounded" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="seller-card p-5 space-y-3">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="skeleton w-20 h-3 rounded" />
                <div className="skeleton w-24 h-7 rounded" />
              </div>
            ))}
          </div>
          <div className="seller-card p-6">
            <div className="skeleton w-full h-64 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  // ─── EMPTY STATE ─────────────────────────────────────
  if (products.length === 0 && !loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold tracking-tight">Pricing Engine</h1>
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: "oklch(0.65 0.15 250 / 0.15)", color: "oklch(0.65 0.15 250)" }}
                >
                  Pro Tool
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Dynamische Preisoptimierung und Marktanalyse
              </p>
            </div>
          </div>

          <div className="seller-card p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4" style={{ color: "oklch(0.65 0.15 250 / 0.3)" }} />
            <h2 className="text-xl font-bold mb-2">Keine Produkte gefunden</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Erstellen Sie zuerst Produkte, um die Pricing Engine nutzen zu konnen. Die Engine analysiert Ihre Preise und hilft bei der Optimierung.
            </p>
            <Link
              href="/seller/products/create"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
              style={{ background: "oklch(0.65 0.15 250)" }}
            >
              <Plus className="w-4 h-4" />
              Produkt erstellen
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ─── MAIN RENDER ────────────────────────────────────
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">

        {/* ─── HEADER ─────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">Pricing Engine</h1>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: "oklch(0.65 0.15 250 / 0.15)", color: "oklch(0.65 0.15 250)" }}
              >
                Pro Tool
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Dynamische Preisoptimierung, Margenanalyse und Wettbewerbsvergleich
            </p>
          </div>
          <button
            onClick={fetchProducts}
            className="p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* ─── OVERVIEW CARDS ─────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <OverviewCard
            label="Durchschnittspreis"
            value={formatCurrency(stats.avgPrice)}
            subtext={`${products.length} Produkte im Katalog`}
            icon={DollarSign}
            color="oklch(0.78 0.14 85)"
            index={0}
          />
          <OverviewCard
            label="Preisspanne"
            value={`${formatCurrency(stats.minPrice)} - ${formatCurrency(stats.maxPrice)}`}
            subtext="Min - Max"
            icon={BarChart3}
            color="oklch(0.65 0.15 250)"
            index={1}
          />
          <OverviewCard
            label="Durchschn. Marge"
            value={`${stats.avgMargin}%`}
            subtext={stats.avgMargin >= 30 ? "Gesunde Marge" : stats.avgMargin > 0 ? "Marge verbessern" : "Keine Kostendaten"}
            icon={Percent}
            color="oklch(0.72 0.19 145)"
            index={2}
          />
          <OverviewCard
            label="Wettbewerbsposition"
            value={`${stats.atMarket} am Markt`}
            subtext={`${stats.aboveMarket} daruber, ${stats.belowMarket} darunter`}
            icon={Target}
            color="oklch(0.7 0.18 55)"
            index={3}
          />
        </div>

        {/* ─── PRICE DISTRIBUTION BAR ─────────────── */}
        {products.length > 0 && (
          <div className="seller-card p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4" style={{ color: "oklch(0.78 0.14 85)" }} />
                Preisverteilung im Katalog
              </h3>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "oklch(0.72 0.19 145)" }} />
                  Unter Markt ({stats.belowMarket})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "oklch(0.78 0.14 85)" }} />
                  Am Markt ({stats.atMarket})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "oklch(0.63 0.24 25)" }} />
                  Uber Markt ({stats.aboveMarket})
                </span>
              </div>
            </div>
            <div className="h-3 rounded-full overflow-hidden flex" style={{ background: "oklch(0.2 0.02 260)" }}>
              {stats.belowMarket > 0 && (
                <div
                  className="h-full transition-all duration-700"
                  style={{
                    width: `${(stats.belowMarket / products.length) * 100}%`,
                    background: "oklch(0.72 0.19 145)",
                  }}
                />
              )}
              {stats.atMarket > 0 && (
                <div
                  className="h-full transition-all duration-700"
                  style={{
                    width: `${(stats.atMarket / products.length) * 100}%`,
                    background: "oklch(0.78 0.14 85)",
                  }}
                />
              )}
              {stats.aboveMarket > 0 && (
                <div
                  className="h-full transition-all duration-700"
                  style={{
                    width: `${(stats.aboveMarket / products.length) * 100}%`,
                    background: "oklch(0.63 0.24 25)",
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* ─── QUICK PRICE ADJUSTMENT ─────────────── */}
        <div className="seller-card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Zap className="w-5 h-5" style={{ color: "oklch(0.78 0.14 85)" }} />
              Schnelle Preisanpassung
            </h3>
            <button
              onClick={() => setShowAdjustPanel(!showAdjustPanel)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              {showAdjustPanel ? "Schliessen" : "Offnen"}
              <ChevronDown
                className={`w-3 h-3 transition-transform ${showAdjustPanel ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {showAdjustPanel && (
            <div className="space-y-4">
              {selectedIds.size === 0 && (
                <div
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs"
                  style={{
                    background: "oklch(0.82 0.17 85 / 0.08)",
                    border: "1px solid oklch(0.82 0.17 85 / 0.15)",
                    color: "oklch(0.82 0.17 85)",
                  }}
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  Wahlen Sie zuerst Produkte in der Tabelle aus, um Preise anzupassen.
                </div>
              )}

              <div className="flex flex-wrap items-end gap-4">
                {/* Adjustment Type */}
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">
                    Anpassungstyp
                  </label>
                  <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "oklch(0.12 0.02 260)" }}>
                    <button
                      onClick={() => setAdjustment((a) => ({ ...a, type: "percentage" }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        adjustment.type === "percentage" ? "text-foreground" : "text-muted-foreground"
                      }`}
                      style={adjustment.type === "percentage" ? { background: "oklch(0.2 0.03 260)" } : undefined}
                    >
                      Prozent (%)
                    </button>
                    <button
                      onClick={() => setAdjustment((a) => ({ ...a, type: "fixed" }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        adjustment.type === "fixed" ? "text-foreground" : "text-muted-foreground"
                      }`}
                      style={adjustment.type === "fixed" ? { background: "oklch(0.2 0.03 260)" } : undefined}
                    >
                      Festbetrag (EUR)
                    </button>
                  </div>
                </div>

                {/* Direction */}
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">
                    Richtung
                  </label>
                  <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "oklch(0.12 0.02 260)" }}>
                    <button
                      onClick={() => setAdjustment((a) => ({ ...a, direction: "decrease" }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                        adjustment.direction === "decrease" ? "text-foreground" : "text-muted-foreground"
                      }`}
                      style={adjustment.direction === "decrease" ? { background: "oklch(0.2 0.03 260)" } : undefined}
                    >
                      <Minus className="w-3 h-3" /> Senken
                    </button>
                    <button
                      onClick={() => setAdjustment((a) => ({ ...a, direction: "increase" }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                        adjustment.direction === "increase" ? "text-foreground" : "text-muted-foreground"
                      }`}
                      style={adjustment.direction === "increase" ? { background: "oklch(0.2 0.03 260)" } : undefined}
                    >
                      <Plus className="w-3 h-3" /> Erhohen
                    </button>
                  </div>
                </div>

                {/* Value */}
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">
                    Wert
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step={adjustment.type === "percentage" ? 1 : 0.5}
                      value={adjustment.value}
                      onChange={(e) =>
                        setAdjustment((a) => ({ ...a, value: parseFloat(e.target.value) || 0 }))
                      }
                      className="w-24 px-3 py-2 rounded-xl text-sm font-medium bg-transparent outline-none"
                      style={{
                        border: "1px solid oklch(1 0 0 / 0.1)",
                        background: "oklch(0.12 0.02 260)",
                      }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {adjustment.type === "percentage" ? "%" : "EUR"}
                    </span>
                  </div>
                </div>

                {/* Apply Button */}
                <button
                  onClick={applyAdjustment}
                  disabled={selectedIds.size === 0 || adjusting}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{ background: "oklch(0.65 0.15 250)" }}
                >
                  {adjusting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Anwenden...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Auf {selectedIds.size} Produkt{selectedIds.size !== 1 ? "e" : ""} anwenden
                    </>
                  )}
                </button>
              </div>

              {adjustSuccess && (
                <div
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs"
                  style={{
                    background: "oklch(0.72 0.19 145 / 0.08)",
                    border: "1px solid oklch(0.72 0.19 145 / 0.15)",
                    color: "oklch(0.72 0.19 145)",
                  }}
                >
                  <Check className="w-4 h-4 flex-shrink-0" />
                  Preise erfolgreich angepasst!
                </div>
              )}

              {/* Preview */}
              {selectedIds.size > 0 && !adjusting && (
                <div
                  className="px-4 py-3 rounded-xl text-xs"
                  style={{
                    background: "oklch(0.65 0.15 250 / 0.06)",
                    border: "1px solid oklch(0.65 0.15 250 / 0.12)",
                  }}
                >
                  <p className="font-medium mb-1" style={{ color: "oklch(0.65 0.15 250)" }}>
                    Vorschau der Anpassung:
                  </p>
                  <p className="text-muted-foreground">
                    {adjustment.direction === "decrease" ? "Senkung" : "Erhohung"} um{" "}
                    <span className="font-semibold text-foreground">
                      {adjustment.type === "percentage"
                        ? `${adjustment.value}%`
                        : formatCurrency(adjustment.value)}
                    </span>{" "}
                    auf {selectedIds.size} ausgewahlte{selectedIds.size !== 1 ? " Produkte" : "s Produkt"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── PRODUCT PRICING TABLE ──────────────── */}
        <div className="seller-card overflow-hidden mb-6">
          {/* Table Header */}
          <div className="p-5 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Tag className="w-5 h-5" style={{ color: "oklch(0.65 0.15 250)" }} />
              Produktpreise
            </h3>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{
                  background: "oklch(0.12 0.02 260)",
                  border: "1px solid oklch(1 0 0 / 0.08)",
                }}
              >
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Produkt suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-sm outline-none w-40 placeholder:text-muted-foreground/50"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")}>
                    <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {filteredProducts.length} Produkte
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "oklch(0.08 0.02 260 / 0.5)" }}>
                  <th className="text-left py-3 px-4 w-10">
                    <button
                      onClick={toggleSelectAll}
                      className="w-5 h-5 rounded flex items-center justify-center transition-colors"
                      style={{
                        border: "1.5px solid oklch(1 0 0 / 0.2)",
                        background: selectAll ? "oklch(0.65 0.15 250)" : "transparent",
                      }}
                    >
                      {selectAll && <Check className="w-3 h-3 text-white" />}
                    </button>
                  </th>
                  <th
                    className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("title")}
                  >
                    <span className="flex items-center gap-1">
                      Produkt
                      {sortBy === "title" && (
                        <ChevronDown className={`w-3 h-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                      )}
                    </span>
                  </th>
                  <th
                    className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("price")}
                  >
                    <span className="flex items-center gap-1 justify-end">
                      Aktueller Preis
                      {sortBy === "price" && (
                        <ChevronDown className={`w-3 h-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                      )}
                    </span>
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Originalpreis
                  </th>
                  <th
                    className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("discount")}
                  >
                    <span className="flex items-center gap-1 justify-end">
                      Rabatt
                      {sortBy === "discount" && (
                        <ChevronDown className={`w-3 h-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                      )}
                    </span>
                  </th>
                  <th
                    className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("margin")}
                  >
                    <span className="flex items-center gap-1 justify-end">
                      Marge
                      {sortBy === "margin" && (
                        <ChevronDown className={`w-3 h-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                      )}
                    </span>
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Marktposition
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, idx) => {
                  const discountPct = getDiscountPercent(product.price, product.original_price || 0)
                  const marginPct = getMarginPercent(product.price, product.cost_price || 0)
                  const position = getCompetitivePosition(product.price, stats.avgPrice)
                  const isSelected = selectedIds.has(product.id)

                  return (
                    <tr
                      key={product.id}
                      className="transition-colors hover:bg-white/[0.02]"
                      style={{
                        borderTop: "1px solid oklch(1 0 0 / 0.05)",
                        background: isSelected ? "oklch(0.65 0.15 250 / 0.06)" : undefined,
                      }}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleSelect(product.id)}
                          className="w-5 h-5 rounded flex items-center justify-center transition-colors"
                          style={{
                            border: `1.5px solid ${isSelected ? "oklch(0.65 0.15 250)" : "oklch(1 0 0 / 0.2)"}`,
                            background: isSelected ? "oklch(0.65 0.15 250)" : "transparent",
                          }}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </button>
                      </td>

                      {/* Product Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {product.images?.[0] ? (
                            <img
                              src={product.images[0]}
                              alt=""
                              className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: "oklch(0.15 0.02 260)" }}
                            >
                              <Package className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[200px]">{product.title}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {product.stock_quantity} auf Lager
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Current Price */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold" style={{ color: "oklch(0.72 0.19 145)" }}>
                          {formatCurrency(product.price)}
                        </span>
                      </td>

                      {/* Original Price */}
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {product.original_price && product.original_price > product.price ? (
                          <span className="line-through">{formatCurrency(product.original_price)}</span>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </td>

                      {/* Discount */}
                      <td className="py-3 px-4 text-right">
                        {discountPct > 0 ? (
                          <span
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-semibold"
                            style={{
                              background: "oklch(0.72 0.19 145 / 0.12)",
                              color: "oklch(0.72 0.19 145)",
                            }}
                          >
                            <ArrowDownRight className="w-3 h-3" />
                            -{discountPct}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">-</span>
                        )}
                      </td>

                      {/* Margin */}
                      <td className="py-3 px-4 text-right">
                        {product.cost_price && product.cost_price > 0 ? (
                          <span
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-semibold"
                            style={{
                              background: marginPct >= 30
                                ? "oklch(0.72 0.19 145 / 0.12)"
                                : marginPct >= 15
                                  ? "oklch(0.82 0.17 85 / 0.12)"
                                  : "oklch(0.63 0.24 25 / 0.12)",
                              color: marginPct >= 30
                                ? "oklch(0.72 0.19 145)"
                                : marginPct >= 15
                                  ? "oklch(0.82 0.17 85)"
                                  : "oklch(0.63 0.24 25)",
                            }}
                          >
                            {marginPct}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">-</span>
                        )}
                      </td>

                      {/* Competitive Position */}
                      <td className="py-3 px-4 text-center">
                        <CompetitiveBadge position={position} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 && searchQuery && (
            <div className="py-12 text-center">
              <Search className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Keine Produkte gefunden fur &quot;{searchQuery}&quot;
              </p>
            </div>
          )}
        </div>

        {/* ─── BULK PRICING TOOLS ─────────────────── */}
        <div className="seller-card p-6 mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5" style={{ color: "oklch(0.65 0.15 250)" }} />
            Massenpreistools
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Tool Card 1: Category Pricing */}
            <div
              className="p-4 rounded-xl transition-all hover:bg-white/[0.03] cursor-pointer group"
              style={{
                border: "1px solid oklch(1 0 0 / 0.06)",
                background: "oklch(0.08 0.02 260 / 0.4)",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "oklch(0.78 0.14 85 / 0.12)" }}
              >
                <Tag className="w-5 h-5" style={{ color: "oklch(0.78 0.14 85)" }} />
              </div>
              <h4 className="text-sm font-semibold mb-1">Kategoriepreise</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Einheitliche Preisregeln nach Produktkategorie anwenden
              </p>
            </div>

            {/* Tool Card 2: Seasonal Pricing */}
            <div
              className="p-4 rounded-xl transition-all hover:bg-white/[0.03] cursor-pointer group"
              style={{
                border: "1px solid oklch(1 0 0 / 0.06)",
                background: "oklch(0.08 0.02 260 / 0.4)",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "oklch(0.72 0.19 145 / 0.12)" }}
              >
                <TrendingUp className="w-5 h-5" style={{ color: "oklch(0.72 0.19 145)" }} />
              </div>
              <h4 className="text-sm font-semibold mb-1">Saisonale Anpassung</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Zeitbasierte Preisstrategien fur Saison- und Aktionszeitraume
              </p>
            </div>

            {/* Tool Card 3: Margin Optimizer */}
            <div
              className="p-4 rounded-xl transition-all hover:bg-white/[0.03] cursor-pointer group"
              style={{
                border: "1px solid oklch(1 0 0 / 0.06)",
                background: "oklch(0.08 0.02 260 / 0.4)",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "oklch(0.65 0.15 250 / 0.12)" }}
              >
                <Calculator className="w-5 h-5" style={{ color: "oklch(0.65 0.15 250)" }} />
              </div>
              <h4 className="text-sm font-semibold mb-1">Margen-Optimierer</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Automatische Preisberechnung basierend auf Zielmarge und Kosten
              </p>
            </div>

            {/* Tool Card 4: Competitor Match */}
            <div
              className="p-4 rounded-xl transition-all hover:bg-white/[0.03] cursor-pointer group"
              style={{
                border: "1px solid oklch(1 0 0 / 0.06)",
                background: "oklch(0.08 0.02 260 / 0.4)",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "oklch(0.7 0.18 55 / 0.12)" }}
              >
                <Target className="w-5 h-5" style={{ color: "oklch(0.7 0.18 55)" }} />
              </div>
              <h4 className="text-sm font-semibold mb-1">Wettbewerbsabgleich</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Preise automatisch an den Marktdurchschnitt angleichen
              </p>
            </div>

            {/* Tool Card 5: Bundle Pricing */}
            <div
              className="p-4 rounded-xl transition-all hover:bg-white/[0.03] cursor-pointer group"
              style={{
                border: "1px solid oklch(1 0 0 / 0.06)",
                background: "oklch(0.08 0.02 260 / 0.4)",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "oklch(0.55 0.2 300 / 0.12)" }}
              >
                <Layers className="w-5 h-5" style={{ color: "oklch(0.55 0.2 300)" }} />
              </div>
              <h4 className="text-sm font-semibold mb-1">Bundle-Preise</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Kombinationsrabatte fur Produktpakete und Cross-Selling
              </p>
            </div>

            {/* Tool Card 6: Price History */}
            <div
              className="p-4 rounded-xl transition-all hover:bg-white/[0.03] cursor-pointer group"
              style={{
                border: "1px solid oklch(1 0 0 / 0.06)",
                background: "oklch(0.08 0.02 260 / 0.4)",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "oklch(0.63 0.24 25 / 0.12)" }}
              >
                <BarChart3 className="w-5 h-5" style={{ color: "oklch(0.63 0.24 25)" }} />
              </div>
              <h4 className="text-sm font-semibold mb-1">Preisverlauf</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Historische Preisanalyse und Trendentwicklung uber Zeit
              </p>
            </div>
          </div>
        </div>

        {/* ─── BACK TO DASHBOARD ──────────────────── */}
        <div className="text-center pb-8">
          <Link
            href="/seller/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Zuruck zum Command Center
          </Link>
        </div>

      </div>
    </div>
  )
}
