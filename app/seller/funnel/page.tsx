"use client"

import { useState } from "react"
import {
  Filter, Eye, ShoppingCart, CreditCard, CheckCircle2,
  TrendingDown, Monitor, Smartphone, Tablet, Search,
  Share2, Globe, Mail, Megaphone, Clock, ArrowDown,
  BarChart3, Zap, MousePointerClick, ArrowRight
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
  FunnelChart, Funnel, LabelList, Legend
} from "recharts"

// ─── OKLCH COLORS ─────────────────────────────────────
const PURPLE = "oklch(0.65 0.15 250)"
const GREEN = "oklch(0.72 0.19 145)"
const GOLD = "oklch(0.78 0.14 85)"
const RED = "oklch(0.7 0.15 25)"
const BLUE = "oklch(0.65 0.18 260)"

// Hex fallbacks for recharts (SVG doesn't support oklch)
const PURPLE_HEX = "#7c5cbf"
const GREEN_HEX = "#4caf50"
const GOLD_HEX = "#d4a017"
const RED_HEX = "#d35450"
const BLUE_HEX = "#5b7fd6"

// ─── FUNNEL DATA ──────────────────────────────────────
const funnelStages = [
  { name: "Seitenbesuche", value: 7489, icon: Globe, color: BLUE, hex: BLUE_HEX },
  { name: "Produktansichten", value: 4234, icon: Eye, color: PURPLE, hex: PURPLE_HEX },
  { name: "Warenkorb", value: 892, icon: ShoppingCart, color: GOLD, hex: GOLD_HEX },
  { name: "Checkout", value: 567, icon: CreditCard, color: RED_HEX, hex: RED_HEX },
  { name: "Kauf", value: 284, icon: CheckCircle2, color: GREEN, hex: GREEN_HEX },
]

const funnelChartData = funnelStages.map((s) => ({
  name: s.name,
  value: s.value,
  fill: s.hex,
}))

// ─── CONVERSION STATS ─────────────────────────────────
const conversionStats = [
  { label: "Warenkorb-Rate", value: "21,1%", raw: 21.1, desc: "Ansichten \u2192 Warenkorb", icon: ShoppingCart, color: GOLD, hex: GOLD_HEX },
  { label: "Checkout-Rate", value: "63,6%", raw: 63.6, desc: "Warenkorb \u2192 Checkout", icon: CreditCard, color: PURPLE, hex: PURPLE_HEX },
  { label: "Kaufrate", value: "50,1%", raw: 50.1, desc: "Checkout \u2192 Kauf", icon: CheckCircle2, color: GREEN, hex: GREEN_HEX },
  { label: "Gesamt", value: "3,8%", raw: 3.8, desc: "Besuche \u2192 Kauf", icon: Zap, color: BLUE, hex: BLUE_HEX },
]

// ─── 30-DAY CONVERSION TREND ─────────────────────────
const conversionTrend = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1
  const base = 3.5
  const noise = Math.sin(i * 0.7) * 0.6 + Math.cos(i * 1.3) * 0.4
  const trend = i * 0.015
  const rate = Math.max(2.8, Math.min(4.5, base + noise + trend))
  return {
    tag: `${day < 10 ? "0" : ""}${day}.01`,
    rate: parseFloat(rate.toFixed(1)),
  }
})

// ─── DROP-OFF ANALYSIS ────────────────────────────────
const dropoffData = [
  { step: "Besuche \u2192 Ansichten", dropoff: 3255, rate: 43.5, color: BLUE_HEX },
  { step: "Ansichten \u2192 Warenkorb", dropoff: 3342, rate: 78.9, color: PURPLE_HEX },
  { step: "Warenkorb \u2192 Checkout", dropoff: 325, rate: 36.4, color: GOLD_HEX },
  { step: "Checkout \u2192 Kauf", dropoff: 283, rate: 49.9, color: RED_HEX },
]

// ─── DEVICE BREAKDOWN ─────────────────────────────────
const deviceData = [
  { name: "Mobile", value: 51, icon: Smartphone, color: PURPLE, hex: PURPLE_HEX },
  { name: "Desktop", value: 42, icon: Monitor, color: GREEN, hex: GREEN_HEX },
  { name: "Tablet", value: 7, icon: Tablet, color: GOLD, hex: GOLD_HEX },
]

// ─── TRAFFIC SOURCES ──────────────────────────────────
const trafficSources = [
  { source: "Organische Suche", icon: Search, visitors: 2890, conversion: 4.2, share: 38.6, color: GREEN, hex: GREEN_HEX },
  { source: "Social Media", icon: Share2, visitors: 1870, conversion: 3.1, share: 25.0, color: PURPLE, hex: PURPLE_HEX },
  { source: "Direkt", icon: Globe, visitors: 1420, conversion: 5.6, share: 19.0, color: BLUE, hex: BLUE_HEX },
  { source: "E-Mail", icon: Mail, visitors: 785, conversion: 6.8, share: 10.5, color: GOLD, hex: GOLD_HEX },
  { source: "Werbung", icon: Megaphone, visitors: 524, conversion: 2.4, share: 7.0, color: RED, hex: RED_HEX },
]

// ─── TIME TO PURCHASE ─────────────────────────────────
const timeToPurchase = [
  { range: "Sofort", pct: 15, color: GREEN_HEX },
  { range: "< 1 Std.", pct: 22, color: BLUE_HEX },
  { range: "1-24 Std.", pct: 35, color: PURPLE_HEX },
  { range: "1-7 Tage", pct: 18, color: GOLD_HEX },
  { range: "> 7 Tage", pct: 10, color: RED_HEX },
]

// ─── CUSTOM TOOLTIP ───────────────────────────────────
function CustomTooltip({ active, payload, label, suffix }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-lg border"
      style={{ background: "oklch(0.16 0.01 260)", borderColor: "oklch(0.25 0.01 260)" }}>
      <p className="font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-bold" style={{ color: p.color || p.stroke }}>
          {typeof p.value === "number" ? p.value.toLocaleString("de-DE") : p.value}{suffix || ""}
        </p>
      ))}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────
export default function FunnelPage() {
  const [activeDevice, setActiveDevice] = useState<number | null>(null)

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `color-mix(in oklch, ${PURPLE} 15%, transparent)` }}>
              <Filter className="w-5 h-5" style={{ color: PURPLE }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Sales Funnel</h1>
              <p className="text-sm text-muted-foreground">
                Kundenweg vom Entdecken bis zum Kauf analysieren
              </p>
            </div>
          </div>
        </div>

        {/* ─── 1. VISUAL FUNNEL CHART ───────────────────── */}
        <div className="seller-card p-6 mb-6">
          <h2 className="text-base font-bold mb-2">Verkaufstrichter</h2>
          <p className="text-xs text-muted-foreground mb-6">Konversion durch jede Phase des Kaufprozesses</p>

          {/* Visual stacked funnel */}
          <div className="flex flex-col items-center gap-1 mb-6">
            {funnelStages.map((stage, i) => {
              const widthPct = 100 - (i * 16)
              const Icon = stage.icon
              const prevValue = i > 0 ? funnelStages[i - 1].value : null
              const convRate = prevValue ? ((stage.value / prevValue) * 100).toFixed(1) : null
              return (
                <div key={stage.name} className="w-full flex flex-col items-center">
                  {convRate && (
                    <div className="flex items-center gap-1.5 py-2">
                      <ArrowDown className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-mono font-medium" style={{ color: GOLD }}>{convRate}%</span>
                      <span className="text-[10px] text-muted-foreground">Konversion</span>
                    </div>
                  )}
                  <div
                    className="relative rounded-xl flex items-center justify-between px-6 py-4 transition-all duration-500"
                    style={{
                      width: `${widthPct}%`,
                      background: `color-mix(in oklch, ${stage.color} 12%, transparent)`,
                      border: `1px solid color-mix(in oklch, ${stage.color} 25%, transparent)`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" style={{ color: stage.color }} />
                      <span className="text-sm font-semibold">{stage.name}</span>
                    </div>
                    <span className="text-lg font-bold" style={{ color: stage.color }}>
                      {stage.value.toLocaleString("de-DE")}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Recharts bar-based funnel visualization */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelChartData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 260)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "oklch(0.5 0 0)", fontSize: 11 }} tickFormatter={(v) => v.toLocaleString("de-DE")} />
                <YAxis type="category" dataKey="name" tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }} width={110} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                  {funnelChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Overall conversion */}
          <div className="mt-4 p-4 rounded-xl flex items-center justify-between"
            style={{ background: `color-mix(in oklch, ${GREEN} 8%, transparent)`, border: `1px solid color-mix(in oklch, ${GREEN} 20%, transparent)` }}>
            <span className="text-sm font-semibold">Gesamte Konversionsrate (Besuche &rarr; Kauf)</span>
            <span className="text-lg font-bold" style={{ color: GREEN }}>3,8%</span>
          </div>
        </div>

        {/* ─── 2. CONVERSION STATS CARDS ────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {conversionStats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <div key={i} className="seller-card p-5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `color-mix(in oklch, ${stat.color} 12%, transparent)` }}>
                  <Icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{stat.desc}</p>
              </div>
            )
          })}
        </div>

        {/* ─── 3. CONVERSION TREND (30 DAYS) ────────────── */}
        <div className="seller-card p-6 mb-6">
          <h2 className="text-base font-bold flex items-center gap-2 mb-1">
            <MousePointerClick className="w-5 h-5" style={{ color: GREEN }} />
            Konversionstrend (30 Tage)
          </h2>
          <p className="text-xs text-muted-foreground mb-5">T&auml;gliche Konversionsrate zwischen 2,8% und 4,5%</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={conversionTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 260)" />
                <XAxis
                  dataKey="tag"
                  tick={{ fill: "oklch(0.5 0 0)", fontSize: 10 }}
                  interval={4}
                />
                <YAxis
                  domain={[2.5, 5]}
                  tick={{ fill: "oklch(0.5 0 0)", fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<CustomTooltip suffix="%" />} />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke={GREEN_HEX}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: GREEN_HEX, stroke: "#fff", strokeWidth: 2 }}
                />
                {/* Reference area for healthy range */}
                <defs>
                  <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GREEN_HEX} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={GREEN_HEX} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {/* ─── 4. DROP-OFF ANALYSIS BAR CHART ────────── */}
          <div className="seller-card p-6">
            <h2 className="text-base font-bold flex items-center gap-2 mb-1">
              <TrendingDown className="w-5 h-5" style={{ color: RED }} />
              Abbruchanalyse
            </h2>
            <p className="text-xs text-muted-foreground mb-5">Verluste zwischen den einzelnen Schritten</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dropoffData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 260)" />
                  <XAxis
                    dataKey="step"
                    tick={{ fill: "oklch(0.5 0 0)", fontSize: 9 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fill: "oklch(0.5 0 0)", fontSize: 11 }} tickFormatter={(v) => v.toLocaleString("de-DE")} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="dropoff" name="Abbruch" radius={[6, 6, 0, 0]} barSize={36}>
                    {dropoffData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Drop-off rate summary */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {dropoffData.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg"
                  style={{ background: "oklch(0.14 0.01 260)" }}>
                  <span className="text-[10px] text-muted-foreground truncate mr-2">{d.step}</span>
                  <span className="text-xs font-bold" style={{ color: RED }}>{d.rate}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── 5. DEVICE BREAKDOWN PIE CHART ─────────── */}
          <div className="seller-card p-6">
            <h2 className="text-base font-bold flex items-center gap-2 mb-1">
              <Monitor className="w-5 h-5" style={{ color: PURPLE }} />
              Ger&auml;teverteilung
            </h2>
            <p className="text-xs text-muted-foreground mb-5">Anteil der Besucher nach Ger&auml;tetyp</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    onMouseEnter={(_, i) => setActiveDevice(i)}
                    onMouseLeave={() => setActiveDevice(null)}
                    stroke="none"
                  >
                    {deviceData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.hex}
                        opacity={activeDevice === null || activeDevice === i ? 1 : 0.4}
                        style={{ transition: "opacity 0.3s ease" }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload
                      return (
                        <div className="rounded-xl px-3 py-2 text-xs shadow-lg border"
                          style={{ background: "oklch(0.16 0.01 260)", borderColor: "oklch(0.25 0.01 260)" }}>
                          <p className="font-bold" style={{ color: d.hex }}>{d.name}: {d.value}%</p>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Device legend cards */}
            <div className="space-y-3 mt-2">
              {deviceData.map((d) => {
                const Icon = d.icon
                return (
                  <div key={d.name} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: "oklch(0.14 0.01 260)" }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `color-mix(in oklch, ${d.color} 12%, transparent)` }}>
                      <Icon className="w-4 h-4" style={{ color: d.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{d.name}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold" style={{ color: d.color }}>{d.value}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {/* ─── 6. TRAFFIC SOURCES TABLE ───────────────── */}
          <div className="seller-card p-6">
            <h2 className="text-base font-bold flex items-center gap-2 mb-1">
              <BarChart3 className="w-5 h-5" style={{ color: BLUE }} />
              Traffic-Quellen
            </h2>
            <p className="text-xs text-muted-foreground mb-5">Besucherquellen mit Konversionsraten</p>
            <div className="overflow-hidden rounded-xl border" style={{ borderColor: "oklch(0.25 0.01 260)" }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "oklch(0.14 0.01 260)" }}>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Quelle</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Besucher</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Anteil</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Konversion</th>
                  </tr>
                </thead>
                <tbody>
                  {trafficSources.map((s, i) => {
                    const Icon = s.icon
                    return (
                      <tr key={i} className="transition-colors duration-200"
                        style={{ borderTop: "1px solid oklch(0.2 0.01 260)" }}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: `color-mix(in oklch, ${s.color} 12%, transparent)` }}>
                              <Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                            </div>
                            <span className="font-medium">{s.source}</span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 font-mono">{s.visitors.toLocaleString("de-DE")}</td>
                        <td className="text-right py-3 px-4">
                          <span className="font-mono">{s.share}%</span>
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className="font-bold" style={{ color: s.hex }}>{s.conversion}%</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {/* Traffic sources bar chart */}
            <div className="h-48 mt-5">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={trafficSources.map(s => ({ name: s.source, konversion: s.conversion, fill: s.hex }))}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 260)" />
                  <XAxis dataKey="name" tick={{ fill: "oklch(0.5 0 0)", fontSize: 9 }} />
                  <YAxis tick={{ fill: "oklch(0.5 0 0)", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<CustomTooltip suffix="%" />} />
                  <Bar dataKey="konversion" name="Konversionsrate" radius={[6, 6, 0, 0]} barSize={30}>
                    {trafficSources.map((s, i) => (
                      <Cell key={i} fill={s.hex} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ─── 7. TIME TO PURCHASE BAR CHART ─────────── */}
          <div className="seller-card p-6">
            <h2 className="text-base font-bold flex items-center gap-2 mb-1">
              <Clock className="w-5 h-5" style={{ color: PURPLE }} />
              Zeit bis zum Kauf
            </h2>
            <p className="text-xs text-muted-foreground mb-5">Wie lange Kunden vom ersten Besuch bis zum Kauf brauchen</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeToPurchase} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 260)" />
                  <XAxis dataKey="range" tick={{ fill: "oklch(0.5 0 0)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "oklch(0.5 0 0)", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<CustomTooltip suffix="%" />} />
                  <Bar dataKey="pct" name="Anteil" radius={[6, 6, 0, 0]} barSize={40}>
                    {timeToPurchase.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Summary cards */}
            <div className="space-y-2 mt-4">
              {timeToPurchase.map((t, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{ background: "oklch(0.14 0.01 260)" }}>
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: t.color }} />
                  <span className="text-xs text-muted-foreground flex-1">{t.range}</span>
                  <div className="flex-1">
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.2 0 0)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(t.pct / 35) * 100}%`, background: t.color, transition: "width 0.6s ease" }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-bold w-10 text-right" style={{ color: t.color }}>{t.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
