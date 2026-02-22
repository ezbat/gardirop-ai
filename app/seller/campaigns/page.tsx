"use client"

import { useState } from "react"
import {
  Megaphone, Plus, TrendingUp, MousePointerClick, Euro,
  BarChart3, Pause, Play, Eye, Target, Sparkles,
  ArrowUpRight, ArrowDownRight
} from "lucide-react"
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts"

// --- Colors ---
const purple = "oklch(0.65 0.15 250)"
const green = "oklch(0.72 0.19 145)"
const gold = "oklch(0.78 0.14 85)"
const red = "oklch(0.7 0.15 25)"
const blue = "oklch(0.65 0.18 260)"

// --- 30-day performance data ---
const performanceData = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1
  const base = Math.sin(day / 5) * 200 + 600
  return {
    tag: `${day}.01`,
    Impressionen: Math.round(base * 4.5 + Math.random() * 400),
    Klicks: Math.round(base * 0.45 + Math.random() * 80),
    Conversions: Math.round(base * 0.06 + Math.random() * 15),
  }
})

// --- Active campaigns ---
const campaigns = [
  {
    name: "Frühlingsaktion 2025",
    status: "Aktiv",
    budget: 1200,
    spent: 800,
    klicks: 4820,
    ctr: 3.8,
    roas: 5.1,
    trend: "up" as const,
  },
  {
    name: "Blazer Kollektion",
    status: "Aktiv",
    budget: 600,
    spent: 450,
    klicks: 3210,
    ctr: 2.9,
    roas: 3.8,
    trend: "up" as const,
  },
  {
    name: "Newsletter Rabatt",
    status: "Aktiv",
    budget: 300,
    spent: 200,
    klicks: 2890,
    ctr: 5.2,
    roas: 6.2,
    trend: "up" as const,
  },
  {
    name: "Instagram Push",
    status: "Pausiert",
    budget: 500,
    spent: 340,
    klicks: 1530,
    ctr: 1.7,
    roas: 2.9,
    trend: "down" as const,
  },
]

// --- Channel performance data ---
const channelData = [
  { kanal: "Google Ads", Ausgaben: 680, Einnahmen: 3120 },
  { kanal: "Instagram", Ausgaben: 540, Einnahmen: 1980 },
  { kanal: "Facebook", Ausgaben: 420, Einnahmen: 1540 },
  { kanal: "Pinterest", Ausgaben: 380, Einnahmen: 1260 },
  { kanal: "Newsletter", Ausgaben: 320, Einnahmen: 1940 },
]

// --- ROI comparison data ---
const roiData = [
  { kampagne: "Frühling '25", ROAS: 5.1 },
  { kampagne: "Blazer", ROAS: 3.8 },
  { kampagne: "Newsletter", ROAS: 6.2 },
  { kampagne: "Insta Push", ROAS: 2.9 },
  { kampagne: "Winter '24", ROAS: 4.5 },
]

// --- Stats ---
const stats = [
  {
    label: "Aktive Kampagnen",
    value: "4",
    icon: Megaphone,
    color: purple,
    change: "+2",
    changeType: "up" as const,
  },
  {
    label: "Gesamtausgaben",
    value: "\u20AC2.340",
    icon: Euro,
    color: gold,
    change: "+12%",
    changeType: "up" as const,
  },
  {
    label: "Gesamt-ROAS",
    value: "4.2x",
    icon: TrendingUp,
    color: green,
    change: "+0.8x",
    changeType: "up" as const,
  },
  {
    label: "Klicks",
    value: "12.450",
    icon: MousePointerClick,
    color: blue,
    change: "+18%",
    changeType: "up" as const,
  },
]

// --- Custom Tooltip ---
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; label?: string }) {
  if (!active || !payload) return null
  return (
    <div
      style={{
        background: "oklch(0.16 0.02 260)",
        border: "1px solid oklch(1 0 0 / 0.1)",
        borderRadius: 12,
        padding: "10px 14px",
        fontSize: 13,
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 6 }}>{label}</p>
      {payload.map((entry, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: entry.color, display: "inline-block" }} />
          <span style={{ color: "oklch(0.75 0 0)" }}>{entry.name}:</span>
          <span style={{ fontWeight: 600 }}>{entry.value.toLocaleString("de-DE")}</span>
        </div>
      ))}
    </div>
  )
}

export default function CampaignsPage() {
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">Marketing-Kampagnen</h1>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: `color-mix(in oklch, ${green} 15%, transparent)`, color: green }}
              >
                4 Aktiv
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Erstellen, verwalten und optimieren Sie Ihre Werbekampagnen.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
            style={{ background: purple, color: "#fff" }}
          >
            <Plus className="w-4 h-4" />
            Neue Kampagne
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="seller-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `color-mix(in oklch, ${stat.color} 12%, transparent)` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: stat.color }} />
                  </div>
                  <div
                    className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg"
                    style={{
                      background: `color-mix(in oklch, ${stat.changeType === "up" ? green : red} 10%, transparent)`,
                      color: stat.changeType === "up" ? green : red,
                    }}
                  >
                    {stat.changeType === "up" ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {stat.change}
                  </div>
                </div>
                <p className="text-[13px] text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
              </div>
            )
          })}
        </div>

        {/* Campaign Performance LineChart (30 days) */}
        <div className="seller-card p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: purple }} />
              Kampagnen-Performance (30 Tage)
            </h2>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full" style={{ background: blue, display: "inline-block" }} />
                Impressionen
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full" style={{ background: purple, display: "inline-block" }} />
                Klicks
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full" style={{ background: green, display: "inline-block" }} />
                Conversions
              </span>
            </div>
          </div>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                <XAxis
                  dataKey="tag"
                  tick={{ fontSize: 11, fill: "oklch(0.65 0 0)" }}
                  tickLine={false}
                  axisLine={{ stroke: "oklch(1 0 0 / 0.1)" }}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "oklch(0.65 0 0)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="Impressionen"
                  stroke={blue}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: blue }}
                />
                <Line
                  type="monotone"
                  dataKey="Klicks"
                  stroke={purple}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: purple }}
                />
                <Line
                  type="monotone"
                  dataKey="Conversions"
                  stroke={green}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: green }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Campaigns Table */}
        <div className="seller-card p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Megaphone className="w-5 h-5" style={{ color: gold }} />
              Aktive Kampagnen
            </h2>
            <span className="text-xs text-muted-foreground">{campaigns.length} Kampagnen</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid oklch(1 0 0 / 0.08)" }}>
                  {["Kampagne", "Status", "Budget", "Ausgegeben", "Klicks", "CTR", "ROAS"].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-semibold text-muted-foreground pb-3 pr-4"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => {
                  const isActive = c.status === "Aktiv"
                  const spentPercent = Math.round((c.spent / c.budget) * 100)
                  return (
                    <tr
                      key={i}
                      className="transition-colors duration-150"
                      style={{
                        borderBottom: i < campaigns.length - 1 ? "1px solid oklch(1 0 0 / 0.06)" : undefined,
                      }}
                    >
                      {/* Name */}
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{
                              background: `color-mix(in oklch, ${isActive ? purple : red} 12%, transparent)`,
                            }}
                          >
                            {isActive ? (
                              <Play className="w-3.5 h-3.5" style={{ color: purple }} />
                            ) : (
                              <Pause className="w-3.5 h-3.5" style={{ color: red }} />
                            )}
                          </div>
                          <span className="font-semibold">{c.name}</span>
                        </div>
                      </td>
                      {/* Status */}
                      <td className="py-4 pr-4">
                        <span
                          className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                          style={{
                            background: `color-mix(in oklch, ${isActive ? green : gold} 12%, transparent)`,
                            color: isActive ? green : gold,
                          }}
                        >
                          {c.status}
                        </span>
                      </td>
                      {/* Budget */}
                      <td className="py-4 pr-4 font-medium">
                        {"\u20AC"}{c.budget.toLocaleString("de-DE")}
                      </td>
                      {/* Spent */}
                      <td className="py-4 pr-4">
                        <div className="flex flex-col gap-1.5">
                          <span className="font-medium">
                            {"\u20AC"}{c.spent.toLocaleString("de-DE")}
                          </span>
                          <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 0.08)" }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${spentPercent}%`,
                                background: spentPercent > 80 ? red : purple,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      {/* Klicks */}
                      <td className="py-4 pr-4 font-medium">
                        {c.klicks.toLocaleString("de-DE")}
                      </td>
                      {/* CTR */}
                      <td className="py-4 pr-4">
                        <span
                          className="font-semibold"
                          style={{ color: c.ctr >= 3 ? green : gold }}
                        >
                          {c.ctr.toFixed(1)}%
                        </span>
                      </td>
                      {/* ROAS */}
                      <td className="py-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-bold text-base"
                            style={{ color: c.roas >= 4 ? green : c.roas >= 3 ? gold : red }}
                          >
                            {c.roas.toFixed(1)}x
                          </span>
                          {c.trend === "up" ? (
                            <ArrowUpRight className="w-3.5 h-3.5" style={{ color: green }} />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" style={{ color: red }} />
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts Row: Channel Performance + ROI Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Channel Performance BarChart */}
          <div className="seller-card p-6">
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" style={{ color: blue }} />
              Kanal-Performance
            </h2>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                  <XAxis
                    dataKey="kanal"
                    tick={{ fontSize: 11, fill: "oklch(0.65 0 0)" }}
                    tickLine={false}
                    axisLine={{ stroke: "oklch(1 0 0 / 0.1)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "oklch(0.65 0 0)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `\u20AC${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  />
                  <Bar dataKey="Ausgaben" fill={red} radius={[6, 6, 0, 0]} barSize={22} />
                  <Bar dataKey="Einnahmen" fill={green} radius={[6, 6, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ROI Comparison BarChart */}
          <div className="seller-card p-6">
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
              <Target className="w-5 h-5" style={{ color: green }} />
              ROAS-Vergleich
            </h2>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roiData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "oklch(0.65 0 0)" }}
                    tickLine={false}
                    axisLine={{ stroke: "oklch(1 0 0 / 0.1)" }}
                    domain={[0, 7]}
                    tickFormatter={(v: number) => `${v}x`}
                  />
                  <YAxis
                    type="category"
                    dataKey="kampagne"
                    tick={{ fontSize: 11, fill: "oklch(0.65 0 0)" }}
                    tickLine={false}
                    axisLine={false}
                    width={90}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload) return null
                      return (
                        <div
                          style={{
                            background: "oklch(0.16 0.02 260)",
                            border: "1px solid oklch(1 0 0 / 0.1)",
                            borderRadius: 12,
                            padding: "10px 14px",
                            fontSize: 13,
                          }}
                        >
                          <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
                          <p>ROAS: <span style={{ fontWeight: 700, color: green }}>{payload[0]?.value}x</span></p>
                        </div>
                      )
                    }}
                  />
                  <Bar
                    dataKey="ROAS"
                    radius={[0, 8, 8, 0]}
                    barSize={28}
                    fill={purple}
                    label={{
                      position: "right",
                      fill: "oklch(0.75 0 0)",
                      fontSize: 12,
                      fontWeight: 600,
                      formatter: (v: number) => `${v}x`,
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Create Campaign Area */}
        {showCreate && (
          <div
            className="seller-card p-6"
            style={{ border: `1px solid color-mix(in oklch, ${purple} 30%, transparent)` }}
          >
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: purple }} />
              Neue Kampagne erstellen
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Konfigurieren Sie Ihre neue Marketing-Kampagne mit Budget, Laufzeit und Zielgruppe.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              {[
                { label: "Kampagnenname", placeholder: "z.B. Sommer Kollektion 2025", type: "text" },
                { label: "Tagesbudget (\u20AC)", placeholder: "z.B. 50", type: "number" },
                { label: "Startdatum", placeholder: "", type: "date" },
                { label: "Enddatum", placeholder: "", type: "date" },
              ].map((field) => (
                <div key={field.label}>
                  <label className="text-sm font-semibold mb-2 block">{field.label}</label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 focus:outline-none"
                    style={{
                      background: "oklch(0.16 0.02 260 / 0.5)",
                      border: "1px solid oklch(1 0 0 / 0.1)",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Channel selection */}
            <div className="mb-6">
              <label className="text-sm font-semibold mb-3 block">Kanäle auswählen</label>
              <div className="flex flex-wrap gap-2">
                {["Google Ads", "Instagram", "Facebook", "Pinterest", "Newsletter"].map((ch) => (
                  <button
                    key={ch}
                    className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:opacity-90"
                    style={{
                      background: `color-mix(in oklch, ${purple} 10%, transparent)`,
                      border: `1px solid color-mix(in oklch, ${purple} 20%, transparent)`,
                      color: purple,
                    }}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                Abbrechen
              </button>
              <button
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90"
                style={{ background: purple, color: "#fff" }}
              >
                <Plus className="w-4 h-4" />
                Kampagne erstellen
              </button>
            </div>
          </div>
        )}

        {/* Create CTA if form is hidden */}
        {!showCreate && (
          <div
            className="seller-card p-8 text-center"
            style={{
              background: `linear-gradient(135deg, color-mix(in oklch, ${purple} 8%, transparent), color-mix(in oklch, ${blue} 5%, transparent))`,
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: `color-mix(in oklch, ${purple} 15%, transparent)` }}
            >
              <Megaphone className="w-7 h-7" style={{ color: purple }} />
            </div>
            <h3 className="text-lg font-bold mb-2">Neue Kampagne starten</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
              Erreichen Sie neue Kunden mit gezielten Werbekampagnen auf allen Kanälen.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
              style={{ background: purple, color: "#fff" }}
            >
              <Plus className="w-4 h-4" />
              Kampagne erstellen
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
