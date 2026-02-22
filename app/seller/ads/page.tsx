"use client"

import { useState } from "react"
import {
  Megaphone, Eye, MousePointerClick, TrendingUp, Wallet,
  BarChart3, Search, LayoutGrid, Home, ShoppingBag, Hash,
  ToggleLeft, ToggleRight, Plus, Target, ArrowUpRight,
  ArrowDownRight, CircleDollarSign, Percent, Sparkles, CalendarRange
} from "lucide-react"
import {
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts"

// --- OKLCH Color Palette ---
const colors = {
  purple: "oklch(0.65 0.15 250)",
  green: "oklch(0.72 0.19 145)",
  gold: "oklch(0.78 0.14 85)",
  red: "oklch(0.7 0.15 25)",
  blue: "oklch(0.65 0.18 260)",
}

// --- Chart hex approximations for recharts (recharts needs hex/rgb) ---
const chartColors = {
  purple: "#7c6cdb",
  green: "#3dbd6e",
  gold: "#c9a84c",
  red: "#d46a4a",
  blue: "#5579e6",
}

// --- Stats Cards Data ---
const statsCards = [
  { label: "Aktive Anzeigen", value: "12", icon: Megaphone, color: colors.purple, trend: "+3", up: true },
  { label: "Tagesbudget", value: "\u20AC85", icon: Wallet, color: colors.green, trend: "+\u20AC15", up: true },
  { label: "Heutige Impressionen", value: "3.240", icon: Eye, color: colors.blue, trend: "+18%", up: true },
  { label: "Heutige Klicks", value: "187", icon: MousePointerClick, color: colors.gold, trend: "+24", up: true },
  { label: "CTR", value: "5,8%", icon: Percent, color: colors.red, trend: "+0,4%", up: true },
]

// --- 30-Day Ad Spend vs Revenue ---
function generateDailyData() {
  const data = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const day = date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })
    const ausgaben = Math.round(50 + Math.random() * 70)
    const einnahmen = Math.round(200 + Math.random() * 400)
    data.push({ day, Ausgaben: ausgaben, Einnahmen: einnahmen })
  }
  return data
}
const dailyData = generateDailyData()

// --- Active Ads ---
const activeAds = [
  { id: 1, name: "Oversized Blazer Schwarz", bid: 1.20, impressions: 8420, clicks: 512, ctr: 6.1, active: true, img: "OB" },
  { id: 2, name: "Satin Abendkleid Gold", bid: 0.95, impressions: 6130, clicks: 294, ctr: 4.8, active: true, img: "SA" },
  { id: 3, name: "Damen Wollmantel Beige", bid: 1.50, impressions: 11200, clicks: 687, ctr: 6.1, active: true, img: "DW" },
  { id: 4, name: "Vintage Lederhandtasche", bid: 0.80, impressions: 4750, clicks: 213, ctr: 4.5, active: false, img: "VL" },
  { id: 5, name: "High-Waist Jeans Blau", bid: 1.10, impressions: 9300, clicks: 558, ctr: 6.0, active: true, img: "HW" },
  { id: 6, name: "Kaschmir Pullover Grau", bid: 1.35, impressions: 7600, clicks: 418, ctr: 5.5, active: true, img: "KP" },
]

// --- Ad Placement Pie ---
const placementData = [
  { name: "Suchergebnisse", value: 45, color: chartColors.purple },
  { name: "Kategorie-Seiten", value: 28, color: chartColors.green },
  { name: "Startseite", value: 15, color: chartColors.gold },
  { name: "\u00C4hnliche Produkte", value: 12, color: chartColors.blue },
]

// --- Keyword Performance ---
const keywords = [
  { keyword: "oversized blazer", impressionen: 4200, klicks: 312, ctr: 7.4, cpc: 0.85, conversions: 28 },
  { keyword: "satin kleid", impressionen: 3800, klicks: 247, ctr: 6.5, cpc: 0.92, conversions: 19 },
  { keyword: "damen mantel", impressionen: 5100, klicks: 382, ctr: 7.5, cpc: 0.78, conversions: 34 },
  { keyword: "vintage tasche", impressionen: 2900, klicks: 168, ctr: 5.8, cpc: 1.05, conversions: 12 },
  { keyword: "high waist jeans", impressionen: 6200, klicks: 434, ctr: 7.0, cpc: 0.72, conversions: 41 },
  { keyword: "kaschmir pullover", impressionen: 3400, klicks: 198, ctr: 5.8, cpc: 0.95, conversions: 15 },
  { keyword: "sommerkleid lang", impressionen: 4700, klicks: 329, ctr: 7.0, cpc: 0.68, conversions: 31 },
  { keyword: "designer sneaker", impressionen: 3100, klicks: 186, ctr: 6.0, cpc: 1.12, conversions: 14 },
]

// --- Budget Forecast (7 days) ---
function generateForecast() {
  const data = []
  const now = new Date()
  let cumulativeSpend = 0
  let cumulativeBudget = 0
  const dailyBudget = 85
  for (let i = 0; i < 7; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() + i)
    const day = date.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit" })
    const projectedSpend = Math.round(65 + Math.random() * 35)
    cumulativeSpend += projectedSpend
    cumulativeBudget += dailyBudget
    data.push({
      day,
      "Progn. Ausgaben": cumulativeSpend,
      "Budget Limit": cumulativeBudget,
    })
  }
  return data
}
const forecastData = generateForecast()

// --- Custom Tooltip ---
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-4 py-3 text-xs shadow-xl border"
      style={{
        background: "oklch(0.13 0.02 260 / 0.95)",
        borderColor: "oklch(1 0 0 / 0.1)",
        backdropFilter: "blur(12px)",
      }}>
      <p className="font-semibold mb-1.5" style={{ color: "oklch(1 0 0 / 0.7)" }}>{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.color }} />
          <span style={{ color: "oklch(1 0 0 / 0.5)" }}>{entry.name}:</span>
          <span className="font-semibold" style={{ color: entry.color }}>
            {entry.name.includes("CTR") ? `${entry.value}%` : `\u20AC${entry.value.toLocaleString("de-DE")}`}
          </span>
        </p>
      ))}
    </div>
  )
}

export default function AdsPromotionsPage() {
  const [ads, setAds] = useState(activeAds)
  const [selectedPlacement, setSelectedPlacement] = useState<number | null>(null)

  const toggleAd = (id: number) => {
    setAds(prev => prev.map(ad => ad.id === id ? { ...ad, active: !ad.active } : ad))
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Werbung & Promotions</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: `color-mix(in oklch, ${colors.purple} 15%, transparent)`, color: colors.purple }}>
                Marketing
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Verwalte deine Anzeigen, Budgets und Kampagnen-Performance auf einen Blick.
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
            style={{ background: colors.green }}
          >
            <Plus className="w-4 h-4" />
            Neue Anzeige
          </button>
        </div>

        {/* === 1. Stats Cards === */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
          {statsCards.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="seller-card p-4 md:p-5 transition-all duration-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `color-mix(in oklch, ${stat.color} 12%, transparent)` }}>
                    <Icon className="w-5 h-5" style={{ color: stat.color }} />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold"
                    style={{ color: stat.up ? colors.green : colors.red }}>
                    {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {stat.trend}
                  </div>
                </div>
                <p className="text-[12px] md:text-[13px] text-muted-foreground mb-0.5">{stat.label}</p>
                <p className="text-xl md:text-2xl font-bold tracking-tight">{stat.value}</p>
              </div>
            )
          })}
        </div>

        {/* === 2. Daily Ad Spend vs Revenue AreaChart === */}
        <div className="seller-card p-5 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base md:text-lg font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5" style={{ color: colors.gold }} />
              Tgl. Werbeausgaben vs. Einnahmen
            </h2>
            <span className="text-xs text-muted-foreground">Letzte 30 Tage</span>
          </div>
          <div className="w-full h-[280px] md:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradAusgaben" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.red} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={chartColors.red} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradEinnahmen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.green} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={chartColors.green} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                <XAxis dataKey="day" tick={{ fill: "oklch(1 0 0 / 0.4)", fontSize: 11 }} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={{ fill: "oklch(1 0 0 / 0.4)", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `\u20AC${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Area type="monotone" dataKey="Einnahmen" stroke={chartColors.green} fill="url(#gradEinnahmen)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="Ausgaben" stroke={chartColors.red} fill="url(#gradAusgaben)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* === 3. Active Ads Grid === */}
        <div className="seller-card p-5 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base md:text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: colors.purple }} />
              Aktive Anzeigen
            </h2>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: `color-mix(in oklch, ${colors.green} 12%, transparent)`, color: colors.green }}>
              {ads.filter(a => a.active).length} aktiv
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ads.map((ad) => (
              <div key={ad.id}
                className="rounded-xl p-4 transition-all duration-200 border"
                style={{
                  background: ad.active
                    ? "oklch(0.12 0.02 260 / 0.5)"
                    : "oklch(0.1 0.01 260 / 0.3)",
                  borderColor: ad.active
                    ? "oklch(1 0 0 / 0.08)"
                    : "oklch(1 0 0 / 0.04)",
                  opacity: ad.active ? 1 : 0.6,
                }}>
                {/* Ad header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold"
                      style={{
                        background: `color-mix(in oklch, ${colors.purple} 15%, transparent)`,
                        color: colors.purple,
                      }}>
                      {ad.img}
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{ad.name}</p>
                      <p className="text-[11px] text-muted-foreground">Gebot: {"\u20AC"}{ad.bid.toFixed(2)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAd(ad.id)}
                    className="transition-all duration-200 hover:scale-110"
                    title={ad.active ? "Pausieren" : "Aktivieren"}
                  >
                    {ad.active ? (
                      <ToggleRight className="w-7 h-7" style={{ color: colors.green }} />
                    ) : (
                      <ToggleLeft className="w-7 h-7" style={{ color: "oklch(1 0 0 / 0.25)" }} />
                    )}
                  </button>
                </div>
                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg px-2.5 py-2 text-center"
                    style={{ background: `color-mix(in oklch, ${colors.blue} 8%, transparent)` }}>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Impressionen</p>
                    <p className="text-sm font-bold" style={{ color: colors.blue }}>
                      {ad.impressions.toLocaleString("de-DE")}
                    </p>
                  </div>
                  <div className="rounded-lg px-2.5 py-2 text-center"
                    style={{ background: `color-mix(in oklch, ${colors.gold} 8%, transparent)` }}>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Klicks</p>
                    <p className="text-sm font-bold" style={{ color: colors.gold }}>
                      {ad.clicks.toLocaleString("de-DE")}
                    </p>
                  </div>
                  <div className="rounded-lg px-2.5 py-2 text-center"
                    style={{ background: `color-mix(in oklch, ${colors.green} 8%, transparent)` }}>
                    <p className="text-[10px] text-muted-foreground mb-0.5">CTR</p>
                    <p className="text-sm font-bold" style={{ color: colors.green }}>
                      {ad.ctr.toFixed(1)}%
                    </p>
                  </div>
                </div>
                {/* Status bar */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden"
                    style={{ background: "oklch(1 0 0 / 0.06)" }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(ad.ctr * 14, 100)}%`,
                        background: ad.active ? colors.green : "oklch(1 0 0 / 0.15)",
                      }} />
                  </div>
                  <span className="text-[10px] font-medium"
                    style={{ color: ad.active ? colors.green : "oklch(1 0 0 / 0.3)" }}>
                    {ad.active ? "Aktiv" : "Pausiert"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* === 4 & 5. Placement Pie + Keyword Table side by side === */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">

          {/* 4. Ad Placement PieChart */}
          <div className="lg:col-span-2 seller-card p-5 md:p-6">
            <h2 className="text-base md:text-lg font-bold flex items-center gap-2 mb-5">
              <Target className="w-5 h-5" style={{ color: colors.blue }} />
              Anzeigenplatzierung
            </h2>
            <div className="w-full h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={placementData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    onMouseEnter={(_, index) => setSelectedPlacement(index)}
                    onMouseLeave={() => setSelectedPlacement(null)}
                    stroke="none"
                  >
                    {placementData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color}
                        opacity={selectedPlacement === null || selectedPlacement === index ? 1 : 0.35}
                        style={{ transition: "opacity 0.2s ease" }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, "Anteil"]}
                    contentStyle={{
                      background: "oklch(0.13 0.02 260 / 0.95)",
                      border: "1px solid oklch(1 0 0 / 0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              {placementData.map((item) => {
                const icons: Record<string, any> = {
                  "Suchergebnisse": Search,
                  "Kategorie-Seiten": LayoutGrid,
                  "Startseite": Home,
                  "\u00C4hnliche Produkte": ShoppingBag,
                }
                const LIcon = icons[item.name] || Search
                return (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center"
                      style={{ background: `color-mix(in oklch, ${item.color} 20%, transparent)` }}>
                      <LIcon className="w-3.5 h-3.5" style={{ color: item.color }} />
                    </div>
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-bold ml-auto">{item.value}%</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 5. Keyword Performance Table */}
          <div className="lg:col-span-3 seller-card p-5 md:p-6">
            <h2 className="text-base md:text-lg font-bold flex items-center gap-2 mb-5">
              <Hash className="w-5 h-5" style={{ color: colors.gold }} />
              Keyword-Performance
            </h2>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground"
                    style={{ borderBottom: "1px solid oklch(1 0 0 / 0.06)" }}>
                    <th className="text-left pb-3 pl-2 font-semibold">Keyword</th>
                    <th className="text-right pb-3 font-semibold">Impr.</th>
                    <th className="text-right pb-3 font-semibold">Klicks</th>
                    <th className="text-right pb-3 font-semibold">CTR</th>
                    <th className="text-right pb-3 font-semibold">CPC</th>
                    <th className="text-right pb-3 pr-2 font-semibold">Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {keywords.map((kw, i) => (
                    <tr key={kw.keyword}
                      className="transition-colors duration-150"
                      style={{
                        borderBottom: i < keywords.length - 1 ? "1px solid oklch(1 0 0 / 0.04)" : "none",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "oklch(1 0 0 / 0.03)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="py-2.5 pl-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold"
                            style={{
                              background: `color-mix(in oklch, ${colors.purple} 12%, transparent)`,
                              color: colors.purple,
                            }}>
                            {i + 1}
                          </span>
                          <span className="font-medium">{kw.keyword}</span>
                        </div>
                      </td>
                      <td className="text-right py-2.5 text-muted-foreground">
                        {kw.impressionen.toLocaleString("de-DE")}
                      </td>
                      <td className="text-right py-2.5 font-semibold">
                        {kw.klicks.toLocaleString("de-DE")}
                      </td>
                      <td className="text-right py-2.5">
                        <span className="px-1.5 py-0.5 rounded-md text-xs font-semibold"
                          style={{
                            background: `color-mix(in oklch, ${kw.ctr >= 7.0 ? colors.green : colors.gold} 12%, transparent)`,
                            color: kw.ctr >= 7.0 ? colors.green : colors.gold,
                          }}>
                          {kw.ctr.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-right py-2.5 text-muted-foreground">
                        {"\u20AC"}{kw.cpc.toFixed(2)}
                      </td>
                      <td className="text-right py-2.5 pr-2 font-bold" style={{ color: colors.green }}>
                        {kw.conversions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Summary row */}
            <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-3"
              style={{ borderTop: "1px solid oklch(1 0 0 / 0.06)" }}>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-muted-foreground">Gesamt:</span>
                <span className="font-semibold">{keywords.reduce((s, k) => s + k.impressionen, 0).toLocaleString("de-DE")} Impr.</span>
                <span className="font-semibold">{keywords.reduce((s, k) => s + k.klicks, 0).toLocaleString("de-DE")} Klicks</span>
                <span className="font-semibold" style={{ color: colors.green }}>
                  {keywords.reduce((s, k) => s + k.conversions, 0)} Conv.
                </span>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CircleDollarSign className="w-3.5 h-3.5" style={{ color: colors.gold }} />
                Durchschn. CPC: {"\u20AC"}{(keywords.reduce((s, k) => s + k.cpc, 0) / keywords.length).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* === 6. Budget Forecast LineChart === */}
        <div className="seller-card p-5 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base md:text-lg font-bold flex items-center gap-2">
              <CalendarRange className="w-5 h-5" style={{ color: colors.green }} />
              Budget-Prognose
            </h2>
            <span className="text-xs text-muted-foreground">N{"\u00E4"}chste 7 Tage</span>
          </div>
          <div className="w-full h-[260px] md:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                <XAxis dataKey="day" tick={{ fill: "oklch(1 0 0 / 0.4)", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "oklch(1 0 0 / 0.4)", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `\u20AC${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line
                  type="monotone"
                  dataKey="Progn. Ausgaben"
                  stroke={chartColors.purple}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: chartColors.purple, strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="Budget Limit"
                  stroke={chartColors.red}
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={{ r: 3, fill: chartColors.red, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Budget summary */}
          <div className="mt-4 pt-3 grid grid-cols-2 md:grid-cols-4 gap-3"
            style={{ borderTop: "1px solid oklch(1 0 0 / 0.06)" }}>
            {[
              { label: "Tagesbudget", value: "\u20AC85", color: colors.green },
              { label: "Wochenbudget", value: "\u20AC595", color: colors.blue },
              { label: "Progn. Ausgaben", value: `\u20AC${forecastData[forecastData.length - 1]?.["Progn. Ausgaben"] || 0}`, color: colors.purple },
              {
                label: "Verbleibend",
                value: `\u20AC${Math.max(0, 595 - (forecastData[forecastData.length - 1]?.["Progn. Ausgaben"] || 0))}`,
                color: colors.gold,
              },
            ].map((item) => (
              <div key={item.label} className="rounded-xl px-3 py-2.5 text-center"
                style={{ background: `color-mix(in oklch, ${item.color} 8%, transparent)` }}>
                <p className="text-[10px] text-muted-foreground mb-0.5">{item.label}</p>
                <p className="text-sm font-bold" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: "Bestseller bewerben",
              desc: "Produkte mit guten Bewertungen konvertieren 3x besser bei Werbung.",
              color: colors.green,
              icon: TrendingUp,
            },
            {
              title: "Optimales Timing",
              desc: "Kampagnen performen am besten an Werktag-Abenden und Wochenenden.",
              color: colors.purple,
              icon: CalendarRange,
            },
            {
              title: "A/B-Tests nutzen",
              desc: "Teste verschiedene Bilder und Beschreibungen, um die beste Performance zu finden.",
              color: colors.gold,
              icon: Target,
            },
          ].map((tip) => {
            const TipIcon = tip.icon
            return (
              <div key={tip.title} className="seller-card p-5 transition-all duration-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: `color-mix(in oklch, ${tip.color} 12%, transparent)` }}>
                    <TipIcon className="w-4 h-4" style={{ color: tip.color }} />
                  </div>
                  <h3 className="text-sm font-semibold">{tip.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{tip.desc}</p>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
