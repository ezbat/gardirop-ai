"use client"

import { useState } from "react"
import {
  FileText, Receipt, Calendar, Clock, Download, TrendingUp,
  AlertTriangle, CheckCircle2, Search, Euro, Filter,
  Calculator, Globe, ArrowUpRight, PieChart as PieIcon,
  BarChart3, Layers
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts"

const PURPLE = "oklch(0.65 0.15 250)"
const GREEN = "oklch(0.72 0.19 145)"
const GOLD = "oklch(0.78 0.14 85)"
const RED = "oklch(0.7 0.15 25)"
const BLUE = "oklch(0.65 0.18 260)"

// Hex fallbacks for recharts (recharts doesn't support oklch)
const PURPLE_HEX = "#7B5EA7"
const GREEN_HEX = "#4CAF50"
const GOLD_HEX = "#D4A843"
const RED_HEX = "#C0564B"
const BLUE_HEX = "#5B7FC7"

type InvoiceStatus = "paid" | "pending" | "overdue"
const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string }> = {
  paid: { label: "Bezahlt", color: GREEN },
  pending: { label: "Offen", color: GOLD },
  overdue: { label: "\u00dcberf\u00e4llig", color: RED },
}

const invoices = [
  { id: "RE-2025-0012", customer: "Anna K.", amount: 289.90, tax: 46.29, date: "10.03.2025", status: "paid" as const },
  { id: "RE-2025-0011", customer: "Peter M.", amount: 149.50, tax: 23.87, date: "08.03.2025", status: "paid" as const },
  { id: "RE-2025-0010", customer: "Maria S.", amount: 65.00, tax: 10.38, date: "05.03.2025", status: "pending" as const },
  { id: "RE-2025-0009", customer: "Jan W.", amount: 199.99, tax: 31.93, date: "01.03.2025", status: "paid" as const },
  { id: "RE-2025-0008", customer: "Sophie L.", amount: 345.00, tax: 55.08, date: "27.02.2025", status: "overdue" as const },
  { id: "RE-2025-0007", customer: "Tom B.", amount: 234.50, tax: 37.44, date: "22.02.2025", status: "paid" as const },
  { id: "RE-2025-0006", customer: "Lisa F.", amount: 78.90, tax: 12.60, date: "18.02.2025", status: "paid" as const },
  { id: "RE-2025-0005", customer: "Max H.", amount: 312.00, tax: 49.82, date: "14.02.2025", status: "pending" as const },
  { id: "RE-2025-0004", customer: "Elif D.", amount: 159.90, tax: 25.53, date: "10.02.2025", status: "paid" as const },
  { id: "RE-2025-0003", customer: "Chris R.", amount: 89.95, tax: 14.36, date: "05.02.2025", status: "paid" as const },
  { id: "RE-2025-0002", customer: "Nina W.", amount: 425.00, tax: 67.86, date: "01.02.2025", status: "paid" as const },
  { id: "RE-2025-0001", customer: "Lukas P.", amount: 198.00, tax: 31.61, date: "28.01.2025", status: "overdue" as const },
]

const monthlyTaxData = [
  { month: "Apr", collected: 1250 },
  { month: "Mai", collected: 1480 },
  { month: "Jun", collected: 1120 },
  { month: "Jul", collected: 980 },
  { month: "Aug", collected: 850 },
  { month: "Sep", collected: 1340 },
  { month: "Okt", collected: 1780 },
  { month: "Nov", collected: 2150 },
  { month: "Dez", collected: 2500 },
  { month: "Jan", collected: 1890 },
  { month: "Feb", collected: 1650 },
  { month: "Mrz", collected: 2100 },
]

const quarterlyData = [
  { quarter: "Q1 2024", brutto: 12500, mwst: 1996, netto: 10504 },
  { quarter: "Q2 2024", brutto: 10800, mwst: 1724, netto: 9076 },
  { quarter: "Q3 2024", brutto: 9400, mwst: 1501, netto: 7899 },
  { quarter: "Q4 2024", brutto: 19200, mwst: 3067, netto: 16133 },
]

const taxRates = [
  { name: "Standard (MwSt)", rate: "19%", description: "Regelsteuersatz f\u00fcr die meisten Waren", color: GREEN, active: true },
  { name: "Erm\u00e4\u00dfigt", rate: "7%", description: "B\u00fccher, Lebensmittel, Zeitungen", color: BLUE, active: true },
  { name: "EU-Lieferung", rate: "0%", description: "Innergemeinschaftliche Lieferung", color: GOLD, active: true },
  { name: "Kleinunternehmer", rate: "\u00a719 UStG", description: "Befreiung bis 22.000\u20ac/Jahr", color: PURPLE, active: false },
  { name: "Reverse Charge", rate: "\u00a713b", description: "Steuerschuldumkehr (B2B)", color: RED, active: true },
]

const categoryTaxData = [
  { name: "Kleider", value: 980, hex: PURPLE_HEX },
  { name: "Schuhe", value: 650, hex: GREEN_HEX },
  { name: "Accessoires", value: 420, hex: GOLD_HEX },
  { name: "Jacken", value: 510, hex: BLUE_HEX },
  { name: "Hosen", value: 287, hex: RED_HEX },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: "oklch(0.15 0.02 260)",
      border: "1px solid oklch(1 0 0 / 0.1)",
      borderRadius: 12,
      padding: "10px 14px",
      fontSize: 12,
    }}>
      <p style={{ color: "oklch(0.7 0 0)", marginBottom: 4 }}>{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color, fontWeight: 600 }}>
          {entry.name}: {"\u20ac"}{entry.value.toLocaleString("de-DE")}
        </p>
      ))}
    </div>
  )
}

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: "oklch(0.15 0.02 260)",
      border: "1px solid oklch(1 0 0 / 0.1)",
      borderRadius: 12,
      padding: "10px 14px",
      fontSize: 12,
    }}>
      <p style={{ color: payload[0].payload.hex, fontWeight: 600 }}>
        {payload[0].name}: {"\u20ac"}{payload[0].value.toLocaleString("de-DE")}
      </p>
    </div>
  )
}

export default function TaxPage() {
  const [search, setSearch] = useState("")
  const [showBrutto, setShowBrutto] = useState(true)
  const [statusFilter, setStatusFilter] = useState<"all" | InvoiceStatus>("all")

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.id.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `color-mix(in oklch, ${GREEN} 15%, transparent)` }}>
                <Calculator className="w-5 h-5" style={{ color: GREEN }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Steuern & Rechnungen</h1>
                <p className="text-sm text-muted-foreground">MwSt-Verwaltung, Rechnungen und Steuerexport</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-90 cursor-pointer"
                style={{ background: `color-mix(in oklch, ${GREEN} 12%, transparent)`, color: GREEN, border: `1px solid color-mix(in oklch, ${GREEN} 25%, transparent)` }}>
                <Download className="w-3.5 h-3.5" /> CSV Export
              </button>
              <button className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-90 cursor-pointer"
                style={{ background: PURPLE, color: "#fff" }}>
                <Download className="w-3.5 h-3.5" /> PDF Export
              </button>
            </div>
          </div>
        </div>

        {/* Tax Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "MwSt gesammelt", value: "\u20ac2.847,56", sub: "Laufendes Quartal", icon: Receipt, color: GREEN },
            { label: "MwSt abzuf\u00fchren", value: "\u20ac1.423,78", sub: "Noch ausstehend", icon: AlertTriangle, color: GOLD },
            { label: "N\u00e4chste F\u00e4lligkeit", value: "15.04.2025", sub: "USt-Voranmeldung", icon: Calendar, color: PURPLE },
            { label: "Letzte Meldung", value: "15.01.2025", sub: "Fristgerecht eingereicht", icon: CheckCircle2, color: GREEN },
          ].map((card, i) => {
            const Icon = card.icon
            return (
              <div key={i} className="seller-card p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.06] -translate-y-8 translate-x-8"
                  style={{ background: card.color }} />
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `color-mix(in oklch, ${card.color} 12%, transparent)` }}>
                  <Icon className="w-4 h-4" style={{ color: card.color }} />
                </div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-xl font-bold mt-1">{card.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{card.sub}</p>
              </div>
            )
          })}
        </div>

        {/* Monthly Tax Collection BarChart + Tax by Category PieChart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          <div className="seller-card p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" style={{ color: PURPLE }} />
                <h2 className="text-base font-bold">Monatliche MwSt-Einnahmen</h2>
              </div>
              <span className="text-xs text-muted-foreground">Letzte 12 Monate</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTaxData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0 0)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "oklch(0.5 0 0)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "oklch(0.5 0 0)", fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `\u20ac${v}`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "oklch(1 0 0 / 0.03)" }} />
                  <Bar dataKey="collected" name="MwSt" fill={PURPLE_HEX} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tax by Category PieChart */}
          <div className="seller-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <PieIcon className="w-5 h-5" style={{ color: GOLD }} />
              <h2 className="text-base font-bold">MwSt nach Kategorie</h2>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryTaxData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryTaxData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.hex} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {categoryTaxData.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: cat.hex }} />
                    <span className="text-muted-foreground">{cat.name}</span>
                  </div>
                  <span className="font-semibold">{"\u20ac"}{cat.value.toLocaleString("de-DE")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tax Rates Table + Quarterly Breakdown AreaChart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {/* Tax Rates */}
          <div className="seller-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5" style={{ color: BLUE }} />
                <h2 className="text-base font-bold">Steuers\u00e4tze</h2>
              </div>
              {/* Brutto/Netto Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium" style={{ color: showBrutto ? PURPLE : "oklch(0.5 0 0)" }}>Brutto</span>
                <button onClick={() => setShowBrutto(!showBrutto)}
                  className="relative w-10 h-5 rounded-full transition-colors duration-300 cursor-pointer"
                  style={{ backgroundColor: showBrutto ? PURPLE : GREEN }}>
                  <div className="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all duration-300"
                    style={{ left: showBrutto ? "2px" : "22px" }} />
                </button>
                <span className="text-xs font-medium" style={{ color: !showBrutto ? GREEN : "oklch(0.5 0 0)" }}>Netto</span>
              </div>
            </div>
            <div className="space-y-2.5">
              {taxRates.map((rate) => (
                <div key={rate.name} className="flex items-center justify-between p-3.5 rounded-xl"
                  style={{ background: "oklch(0.14 0.01 260)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{rate.name}</p>
                      {!rate.active && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: "oklch(0.25 0 0)", color: "oklch(0.5 0 0)" }}>inaktiv</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{rate.description}</p>
                  </div>
                  <div className="flex items-center gap-2.5 ml-3">
                    <span className="text-sm font-bold font-mono"
                      style={{ color: rate.active ? rate.color : "oklch(0.35 0 0)" }}>{rate.rate}</span>
                    <div className="w-2 h-2 rounded-full" style={{ background: rate.active ? GREEN : "oklch(0.3 0 0)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quarterly Breakdown AreaChart */}
          <div className="seller-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5" style={{ color: GREEN }} />
                <h2 className="text-base font-bold">Quartals\u00fcbersicht</h2>
              </div>
              <span className="text-xs text-muted-foreground">Brutto \u2192 MwSt \u2192 Netto</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={quarterlyData}>
                  <defs>
                    <linearGradient id="gradBrutto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PURPLE_HEX} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={PURPLE_HEX} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradMwst" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={RED_HEX} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={RED_HEX} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradNetto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={GREEN_HEX} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={GREEN_HEX} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0 0)" vertical={false} />
                  <XAxis dataKey="quarter" tick={{ fill: "oklch(0.5 0 0)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "oklch(0.5 0 0)", fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="brutto" name="Brutto" stroke={PURPLE_HEX} fill="url(#gradBrutto)" strokeWidth={2} />
                  <Area type="monotone" dataKey="mwst" name="MwSt" stroke={RED_HEX} fill="url(#gradMwst)" strokeWidth={2} />
                  <Area type="monotone" dataKey="netto" name="Netto" stroke={GREEN_HEX} fill="url(#gradNetto)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-5 mt-3">
              {[
                { label: "Brutto", color: PURPLE_HEX },
                { label: "MwSt", color: RED_HEX },
                { label: "Netto", color: GREEN_HEX },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Invoice List Table */}
        <div className="seller-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5" style={{ color: GREEN }} />
              <h2 className="text-base font-bold">Rechnungen</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: `color-mix(in oklch, ${GREEN} 12%, transparent)`, color: GREEN }}>
                {invoices.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Status Filter */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: "oklch(0.14 0.01 260)" }}>
                {([
                  { key: "all" as const, label: "Alle" },
                  { key: "paid" as const, label: "Bezahlt" },
                  { key: "pending" as const, label: "Offen" },
                  { key: "overdue" as const, label: "\u00dcberf." },
                ]).map((f) => (
                  <button key={f.key} onClick={() => setStatusFilter(f.key)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer"
                    style={{
                      background: statusFilter === f.key ? `color-mix(in oklch, ${PURPLE} 20%, transparent)` : "transparent",
                      color: statusFilter === f.key ? PURPLE : "oklch(0.5 0 0)",
                    }}>
                    {f.label}
                  </button>
                ))}
              </div>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen..."
                  className="pl-8 pr-4 py-1.5 rounded-xl text-xs border-0 outline-none w-44"
                  style={{ background: "oklch(0.14 0.01 260)" }} />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-muted-foreground uppercase tracking-wider border-b"
                  style={{ borderColor: "oklch(0.2 0 0)" }}>
                  <th className="text-left py-3 pr-4 font-medium">Rechnungsnr.</th>
                  <th className="text-left py-3 pr-4 font-medium">Datum</th>
                  <th className="text-left py-3 pr-4 font-medium">Kunde</th>
                  <th className="text-right py-3 pr-4 font-medium">{showBrutto ? "Betrag (Brutto)" : "Betrag (Netto)"}</th>
                  <th className="text-right py-3 pr-4 font-medium">MwSt</th>
                  <th className="text-right py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(inv => {
                  const statusCfg = STATUS_CONFIG[inv.status]
                  const displayAmount = showBrutto ? inv.amount : (inv.amount - inv.tax)
                  return (
                    <tr key={inv.id} className="border-b transition-colors hover:bg-white/[0.02] group"
                      style={{ borderColor: "oklch(0.15 0 0)" }}>
                      <td className="py-3.5 pr-4">
                        <span className="text-xs font-mono font-semibold">{inv.id}</span>
                      </td>
                      <td className="py-3.5 pr-4 text-xs text-muted-foreground">{inv.date}</td>
                      <td className="py-3.5 pr-4 text-xs font-medium">{inv.customer}</td>
                      <td className="py-3.5 pr-4 text-xs text-right font-semibold">
                        {"\u20ac"}{displayAmount.toFixed(2).replace(".", ",")}
                      </td>
                      <td className="py-3.5 pr-4 text-xs text-right font-mono" style={{ color: GREEN }}>
                        {"\u20ac"}{inv.tax.toFixed(2).replace(".", ",")}
                      </td>
                      <td className="py-3.5 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-semibold"
                          style={{
                            background: `color-mix(in oklch, ${statusCfg.color} 12%, transparent)`,
                            color: statusCfg.color,
                          }}>
                          {inv.status === "paid" && <CheckCircle2 className="w-3 h-3" />}
                          {inv.status === "overdue" && <AlertTriangle className="w-3 h-3" />}
                          {inv.status === "pending" && <Clock className="w-3 h-3" />}
                          {statusCfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filteredInvoices.length === 0 && (
            <div className="text-center py-10">
              <Search className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">Keine Rechnungen gefunden</p>
            </div>
          )}
          {/* Invoice Summary */}
          <div className="flex flex-wrap items-center gap-4 mt-5 pt-4 border-t" style={{ borderColor: "oklch(0.18 0 0)" }}>
            <div className="text-xs text-muted-foreground">
              Gesamt: <span className="font-bold text-foreground">
                {"\u20ac"}{invoices.reduce((s, i) => s + i.amount, 0).toFixed(2).replace(".", ",")}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              MwSt gesamt: <span className="font-bold" style={{ color: GREEN }}>
                {"\u20ac"}{invoices.reduce((s, i) => s + i.tax, 0).toFixed(2).replace(".", ",")}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Bezahlt: <span className="font-bold" style={{ color: GREEN }}>
                {invoices.filter(i => i.status === "paid").length}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Offen: <span className="font-bold" style={{ color: GOLD }}>
                {invoices.filter(i => i.status === "pending").length}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {"\u00dcberf\u00e4llig"}: <span className="font-bold" style={{ color: RED }}>
                {invoices.filter(i => i.status === "overdue").length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
