"use client"

import { useState } from "react"
import {
  TrendingUp, TrendingDown, Search, Flame, Calendar,
  ArrowUpRight, ArrowDownRight, Sparkles, Target,
  Sun, Snowflake, Leaf, Cloud, ChevronRight, BarChart3,
  Palette, DollarSign, Shirt, Store, Gauge
} from "lucide-react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  RadialBarChart, RadialBar, Legend
} from "recharts"

// --- DATA ---

const trendingBanner = [
  { rank: 1, name: "Oversized Blazer", growth: 47, searches: "18.2K" },
  { rank: 2, name: "Nachhaltige Mode", growth: 34, searches: "14.6K" },
  { rank: 3, name: "Chunky Boots", growth: 29, searches: "11.3K" },
]

// 90-day search trend data (weekly aggregates)
const searchTrendData = (() => {
  const weeks = [
    "KW45", "KW46", "KW47", "KW48", "KW49", "KW50", "KW51", "KW52",
    "KW1", "KW2", "KW3", "KW4", "KW5", "KW6", "KW7"
  ]
  const blazer =  [120, 135, 180, 210, 260, 290, 310, 340, 380, 420, 460, 510, 530, 560, 620]
  const kleid =   [200, 190, 220, 250, 230, 210, 195, 185, 200, 260, 310, 350, 380, 400, 430]
  const boots =   [80,  95, 140, 190, 250, 310, 370, 400, 380, 340, 300, 270, 250, 240, 230]
  const denim =   [150, 160, 165, 170, 180, 185, 190, 200, 210, 220, 235, 250, 265, 275, 290]
  return weeks.map((w, i) => ({
    week: w,
    "Oversized Blazer": blazer[i],
    "Satin Kleid": kleid[i],
    "Chunky Boots": boots[i],
    "Vintage Denim": denim[i],
  }))
})()

const colorTrendData = [
  { name: "Schwarz", value: 28, color: "oklch(0.25 0.01 260)" },
  { name: "Bordeaux", value: 18, color: "oklch(0.5 0.18 15)" },
  { name: "Sage Green", value: 15, color: "oklch(0.72 0.12 145)" },
  { name: "Creme", value: 14, color: "oklch(0.88 0.05 85)" },
  { name: "Navy", value: 12, color: "oklch(0.4 0.12 260)" },
  { name: "Sonstige", value: 13, color: "oklch(0.55 0.05 260)" },
]

const pricePointData = [
  { range: "\u20AC0-25", nachfrage: 2200, fill: "oklch(0.65 0.18 260)" },
  { range: "\u20AC25-50", nachfrage: 4800, fill: "oklch(0.65 0.15 250)" },
  { range: "\u20AC50-100", nachfrage: 6100, fill: "oklch(0.72 0.19 145)" },
  { range: "\u20AC100-200", nachfrage: 3900, fill: "oklch(0.78 0.14 85)" },
  { range: "\u20AC200+", nachfrage: 1400, fill: "oklch(0.7 0.15 25)" },
]

const materialTrends = [
  { name: "Satin", growth: 38, direction: "up" as const, note: "Abendmode-Boom treibt Nachfrage", icon: "sparkle" },
  { name: "Wolle", growth: 22, direction: "up" as const, note: "Winterkollektion-Vorbereitung", icon: "warm" },
  { name: "Kaschmir", growth: 15, direction: "up" as const, note: "Premium-Segment wachsend", icon: "premium" },
  { name: "Bio-Baumwolle", growth: 31, direction: "up" as const, note: "Nachhaltigkeitstrend stark", icon: "eco" },
  { name: "Leinen", growth: -4, direction: "down" as const, note: "Saisonales Tief (Winter)", icon: "leaf" },
]

const seasonalForecasts = [
  {
    season: "Fruhling 2026",
    icon: Leaf,
    color: "oklch(0.72 0.19 145)",
    prediction: "Pastellfarben und leichte Lagen dominieren. Cropped Blazer und Blumenmuster werden Bestseller.",
    confidence: 89,
  },
  {
    season: "Sommer 2026",
    icon: Sun,
    color: "oklch(0.78 0.14 85)",
    prediction: "Leinen-Boom erwartet. Mutige Farben und Cut-Out-Details setzen sich durch. Maxi-Kleider im Aufwind.",
    confidence: 83,
  },
  {
    season: "Herbst 2026",
    icon: Cloud,
    color: "oklch(0.65 0.15 250)",
    prediction: "Erdtone und Oversized-Mantel praegen die Saison. Leder-Accessoires stark nachgefragt.",
    confidence: 75,
  },
  {
    season: "Winter 2026",
    icon: Snowflake,
    color: "oklch(0.65 0.18 260)",
    prediction: "Puffer-Jacken bleiben stark. Wollmischungen und dunkle Florals im Premium-Bereich gefragt.",
    confidence: 68,
  },
]

const alignmentScore = [
  { name: "Score", value: 74, fill: "oklch(0.72 0.19 145)" },
]

const competitorData = [
  { store: "UrbanStyle Berlin", trend: "Oversized Blazer", aktion: "Neue Kollektion", change: 18, direction: "up" as const },
  { store: "NordMode Hamburg", trend: "Nachhaltige Basics", aktion: "Preissenkung -15%", change: 12, direction: "up" as const },
  { store: "VintageVibes Koln", trend: "Vintage Denim", aktion: "Bundle-Angebote", change: 24, direction: "up" as const },
  { store: "LuxLabel Munchen", trend: "Kaschmir Premium", aktion: "Exklusiv-Launch", change: 8, direction: "up" as const },
  { store: "EcoWear Frankfurt", trend: "Bio-Baumwolle", aktion: "Zertifizierung beworben", change: -3, direction: "down" as const },
]

// Chart color constants (hex fallbacks for recharts which doesn't support oklch)
const CHART_PURPLE = "#7B61FF"
const CHART_GREEN = "#4CAF50"
const CHART_GOLD = "#D4A530"
const CHART_RED = "#E05555"
const CHART_BLUE = "#4A7BF7"

const LINE_COLORS = [CHART_PURPLE, CHART_GOLD, CHART_RED, CHART_GREEN]

const PIE_COLORS = ["#2A2A30", "#8B2252", "#7DA87B", "#E8DCC8", "#3A5A8C", "#777788"]

const BAR_COLORS = [CHART_BLUE, CHART_PURPLE, CHART_GREEN, CHART_GOLD, CHART_RED]

// --- COMPONENT ---

export default function TrendRadarPage() {
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null)

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Trends & Marktintelligenz</h1>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: "color-mix(in oklch, oklch(0.72 0.19 145) 15%, transparent)", color: "oklch(0.72 0.19 145)" }}
              >
                Live
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Erkenne aufkommende Trends fruh und positioniere deine Produkte fur maximalen Erfolg.
            </p>
          </div>
        </div>

        {/* 1. Trending Now Banner */}
        <div
          className="rounded-2xl p-5 mb-6 overflow-hidden relative"
          style={{
            background: "linear-gradient(135deg, color-mix(in oklch, oklch(0.65 0.15 250) 15%, transparent), color-mix(in oklch, oklch(0.72 0.19 145) 10%, transparent))",
            border: "1px solid oklch(1 0 0 / 0.1)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5" style={{ color: "oklch(0.78 0.14 85)" }} />
            <h2 className="text-base font-bold">Jetzt im Trend</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {trendingBanner.map((item) => (
              <div
                key={item.rank}
                className="flex items-center gap-4 p-4 rounded-xl"
                style={{
                  background: "color-mix(in oklch, oklch(0.65 0.15 250) 8%, transparent)",
                  border: "1px solid oklch(1 0 0 / 0.06)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black"
                  style={{
                    background: "color-mix(in oklch, oklch(0.78 0.14 85) 15%, transparent)",
                    color: "oklch(0.78 0.14 85)",
                  }}
                >
                  {item.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.searches} Suchanfragen/Monat</p>
                </div>
                <div className="flex items-center gap-1">
                  <ArrowUpRight className="w-4 h-4" style={{ color: "oklch(0.72 0.19 145)" }} />
                  <span className="text-sm font-bold" style={{ color: "oklch(0.72 0.19 145)" }}>
                    +{item.growth}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Search Trend LineChart (90 Days) */}
        <div className="seller-card p-5 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Search className="w-5 h-5" style={{ color: "oklch(0.65 0.15 250)" }} />
              Suchtrends (90 Tage)
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mb-5">Woechentliches Suchvolumen fur Top-Begriffe</p>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-4">
            {["Oversized Blazer", "Satin Kleid", "Chunky Boots", "Vintage Denim"].map((name, i) => (
              <button
                key={name}
                className="flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-lg transition-opacity"
                style={{
                  opacity: activeLineIndex === null || activeLineIndex === i ? 1 : 0.35,
                  background: `${LINE_COLORS[i]}18`,
                  color: LINE_COLORS[i],
                }}
                onClick={() => setActiveLineIndex(activeLineIndex === i ? null : i)}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: LINE_COLORS[i] }} />
                {name}
              </button>
            ))}
          </div>

          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={searchTrendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(20,20,30,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#aaa", marginBottom: 4 }}
                />
                {["Oversized Blazer", "Satin Kleid", "Chunky Boots", "Vintage Denim"].map((key, i) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={LINE_COLORS[i]}
                    strokeWidth={activeLineIndex === null || activeLineIndex === i ? 2.5 : 1}
                    strokeOpacity={activeLineIndex === null || activeLineIndex === i ? 1 : 0.2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Color Trends + 4. Price Point Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* 3. Color Trends PieChart */}
          <div className="seller-card p-5 md:p-6">
            <h2 className="text-base font-bold mb-1 flex items-center gap-2">
              <Palette className="w-5 h-5" style={{ color: "oklch(0.7 0.15 25)" }} />
              Farbtrends
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Meistgesuchte Farben auf der Plattform</p>

            <div className="w-full h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={colorTrendData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {colorTrendData.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "rgba(20,20,30,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [`${value}%`, "Anteil"]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span style={{ fontSize: 11, color: "#aaa" }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. Price Point Analysis BarChart */}
          <div className="seller-card p-5 md:p-6">
            <h2 className="text-base font-bold mb-1 flex items-center gap-2">
              <DollarSign className="w-5 h-5" style={{ color: "oklch(0.78 0.14 85)" }} />
              Preissegment-Analyse
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Nachfrage nach Preisbereich (Suchanfragen)</p>

            <div className="w-full h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pricePointData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(20,20,30,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [value.toLocaleString("de-DE"), "Suchanfragen"]}
                  />
                  <Bar dataKey="nachfrage" radius={[6, 6, 0, 0]}>
                    {pricePointData.map((entry, index) => (
                      <Cell key={entry.range} fill={BAR_COLORS[index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 5. Material Trends */}
        <div className="seller-card p-5 md:p-6 mb-6">
          <h2 className="text-base font-bold mb-1 flex items-center gap-2">
            <Shirt className="w-5 h-5" style={{ color: "oklch(0.65 0.18 260)" }} />
            Material-Trends
          </h2>
          <p className="text-xs text-muted-foreground mb-4">Beliebteste Materialien und ihre Wachstumsraten</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {materialTrends.map((mat) => {
              const isUp = mat.direction === "up"
              const accentColor = isUp ? "oklch(0.72 0.19 145)" : "oklch(0.7 0.15 25)"
              return (
                <div
                  key={mat.name}
                  className="p-4 rounded-xl transition-all"
                  style={{
                    background: `color-mix(in oklch, ${accentColor} 6%, transparent)`,
                    border: `1px solid color-mix(in oklch, ${accentColor} 15%, transparent)`,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold">{mat.name}</span>
                    <div className="flex items-center gap-0.5">
                      {isUp ? (
                        <ArrowUpRight className="w-3.5 h-3.5" style={{ color: accentColor }} />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" style={{ color: accentColor }} />
                      )}
                      <span className="text-xs font-bold" style={{ color: accentColor }}>
                        {isUp ? "+" : ""}{mat.growth}%
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{mat.note}</p>
                  {/* Growth bar */}
                  <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.15 0.02 260 / 0.5)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(Math.abs(mat.growth) * 2.2, 100)}%`,
                        background: accentColor,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 6. Seasonal Forecast Cards */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5" style={{ color: "oklch(0.78 0.14 85)" }} />
            <h2 className="text-base font-bold">Saisonale Prognosen</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {seasonalForecasts.map((s) => {
              const SeasonIcon = s.icon
              return (
                <div key={s.season} className="seller-card p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `color-mix(in oklch, ${s.color} 12%, transparent)` }}
                    >
                      <SeasonIcon className="w-5 h-5" style={{ color: s.color }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">{s.season}</h3>
                      <p className="text-[10px] text-muted-foreground">Konfidenz: {s.confidence}%</p>
                    </div>
                  </div>

                  {/* Confidence bar */}
                  <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: "oklch(0.15 0.02 260 / 0.5)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${s.confidence}%`, background: s.color }}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">{s.prediction}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* 7. Alignment Score + 8. Competitor Movement */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

          {/* 7. Your Alignment Score RadialBarChart */}
          <div className="seller-card p-5 md:p-6">
            <h2 className="text-base font-bold mb-1 flex items-center gap-2">
              <Gauge className="w-5 h-5" style={{ color: "oklch(0.72 0.19 145)" }} />
              Dein Trend-Score
            </h2>
            <p className="text-xs text-muted-foreground mb-2">Wie gut passen deine Produkte zu aktuellen Trends?</p>

            <div className="w-full h-[220px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="85%"
                  startAngle={180}
                  endAngle={0}
                  data={alignmentScore}
                  barSize={14}
                >
                  <RadialBar
                    background={{ fill: "rgba(255,255,255,0.05)" }}
                    dataKey="value"
                    cornerRadius={10}
                    fill={CHART_GREEN}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ marginTop: -16 }}>
                <span className="text-3xl font-black" style={{ color: "oklch(0.72 0.19 145)" }}>74%</span>
                <span className="text-[10px] text-muted-foreground font-medium mt-0.5">Ubereinstimmung</span>
              </div>
            </div>

            <div className="space-y-2 mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Farbtrends</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.15 0.02 260 / 0.5)" }}>
                    <div className="h-full rounded-full" style={{ width: "82%", background: "oklch(0.72 0.19 145)" }} />
                  </div>
                  <span className="font-bold w-8 text-right">82%</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Preissegmente</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.15 0.02 260 / 0.5)" }}>
                    <div className="h-full rounded-full" style={{ width: "71%", background: "oklch(0.78 0.14 85)" }} />
                  </div>
                  <span className="font-bold w-8 text-right">71%</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Materialien</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.15 0.02 260 / 0.5)" }}>
                    <div className="h-full rounded-full" style={{ width: "68%", background: "oklch(0.65 0.15 250)" }} />
                  </div>
                  <span className="font-bold w-8 text-right">68%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 8. Competitor Movement Table */}
          <div className="seller-card p-5 md:p-6 lg:col-span-2">
            <h2 className="text-base font-bold mb-1 flex items-center gap-2">
              <Store className="w-5 h-5" style={{ color: "oklch(0.65 0.15 250)" }} />
              Wettbewerber-Aktivitaten
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Aktuelle Bewegungen ahnlicher Shops auf WEARO</p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
                    <th className="text-left py-2.5 pr-4 font-medium">Shop</th>
                    <th className="text-left py-2.5 pr-4 font-medium hidden sm:table-cell">Trend-Fokus</th>
                    <th className="text-left py-2.5 pr-4 font-medium">Letzte Aktion</th>
                    <th className="text-right py-2.5 font-medium">Wachstum</th>
                  </tr>
                </thead>
                <tbody>
                  {competitorData.map((comp) => {
                    const isUp = comp.direction === "up"
                    const accentColor = isUp ? "oklch(0.72 0.19 145)" : "oklch(0.7 0.15 25)"
                    return (
                      <tr
                        key={comp.store}
                        className="border-b transition-colors hover:bg-white/[0.02]"
                        style={{ borderColor: "oklch(1 0 0 / 0.05)" }}
                      >
                        <td className="py-3 pr-4">
                          <span className="font-semibold text-sm">{comp.store}</span>
                        </td>
                        <td className="py-3 pr-4 hidden sm:table-cell">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: "color-mix(in oklch, oklch(0.65 0.15 250) 10%, transparent)",
                              color: "oklch(0.75 0.1 250)",
                            }}
                          >
                            {comp.trend}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">{comp.aktion}</td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isUp ? (
                              <ArrowUpRight className="w-3.5 h-3.5" style={{ color: accentColor }} />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5" style={{ color: accentColor }} />
                            )}
                            <span className="text-xs font-bold" style={{ color: accentColor }}>
                              {isUp ? "+" : ""}{comp.change}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* AI Insight Footer */}
        <div
          className="seller-card p-5 flex items-start gap-3"
          style={{ border: "1px solid color-mix(in oklch, oklch(0.65 0.15 250) 20%, transparent)" }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "color-mix(in oklch, oklch(0.65 0.15 250) 12%, transparent)" }}
          >
            <Sparkles className="w-5 h-5" style={{ color: "oklch(0.65 0.15 250)" }} />
          </div>
          <div>
            <h3 className="text-sm font-bold mb-1" style={{ color: "oklch(0.65 0.15 250)" }}>KI-Empfehlung</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Dein Sortiment deckt 74% der aktuellen Trends ab. Um deinen Score zu verbessern, solltest du
              mehr <strong className="text-foreground">Satin-</strong> und <strong className="text-foreground">Bio-Baumwoll-Produkte</strong> listen.
              Das Preissegment 50-100 EUR zeigt die hochste Nachfrage -- prufe, ob du hier ausreichend
              vertreten bist. Shops mit einem Score uber 80% erzielen durchschnittlich 35% mehr Verkaufe.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
