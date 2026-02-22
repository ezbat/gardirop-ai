"use client"

import { useState, useMemo } from "react"
import {
  DollarSign, TrendingUp, TrendingDown, Percent, ArrowLeft,
  BarChart3, Target, RefreshCw, Zap, Tag, Package,
  ArrowUpRight, ArrowDownRight, ToggleLeft, ToggleRight,
  Calculator, Activity, ShoppingBag, Layers, AlertTriangle
} from "lucide-react"
import Link from "next/link"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, Cell,
  Legend, ZAxis
} from "recharts"

// ---- OKLCH PALETTE ----
const PURPLE = "oklch(0.65 0.15 250)"
const GREEN = "oklch(0.72 0.19 145)"
const GOLD = "oklch(0.78 0.14 85)"
const RED = "oklch(0.7 0.15 25)"
const BLUE = "oklch(0.65 0.18 260)"

// ---- HELPERS ----
function fmt(v: number): string {
  return `\u20AC${v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ---- MOCK DATA ----
const priceDistributionData = [
  { bucket: "0-10", count: 2 },
  { bucket: "10-20", count: 5 },
  { bucket: "20-30", count: 8 },
  { bucket: "30-40", count: 14 },
  { bucket: "40-50", count: 18 },
  { bucket: "50-60", count: 22 },
  { bucket: "60-70", count: 26 },
  { bucket: "70-80", count: 19 },
  { bucket: "80-90", count: 12 },
  { bucket: "90-100", count: 7 },
  { bucket: "100-150", count: 9 },
  { bucket: "150-200", count: 4 },
  { bucket: "200-300", count: 2 },
]

const priceVsSalesData = [
  { name: "Basic Tee", price: 19.90, units: 142 },
  { name: "Slim Jeans", price: 49.90, units: 98 },
  { name: "Wollpullover", price: 79.00, units: 63 },
  { name: "Lederjacke", price: 189.00, units: 24 },
  { name: "Sneaker Classic", price: 89.90, units: 77 },
  { name: "Sommerkleid", price: 59.90, units: 85 },
  { name: "Cargo Hose", price: 44.90, units: 104 },
  { name: "Hoodie Premium", price: 69.00, units: 91 },
  { name: "Seidenbluse", price: 129.00, units: 38 },
  { name: "Sport-BH", price: 29.90, units: 116 },
  { name: "Wintermantel", price: 249.00, units: 15 },
  { name: "Leinenhose", price: 54.90, units: 72 },
  { name: "Cashmere Schal", price: 99.00, units: 45 },
  { name: "Regenjacke", price: 119.00, units: 33 },
  { name: "Baumwollsocken 3er", price: 12.90, units: 189 },
]

const competitorData = [
  { product: "Basic Tee", yours: 19.90, market: 22.50, lowest: 14.90 },
  { product: "Slim Jeans", yours: 49.90, market: 54.00, lowest: 39.90 },
  { product: "Wollpullover", yours: 79.00, market: 85.00, lowest: 62.00 },
  { product: "Lederjacke", yours: 189.00, market: 210.00, lowest: 159.00 },
  { product: "Sneaker", yours: 89.90, market: 95.00, lowest: 79.90 },
  { product: "Sommerkleid", yours: 59.90, market: 55.00, lowest: 42.00 },
  { product: "Cargo Hose", yours: 44.90, market: 48.00, lowest: 34.90 },
  { product: "Hoodie", yours: 69.00, market: 72.00, lowest: 55.00 },
]

const dynamicPricingRules = [
  { id: 1, name: "Lagerbestand < 5", description: "Preis um 15% erhohen bei niedrigem Bestand", condition: "stock < 5", action: "+15%", active: true },
  { id: 2, name: "Saisonende-Rabatt", description: "20% Rabatt auf Saisonware nach 60 Tagen", condition: "Alter > 60 Tage", action: "-20%", active: true },
  { id: 3, name: "Wettbewerber unterbieten", description: "5% unter dem niedrigsten Marktpreis", condition: "Preis > Marktmin", action: "-5% vs. Min", active: false },
  { id: 4, name: "Bundle-Rabatt", description: "10% Rabatt bei Kauf von 3+ Artikeln", condition: "Menge >= 3", action: "-10%", active: true },
  { id: 5, name: "Wochenend-Aktion", description: "8% Rabatt an Samstagen und Sonntagen", condition: "Sa/So", action: "-8%", active: false },
]

const marginAnalysisData = [
  { product: "Basic Tee", einkauf: 7.50, verkauf: 19.90, mpieces: 142 },
  { product: "Slim Jeans", einkauf: 18.00, verkauf: 49.90, mpieces: 98 },
  { product: "Wollpullover", einkauf: 32.00, verkauf: 79.00, mpieces: 63 },
  { product: "Lederjacke", einkauf: 85.00, verkauf: 189.00, mpieces: 24 },
  { product: "Sneaker Classic", einkauf: 38.00, verkauf: 89.90, mpieces: 77 },
  { product: "Sommerkleid", einkauf: 22.00, verkauf: 59.90, mpieces: 85 },
  { product: "Cargo Hose", einkauf: 16.50, verkauf: 44.90, mpieces: 104 },
  { product: "Hoodie Premium", einkauf: 28.00, verkauf: 69.00, mpieces: 91 },
]

const elasticityData = [
  { product: "Basic Tee", elasticity: -1.8 },
  { product: "Slim Jeans", elasticity: -1.2 },
  { product: "Wollpullover", elasticity: -0.7 },
  { product: "Sneaker", elasticity: -1.5 },
  { product: "Sommerkleid", elasticity: -2.1 },
]

// ---- OVERVIEW CARD ----
function OverviewCard({ label, value, subtext, icon: Icon, color, index }: {
  label: string; value: string; subtext?: string; icon: any; color: string; index: number
}) {
  return (
    <div className="seller-card p-5 relative overflow-hidden" style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.04] -translate-y-8 translate-x-8" style={{ background: color }} />
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `color-mix(in oklch, ${color} 12%, transparent)` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <p className="text-[13px] text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold tracking-tight mb-1">{value}</p>
      {subtext && <p className="text-[11px] text-muted-foreground">{subtext}</p>}
    </div>
  )
}

// ---- SECTION HEADER ----
function SectionHeader({ icon: Icon, title, color }: { icon: any; title: string; color: string }) {
  return (
    <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5" style={{ color }} />
      {title}
    </h3>
  )
}

// ---- CUSTOM TOOLTIP ----
function ChartTooltip({ active, payload, label, prefix }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-lg border"
      style={{ background: "oklch(0.13 0.02 260)", borderColor: "oklch(1 0 0 / 0.1)" }}>
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{prefix === "EUR" ? fmt(entry.value) : entry.value}</span>
        </p>
      ))}
    </div>
  )
}

// ---- SCATTER TOOLTIP ----
function ScatterTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-lg border"
      style={{ background: "oklch(0.13 0.02 260)", borderColor: "oklch(1 0 0 / 0.1)" }}>
      <p className="font-semibold mb-1">{d.name}</p>
      <p className="text-muted-foreground">Preis: <span className="font-medium text-foreground">{fmt(d.price)}</span></p>
      <p className="text-muted-foreground">Verkauft: <span className="font-medium text-foreground">{d.units} Stk.</span></p>
    </div>
  )
}

// ---- MAIN PAGE ----
export default function PricingEnginePage() {
  const [rules, setRules] = useState(dynamicPricingRules)
  const [discountPercent, setDiscountPercent] = useState(15)

  // Toggle pricing rule
  const toggleRule = (id: number) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r))
  }

  // Discount simulator calculations
  const simulatorResults = useMemo(() => {
    const avgPrice = 67.40
    const totalRevenue = 148200
    const totalUnits = 2200
    const factor = 1 - discountPercent / 100
    const newAvgPrice = avgPrice * factor
    const demandIncrease = discountPercent * 1.4
    const newUnits = Math.round(totalUnits * (1 + demandIncrease / 100))
    const newRevenue = Math.round(newAvgPrice * newUnits)
    const revenueDelta = newRevenue - totalRevenue
    const revenueDeltaPct = ((revenueDelta / totalRevenue) * 100).toFixed(1)
    return {
      newAvgPrice,
      newUnits,
      newRevenue,
      revenueDelta,
      revenueDeltaPct,
      demandIncrease: demandIncrease.toFixed(1),
    }
  }, [discountPercent])

  // Margin calculations
  const marginRows = useMemo(() => {
    return marginAnalysisData.map(item => {
      const marge = ((item.verkauf - item.einkauf) / item.verkauf) * 100
      const profit = (item.verkauf - item.einkauf) * item.mpieces
      return { ...item, marge: marge.toFixed(1), profit }
    })
  }, [])

  // Scatter colors by price range
  const getScatterColor = (price: number) => {
    if (price < 30) return GREEN
    if (price < 70) return BLUE
    if (price < 130) return GOLD
    return RED
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">

        {/* ---- HEADER ---- */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">Pricing Engine</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: `color-mix(in oklch, ${PURPLE} 15%, transparent)`, color: PURPLE }}>
                Pro Tool
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Dynamische Preisoptimierung, Margenanalyse und Wettbewerbsvergleich
            </p>
          </div>
          <Link href="/seller/dashboard"
            className="p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors" title="Zuruck">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>

        {/* ---- 1. OVERVIEW CARDS ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <OverviewCard
            label="Durchschnittspreis"
            value={fmt(67.40)}
            subtext="uber 148 Produkte"
            icon={DollarSign}
            color={GOLD}
            index={0}
          />
          <OverviewCard
            label="Hochster Preis"
            value={fmt(289.00)}
            subtext="Lederjacke Premium"
            icon={TrendingUp}
            color={GREEN}
            index={1}
          />
          <OverviewCard
            label="Niedrigster Preis"
            value={fmt(12.90)}
            subtext="Baumwollsocken 3er-Pack"
            icon={TrendingDown}
            color={RED}
            index={2}
          />
          <OverviewCard
            label="Preisanderungen"
            value="8"
            subtext="in den letzten 7 Tagen"
            icon={RefreshCw}
            color={PURPLE}
            index={3}
          />
        </div>

        {/* ---- 2. PRICE DISTRIBUTION BARCHART ---- */}
        <div className="seller-card p-5 mb-6">
          <SectionHeader icon={BarChart3} title="Preisverteilung (EUR-Bereiche)" color={GOLD} />
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={priceDistributionData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "oklch(0.65 0 0)" }} axisLine={{ stroke: "oklch(1 0 0 / 0.1)" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "oklch(0.65 0 0)" }} axisLine={{ stroke: "oklch(1 0 0 / 0.1)" }} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Produkte" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {priceDistributionData.map((_, i) => (
                    <Cell key={i} fill={`color-mix(in oklch, ${GOLD} ${70 + (i * 2)}%, ${PURPLE})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ---- 3. PRICE VS SALES SCATTERCHART ---- */}
        <div className="seller-card p-5 mb-6">
          <SectionHeader icon={Activity} title="Preis vs. Verkaufe" color={BLUE} />
          <div className="flex items-center gap-4 mb-3 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: GREEN }} /> &lt; 30 EUR
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: BLUE }} /> 30-70 EUR
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: GOLD }} /> 70-130 EUR
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: RED }} /> &gt; 130 EUR
            </span>
          </div>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                <XAxis type="number" dataKey="price" name="Preis" unit=" EUR"
                  tick={{ fontSize: 11, fill: "oklch(0.65 0 0)" }} axisLine={{ stroke: "oklch(1 0 0 / 0.1)" }} tickLine={false} />
                <YAxis type="number" dataKey="units" name="Verkauft" unit=" Stk."
                  tick={{ fontSize: 11, fill: "oklch(0.65 0 0)" }} axisLine={{ stroke: "oklch(1 0 0 / 0.1)" }} tickLine={false} />
                <ZAxis range={[80, 250]} />
                <Tooltip content={<ScatterTooltip />} />
                <Scatter name="Produkte" data={priceVsSalesData}>
                  {priceVsSalesData.map((entry, i) => (
                    <Cell key={i} fill={getScatterColor(entry.price)} fillOpacity={0.85} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ---- 4. COMPETITOR PRICE COMPARISON ---- */}
        <div className="seller-card p-5 mb-6">
          <SectionHeader icon={Target} title="Wettbewerber-Preisvergleich" color={PURPLE} />
          <div style={{ width: "100%", height: 350 }}>
            <ResponsiveContainer>
              <BarChart data={competitorData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                <XAxis dataKey="product" tick={{ fontSize: 10, fill: "oklch(0.65 0 0)" }} axisLine={{ stroke: "oklch(1 0 0 / 0.1)" }} tickLine={false} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: "oklch(0.65 0 0)" }} axisLine={{ stroke: "oklch(1 0 0 / 0.1)" }} tickLine={false} />
                <Tooltip content={<ChartTooltip prefix="EUR" />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="yours" name="Dein Preis" fill={PURPLE} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="market" name="Markt-Durchschnitt" fill={GOLD} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="lowest" name="Niedrigster" fill={GREEN} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ---- 5. DYNAMIC PRICING RULES TABLE ---- */}
        <div className="seller-card p-5 mb-6">
          <SectionHeader icon={Zap} title="Dynamische Preisregeln" color={GOLD} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "oklch(0.08 0.02 260 / 0.5)" }}>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Regel</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Beschreibung</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bedingung</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aktion</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id} className="transition-colors hover:bg-white/[0.02]"
                    style={{ borderTop: "1px solid oklch(1 0 0 / 0.05)" }}>
                    <td className="py-3 px-4 font-medium">{rule.name}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{rule.description}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono"
                        style={{ background: `color-mix(in oklch, ${BLUE} 12%, transparent)`, color: BLUE }}>
                        {rule.condition}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold"
                        style={{
                          background: rule.action.startsWith("+")
                            ? `color-mix(in oklch, ${GREEN} 12%, transparent)`
                            : `color-mix(in oklch, ${RED} 12%, transparent)`,
                          color: rule.action.startsWith("+") ? GREEN : RED,
                        }}>
                        {rule.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => toggleRule(rule.id)}
                        className="inline-flex items-center gap-1.5 transition-colors"
                        style={{ color: rule.active ? GREEN : "oklch(0.5 0 0)" }}>
                        {rule.active
                          ? <ToggleRight className="w-6 h-6" />
                          : <ToggleLeft className="w-6 h-6" />}
                        <span className="text-[11px] font-medium">
                          {rule.active ? "Aktiv" : "Inaktiv"}
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---- 6. MARGIN ANALYSIS TABLE ---- */}
        <div className="seller-card p-5 mb-6">
          <SectionHeader icon={Percent} title="Margenanalyse" color={GREEN} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "oklch(0.08 0.02 260 / 0.5)" }}>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Produkt</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Einkaufspreis</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Verkaufspreis</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Marge %</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Verkauft</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gewinn</th>
                </tr>
              </thead>
              <tbody>
                {marginRows.map((row, idx) => {
                  const margeNum = parseFloat(row.marge)
                  const margeColor = margeNum >= 55 ? GREEN : margeNum >= 40 ? GOLD : RED
                  return (
                    <tr key={idx} className="transition-colors hover:bg-white/[0.02]"
                      style={{ borderTop: "1px solid oklch(1 0 0 / 0.05)" }}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: `color-mix(in oklch, ${PURPLE} 10%, transparent)` }}>
                            <ShoppingBag className="w-4 h-4" style={{ color: PURPLE }} />
                          </div>
                          <span className="font-medium">{row.product}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{fmt(row.einkauf)}</td>
                      <td className="py-3 px-4 text-right font-semibold">{fmt(row.verkauf)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold"
                          style={{ background: `color-mix(in oklch, ${margeColor} 12%, transparent)`, color: margeColor }}>
                          {row.marge}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{row.mpieces} Stk.</td>
                      <td className="py-3 px-4 text-right font-semibold" style={{ color: GREEN }}>
                        {fmt(row.profit)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid oklch(1 0 0 / 0.1)" }}>
                  <td className="py-3 px-4 font-bold">Gesamt</td>
                  <td className="py-3 px-4" />
                  <td className="py-3 px-4" />
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold"
                      style={{ background: `color-mix(in oklch, ${GREEN} 12%, transparent)`, color: GREEN }}>
                      {(marginRows.reduce((s, r) => s + parseFloat(r.marge), 0) / marginRows.length).toFixed(1)}% Avg
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-muted-foreground font-medium">
                    {marginRows.reduce((s, r) => s + r.mpieces, 0).toLocaleString("de-DE")} Stk.
                  </td>
                  <td className="py-3 px-4 text-right font-bold" style={{ color: GREEN }}>
                    {fmt(marginRows.reduce((s, r) => s + r.profit, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ---- 7. DISCOUNT SIMULATOR ---- */}
        <div className="seller-card p-5 mb-6">
          <SectionHeader icon={Calculator} title="Rabatt-Simulator" color={BLUE} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input side */}
            <div>
              <label className="text-[13px] font-medium text-muted-foreground mb-3 block">
                Rabatt in Prozent
              </label>
              <div className="flex items-center gap-4 mb-4">
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, ${BLUE} ${discountPercent * 2}%, oklch(0.2 0.02 260) ${discountPercent * 2}%)` }}
                />
                <div className="flex items-center gap-1 px-3 py-2 rounded-xl min-w-[72px] justify-center"
                  style={{ background: `color-mix(in oklch, ${BLUE} 10%, transparent)`, border: `1px solid color-mix(in oklch, ${BLUE} 20%, transparent)` }}>
                  <span className="text-lg font-bold" style={{ color: BLUE }}>{discountPercent}</span>
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>

              <div className="space-y-3 mt-6">
                <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: "oklch(0.08 0.02 260 / 0.5)", border: "1px solid oklch(1 0 0 / 0.05)" }}>
                  <span className="text-xs text-muted-foreground">Aktueller Durchschnittspreis</span>
                  <span className="text-sm font-semibold">{fmt(67.40)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: "oklch(0.08 0.02 260 / 0.5)", border: "1px solid oklch(1 0 0 / 0.05)" }}>
                  <span className="text-xs text-muted-foreground">Aktueller Gesamtumsatz</span>
                  <span className="text-sm font-semibold">{fmt(148200)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: "oklch(0.08 0.02 260 / 0.5)", border: "1px solid oklch(1 0 0 / 0.05)" }}>
                  <span className="text-xs text-muted-foreground">Aktuelle Verkaufte Einheiten</span>
                  <span className="text-sm font-semibold">2.200 Stk.</span>
                </div>
              </div>
            </div>

            {/* Result side */}
            <div>
              <p className="text-[13px] font-medium text-muted-foreground mb-3">
                Projizierte Auswirkung
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl" style={{ background: `color-mix(in oklch, ${BLUE} 6%, transparent)`, border: `1px solid color-mix(in oklch, ${BLUE} 15%, transparent)` }}>
                  <p className="text-[11px] text-muted-foreground mb-1">Neuer Durchschnittspreis</p>
                  <p className="text-xl font-bold" style={{ color: BLUE }}>{fmt(simulatorResults.newAvgPrice)}</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: `color-mix(in oklch, ${GREEN} 6%, transparent)`, border: `1px solid color-mix(in oklch, ${GREEN} 15%, transparent)` }}>
                  <p className="text-[11px] text-muted-foreground mb-1">Nachfrageanstieg</p>
                  <p className="text-xl font-bold flex items-center gap-1" style={{ color: GREEN }}>
                    <ArrowUpRight className="w-4 h-4" />
                    +{simulatorResults.demandIncrease}%
                  </p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: `color-mix(in oklch, ${GOLD} 6%, transparent)`, border: `1px solid color-mix(in oklch, ${GOLD} 15%, transparent)` }}>
                  <p className="text-[11px] text-muted-foreground mb-1">Projizierte Einheiten</p>
                  <p className="text-xl font-bold" style={{ color: GOLD }}>
                    {simulatorResults.newUnits.toLocaleString("de-DE")}
                  </p>
                </div>
                <div className="p-4 rounded-xl"
                  style={{
                    background: `color-mix(in oklch, ${simulatorResults.revenueDelta >= 0 ? GREEN : RED} 6%, transparent)`,
                    border: `1px solid color-mix(in oklch, ${simulatorResults.revenueDelta >= 0 ? GREEN : RED} 15%, transparent)`,
                  }}>
                  <p className="text-[11px] text-muted-foreground mb-1">Umsatzveranderung</p>
                  <p className="text-xl font-bold flex items-center gap-1"
                    style={{ color: simulatorResults.revenueDelta >= 0 ? GREEN : RED }}>
                    {simulatorResults.revenueDelta >= 0
                      ? <ArrowUpRight className="w-4 h-4" />
                      : <ArrowDownRight className="w-4 h-4" />}
                    {simulatorResults.revenueDeltaPct}%
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {simulatorResults.revenueDelta >= 0 ? "+" : ""}{fmt(simulatorResults.revenueDelta)}
                  </p>
                </div>
              </div>

              {discountPercent > 30 && (
                <div className="flex items-center gap-2 mt-3 px-4 py-2.5 rounded-xl text-xs"
                  style={{
                    background: `color-mix(in oklch, ${GOLD} 8%, transparent)`,
                    border: `1px solid color-mix(in oklch, ${GOLD} 15%, transparent)`,
                    color: GOLD,
                  }}>
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  Hohe Rabatte konnen die Markenwahrnehmung beeintrachtigen.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ---- 8. PRICE ELASTICITY BARCHART ---- */}
        <div className="seller-card p-5 mb-6">
          <SectionHeader icon={TrendingDown} title="Preiselastizitat (Top 5 Produkte)" color={RED} />
          <p className="text-xs text-muted-foreground mb-4">
            Elastizitat &lt; -1 = elastisch (preissensitiv) | &gt; -1 = unelastisch (preisunempfindlich)
          </p>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={elasticityData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" horizontal={false} />
                <XAxis type="number" domain={[-2.5, 0]}
                  tick={{ fontSize: 11, fill: "oklch(0.65 0 0)" }} axisLine={{ stroke: "oklch(1 0 0 / 0.1)" }} tickLine={false} />
                <YAxis type="category" dataKey="product" width={100}
                  tick={{ fontSize: 11, fill: "oklch(0.65 0 0)" }} axisLine={{ stroke: "oklch(1 0 0 / 0.1)" }} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="elasticity" name="Elastizitat" radius={[0, 4, 4, 0]} maxBarSize={32}>
                  {elasticityData.map((entry, i) => (
                    <Cell key={i} fill={entry.elasticity < -1.5 ? RED : entry.elasticity < -1 ? GOLD : GREEN} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-3 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: RED }} /> Stark elastisch (&lt; -1.5)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: GOLD }} /> Elastisch (-1.0 bis -1.5)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: GREEN }} /> Unelastisch (&gt; -1.0)
            </span>
          </div>
        </div>

        {/* ---- BACK LINK ---- */}
        <div className="text-center pb-8">
          <Link href="/seller/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Zuruck zum Command Center
          </Link>
        </div>

      </div>
    </div>
  )
}
