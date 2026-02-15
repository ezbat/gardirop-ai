"use client"

import { useState } from "react"
import {
  FileText, Receipt, Calendar, Clock, Download, TrendingUp,
  AlertTriangle, CheckCircle2, Search, ChevronDown, Euro,
  Calculator, Globe, ArrowUpRight
} from "lucide-react"

const PURPLE = "oklch(0.65 0.15 250)"
const GREEN = "oklch(0.72 0.19 145)"
const GOLD = "oklch(0.78 0.14 85)"
const RED = "oklch(0.7 0.15 25)"

type InvoiceStatus = "paid" | "pending" | "overdue"
const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string }> = {
  paid: { label: "Bezahlt", color: GREEN },
  pending: { label: "Ausstehend", color: GOLD },
  overdue: { label: "Überfällig", color: RED },
}

const invoices = [
  { id: "INV-2026-0147", customer: "Anna K.", amount: 89.99, tax: 14.37, date: "14.02.2026", status: "paid" as const },
  { id: "INV-2026-0146", customer: "Peter M.", amount: 149.50, tax: 23.87, date: "13.02.2026", status: "paid" as const },
  { id: "INV-2026-0145", customer: "Maria S.", amount: 65.00, tax: 10.38, date: "12.02.2026", status: "pending" as const },
  { id: "INV-2026-0144", customer: "Jan W.", amount: 199.99, tax: 31.93, date: "10.02.2026", status: "paid" as const },
  { id: "INV-2026-0143", customer: "Sophie L.", amount: 45.00, tax: 7.18, date: "08.02.2026", status: "overdue" as const },
  { id: "INV-2026-0142", customer: "Tom B.", amount: 234.50, tax: 37.44, date: "06.02.2026", status: "paid" as const },
  { id: "INV-2026-0141", customer: "Lisa F.", amount: 78.90, tax: 12.60, date: "04.02.2026", status: "paid" as const },
  { id: "INV-2026-0140", customer: "Max H.", amount: 312.00, tax: 49.82, date: "02.02.2026", status: "pending" as const },
]

const monthlyBreakdown = [
  { month: "Sep", tax: 890 }, { month: "Okt", tax: 1120 }, { month: "Nov", tax: 1350 },
  { month: "Dez", tax: 1890 }, { month: "Jan", tax: 1240 }, { month: "Feb", tax: 187.59 },
]

const taxRates = [
  { region: "Deutschland", rate: "19%", type: "USt.", active: true },
  { region: "Österreich", rate: "20%", type: "USt.", active: true },
  { region: "Schweiz", rate: "8,1%", type: "MWST", active: false },
  { region: "EU (allgemein)", rate: "Variabel", type: "OSS", active: true },
]

export default function TaxPage() {
  const [search, setSearch] = useState("")
  const [netPricing, setNetPricing] = useState(false)

  const totalTax = invoices.reduce((s, inv) => s + inv.tax, 0)
  const paidTax = invoices.filter(i => i.status === "paid").reduce((s, inv) => s + inv.tax, 0)
  const maxMonthly = Math.max(...monthlyBreakdown.map(m => m.tax))

  const filteredInvoices = invoices.filter(inv =>
    inv.id.toLowerCase().includes(search.toLowerCase()) || inv.customer.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in oklch, ${GREEN} 15%, transparent)` }}>
                <FileText className="w-5 h-5" style={{ color: GREEN }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Steuern & Rechnungen</h1>
                <p className="text-sm text-muted-foreground">Steuerdokumentation, Rechnungen und Export</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-90"
                style={{ background: `color-mix(in oklch, ${GREEN} 12%, transparent)`, color: GREEN, border: `1px solid color-mix(in oklch, ${GREEN} 25%, transparent)` }}>
                <Download className="w-3.5 h-3.5" /> CSV Export
              </button>
              <button className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-90"
                style={{ background: PURPLE, color: "#fff" }}>
                <Download className="w-3.5 h-3.5" /> PDF für Steuerberater
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Gesamtsteuer", value: `\u20AC${totalTax.toFixed(2)}`, sub: "Februar 2026", icon: Receipt, color: GREEN },
            { label: "USt. fällig", value: `\u20AC${(totalTax - paidTax).toFixed(2)}`, sub: "Noch ausstehend", icon: AlertTriangle, color: GOLD },
            { label: "Letzte Abgabe", value: "31.01.2026", sub: "Fristgerecht", icon: CheckCircle2, color: GREEN },
            { label: "Nächste Frist", value: "10.03.2026", sub: "USt.-Voranmeldung", icon: Calendar, color: PURPLE },
          ].map((card, i) => {
            const Icon = card.icon
            return (
              <div key={i} className="seller-card p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-[0.05] -translate-y-6 translate-x-6" style={{ background: card.color }} />
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `color-mix(in oklch, ${card.color} 12%, transparent)` }}>
                  <Icon className="w-4 h-4" style={{ color: card.color }} />
                </div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-xl font-bold mt-1">{card.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{card.sub}</p>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          {/* Tax Rates */}
          <div className="seller-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5" style={{ color: PURPLE }} />
                <h2 className="text-base font-bold">Steuersätze</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{netPricing ? "Netto" : "Brutto"}</span>
                <button onClick={() => setNetPricing(!netPricing)}
                  className="relative w-10 h-5 rounded-full transition-colors duration-300 cursor-pointer"
                  style={{ backgroundColor: netPricing ? PURPLE : "oklch(0.35 0 0)" }}>
                  <div className="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all duration-300"
                    style={{ left: netPricing ? "22px" : "2px" }} />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {taxRates.map(rate => (
                <div key={rate.region} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "oklch(0.14 0.01 260)" }}>
                  <div>
                    <p className="text-sm font-medium">{rate.region}</p>
                    <p className="text-[11px] text-muted-foreground">{rate.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold font-mono" style={{ color: rate.active ? GREEN : "oklch(0.4 0 0)" }}>{rate.rate}</span>
                    <div className="w-2 h-2 rounded-full" style={{ background: rate.active ? GREEN : "oklch(0.35 0 0)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Breakdown */}
          <div className="seller-card p-6 lg:col-span-2">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="w-5 h-5" style={{ color: GOLD }} />
              <h2 className="text-base font-bold">Monatliche Steuerübersicht</h2>
            </div>
            <div className="space-y-3">
              {monthlyBreakdown.map((m, i) => {
                const pct = (m.tax / maxMonthly) * 100
                const isLatest = i === monthlyBreakdown.length - 1
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className={`text-xs w-8 text-right ${isLatest ? "font-bold" : "text-muted-foreground"}`}>{m.month}</span>
                    <div className="flex-1 h-8 rounded-lg overflow-hidden relative" style={{ background: "oklch(0.15 0.02 260)" }}>
                      <div className="h-full rounded-lg flex items-center justify-end pr-3"
                        style={{ width: `${Math.max(pct, 5)}%`, background: isLatest ? `linear-gradient(90deg, color-mix(in oklch, ${PURPLE} 80%, transparent), ${PURPLE})` : `linear-gradient(90deg, color-mix(in oklch, ${GREEN} 60%, transparent), ${GREEN})`, transition: "width 0.8s ease" }}>
                        <span className="text-[11px] font-bold text-white">{"\u20AC"}{m.tax.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Invoice List */}
        <div className="seller-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5" style={{ color: GREEN }} />
              <h2 className="text-base font-bold">Rechnungen</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `color-mix(in oklch, ${GREEN} 12%, transparent)`, color: GREEN }}>{invoices.length}</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen..."
                className="pl-9 pr-4 py-2 rounded-xl text-sm border-0 outline-none w-56" style={{ background: "oklch(0.14 0.01 260)" }} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b" style={{ borderColor: "oklch(0.2 0 0)" }}>
                  <th className="text-left py-3 pr-4">Rechnung</th>
                  <th className="text-left py-3 pr-4">Kunde</th>
                  <th className="text-right py-3 pr-4">Betrag</th>
                  <th className="text-right py-3 pr-4">Steuer</th>
                  <th className="text-left py-3 pr-4">Datum</th>
                  <th className="text-right py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(inv => {
                  const statusCfg = STATUS_CONFIG[inv.status]
                  return (
                    <tr key={inv.id} className="border-b transition-colors hover:bg-white/[0.02]" style={{ borderColor: "oklch(0.15 0 0)" }}>
                      <td className="py-3 pr-4 text-xs font-mono font-medium">{inv.id}</td>
                      <td className="py-3 pr-4 text-xs">{inv.customer}</td>
                      <td className="py-3 pr-4 text-xs text-right font-medium">{"\u20AC"}{inv.amount.toFixed(2)}</td>
                      <td className="py-3 pr-4 text-xs text-right font-mono" style={{ color: GREEN }}>{"\u20AC"}{inv.tax.toFixed(2)}</td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">{inv.date}</td>
                      <td className="py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: `color-mix(in oklch, ${statusCfg.color} 12%, transparent)`, color: statusCfg.color }}>
                          {statusCfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
