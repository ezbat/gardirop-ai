"use client"

import { useState } from "react"
import {
  Package, AlertTriangle, XCircle, TrendingUp, TrendingDown,
  BarChart3, RefreshCw, ShoppingBag, Layers, Ruler,
  Clock, ArrowRight, Euro, PieChart as PieChartIcon
} from "lucide-react"
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, AreaChart, Area, ReferenceLine, Legend
} from "recharts"

// ─── OKLCH COLORS ───────────────────────────────────────
const COLORS = {
  purple: "oklch(0.65 0.15 250)",
  green: "oklch(0.72 0.19 145)",
  gold: "oklch(0.78 0.14 85)",
  red: "oklch(0.7 0.15 25)",
  blue: "oklch(0.65 0.18 260)",
}

// Hex fallbacks for recharts (recharts needs hex/rgb)
const HEX = {
  purple: "#7c6fef",
  green: "#4caf7c",
  gold: "#c9a84c",
  red: "#d4654a",
  blue: "#5b7fe8",
  gray: "#6b7280",
}

// ─── MOCK DATA ──────────────────────────────────────────

// Stock level pie chart data
const stockLevelData = [
  { name: "Gut (>20)", value: 68, color: HEX.green },
  { name: "Mittel (5-20)", value: 20, color: HEX.gold },
  { name: "Niedrig (<5)", value: 8, color: HEX.red },
  { name: "Ausverkauft", value: 4, color: HEX.gray },
]

// Stock movement line chart data (30 days)
function generateMovementData() {
  const data = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const day = date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })
    data.push({
      tag: day,
      eingang: Math.floor(Math.random() * 30) + 5,
      ausgang: Math.floor(Math.random() * 25) + 8,
    })
  }
  return data
}
const movementData = generateMovementData()

// Low stock alerts table
const lowStockProducts = [
  { id: 1, name: "Oversized Blazer Schwarz M", sku: "WR-BLZ-001", bestand: 3, rate: 2.1, tage: 1 },
  { id: 2, name: "Satin Midikleid Bordeaux S", sku: "WR-KLD-012", bestand: 2, rate: 1.8, tage: 1 },
  { id: 3, name: "Cargo Hose Beige L", sku: "WR-HSE-045", bestand: 4, rate: 1.5, tage: 3 },
  { id: 4, name: "Cropped Strickjacke Creme M", sku: "WR-STR-078", bestand: 1, rate: 0.9, tage: 1 },
  { id: 5, name: "High-Waist Jeans Dunkelblau S", sku: "WR-JNS-023", bestand: 3, rate: 2.5, tage: 1 },
  { id: 6, name: "Lederimitat Jacke Schwarz L", sku: "WR-JCK-034", bestand: 2, rate: 1.2, tage: 2 },
  { id: 7, name: "Plissee Rock Smaragd M", sku: "WR-ROK-056", bestand: 4, rate: 1.0, tage: 4 },
  { id: 8, name: "Turtleneck Pullover Grau XL", sku: "WR-PUL-089", bestand: 1, rate: 0.7, tage: 1 },
  { id: 9, name: "Wickelbluse Wei\u00df S", sku: "WR-BLS-067", bestand: 3, rate: 1.6, tage: 2 },
  { id: 10, name: "Palazzo Hose Schwarz M", sku: "WR-HSE-091", bestand: 2, rate: 1.3, tage: 2 },
  { id: 11, name: "Denim Jacke Vintage L", sku: "WR-JCK-015", bestand: 4, rate: 0.8, tage: 5 },
  { id: 12, name: "Bodycon Kleid Schwarz XS", sku: "WR-KLD-042", bestand: 1, rate: 1.1, tage: 1 },
]

// Category stock bar chart
const categoryData = [
  { kategorie: "Kleider", bestand: 42 },
  { kategorie: "Blazer", bestand: 28 },
  { kategorie: "Hosen", bestand: 35 },
  { kategorie: "R\u00f6cke", bestand: 18 },
  { kategorie: "Jacken", bestand: 22 },
  { kategorie: "Strick", bestand: 15 },
  { kategorie: "Blusen", bestand: 31 },
  { kategorie: "Accessoires", bestand: 24 },
]

// Restock forecast area chart (30 days)
function generateForecastData() {
  const data = []
  let stock = 156
  const now = new Date()
  for (let i = 0; i <= 30; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() + i)
    const day = date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })
    data.push({
      tag: day,
      bestand: Math.max(0, Math.round(stock)),
      nachbestellpunkt: 40,
    })
    stock -= (Math.random() * 5) + 2
  }
  return data
}
const forecastData = generateForecastData()

// Size distribution bar chart
const sizeData = [
  { groesse: "XS", bestand: 18 },
  { groesse: "S", bestand: 35 },
  { groesse: "M", bestand: 48 },
  { groesse: "L", bestand: 32 },
  { groesse: "XL", bestand: 23 },
]

// Recently restocked
const recentRestocked = [
  { name: "Wollmantel Camel M", menge: 25, datum: "14.02.2026", sku: "WR-MNT-011" },
  { name: "Seidenbluse Ivory S", menge: 15, datum: "13.02.2026", sku: "WR-BLS-088" },
  { name: "Jogginghose Anthrazit L", menge: 30, datum: "12.02.2026", sku: "WR-HSE-033" },
  { name: "Strickkleid Taupe M", menge: 20, datum: "11.02.2026", sku: "WR-KLD-077" },
  { name: "Leinenblazer Sand S", menge: 12, datum: "10.02.2026", sku: "WR-BLZ-055" },
]

// ─── STAT CARD ──────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  suffix,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
  suffix?: string
}) {
  return (
    <div className="seller-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `color-mix(in oklch, ${color} 15%, transparent)` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <p className="text-[13px] text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold tracking-tight">
        {suffix === "\u20AC" ? `\u20AC${value}` : value}
      </p>
    </div>
  )
}

// ─── CUSTOM TOOLTIP ─────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs shadow-lg border border-white/[0.1]"
      style={{ background: "oklch(0.18 0.01 260)" }}
    >
      <p className="font-semibold text-white/80 mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.color }} />
          {entry.name}: <span className="font-bold">{entry.value}</span>
        </p>
      ))}
    </div>
  )
}

// ─── MAIN PAGE ──────────────────────────────────────────
export default function InventoryManagementPage() {
  const [reorderingIds, setReorderingIds] = useState<Set<number>>(new Set())

  const handleReorder = (id: number) => {
    setReorderingIds(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
    setTimeout(() => {
      setReorderingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 1500)
  }

  return (
    <div className="min-h-screen p-4 md:p-6 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ─── HEADER ──────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Bestandsverwaltung
              </h1>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background: `color-mix(in oklch, ${COLORS.purple} 15%, transparent)`,
                  color: COLORS.purple,
                }}
              >
                Live
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Lagerbestand, Warenbewegungen und Nachbestellungen im \u00dcberblick
            </p>
          </div>
          <button
            className="p-2.5 rounded-xl hover:bg-white/[0.06] transition-colors"
            title="Aktualisieren"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* ─── STATS CARDS ─────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Gesamtprodukte" value={156} icon={Package} color={COLORS.purple} />
          <StatCard label="Niedriger Bestand" value={12} icon={AlertTriangle} color={COLORS.gold} />
          <StatCard label="Ausverkauft" value={3} icon={XCircle} color={COLORS.red} />
          <StatCard label="Inventarwert" value="45.670" icon={Euro} color={COLORS.green} suffix={"\u20AC"} />
        </div>

        {/* ─── ROW: PIE CHART + LINE CHART ─────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Stock Level Pie Chart */}
          <div className="lg:col-span-2 seller-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <PieChartIcon className="w-4 h-4" style={{ color: COLORS.purple }} />
              <h2 className="text-sm font-semibold">Bestandslevel</h2>
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockLevelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {stockLevelData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {stockLevelData.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-muted-foreground truncate">{item.name}</span>
                  <span className="font-semibold ml-auto">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stock Movement Line Chart */}
          <div className="lg:col-span-3 seller-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4" style={{ color: COLORS.green }} />
              <h2 className="text-sm font-semibold">Warenbewegung (30 Tage)</h2>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={movementData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="tag"
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                    width={30}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="eingang"
                    name="Eingang"
                    stroke={HEX.green}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: HEX.green }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ausgang"
                    name="Ausgang"
                    stroke={HEX.red}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: HEX.red }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ─── LOW STOCK ALERTS TABLE ──────────────── */}
        <div className="seller-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: COLORS.gold }} />
              <h2 className="text-sm font-semibold">Niedrigbestand-Warnungen</h2>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  background: `color-mix(in oklch, ${COLORS.red} 15%, transparent)`,
                  color: COLORS.red,
                }}
              >
                {lowStockProducts.length} Artikel
              </span>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  className="border-b border-white/[0.08] text-left"
                  style={{ background: "oklch(0.15 0.02 260 / 0.5)" }}
                >
                  <th className="py-3 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Produkt</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">SKU</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Bestand</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Verkaufsrate/Tag</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Tage bis ausverkauft</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map((product) => (
                  <tr key={product.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium">{product.name}</p>
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-xs px-2 py-1 rounded-lg bg-white/[0.04] text-muted-foreground font-mono">
                        {product.sku}
                      </code>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold min-w-[32px]"
                        style={{
                          background: product.bestand <= 2
                            ? `color-mix(in oklch, ${COLORS.red} 15%, transparent)`
                            : `color-mix(in oklch, ${COLORS.gold} 15%, transparent)`,
                          color: product.bestand <= 2 ? COLORS.red : COLORS.gold,
                        }}
                      >
                        {product.bestand}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm text-muted-foreground">{product.rate.toFixed(1)}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: product.tage <= 1 ? COLORS.red : product.tage <= 3 ? COLORS.gold : COLORS.green }}
                      >
                        {product.tage} {product.tage === 1 ? "Tag" : "Tage"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleReorder(product.id)}
                        disabled={reorderingIds.has(product.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
                        style={{
                          background: reorderingIds.has(product.id)
                            ? `color-mix(in oklch, ${COLORS.green} 20%, transparent)`
                            : COLORS.gold,
                          color: reorderingIds.has(product.id) ? COLORS.green : "#000",
                        }}
                      >
                        {reorderingIds.has(product.id) ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Bestellt...
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-3 h-3" />
                            Nachbestellen
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {lowStockProducts.map((product) => (
              <div key={product.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <code className="text-[10px] text-muted-foreground font-mono">{product.sku}</code>
                  </div>
                  <span
                    className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold ml-2 flex-shrink-0"
                    style={{
                      background: product.bestand <= 2
                        ? `color-mix(in oklch, ${COLORS.red} 15%, transparent)`
                        : `color-mix(in oklch, ${COLORS.gold} 15%, transparent)`,
                      color: product.bestand <= 2 ? COLORS.red : COLORS.gold,
                    }}
                  >
                    {product.bestand} St\u00fcck
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>{product.rate.toFixed(1)}/Tag</span>
                    <span
                      className="font-semibold"
                      style={{ color: product.tage <= 1 ? COLORS.red : product.tage <= 3 ? COLORS.gold : COLORS.green }}
                    >
                      {product.tage}d \u00fcbrig
                    </span>
                  </div>
                  <button
                    onClick={() => handleReorder(product.id)}
                    disabled={reorderingIds.has(product.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-60"
                    style={{
                      background: reorderingIds.has(product.id)
                        ? `color-mix(in oklch, ${COLORS.green} 20%, transparent)`
                        : COLORS.gold,
                      color: reorderingIds.has(product.id) ? COLORS.green : "#000",
                    }}
                  >
                    {reorderingIds.has(product.id) ? "Bestellt..." : "Nachbestellen"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── ROW: CATEGORY BAR + RESTOCK FORECAST ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Category Stock Bar Chart (Horizontal) */}
          <div className="seller-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4" style={{ color: COLORS.blue }} />
              <h2 className="text-sm font-semibold">Bestand nach Kategorie</h2>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="kategorie"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="bestand"
                    name="Bestand"
                    fill={HEX.blue}
                    radius={[0, 6, 6, 0]}
                    barSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Restock Forecast Area Chart */}
          <div className="seller-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-4 h-4" style={{ color: COLORS.red }} />
              <h2 className="text-sm font-semibold">Nachbestellprognose (30 Tage)</h2>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="tag"
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                    interval={5}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                    width={35}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <defs>
                    <linearGradient id="bestandGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={HEX.purple} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={HEX.purple} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="bestand"
                    name="Progn. Bestand"
                    stroke={HEX.purple}
                    strokeWidth={2}
                    fill="url(#bestandGradient)"
                    activeDot={{ r: 4, fill: HEX.purple }}
                  />
                  <ReferenceLine
                    y={40}
                    stroke={HEX.red}
                    strokeDasharray="6 4"
                    strokeWidth={1.5}
                    label={{
                      value: "Nachbestellpunkt",
                      position: "insideTopRight",
                      fill: HEX.red,
                      fontSize: 10,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ─── ROW: SIZE DISTRIBUTION + RECENTLY RESTOCKED */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Size Distribution Bar Chart */}
          <div className="lg:col-span-3 seller-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Ruler className="w-4 h-4" style={{ color: COLORS.purple }} />
              <h2 className="text-sm font-semibold">Gr\u00f6\u00dfenverteilung</h2>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sizeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="groesse"
                    tick={{ fontSize: 12, fill: "#9ca3af", fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                    width={30}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="bestand"
                    name="Bestand"
                    radius={[6, 6, 0, 0]}
                    barSize={40}
                  >
                    {sizeData.map((entry, index) => {
                      const colors = [HEX.purple, HEX.blue, HEX.green, HEX.gold, HEX.red]
                      return <Cell key={index} fill={colors[index % colors.length]} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 mt-3">
              {sizeData.map((item, index) => {
                const colors = [HEX.purple, HEX.blue, HEX.green, HEX.gold, HEX.red]
                return (
                  <div key={item.groesse} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full" style={{ background: colors[index] }} />
                    {item.groesse}: <span className="font-semibold text-foreground">{item.bestand}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recently Restocked */}
          <div className="lg:col-span-2 seller-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4" style={{ color: COLORS.green }} />
              <h2 className="text-sm font-semibold">K\u00fcrzlich nachbestellt</h2>
            </div>
            <div className="space-y-3">
              {recentRestocked.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `color-mix(in oklch, ${COLORS.green} 15%, transparent)` }}
                  >
                    <ArrowRight className="w-4 h-4" style={{ color: COLORS.green }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <code className="font-mono">{item.sku}</code>
                      <span>\u00b7</span>
                      <span>{item.datum}</span>
                    </div>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: `color-mix(in oklch, ${COLORS.green} 15%, transparent)`,
                      color: COLORS.green,
                    }}
                  >
                    +{item.menge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── BOTTOM SPACER FOR MOBILE NAV ────────── */}
        <div className="h-4" />
      </div>
    </div>
  )
}
