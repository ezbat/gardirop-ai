"use client"

import { useState, useMemo } from "react"
import {
  Users, UserPlus, UserCheck, RefreshCw, Search,
  ArrowUpRight, ArrowDownRight, TrendingUp, ShoppingBag,
  Clock, AlertTriangle, Crown, ChevronDown, ChevronUp
} from "lucide-react"

// ─── TYPES ─────────────────────────────────────────────
type Segment = "new" | "loyal" | "at-risk" | "inactive"
type SortOption = "recent" | "most-orders" | "highest-spending"

interface Customer {
  id: string
  name: string
  email: string
  avatar: string
  orders: number
  totalSpent: number
  lastOrder: string
  segment: Segment
  joinedDate: string
}

// ─── SEGMENT CONFIG ────────────────────────────────────
const SEGMENT_CONFIG: Record<Segment, { label: string; color: string; bg: string; icon: any; description: string }> = {
  new: {
    label: "Neukunde",
    color: "oklch(0.65 0.15 250)",
    bg: "oklch(0.65 0.15 250 / 0.12)",
    icon: UserPlus,
    description: "Erste Bestellung in den letzten 30 Tagen"
  },
  loyal: {
    label: "Stammkunde",
    color: "oklch(0.72 0.19 145)",
    bg: "oklch(0.72 0.19 145 / 0.12)",
    icon: Crown,
    description: "5+ Bestellungen, aktiv in den letzten 60 Tagen"
  },
  "at-risk": {
    label: "Gefährdet",
    color: "oklch(0.78 0.14 85)",
    bg: "oklch(0.78 0.14 85 / 0.12)",
    icon: AlertTriangle,
    description: "War aktiv, keine Bestellung seit 60+ Tagen"
  },
  inactive: {
    label: "Inaktiv",
    color: "oklch(0.55 0.03 260)",
    bg: "oklch(0.55 0.03 260 / 0.12)",
    icon: Clock,
    description: "Keine Bestellung seit 120+ Tagen"
  },
}

// ─── MOCK DATA ─────────────────────────────────────────
const MOCK_CUSTOMERS: Customer[] = [
  {
    id: "c1", name: "Lena Müller", email: "le***@gmail.com",
    avatar: "LM", orders: 12, totalSpent: 1847.50,
    lastOrder: "2026-02-12", segment: "loyal", joinedDate: "2025-06-15"
  },
  {
    id: "c2", name: "Jonas Weber", email: "jo***@outlook.de",
    avatar: "JW", orders: 8, totalSpent: 1230.00,
    lastOrder: "2026-02-10", segment: "loyal", joinedDate: "2025-08-02"
  },
  {
    id: "c3", name: "Sophie Braun", email: "so***@yahoo.de",
    avatar: "SB", orders: 1, totalSpent: 89.99,
    lastOrder: "2026-02-08", segment: "new", joinedDate: "2026-02-08"
  },
  {
    id: "c4", name: "Maximilian Schmidt", email: "ma***@web.de",
    avatar: "MS", orders: 3, totalSpent: 345.00,
    lastOrder: "2025-11-20", segment: "at-risk", joinedDate: "2025-04-10"
  },
  {
    id: "c5", name: "Emma Fischer", email: "em***@gmail.com",
    avatar: "EF", orders: 15, totalSpent: 2456.80,
    lastOrder: "2026-02-14", segment: "loyal", joinedDate: "2025-03-22"
  },
  {
    id: "c6", name: "Tim Hoffmann", email: "ti***@gmx.de",
    avatar: "TH", orders: 2, totalSpent: 178.50,
    lastOrder: "2025-09-03", segment: "inactive", joinedDate: "2025-07-18"
  },
  {
    id: "c7", name: "Laura Klein", email: "la***@icloud.com",
    avatar: "LK", orders: 1, totalSpent: 64.99,
    lastOrder: "2026-01-28", segment: "new", joinedDate: "2026-01-28"
  },
  {
    id: "c8", name: "Niklas Wagner", email: "ni***@proton.me",
    avatar: "NW", orders: 6, totalSpent: 890.20,
    lastOrder: "2025-12-15", segment: "at-risk", joinedDate: "2025-05-30"
  },
  {
    id: "c9", name: "Mia Becker", email: "mi***@gmail.com",
    avatar: "MB", orders: 1, totalSpent: 129.00,
    lastOrder: "2026-02-11", segment: "new", joinedDate: "2026-02-11"
  },
  {
    id: "c10", name: "Felix Richter", email: "fe***@outlook.de",
    avatar: "FR", orders: 4, totalSpent: 520.75,
    lastOrder: "2025-08-22", segment: "inactive", joinedDate: "2025-02-14"
  },
]

// ─── HELPERS ───────────────────────────────────────────
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value)
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })
}

function daysAgo(dateStr: string): number {
  const now = new Date("2026-02-14")
  const date = new Date(dateStr)
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
}

// ─── AVATAR COLORS ─────────────────────────────────────
const AVATAR_COLORS = [
  "oklch(0.65 0.15 250)",
  "oklch(0.72 0.19 145)",
  "oklch(0.78 0.14 85)",
  "oklch(0.55 0.2 300)",
  "oklch(0.7 0.18 55)",
]

function getAvatarColor(id: string): string {
  const index = id.charCodeAt(1) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

// ─── OVERVIEW CARD COMPONENT ───────────────────────────
function OverviewCard({ label, value, change, icon: Icon, color, bgColor }: {
  label: string
  value: string
  change: number
  icon: any
  color: string
  bgColor: string
}) {
  const isPositive = change >= 0
  return (
    <div className="seller-card p-5 relative overflow-hidden">
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.04] -translate-y-8 translate-x-8"
        style={{ background: color }}
      />
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bgColor }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <p className="text-[13px] text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold tracking-tight mb-2">{value}</p>
      <div className="flex items-center gap-1.5">
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-semibold"
          style={{
            background: isPositive ? "oklch(0.72 0.19 145 / 0.12)" : "oklch(0.63 0.24 25 / 0.12)",
            color: isPositive ? "oklch(0.72 0.19 145)" : "oklch(0.63 0.24 25)",
          }}
        >
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {isPositive ? "+" : ""}{change}%
        </span>
        <span className="text-[11px] text-muted-foreground">vs. letzter Monat</span>
      </div>
    </div>
  )
}

// ─── SEGMENT CARD COMPONENT ────────────────────────────
function SegmentCard({ segment, count, total, active, onClick }: {
  segment: Segment
  count: number
  total: number
  active: boolean
  onClick: () => void
}) {
  const config = SEGMENT_CONFIG[segment]
  const Icon = config.icon
  const pct = total > 0 ? Math.round((count / total) * 100) : 0

  return (
    <button
      onClick={onClick}
      className="seller-card p-4 text-left transition-all w-full"
      style={{
        borderColor: active ? config.color : undefined,
        boxShadow: active ? `0 0 0 1px ${config.color}` : undefined,
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: config.bg }}>
          <Icon className="w-4 h-4" style={{ color: config.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{config.label}</p>
          <p className="text-[11px] text-muted-foreground truncate">{config.description}</p>
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-xl font-bold">{count}</span>
        <span className="text-[11px] text-muted-foreground">{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.2 0.02 260)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: config.color }}
        />
      </div>
    </button>
  )
}

// ─── MAIN PAGE ─────────────────────────────────────────
export default function CustomerIntelligencePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("recent")
  const [activeSegment, setActiveSegment] = useState<Segment | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  // ─── COMPUTED STATS ────────────────────────────────
  const totalCustomers = MOCK_CUSTOMERS.length
  const newThisMonth = MOCK_CUSTOMERS.filter(c => c.joinedDate >= "2026-02-01").length
  const returningPct = Math.round(
    (MOCK_CUSTOMERS.filter(c => c.orders > 1).length / totalCustomers) * 100
  )
  const avgLifetimeValue = MOCK_CUSTOMERS.reduce((sum, c) => sum + c.totalSpent, 0) / totalCustomers

  const segmentCounts: Record<Segment, number> = {
    new: MOCK_CUSTOMERS.filter(c => c.segment === "new").length,
    loyal: MOCK_CUSTOMERS.filter(c => c.segment === "loyal").length,
    "at-risk": MOCK_CUSTOMERS.filter(c => c.segment === "at-risk").length,
    inactive: MOCK_CUSTOMERS.filter(c => c.segment === "inactive").length,
  }

  // ─── FILTERED & SORTED CUSTOMERS ──────────────────
  const filteredCustomers = useMemo(() => {
    let customers = [...MOCK_CUSTOMERS]

    // Filter by segment
    if (activeSegment) {
      customers = customers.filter(c => c.segment === activeSegment)
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      customers = customers.filter(
        c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
      )
    }

    // Sort
    customers.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "recent":
          comparison = new Date(b.lastOrder).getTime() - new Date(a.lastOrder).getTime()
          break
        case "most-orders":
          comparison = b.orders - a.orders
          break
        case "highest-spending":
          comparison = b.totalSpent - a.totalSpent
          break
      }
      return sortDirection === "desc" ? comparison : -comparison
    })

    return customers
  }, [searchQuery, sortBy, activeSegment, sortDirection])

  const toggleSegment = (segment: Segment) => {
    setActiveSegment(prev => (prev === segment ? null : segment))
  }

  const toggleSortDirection = () => {
    setSortDirection(prev => (prev === "desc" ? "asc" : "desc"))
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">

        {/* ─── HEADER ──────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">Customer Intelligence</h1>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: "oklch(0.65 0.15 250 / 0.15)", color: "oklch(0.65 0.15 250)" }}
              >
                Insights
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Kundenanalysen, Segmentierung und Lifetime-Value auf einen Blick
            </p>
          </div>
        </div>

        {/* ─── OVERVIEW CARDS ──────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <OverviewCard
            label="Kunden gesamt"
            value={totalCustomers.toLocaleString("de-DE")}
            change={14.2}
            icon={Users}
            color="oklch(0.65 0.15 250)"
            bgColor="oklch(0.65 0.15 250 / 0.12)"
          />
          <OverviewCard
            label="Neu diesen Monat"
            value={newThisMonth.toLocaleString("de-DE")}
            change={23.1}
            icon={UserPlus}
            color="oklch(0.72 0.19 145)"
            bgColor="oklch(0.72 0.19 145 / 0.12)"
          />
          <OverviewCard
            label="Wiederkehrend"
            value={`${returningPct}%`}
            change={5.8}
            icon={RefreshCw}
            color="oklch(0.78 0.14 85)"
            bgColor="oklch(0.78 0.14 85 / 0.12)"
          />
          <OverviewCard
            label="Ø Lifetime Value"
            value={formatCurrency(avgLifetimeValue)}
            change={8.4}
            icon={TrendingUp}
            color="oklch(0.55 0.2 300)"
            bgColor="oklch(0.55 0.2 300 / 0.12)"
          />
        </div>

        {/* ─── SEGMENT CARDS ──────────────────────── */}
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5" style={{ color: "oklch(0.78 0.14 85)" }} />
            Kundensegmente
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(["new", "loyal", "at-risk", "inactive"] as Segment[]).map(segment => (
              <SegmentCard
                key={segment}
                segment={segment}
                count={segmentCounts[segment]}
                total={totalCustomers}
                active={activeSegment === segment}
                onClick={() => toggleSegment(segment)}
              />
            ))}
          </div>
        </div>

        {/* ─── CUSTOMER TABLE ─────────────────────── */}
        <div className="seller-card overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-5 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" style={{ color: "oklch(0.72 0.19 145)" }} />
                Kundenliste
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  ({filteredCustomers.length})
                </span>
              </h2>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Search */}
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Kunden suchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-56 pl-9 pr-4 py-2 rounded-xl text-sm border-0 outline-none focus:ring-2 transition-all"
                    style={{
                      background: "oklch(0.15 0.02 260)",
                      color: "inherit",
                    }}
                  />
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-1">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="px-3 py-2 rounded-xl text-sm border-0 outline-none cursor-pointer appearance-none pr-8"
                    style={{
                      background: "oklch(0.15 0.02 260)",
                      color: "inherit",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m4 6 4 4 4-4'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 8px center",
                    }}
                  >
                    <option value="recent">Neueste zuerst</option>
                    <option value="most-orders">Meiste Bestellungen</option>
                    <option value="highest-spending">Höchster Umsatz</option>
                  </select>
                  <button
                    onClick={toggleSortDirection}
                    className="p-2 rounded-xl transition-colors hover:bg-white/[0.04]"
                    title={sortDirection === "desc" ? "Absteigend" : "Aufsteigend"}
                  >
                    {sortDirection === "desc" ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Active filter indicator */}
            {activeSegment && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Filter:</span>
                <button
                  onClick={() => setActiveSegment(null)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                  style={{
                    background: SEGMENT_CONFIG[activeSegment].bg,
                    color: SEGMENT_CONFIG[activeSegment].color,
                  }}
                >
                  {SEGMENT_CONFIG[activeSegment].label}
                  <span className="ml-1 opacity-60">x</span>
                </button>
              </div>
            )}
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            {/* Desktop Table Header */}
            <div
              className="hidden md:grid items-center px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              style={{
                gridTemplateColumns: "2fr 1.2fr 0.8fr 1fr 1fr 1fr",
                borderBottom: "1px solid oklch(1 0 0 / 0.06)",
              }}
            >
              <span>Kunde</span>
              <span>E-Mail</span>
              <span className="text-center">Bestellungen</span>
              <span className="text-right">Umsatz</span>
              <span className="text-center">Letzte Bestellung</span>
              <span className="text-center">Segment</span>
            </div>

            {/* Customer Rows */}
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => {
                const segConfig = SEGMENT_CONFIG[customer.segment]
                const days = daysAgo(customer.lastOrder)
                const avatarColor = getAvatarColor(customer.id)

                return (
                  <div
                    key={customer.id}
                    className="grid items-center px-5 py-4 transition-colors hover:bg-white/[0.02] cursor-default"
                    style={{
                      gridTemplateColumns: "2fr 1.2fr 0.8fr 1fr 1fr 1fr",
                      borderBottom: "1px solid oklch(1 0 0 / 0.04)",
                    }}
                  >
                    {/* Name + Avatar */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: `color-mix(in oklch, ${avatarColor} 18%, transparent)`, color: avatarColor }}
                      >
                        {customer.avatar}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{customer.name}</p>
                        <p className="text-[11px] text-muted-foreground md:hidden">{customer.email}</p>
                      </div>
                    </div>

                    {/* Email */}
                    <span className="hidden md:block text-sm text-muted-foreground truncate">
                      {customer.email}
                    </span>

                    {/* Orders */}
                    <span className="text-sm font-medium text-center">{customer.orders}</span>

                    {/* Total Spent */}
                    <span className="text-sm font-semibold text-right" style={{ color: "oklch(0.72 0.19 145)" }}>
                      {formatCurrency(customer.totalSpent)}
                    </span>

                    {/* Last Order */}
                    <div className="text-center">
                      <p className="text-sm">{formatDate(customer.lastOrder)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {days === 0 ? "Heute" : days === 1 ? "Gestern" : `vor ${days} Tagen`}
                      </p>
                    </div>

                    {/* Segment Badge */}
                    <div className="flex justify-center">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                        style={{ background: segConfig.bg, color: segConfig.color }}
                      >
                        {segConfig.label}
                      </span>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="py-16 text-center">
                <Users className="w-10 h-10 mx-auto mb-3" style={{ color: "oklch(0.55 0.03 260 / 0.3)" }} />
                <p className="text-sm text-muted-foreground">Keine Kunden gefunden</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Versuchen Sie andere Suchbegriffe oder Filter
                </p>
              </div>
            )}
          </div>

          {/* Table Footer */}
          <div
            className="px-5 py-3 flex items-center justify-between text-xs text-muted-foreground"
            style={{ borderTop: "1px solid oklch(1 0 0 / 0.06)" }}
          >
            <span>
              {filteredCustomers.length} von {totalCustomers} Kunden angezeigt
            </span>
            <span>
              Gesamt-Umsatz: {formatCurrency(filteredCustomers.reduce((sum, c) => sum + c.totalSpent, 0))}
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}
