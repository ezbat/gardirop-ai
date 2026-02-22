"use client"

import { useState } from "react"
import {
  Users, UserPlus, RefreshCw, TrendingUp,
  ArrowUpRight, ArrowDownRight, ShoppingBag,
  Crown, Star, MapPin, Clock, UserCheck,
  BarChart3, PieChart as PieChartIcon, Activity
} from "lucide-react"
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart,
  Legend
} from "recharts"

// ---- OKLCH COLOR PALETTE ----
const COLORS = {
  purple: "oklch(0.65 0.15 250)",
  green: "oklch(0.72 0.19 145)",
  gold: "oklch(0.78 0.14 85)",
  red: "oklch(0.7 0.15 25)",
  blue: "oklch(0.65 0.18 260)",
}

// ---- CHART HEX APPROXIMATIONS (recharts needs hex/rgb) ----
const CHART = {
  purple: "#7b6cf6",
  green: "#4ead6b",
  gold: "#c9a84c",
  red: "#d4644a",
  blue: "#5a7cf6",
  pink: "#c76aaf",
  teal: "#4a9e9e",
  orange: "#d4944a",
}

// ---- HELPERS ----
function fmt(v: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v)
}

// ---- GROWTH DATA (12 months) ----
const growthData = [
  { month: "Mär 25", neue: 65, kumulativ: 800 },
  { month: "Apr 25", neue: 78, kumulativ: 878 },
  { month: "Mai 25", neue: 92, kumulativ: 970 },
  { month: "Jun 25", neue: 110, kumulativ: 1080 },
  { month: "Jul 25", neue: 88, kumulativ: 1168 },
  { month: "Aug 25", neue: 95, kumulativ: 1263 },
  { month: "Sep 25", neue: 102, kumulativ: 1365 },
  { month: "Okt 25", neue: 115, kumulativ: 1480 },
  { month: "Nov 25", neue: 72, kumulativ: 1552 },
  { month: "Dez 25", neue: 61, kumulativ: 1613 },
  { month: "Jan 26", neue: 120, kumulativ: 1733 },
  { month: "Feb 26", neue: 114, kumulativ: 1847 },
]

// ---- SEGMENT DATA ----
const segmentData = [
  { name: "VIP (>500\u20AC)", value: 8, color: CHART.purple },
  { name: "Stamm (3+)", value: 22, color: CHART.green },
  { name: "Gelegentlich (2)", value: 28, color: CHART.gold },
  { name: "Einmalig", value: 42, color: CHART.red },
]

// ---- TOP CUSTOMERS ----
type Segment = "VIP" | "Stamm" | "Gelegentlich" | "Einmalig"
const segmentStyle: Record<Segment, { color: string; bg: string }> = {
  VIP: { color: COLORS.purple, bg: "color-mix(in oklch, oklch(0.65 0.15 250) 15%, transparent)" },
  Stamm: { color: COLORS.green, bg: "color-mix(in oklch, oklch(0.72 0.19 145) 15%, transparent)" },
  Gelegentlich: { color: COLORS.gold, bg: "color-mix(in oklch, oklch(0.78 0.14 85) 15%, transparent)" },
  Einmalig: { color: COLORS.red, bg: "color-mix(in oklch, oklch(0.7 0.15 25) 15%, transparent)" },
}

const topCustomers: { name: string; email: string; bestellungen: number; umsatz: number; segment: Segment }[] = [
  { name: "Emma Fischer", email: "em***@gmail.com", bestellungen: 24, umsatz: 1842.50, segment: "VIP" },
  { name: "Sophia Wagner", email: "so***@web.de", bestellungen: 19, umsatz: 1567.30, segment: "VIP" },
  { name: "Lena Muller", email: "le***@outlook.de", bestellungen: 16, umsatz: 1234.80, segment: "VIP" },
  { name: "Mia Schneider", email: "mi***@gmx.de", bestellungen: 12, umsatz: 945.60, segment: "Stamm" },
  { name: "Hannah Becker", email: "ha***@icloud.com", bestellungen: 10, umsatz: 823.40, segment: "Stamm" },
  { name: "Marie Hoffmann", email: "ma***@yahoo.de", bestellungen: 8, umsatz: 678.20, segment: "Stamm" },
  { name: "Anna Schulz", email: "an***@gmail.com", bestellungen: 6, umsatz: 512.90, segment: "Stamm" },
  { name: "Johanna Koch", email: "jo***@proton.me", bestellungen: 4, umsatz: 345.10, segment: "Gelegentlich" },
  { name: "Clara Weber", email: "cl***@gmx.de", bestellungen: 2, umsatz: 178.50, segment: "Gelegentlich" },
  { name: "Luisa Richter", email: "lu***@web.de", bestellungen: 1, umsatz: 89.99, segment: "Einmalig" },
]

// ---- CLV DISTRIBUTION ----
const clvData = [
  { range: "0-50\u20AC", kunden: 312 },
  { range: "51-100\u20AC", kunden: 468 },
  { range: "101-150\u20AC", kunden: 324 },
  { range: "151-200\u20AC", kunden: 256 },
  { range: "201-250\u20AC", kunden: 189 },
  { range: "251-300\u20AC", kunden: 132 },
  { range: "301-400\u20AC", kunden: 98 },
  { range: "400\u20AC+", kunden: 68 },
]

// ---- PURCHASE FREQUENCY ----
const frequencyData = [
  { label: "1 Kauf", pct: 42, kunden: 776 },
  { label: "2 Kaufe", pct: 28, kunden: 517 },
  { label: "3-5 Kaufe", pct: 18, kunden: 332 },
  { label: "6-10 Kaufe", pct: 8, kunden: 148 },
  { label: "10+ Kaufe", pct: 4, kunden: 74 },
]

// ---- GEOGRAPHIC DATA ----
const geoData = [
  { stadt: "Berlin", kunden: 312 },
  { stadt: "Hamburg", kunden: 234 },
  { stadt: "Munchen", kunden: 198 },
  { stadt: "Koln", kunden: 167 },
  { stadt: "Frankfurt", kunden: 145 },
  { stadt: "Dusseldorf", kunden: 123 },
  { stadt: "Stuttgart", kunden: 108 },
  { stadt: "Leipzig", kunden: 92 },
]

// ---- AGE DATA ----
const ageData = [
  { name: "18-24", value: 22, color: CHART.blue },
  { name: "25-34", value: 38, color: CHART.purple },
  { name: "35-44", value: 24, color: CHART.green },
  { name: "45-54", value: 12, color: CHART.gold },
  { name: "55+", value: 4, color: CHART.red },
]

// ---- GENDER DATA ----
const genderData = [
  { name: "Weiblich", value: 72, color: CHART.pink },
  { name: "Mannlich", value: 24, color: CHART.blue },
  { name: "Divers", value: 4, color: CHART.teal },
]

// ---- ACTIVITY TIMELINE ----
const activities = [
  { zeit: "Vor 2 Min.", text: "Emma Fischer hat eine neue Bestellung aufgegeben", icon: ShoppingBag, color: COLORS.green },
  { zeit: "Vor 15 Min.", text: "Sophia Wagner hat eine Bewertung hinterlassen", icon: Star, color: COLORS.gold },
  { zeit: "Vor 32 Min.", text: "Neukunde Clara Weber hat sich registriert", icon: UserPlus, color: COLORS.blue },
  { zeit: "Vor 1 Std.", text: "Hannah Becker hat ihren Warenkorb aktualisiert", icon: ShoppingBag, color: COLORS.purple },
  { zeit: "Vor 1,5 Std.", text: "Marie Hoffmann hat eine Rucksendung angefragt", icon: RefreshCw, color: COLORS.red },
  { zeit: "Vor 2 Std.", text: "Lena Muller hat 3 Artikel zur Wunschliste hinzugefugt", icon: Star, color: COLORS.gold },
  { zeit: "Vor 3 Std.", text: "Anna Schulz hat eine Bestellung aufgegeben", icon: ShoppingBag, color: COLORS.green },
  { zeit: "Vor 4 Std.", text: "Neukunde Luisa Richter hat sich registriert", icon: UserPlus, color: COLORS.blue },
  { zeit: "Vor 5 Std.", text: "Johanna Koch hat ihr Profil aktualisiert", icon: UserCheck, color: COLORS.purple },
  { zeit: "Vor 6 Std.", text: "Mia Schneider hat eine Bewertung geschrieben", icon: Star, color: COLORS.gold },
]

// ---- CUSTOM TOOLTIP ----
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-4 py-3 text-xs shadow-xl border"
      style={{
        background: "oklch(0.16 0.02 260)",
        borderColor: "oklch(1 0 0 / 0.08)",
      }}
    >
      <p className="font-semibold mb-1.5" style={{ color: "oklch(0.9 0 0)" }}>{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold" style={{ color: "oklch(0.9 0 0)" }}>{entry.value.toLocaleString("de-DE")}</span>
        </p>
      ))}
    </div>
  )
}

// ---- STAT CARD ----
function StatCard({ label, value, change, icon: Icon, color }: {
  label: string; value: string; change: number; icon: any; color: string
}) {
  const positive = change >= 0
  return (
    <div className="seller-card p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.04] -translate-y-8 translate-x-8" style={{ background: color }} />
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `color-mix(in oklch, ${color} 14%, transparent)` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <p className="text-[13px] text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold tracking-tight mb-2">{value}</p>
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-semibold"
          style={{
            background: positive ? "oklch(0.72 0.19 145 / 0.12)" : "oklch(0.7 0.15 25 / 0.12)",
            color: positive ? "oklch(0.72 0.19 145)" : "oklch(0.7 0.15 25)",
          }}>
          {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {positive ? "+" : ""}{change}%
        </span>
        <span className="text-[11px] text-muted-foreground">vs. Vormonat</span>
      </div>
    </div>
  )
}

// ---- SECTION HEADER ----
function SectionHeader({ icon: Icon, title, color }: { icon: any; title: string; color: string }) {
  return (
    <h2 className="text-lg font-bold mb-4 flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: `color-mix(in oklch, ${color} 14%, transparent)` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      {title}
    </h2>
  )
}

// ---- PIE LABEL ----
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value }: any) => {
  const RADIAN = Math.PI / 180
  const radius = outerRadius + 28
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="oklch(0.75 0 0)" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={11}>
      {name} {value}%
    </text>
  )
}

// ---- MAIN PAGE ----
export default function CustomerAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "details">("overview")

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Kundenanalyse</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: "color-mix(in oklch, oklch(0.65 0.15 250) 15%, transparent)", color: COLORS.purple }}>
                Analytics
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Kundenverhalten, Segmente und demografische Daten im Uberblick
            </p>
          </div>
          <div className="flex items-center rounded-xl p-1" style={{ background: "oklch(0.15 0.02 260)" }}>
            {(["overview", "details"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: activeTab === tab ? "color-mix(in oklch, oklch(0.65 0.15 250) 18%, transparent)" : "transparent",
                  color: activeTab === tab ? COLORS.purple : "oklch(0.6 0 0)",
                }}>
                {tab === "overview" ? "Ubersicht" : "Details"}
              </button>
            ))}
          </div>
        </div>

        {/* 1. STAT CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Gesamtkunden" value="1.847" change={14.2} icon={Users} color={COLORS.purple} />
          <StatCard label="Neue (30T)" value="234" change={23.1} icon={UserPlus} color={COLORS.green} />
          <StatCard label="Wiederkehrende" value="42%" change={5.8} icon={RefreshCw} color={COLORS.gold} />
          <StatCard label="O Bestellwert" value={fmt(52.30)} change={8.4} icon={TrendingUp} color={COLORS.blue} />
        </div>

        {activeTab === "overview" ? (
          <>
            {/* 2. CUSTOMER GROWTH CHART */}
            <div className="seller-card p-6 mb-8">
              <SectionHeader icon={TrendingUp} title="Kundenwachstum (12 Monate)" color={COLORS.green} />
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={growthData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "oklch(0.6 0 0)" }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "oklch(0.6 0 0)" }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "oklch(0.6 0 0)" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                    <Bar yAxisId="left" dataKey="neue" name="Neue Kunden" fill={CHART.green} radius={[4, 4, 0, 0]} barSize={28} opacity={0.85} />
                    <Line yAxisId="right" type="monotone" dataKey="kumulativ" name="Gesamt (kumulativ)" stroke={CHART.purple} strokeWidth={2.5} dot={{ r: 3, fill: CHART.purple }} activeDot={{ r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. SEGMENTS PIE + 5. CLV DISTRIBUTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Segments Pie */}
              <div className="seller-card p-6">
                <SectionHeader icon={PieChartIcon} title="Kundensegmente" color={COLORS.purple} />
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={segmentData} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                        paddingAngle={3} dataKey="value" label={renderPieLabel} labelLine={false}>
                        {segmentData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {segmentData.map((seg, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: seg.color }} />
                      <span className="text-muted-foreground">{seg.name}</span>
                      <span className="font-semibold ml-auto">{seg.value}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CLV Distribution */}
              <div className="seller-card p-6">
                <SectionHeader icon={BarChart3} title="CLV-Verteilung" color={COLORS.gold} />
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={clvData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                      <XAxis dataKey="range" tick={{ fontSize: 10, fill: "oklch(0.6 0 0)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "oklch(0.6 0 0)" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="kunden" name="Kunden" fill={CHART.gold} radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 4. TOP CUSTOMERS TABLE */}
            <div className="seller-card overflow-hidden mb-8">
              <div className="p-5 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
                <SectionHeader icon={Crown} title="Top Kunden" color={COLORS.gold} />
              </div>
              <div className="overflow-x-auto">
                {/* Header */}
                <div className="hidden md:grid items-center px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  style={{ gridTemplateColumns: "0.4fr 2fr 1.4fr 0.9fr 1fr 1fr", borderBottom: "1px solid oklch(1 0 0 / 0.06)" }}>
                  <span className="text-center">#</span>
                  <span>Kunde</span>
                  <span>E-Mail</span>
                  <span className="text-center">Bestellungen</span>
                  <span className="text-right">Umsatz</span>
                  <span className="text-center">Segment</span>
                </div>
                {/* Rows */}
                {topCustomers.map((c, i) => {
                  const initials = c.name.split(" ").map(n => n[0]).join("")
                  const avatarColors = [CHART.purple, CHART.green, CHART.gold, CHART.blue, CHART.pink, CHART.teal, CHART.red, CHART.orange]
                  const avatarColor = avatarColors[i % avatarColors.length]
                  const s = segmentStyle[c.segment]
                  return (
                    <div key={i} className="grid items-center px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
                      style={{ gridTemplateColumns: "0.4fr 2fr 1.4fr 0.9fr 1fr 1fr", borderBottom: "1px solid oklch(1 0 0 / 0.04)" }}>
                      <span className="text-sm font-semibold text-center text-muted-foreground">{i + 1}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                          style={{ background: `${avatarColor}22`, color: avatarColor }}>
                          {initials}
                        </div>
                        <span className="text-sm font-medium truncate">{c.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground truncate hidden md:block">{c.email}</span>
                      <span className="text-sm font-medium text-center">{c.bestellungen}</span>
                      <span className="text-sm font-semibold text-right" style={{ color: COLORS.green }}>{fmt(c.umsatz)}</span>
                      <div className="flex justify-center">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: s.bg, color: s.color }}>
                          {c.segment}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 6. PURCHASE FREQUENCY + 7. GEOGRAPHIC */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Purchase Frequency */}
              <div className="seller-card p-6">
                <SectionHeader icon={ShoppingBag} title="Kaufhaufigkeit" color={COLORS.blue} />
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={frequencyData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "oklch(0.6 0 0)" }} axisLine={false} tickLine={false}
                        tickFormatter={(v) => `${v}%`} domain={[0, 50]} />
                      <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: "oklch(0.6 0 0)" }} axisLine={false}
                        tickLine={false} width={80} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="pct" name="Anteil (%)" fill={CHART.blue} radius={[0, 4, 4, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Geographic */}
              <div className="seller-card p-6">
                <SectionHeader icon={MapPin} title="Top Stadte" color={COLORS.red} />
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={geoData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "oklch(0.6 0 0)" }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="stadt" tick={{ fontSize: 11, fill: "oklch(0.6 0 0)" }} axisLine={false}
                        tickLine={false} width={80} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="kunden" name="Kunden" fill={CHART.red} radius={[0, 4, 4, 0]} barSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* DETAILS TAB */}

            {/* 8. DEMOGRAPHICS: AGE + GENDER */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Age Distribution */}
              <div className="seller-card p-6">
                <SectionHeader icon={Users} title="Altersverteilung" color={COLORS.blue} />
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={ageData} cx="50%" cy="50%" innerRadius={55} outerRadius={95}
                        paddingAngle={3} dataKey="value" label={renderPieLabel} labelLine={false}>
                        {ageData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {ageData.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: a.color }} />
                      <span className="text-muted-foreground">{a.name}</span>
                      <span className="font-semibold ml-auto">{a.value}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gender Distribution */}
              <div className="seller-card p-6">
                <SectionHeader icon={PieChartIcon} title="Geschlechterverteilung" color={COLORS.purple} />
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={genderData} cx="50%" cy="50%" innerRadius={55} outerRadius={95}
                        paddingAngle={3} dataKey="value" label={renderPieLabel} labelLine={false}>
                        {genderData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-6 mt-2">
                  {genderData.map((g, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: g.color }} />
                      <span className="text-muted-foreground">{g.name}</span>
                      <span className="font-semibold">{g.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Repeated: CLV + Frequency in details tab for deeper view */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* CLV Distribution */}
              <div className="seller-card p-6">
                <SectionHeader icon={BarChart3} title="CLV-Verteilung" color={COLORS.gold} />
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={clvData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                      <XAxis dataKey="range" tick={{ fontSize: 10, fill: "oklch(0.6 0 0)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "oklch(0.6 0 0)" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="kunden" name="Kunden" fill={CHART.gold} radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Purchase Frequency */}
              <div className="seller-card p-6">
                <SectionHeader icon={ShoppingBag} title="Kaufhaufigkeit" color={COLORS.blue} />
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={frequencyData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "oklch(0.6 0 0)" }} axisLine={false} tickLine={false}
                        tickFormatter={(v) => `${v}%`} domain={[0, 50]} />
                      <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: "oklch(0.6 0 0)" }} axisLine={false}
                        tickLine={false} width={80} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="pct" name="Anteil (%)" fill={CHART.blue} radius={[0, 4, 4, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* TOP CUSTOMERS TABLE (also in details) */}
            <div className="seller-card overflow-hidden mb-8">
              <div className="p-5 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
                <SectionHeader icon={Crown} title="Top Kunden" color={COLORS.gold} />
              </div>
              <div className="overflow-x-auto">
                <div className="hidden md:grid items-center px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  style={{ gridTemplateColumns: "0.4fr 2fr 1.4fr 0.9fr 1fr 1fr", borderBottom: "1px solid oklch(1 0 0 / 0.06)" }}>
                  <span className="text-center">#</span>
                  <span>Kunde</span>
                  <span>E-Mail</span>
                  <span className="text-center">Bestellungen</span>
                  <span className="text-right">Umsatz</span>
                  <span className="text-center">Segment</span>
                </div>
                {topCustomers.map((c, i) => {
                  const initials = c.name.split(" ").map(n => n[0]).join("")
                  const avatarColors = [CHART.purple, CHART.green, CHART.gold, CHART.blue, CHART.pink, CHART.teal, CHART.red, CHART.orange]
                  const avatarColor = avatarColors[i % avatarColors.length]
                  const s = segmentStyle[c.segment]
                  return (
                    <div key={i} className="grid items-center px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
                      style={{ gridTemplateColumns: "0.4fr 2fr 1.4fr 0.9fr 1fr 1fr", borderBottom: "1px solid oklch(1 0 0 / 0.04)" }}>
                      <span className="text-sm font-semibold text-center text-muted-foreground">{i + 1}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                          style={{ background: `${avatarColor}22`, color: avatarColor }}>
                          {initials}
                        </div>
                        <span className="text-sm font-medium truncate">{c.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground truncate hidden md:block">{c.email}</span>
                      <span className="text-sm font-medium text-center">{c.bestellungen}</span>
                      <span className="text-sm font-semibold text-right" style={{ color: COLORS.green }}>{fmt(c.umsatz)}</span>
                      <div className="flex justify-center">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: s.bg, color: s.color }}>
                          {c.segment}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Geographic in details */}
            <div className="seller-card p-6 mb-8">
              <SectionHeader icon={MapPin} title="Geografische Verteilung" color={COLORS.red} />
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={geoData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                    <XAxis dataKey="stadt" tick={{ fontSize: 11, fill: "oklch(0.6 0 0)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "oklch(0.6 0 0)" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="kunden" name="Kunden" fill={CHART.red} radius={[4, 4, 0, 0]} barSize={36}>
                      {geoData.map((_, i) => (
                        <Cell key={i} fill={[CHART.red, CHART.purple, CHART.blue, CHART.green, CHART.gold, CHART.pink, CHART.teal, CHART.orange][i % 8]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* 9. ACTIVITY TIMELINE (always visible) */}
        <div className="seller-card p-6">
          <SectionHeader icon={Activity} title="Aktivitaten-Timeline" color={COLORS.purple} />
          <div className="space-y-1">
            {activities.map((a, i) => {
              const Icon = a.icon
              return (
                <div key={i} className="flex items-start gap-4 py-3 transition-colors hover:bg-white/[0.02] rounded-lg px-3 -mx-3"
                  style={{ borderBottom: i < activities.length - 1 ? "1px solid oklch(1 0 0 / 0.04)" : "none" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `color-mix(in oklch, ${a.color} 14%, transparent)` }}>
                    <Icon className="w-4 h-4" style={{ color: a.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{a.text}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {a.zeit}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
