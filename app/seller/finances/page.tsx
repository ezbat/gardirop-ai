"use client"

import { useState } from "react"
import {
  Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  CreditCard, FileText, Download, Euro, Calendar, Filter,
  ChevronDown, ChevronUp, Building2, Clock, PiggyBank
} from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ComposedChart
} from "recharts"

const monthlyRevenueData = [
  { month: "Mar", einnahmen: 5840, ausgaben: 2120, gewinn: 3720 },
  { month: "Apr", einnahmen: 6290, ausgaben: 2340, gewinn: 3950 },
  { month: "Mai", einnahmen: 7150, ausgaben: 2580, gewinn: 4570 },
  { month: "Jun", einnahmen: 6780, ausgaben: 2450, gewinn: 4330 },
  { month: "Jul", einnahmen: 5920, ausgaben: 2180, gewinn: 3740 },
  { month: "Aug", einnahmen: 6450, ausgaben: 2390, gewinn: 4060 },
  { month: "Sep", einnahmen: 7890, ausgaben: 2760, gewinn: 5130 },
  { month: "Okt", einnahmen: 8340, ausgaben: 2910, gewinn: 5430 },
  { month: "Nov", einnahmen: 11250, ausgaben: 3680, gewinn: 7570 },
  { month: "Dez", einnahmen: 12480, ausgaben: 4120, gewinn: 8360 },
  { month: "Jan", einnahmen: 7640, ausgaben: 2680, gewinn: 4960 },
  { month: "Feb", einnahmen: 8247, ausgaben: 2890, gewinn: 5357 },
]

const feeBreakdownData = [
  { name: "Netto-Gewinn", value: 55.1, color: "oklch(0.72 0.19 145)" },
  { name: "MwSt", value: 19, color: "oklch(0.65 0.15 250)" },
  { name: "Versand", value: 15, color: "oklch(0.78 0.14 85)" },
  { name: "Plattform", value: 8, color: "oklch(0.65 0.18 260)" },
  { name: "Zahlung", value: 2.9, color: "oklch(0.7 0.15 25)" },
]

const monthlyEarningsData = [
  { month: "Sep", brutto: 7890, gebuehren: 2760, netto: 5130 },
  { month: "Okt", brutto: 8340, gebuehren: 2910, netto: 5430 },
  { month: "Nov", brutto: 11250, gebuehren: 3680, netto: 7570 },
  { month: "Dez", brutto: 12480, gebuehren: 4120, netto: 8360 },
  { month: "Jan", brutto: 7640, gebuehren: 2680, netto: 4960 },
  { month: "Feb", brutto: 8247, gebuehren: 2890, netto: 5357 },
]

const profitMarginData = [
  { month: "Sep", marge: 32.4 },
  { month: "Okt", marge: 31.8 },
  { month: "Nov", marge: 33.6 },
  { month: "Dez", marge: 34.2 },
  { month: "Jan", marge: 30.9 },
  { month: "Feb", marge: 32.1 },
]

const transactions = [
  { id: "TXN-2847", datum: "15.02.2025", typ: "Verkauf", beschreibung: "Bestellung #WR-8847 – Oversized Blazer Schwarz", betrag: 89.90, saldo: 4287.35 },
  { id: "TXN-2846", datum: "14.02.2025", typ: "Verkauf", beschreibung: "Bestellung #WR-8842 – Satin Midikleid Bordeaux", betrag: 124.90, saldo: 4197.45 },
  { id: "TXN-2845", datum: "14.02.2025", typ: "Gebühr", beschreibung: "Plattformgebühr – Bestellung #WR-8842", betrag: -9.99, saldo: 4072.55 },
  { id: "TXN-2844", datum: "13.02.2025", typ: "Verkauf", beschreibung: "Bestellung #WR-8839 – Wollmantel Camel", betrag: 189.00, saldo: 4082.54 },
  { id: "TXN-2843", datum: "13.02.2025", typ: "Gebühr", beschreibung: "Zahlungsgebühr – Bestellung #WR-8839", betrag: -5.78, saldo: 3893.54 },
  { id: "TXN-2842", datum: "12.02.2025", typ: "Rückerstattung", beschreibung: "Retoure #RT-412 – Plisseerock Midi Navy", betrag: -54.90, saldo: 3899.32 },
  { id: "TXN-2841", datum: "12.02.2025", typ: "Verkauf", beschreibung: "Bestellung #WR-8835 – Chunky Boots Schwarz", betrag: 129.90, saldo: 3954.22 },
  { id: "TXN-2840", datum: "11.02.2025", typ: "Auszahlung", beschreibung: "Auszahlung auf DE89 •••• 4567", betrag: -2500.00, saldo: 3824.32 },
  { id: "TXN-2839", datum: "11.02.2025", typ: "Verkauf", beschreibung: "Bestellung #WR-8831 – Cashmere Pullover Creme", betrag: 149.90, saldo: 6324.32 },
  { id: "TXN-2838", datum: "10.02.2025", typ: "Verkauf", beschreibung: "Bestellung #WR-8828 – Leder Gürteltasche Cognac", betrag: 67.90, saldo: 6174.42 },
  { id: "TXN-2837", datum: "10.02.2025", typ: "Gebühr", beschreibung: "Versandgebühr – 3 Sendungen", betrag: -14.85, saldo: 6106.52 },
  { id: "TXN-2836", datum: "09.02.2025", typ: "Verkauf", beschreibung: "Bestellung #WR-8824 – Strickjacke Oversize Beige", betrag: 79.90, saldo: 6121.37 },
  { id: "TXN-2835", datum: "09.02.2025", typ: "Verkauf", beschreibung: "Bestellung #WR-8822 – High-Waist Jeans Vintage", betrag: 74.90, saldo: 6041.47 },
  { id: "TXN-2834", datum: "08.02.2025", typ: "Gebühr", beschreibung: "Plattformgebühr – 5 Bestellungen", betrag: -27.45, saldo: 5966.57 },
  { id: "TXN-2833", datum: "08.02.2025", typ: "Verkauf", beschreibung: "Bestellung #WR-8819 – Seidenbluse Champagner", betrag: 94.90, saldo: 5994.02 },
]

const typColor: Record<string, string> = {
  "Verkauf": "oklch(0.72 0.19 145)",
  "Gebühr": "oklch(0.7 0.15 25)",
  "Auszahlung": "oklch(0.65 0.18 260)",
  "Rückerstattung": "oklch(0.78 0.14 85)",
}

const fmt = (n: number) => n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function SellerFinancesPage() {
  const [activeTab, setActiveTab] = useState<"uebersicht" | "transaktionen">("uebersicht")
  const [showAllTx, setShowAllTx] = useState(false)

  const displayedTx = showAllTx ? transactions : transactions.slice(0, 8)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Finanzen</h1>
          <p className="text-sm" style={{ color: "oklch(0.65 0.03 260)" }}>Umsatz, Gebühren und Auszahlungen</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80" style={{ background: "color-mix(in oklch, oklch(0.65 0.15 250) 15%, transparent)" }}>
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80" style={{ background: "color-mix(in oklch, oklch(0.7 0.15 25) 15%, transparent)" }}>
            <FileText className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Verfügbares Guthaben", value: "4.287,35", icon: Wallet, color: "oklch(0.72 0.19 145)", change: "+12,4%" },
          { label: "Ausstehendes Guthaben", value: "1.892,60", icon: Clock, color: "oklch(0.78 0.14 85)", change: "3 Bestellungen" },
          { label: "Diesen Monat verdient", value: "8.247,90", icon: TrendingUp, color: "oklch(0.65 0.15 250)", change: "+18,2%" },
          { label: "Auszahlungen gesamt", value: "42.156,80", icon: Building2, color: "oklch(0.65 0.18 260)", change: "24 Auszahlungen" },
        ].map((card) => (
          <div key={card.label} className="seller-card p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in oklch, ${card.color} 15%, transparent)` }}>
                <card.icon className="w-4 h-4" style={{ color: card.color }} />
              </div>
            </div>
            <p className="text-xs mb-1" style={{ color: "oklch(0.65 0.03 260)" }}>{card.label}</p>
            <p className="text-xl font-bold">€{card.value}</p>
            <p className="text-xs mt-1" style={{ color: card.color }}>{card.change}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "oklch(0.18 0.02 260)" }}>
        {(["uebersicht", "transaktionen"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === tab ? "oklch(0.25 0.03 260)" : "transparent",
              color: activeTab === tab ? "white" : "oklch(0.65 0.03 260)",
            }}
          >
            {tab === "uebersicht" ? "Übersicht" : "Transaktionen"}
          </button>
        ))}
      </div>

      {activeTab === "uebersicht" && (
        <>
          {/* Revenue vs Expenses Chart */}
          <div className="seller-card p-5 rounded-xl">
            <h3 className="font-semibold mb-1">Einnahmen vs. Ausgaben</h3>
            <p className="text-xs mb-4" style={{ color: "oklch(0.65 0.03 260)" }}>Letzte 12 Monate</p>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyRevenueData}>
                  <defs>
                    <linearGradient id="gradEinnahmen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.72 0.19 145)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.72 0.19 145)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradAusgaben" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.7 0.15 25)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.7 0.15 25)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
                  <XAxis dataKey="month" stroke="oklch(0.5 0.02 260)" fontSize={12} />
                  <YAxis stroke="oklch(0.5 0.02 260)" fontSize={12} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.2 0.02 260)", border: "1px solid oklch(0.3 0.02 260)", borderRadius: "8px" }}
                    labelStyle={{ color: "white" }}
                    formatter={(value: number) => [`€${fmt(value)}`, undefined]}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="einnahmen" name="Einnahmen" stroke="oklch(0.72 0.19 145)" fill="url(#gradEinnahmen)" strokeWidth={2} />
                  <Area type="monotone" dataKey="ausgaben" name="Ausgaben" stroke="oklch(0.7 0.15 25)" fill="url(#gradAusgaben)" strokeWidth={2} />
                  <Line type="monotone" dataKey="gewinn" name="Netto-Gewinn" stroke="oklch(0.65 0.15 250)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fee Breakdown */}
            <div className="seller-card p-5 rounded-xl">
              <h3 className="font-semibold mb-1">Kostenverteilung</h3>
              <p className="text-xs mb-4" style={{ color: "oklch(0.65 0.03 260)" }}>Pro Bestellung (Durchschnitt)</p>
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={feeBreakdownData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {feeBreakdownData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "oklch(0.2 0.02 260)", border: "1px solid oklch(0.3 0.02 260)", borderRadius: "8px" }}
                      formatter={(value: number) => [`${value}%`, undefined]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {feeBreakdownData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                    <span style={{ color: "oklch(0.65 0.03 260)" }}>{item.name}</span>
                    <span className="ml-auto font-medium">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Earnings Comparison */}
            <div className="seller-card p-5 rounded-xl">
              <h3 className="font-semibold mb-1">Monatliche Einnahmen</h3>
              <p className="text-xs mb-4" style={{ color: "oklch(0.65 0.03 260)" }}>Brutto / Gebühren / Netto</p>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyEarningsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
                    <XAxis dataKey="month" stroke="oklch(0.5 0.02 260)" fontSize={12} />
                    <YAxis stroke="oklch(0.5 0.02 260)" fontSize={12} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: "oklch(0.2 0.02 260)", border: "1px solid oklch(0.3 0.02 260)", borderRadius: "8px" }}
                      formatter={(value: number) => [`€${fmt(value)}`, undefined]}
                    />
                    <Legend />
                    <Bar dataKey="brutto" name="Brutto" fill="oklch(0.65 0.15 250)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gebuehren" name="Gebühren" fill="oklch(0.7 0.15 25)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="netto" name="Netto" fill="oklch(0.72 0.19 145)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Profit Margin Trend */}
          <div className="seller-card p-5 rounded-xl">
            <h3 className="font-semibold mb-1">Gewinnmarge</h3>
            <p className="text-xs mb-4" style={{ color: "oklch(0.65 0.03 260)" }}>Netto-Marge in % der letzten 6 Monate</p>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={profitMarginData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
                  <XAxis dataKey="month" stroke="oklch(0.5 0.02 260)" fontSize={12} />
                  <YAxis stroke="oklch(0.5 0.02 260)" fontSize={12} domain={[28, 36]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.2 0.02 260)", border: "1px solid oklch(0.3 0.02 260)", borderRadius: "8px" }}
                    formatter={(value: number) => [`${value}%`, "Marge"]}
                  />
                  <Line type="monotone" dataKey="marge" stroke="oklch(0.78 0.14 85)" strokeWidth={2.5} dot={{ fill: "oklch(0.78 0.14 85)", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payout Schedule */}
          <div className="seller-card p-5 rounded-xl">
            <h3 className="font-semibold mb-4">Nächste Auszahlung</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg" style={{ background: "color-mix(in oklch, oklch(0.72 0.19 145) 10%, transparent)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4" style={{ color: "oklch(0.72 0.19 145)" }} />
                  <span className="text-xs" style={{ color: "oklch(0.65 0.03 260)" }}>Auszahlungsdatum</span>
                </div>
                <p className="font-bold text-lg">20.02.2025</p>
                <p className="text-xs mt-1" style={{ color: "oklch(0.65 0.03 260)" }}>in 5 Tagen</p>
              </div>
              <div className="p-4 rounded-lg" style={{ background: "color-mix(in oklch, oklch(0.65 0.15 250) 10%, transparent)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Euro className="w-4 h-4" style={{ color: "oklch(0.65 0.15 250)" }} />
                  <span className="text-xs" style={{ color: "oklch(0.65 0.03 260)" }}>Auszahlungsbetrag</span>
                </div>
                <p className="font-bold text-lg">€4.287,35</p>
                <p className="text-xs mt-1" style={{ color: "oklch(0.65 0.03 260)" }}>Nach Gebühren</p>
              </div>
              <div className="p-4 rounded-lg" style={{ background: "color-mix(in oklch, oklch(0.65 0.18 260) 10%, transparent)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4" style={{ color: "oklch(0.65 0.18 260)" }} />
                  <span className="text-xs" style={{ color: "oklch(0.65 0.03 260)" }}>Bankverbindung</span>
                </div>
                <p className="font-bold">DE89 •••• •••• 4567</p>
                <p className="text-xs mt-1" style={{ color: "oklch(0.65 0.03 260)" }}>Commerzbank • Wöchentlich</p>
              </div>
            </div>
          </div>

          {/* Tax Summary */}
          <div className="seller-card p-5 rounded-xl">
            <h3 className="font-semibold mb-4">Steuerübersicht</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "color-mix(in oklch, oklch(0.78 0.14 85) 15%, transparent)" }}>
                  <PiggyBank className="w-5 h-5" style={{ color: "oklch(0.78 0.14 85)" }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: "oklch(0.65 0.03 260)" }}>MwSt gesammelt</p>
                  <p className="font-bold">€1.567,42</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "color-mix(in oklch, oklch(0.7 0.15 25) 15%, transparent)" }}>
                  <Calendar className="w-5 h-5" style={{ color: "oklch(0.7 0.15 25)" }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: "oklch(0.65 0.03 260)" }}>Nächste Fälligkeit</p>
                  <p className="font-bold">15.04.2025</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "color-mix(in oklch, oklch(0.65 0.15 250) 15%, transparent)" }}>
                  <FileText className="w-5 h-5" style={{ color: "oklch(0.65 0.15 250)" }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: "oklch(0.65 0.03 260)" }}>Steuer-ID</p>
                  <p className="font-bold">DE123456789</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "transaktionen" && (
        <div className="seller-card rounded-xl overflow-hidden">
          <div className="p-4 flex items-center justify-between" style={{ borderBottom: "1px solid oklch(0.25 0.02 260)" }}>
            <h3 className="font-semibold">Transaktionsverlauf</h3>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs" style={{ background: "oklch(0.18 0.02 260)" }}>
                <Filter className="w-3 h-3" /> Filtern
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "oklch(0.15 0.02 260)" }}>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: "oklch(0.65 0.03 260)" }}>Datum</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: "oklch(0.65 0.03 260)" }}>Typ</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: "oklch(0.65 0.03 260)" }}>Beschreibung</th>
                  <th className="text-right px-4 py-3 font-medium" style={{ color: "oklch(0.65 0.03 260)" }}>Betrag</th>
                  <th className="text-right px-4 py-3 font-medium" style={{ color: "oklch(0.65 0.03 260)" }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {displayedTx.map((tx) => (
                  <tr key={tx.id} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom: "1px solid oklch(0.2 0.01 260)" }}>
                    <td className="px-4 py-3">{tx.datum}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: `color-mix(in oklch, ${typColor[tx.typ]} 15%, transparent)`, color: typColor[tx.typ] }}>
                        {tx.typ}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: "oklch(0.75 0.02 260)" }}>{tx.beschreibung}</td>
                    <td className="px-4 py-3 text-right font-medium" style={{ color: tx.betrag > 0 ? "oklch(0.72 0.19 145)" : "oklch(0.7 0.15 25)" }}>
                      {tx.betrag > 0 ? "+" : ""}€{fmt(Math.abs(tx.betrag))}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">€{fmt(tx.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!showAllTx && transactions.length > 8 && (
            <button
              onClick={() => setShowAllTx(true)}
              className="w-full py-3 text-sm font-medium transition-colors hover:bg-white/[0.02] flex items-center justify-center gap-1"
              style={{ borderTop: "1px solid oklch(0.25 0.02 260)", color: "oklch(0.65 0.15 250)" }}
            >
              Alle {transactions.length} Transaktionen anzeigen <ChevronDown className="w-4 h-4" />
            </button>
          )}
          {showAllTx && (
            <button
              onClick={() => setShowAllTx(false)}
              className="w-full py-3 text-sm font-medium transition-colors hover:bg-white/[0.02] flex items-center justify-center gap-1"
              style={{ borderTop: "1px solid oklch(0.25 0.02 260)", color: "oklch(0.65 0.15 250)" }}
            >
              Weniger anzeigen <ChevronUp className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
