"use client"

import { useState, useMemo } from "react"
import {
  Receipt, TrendingUp, CreditCard, Percent, Calculator,
  ChevronDown, ChevronUp, Lightbulb, Crown, Star, Zap,
  ArrowRight, Shield, Package, BarChart3, PieChart as PieChartIcon,
  LineChart as LineChartIcon, Check
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Area, AreaChart
} from "recharts"

// --- OKLCH Colors ---
const PURPLE = "oklch(0.65 0.15 250)"
const GREEN = "oklch(0.72 0.19 145)"
const GOLD = "oklch(0.78 0.14 85)"
const RED = "oklch(0.7 0.15 25)"
const BLUE = "oklch(0.65 0.18 260)"

// Recharts needs hex/rgb for fills, so we map OKLCH to approximate hex
const PURPLE_HEX = "#7c5cbf"
const GREEN_HEX = "#3fba5e"
const GOLD_HEX = "#c9a230"
const RED_HEX = "#c45a3c"
const BLUE_HEX = "#4a6fe5"

// --- Data: Monthly Fees (12 months, stacked) ---
const monthlyFeesData = [
  { month: "Mär", Plattform: 420, Zahlung: 135, Versand: 80, Sonstige: 32 },
  { month: "Apr", Plattform: 460, Zahlung: 148, Versand: 85, Sonstige: 28 },
  { month: "Mai", Plattform: 390, Zahlung: 125, Versand: 72, Sonstige: 35 },
  { month: "Jun", Plattform: 510, Zahlung: 165, Versand: 95, Sonstige: 40 },
  { month: "Jul", Plattform: 480, Zahlung: 155, Versand: 88, Sonstige: 38 },
  { month: "Aug", Plattform: 530, Zahlung: 170, Versand: 98, Sonstige: 42 },
  { month: "Sep", Plattform: 490, Zahlung: 158, Versand: 90, Sonstige: 36 },
  { month: "Okt", Plattform: 560, Zahlung: 180, Versand: 105, Sonstige: 45 },
  { month: "Nov", Plattform: 620, Zahlung: 200, Versand: 115, Sonstige: 50 },
  { month: "Dez", Plattform: 680, Zahlung: 220, Versand: 130, Sonstige: 55 },
  { month: "Jan", Plattform: 520, Zahlung: 168, Versand: 95, Sonstige: 40 },
  { month: "Feb", Plattform: 540, Zahlung: 174, Versand: 100, Sonstige: 43 },
]

// --- Data: Fee Breakdown Pie ---
const feeBreakdownPie = [
  { name: "Plattformgebühr", value: 52, color: PURPLE_HEX },
  { name: "Zahlungsabwicklung", value: 24, color: GREEN_HEX },
  { name: "Versandkosten", value: 18, color: GOLD_HEX },
  { name: "Sonstige", value: 6, color: BLUE_HEX },
]

// --- Data: Fee vs Revenue Trend (6 months) ---
const feeRevenueTrend = [
  { month: "Sep", Umsatz: 5200, Gebühren: 520 },
  { month: "Okt", Umsatz: 5800, Gebühren: 560 },
  { month: "Nov", Umsatz: 6900, Gebühren: 620 },
  { month: "Dez", Umsatz: 7800, Gebühren: 680 },
  { month: "Jan", Umsatz: 5900, Gebühren: 540 },
  { month: "Feb", Umsatz: 6200, Gebühren: 574 },
]

// --- Tier Comparison ---
const tiers = [
  {
    name: "Basic",
    icon: Zap,
    color: BLUE,
    colorHex: BLUE_HEX,
    monthlyFee: 0,
    commission: 10,
    paymentFee: 2.9,
    listingFee: 0.25,
    features: [
      "Bis zu 50 Listings",
      "Standard-Support (E-Mail)",
      "Basis-Analysen",
      "Standard-Sichtbarkeit",
    ],
  },
  {
    name: "Pro",
    icon: Star,
    color: PURPLE,
    colorHex: PURPLE_HEX,
    monthlyFee: 29.99,
    commission: 8,
    paymentFee: 2.5,
    listingFee: 0.10,
    recommended: true,
    features: [
      "Bis zu 500 Listings",
      "Prioritäts-Support (Chat & E-Mail)",
      "Erweiterte Analysen & Berichte",
      "10% Werberabatt",
      "Hervorgehobene Platzierung",
    ],
  },
  {
    name: "Premium",
    icon: Crown,
    color: GOLD,
    colorHex: GOLD_HEX,
    monthlyFee: 59.99,
    commission: 6,
    paymentFee: 2.0,
    listingFee: 0,
    features: [
      "Unbegrenzte Listings",
      "Persönlicher Account-Manager",
      "Premium-Badge & Top-Platzierung",
      "25% Werberabatt",
      "Kostenlose Listung",
      "Frühzugang zu neuen Features",
    ],
  },
]

// --- Savings Tips ---
const savingsTips = [
  {
    title: "Auf Premium upgraden",
    desc: "Reduzieren Sie Ihre Provision von 10% auf 6%",
    saving: "~€185/Monat",
    detail:
      "Bei einem monatlichen Umsatz von €6.200 sparen Sie €248 an Provisionen abzüglich der €59,99 Plangebühr. Netto-Ersparnis: ~€185/Monat.",
    color: GOLD,
  },
  {
    title: "Versandkosten optimieren",
    desc: "Nutzen Sie gebündelte Versandoptionen und Paketrabatte",
    saving: "~€45/Monat",
    detail:
      "Durch Sammelversand und DHL Geschäftskundenrabatte können Sie bis zu 35% der Versandkosten einsparen. Aktivieren Sie die automatische Versandoptimierung in Ihren Einstellungen.",
    color: GREEN,
  },
  {
    title: "Zahlungsmethoden steuern",
    desc: "Sofortüberweisung hat niedrigere Gebühren als Kreditkarte",
    saving: "~€30/Monat",
    detail:
      "Sofortüberweisungen kosten nur 1,5% statt 2,9% + €0,30. Heben Sie diese Option im Checkout hervor, um Kunden zu ermutigen.",
    color: PURPLE,
  },
]

// --- Custom Tooltip ---
function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0)
  return (
    <div
      className="rounded-xl px-4 py-3 shadow-xl border text-xs"
      style={{
        background: "oklch(0.14 0.02 260)",
        borderColor: "oklch(1 0 0 / 0.08)",
      }}
    >
      <p className="font-bold mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: p.fill || p.color }}
          />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold ml-auto">€{p.value}</span>
        </div>
      ))}
      <div
        className="border-t mt-2 pt-2 flex justify-between font-bold"
        style={{ borderColor: "oklch(1 0 0 / 0.1)" }}
      >
        <span>Gesamt</span>
        <span>€{total.toFixed(0)}</span>
      </div>
    </div>
  )
}

function CustomLineTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-4 py-3 shadow-xl border text-xs"
      style={{
        background: "oklch(0.14 0.02 260)",
        borderColor: "oklch(1 0 0 / 0.08)",
      }}
    >
      <p className="font-bold mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: p.stroke }}
          />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold ml-auto">€{p.value.toLocaleString("de-DE")}</span>
        </div>
      ))}
      {payload.length === 2 && (
        <div
          className="border-t mt-2 pt-2 text-muted-foreground"
          style={{ borderColor: "oklch(1 0 0 / 0.1)" }}
        >
          Anteil: {((payload[1].value / payload[0].value) * 100).toFixed(1)}%
        </div>
      )}
    </div>
  )
}

function CustomPieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div
      className="rounded-xl px-4 py-3 shadow-xl border text-xs"
      style={{
        background: "oklch(0.14 0.02 260)",
        borderColor: "oklch(1 0 0 / 0.08)",
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: d.payload?.color }}
        />
        <span className="font-bold">{d.name}</span>
      </div>
      <p className="mt-1 font-semibold">{d.value}%</p>
    </div>
  )
}

// ===================== MAIN COMPONENT =====================
export default function FeesPage() {
  const [calcPrice, setCalcPrice] = useState(100)
  const [calcTier, setCalcTier] = useState(1) // default Pro
  const [expandedTip, setExpandedTip] = useState<number | null>(null)

  const calcResult = useMemo(() => {
    const tier = tiers[calcTier]
    const plattform = calcPrice * (tier.commission / 100)
    const zahlung = calcPrice * (tier.paymentFee / 100) + 0.30
    const versand = 4.99
    const subtotal = plattform + zahlung + versand
    const mwst = calcPrice * 0.19
    const netto = calcPrice - subtotal - mwst
    const effectiveRate = calcPrice > 0 ? (subtotal / calcPrice) * 100 : 0
    return { plattform, zahlung, versand, subtotal, mwst, netto, effectiveRate }
  }, [calcPrice, calcTier])

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: `color-mix(in oklch, ${PURPLE} 15%, transparent)`,
              }}
            >
              <Receipt className="w-5 h-5" style={{ color: PURPLE }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Gebühren & Provisionen
              </h1>
              <p className="text-sm text-muted-foreground">
                Transparente Übersicht aller Kosten und Optimierungsmöglichkeiten
              </p>
            </div>
          </div>
        </div>

        {/* ============ 1. Summary Cards ============ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: "Gebühren diesen Monat",
              value: "€687,42",
              sub: "↑ 3,2% zum Vormonat",
              icon: Receipt,
              color: PURPLE,
            },
            {
              label: "Plattformgebühr",
              value: "8%",
              sub: "Verkaufsprovision",
              icon: Percent,
              color: GREEN,
            },
            {
              label: "Zahlungsgebühr",
              value: "2,9%",
              sub: "+ €0,30 pro Transaktion",
              icon: CreditCard,
              color: GOLD,
            },
            {
              label: "Effektiver Satz",
              value: "12,4%",
              sub: "Alle Gebühren kombiniert",
              icon: TrendingUp,
              color: BLUE,
            },
          ].map((card, i) => {
            const Icon = card.icon
            return (
              <div key={i} className="seller-card p-5 relative overflow-hidden">
                <div
                  className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.06] -translate-y-8 translate-x-8"
                  style={{ background: card.color }}
                />
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                  style={{
                    background: `color-mix(in oklch, ${card.color} 12%, transparent)`,
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: card.color }} />
                </div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {card.sub}
                </p>
              </div>
            )
          })}
        </div>

        {/* ============ 2. Monthly Fees BarChart (12 months stacked) ============ */}
        <div className="seller-card p-6 mb-6">
          <h2 className="text-base font-bold flex items-center gap-2 mb-5">
            <BarChart3 className="w-5 h-5" style={{ color: PURPLE }} />
            Monatliche Gebühren (12 Monate)
          </h2>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyFeesData}
                margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(1 0 0 / 0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "oklch(0.65 0.02 260)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "oklch(0.65 0.02 260)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `€${v}`}
                />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "oklch(1 0 0 / 0.03)" }} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
                />
                <Bar
                  dataKey="Plattform"
                  stackId="a"
                  fill={PURPLE_HEX}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Zahlung"
                  stackId="a"
                  fill={GREEN_HEX}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Versand"
                  stackId="a"
                  fill={GOLD_HEX}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Sonstige"
                  stackId="a"
                  fill={BLUE_HEX}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {/* ============ 3. Fee Breakdown PieChart ============ */}
          <div className="seller-card p-6">
            <h2 className="text-base font-bold flex items-center gap-2 mb-5">
              <PieChartIcon className="w-5 h-5" style={{ color: GREEN }} />
              Gebührenverteilung
            </h2>
            <div className="flex flex-col items-center">
              <div className="w-full h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={feeBreakdownPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {feeBreakdownPie.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2 w-full max-w-xs">
                {feeBreakdownPie.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: item.color }}
                    />
                    <span className="text-xs text-muted-foreground truncate">
                      {item.name}
                    </span>
                    <span className="text-xs font-bold ml-auto">
                      {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ============ 4. Interactive Fee Calculator ============ */}
          <div className="seller-card p-6">
            <h2 className="text-base font-bold flex items-center gap-2 mb-5">
              <Calculator className="w-5 h-5" style={{ color: GOLD }} />
              Gebührenrechner
            </h2>

            {/* Tier selector */}
            <div className="flex gap-2 mb-4">
              {tiers.map((tier, i) => (
                <button
                  key={tier.name}
                  onClick={() => setCalcTier(i)}
                  className="flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200"
                  style={{
                    background:
                      calcTier === i
                        ? `color-mix(in oklch, ${tier.color} 20%, transparent)`
                        : "oklch(0.15 0.02 260)",
                    border: `1px solid ${calcTier === i ? tier.color : "transparent"}`,
                    color: calcTier === i ? tier.color : undefined,
                  }}
                >
                  {tier.name} ({tier.commission}%)
                </button>
              ))}
            </div>

            {/* Price input */}
            <div className="mb-4">
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Verkaufspreis (€)
              </label>
              <input
                type="number"
                value={calcPrice}
                onChange={(e) =>
                  setCalcPrice(Math.max(0, parseFloat(e.target.value) || 0))
                }
                className="w-full px-4 py-3 rounded-xl text-sm font-mono border-0 outline-none"
                style={{ background: "oklch(0.15 0.02 260)" }}
              />
            </div>

            {/* Breakdown rows */}
            <div className="space-y-2 mb-4">
              {[
                {
                  label: "Plattformgebühr",
                  value: calcResult.plattform,
                  color: PURPLE,
                  rate: `${tiers[calcTier].commission}%`,
                },
                {
                  label: "Zahlungsgebühr",
                  value: calcResult.zahlung,
                  color: GREEN,
                  rate: `${tiers[calcTier].paymentFee}% + €0,30`,
                },
                {
                  label: "Versand",
                  value: calcResult.versand,
                  color: GOLD,
                  rate: "Pauschal",
                },
                {
                  label: "MwSt. (19%)",
                  value: calcResult.mwst,
                  color: RED,
                  rate: "19%",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                  style={{
                    background: `color-mix(in oklch, ${item.color} 6%, transparent)`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: item.color }}
                    />
                    <span className="text-xs">{item.label}</span>
                    <span className="text-[10px] text-muted-foreground">
                      ({item.rate})
                    </span>
                  </div>
                  <span className="text-xs font-mono font-semibold">
                    -€{item.value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Result box */}
            <div
              className="p-4 rounded-xl"
              style={{
                background: `color-mix(in oklch, ${GREEN} 10%, transparent)`,
                border: `1px solid color-mix(in oklch, ${GREEN} 25%, transparent)`,
              }}
            >
              <div className="flex justify-between mb-1.5">
                <span className="text-sm font-semibold">Gesamtgebühren</span>
                <span className="text-lg font-bold" style={{ color: RED }}>
                  €{calcResult.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between mb-1.5">
                <span className="text-sm font-semibold">Netto-Gewinn</span>
                <span className="text-lg font-bold" style={{ color: GREEN }}>
                  €{calcResult.netto.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">
                  Effektiver Gebührensatz
                </span>
                <span
                  className="text-xs font-mono font-semibold"
                  style={{ color: GOLD }}
                >
                  {calcResult.effectiveRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ============ 5. Tier Comparison ============ */}
        <div className="seller-card p-6 mb-6">
          <h2 className="text-base font-bold flex items-center gap-2 mb-5">
            <Crown className="w-5 h-5" style={{ color: GOLD }} />
            Verkäufer-Stufen im Vergleich
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiers.map((tier) => {
              const Icon = tier.icon
              return (
                <div
                  key={tier.name}
                  className="relative p-5 rounded-2xl"
                  style={{
                    background: tier.recommended
                      ? `color-mix(in oklch, ${tier.color} 8%, transparent)`
                      : "oklch(0.12 0.02 260)",
                    border: tier.recommended
                      ? `2px solid ${tier.color}`
                      : "1px solid oklch(1 0 0 / 0.06)",
                  }}
                >
                  {tier.recommended && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: tier.color, color: "#fff" }}
                    >
                      Empfohlen
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-4 mt-1">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{
                        background: `color-mix(in oklch, ${tier.color} 15%, transparent)`,
                      }}
                    >
                      <Icon className="w-4 h-4" style={{ color: tier.color }} />
                    </div>
                    <h3 className="text-lg font-bold">{tier.name}</h3>
                  </div>

                  <div className="mb-4">
                    <span className="text-2xl font-bold">
                      €{tier.monthlyFee.toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground">/Monat</span>
                  </div>

                  {/* Key fee stats */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Provision</span>
                      <span className="font-semibold">{tier.commission}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Zahlungsgebühr
                      </span>
                      <span className="font-semibold">{tier.paymentFee}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Listungsgebühr
                      </span>
                      <span className="font-semibold">
                        {tier.listingFee > 0
                          ? `€${tier.listingFee.toFixed(2)}`
                          : "Kostenlos"}
                      </span>
                    </div>
                  </div>

                  {/* Feature list */}
                  <div
                    className="border-t pt-3"
                    style={{ borderColor: "oklch(1 0 0 / 0.06)" }}
                  >
                    {tier.features.map((f, j) => (
                      <div key={j} className="flex items-center gap-2 py-1.5">
                        <Check
                          className="w-3.5 h-3.5 flex-shrink-0"
                          style={{ color: tier.color }}
                        />
                        <span className="text-xs">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ============ 6. Fee vs Revenue Trend LineChart (6 months) ============ */}
        <div className="seller-card p-6 mb-6">
          <h2 className="text-base font-bold flex items-center gap-2 mb-5">
            <LineChartIcon className="w-5 h-5" style={{ color: GREEN }} />
            Gebühren vs. Umsatz (6 Monate)
          </h2>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={feeRevenueTrend}
                margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradUmsatz" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GREEN_HEX} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={GREEN_HEX} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradGebuehren" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PURPLE_HEX} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={PURPLE_HEX} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(1 0 0 / 0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "oklch(0.65 0.02 260)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "oklch(0.65 0.02 260)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `€${(v / 1000).toFixed(1)}k`}
                />
                <Tooltip content={<CustomLineTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
                />
                <Area
                  type="monotone"
                  dataKey="Umsatz"
                  stroke={GREEN_HEX}
                  strokeWidth={2.5}
                  fill="url(#gradUmsatz)"
                  dot={{ r: 4, fill: GREEN_HEX, stroke: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Area
                  type="monotone"
                  dataKey="Gebühren"
                  stroke={PURPLE_HEX}
                  strokeWidth={2.5}
                  fill="url(#gradGebuehren)"
                  dot={{ r: 4, fill: PURPLE_HEX, stroke: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* Quick ratio badges */}
          <div className="flex flex-wrap gap-3 mt-4">
            {feeRevenueTrend.map((d, i) => {
              const ratio = ((d.Gebühren / d.Umsatz) * 100).toFixed(1)
              return (
                <div
                  key={i}
                  className="px-3 py-1.5 rounded-lg text-xs"
                  style={{
                    background: `color-mix(in oklch, ${PURPLE} 8%, transparent)`,
                  }}
                >
                  <span className="text-muted-foreground">{d.month}:</span>{" "}
                  <span className="font-semibold" style={{ color: PURPLE }}>
                    {ratio}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ============ 7. Savings Tips ============ */}
        <div className="seller-card p-6">
          <h2 className="text-base font-bold flex items-center gap-2 mb-5">
            <Lightbulb className="w-5 h-5" style={{ color: GOLD }} />
            Spartipps
          </h2>
          <div className="space-y-3">
            {savingsTips.map((tip, i) => (
              <div key={i}>
                <button
                  onClick={() =>
                    setExpandedTip(expandedTip === i ? null : i)
                  }
                  className="w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200 hover:bg-white/[0.03]"
                  style={{ borderLeft: `3px solid ${tip.color}` }}
                >
                  <div className="flex items-center gap-3 text-left">
                    <Lightbulb
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: tip.color }}
                    />
                    <div>
                      <p className="text-sm font-semibold">{tip.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {tip.desc}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className="text-sm font-bold"
                      style={{ color: GREEN }}
                    >
                      {tip.saving}
                    </span>
                    {expandedTip === i ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
                <div
                  className="overflow-hidden transition-all duration-300"
                  style={{
                    maxHeight: expandedTip === i ? "200px" : "0px",
                    opacity: expandedTip === i ? 1 : 0,
                  }}
                >
                  <p
                    className="px-4 py-3 mx-4 mb-1 rounded-b-xl text-xs text-muted-foreground leading-relaxed"
                    style={{ background: "oklch(0.12 0.02 260)" }}
                  >
                    {tip.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Total Savings Potential */}
          <div
            className="mt-5 p-4 rounded-xl flex items-center justify-between"
            style={{
              background: `color-mix(in oklch, ${GOLD} 10%, transparent)`,
              border: `1px solid color-mix(in oklch, ${GOLD} 25%, transparent)`,
            }}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" style={{ color: GOLD }} />
              <span className="text-sm font-semibold">
                Gesamtes Sparpotenzial
              </span>
            </div>
            <span className="text-lg font-bold" style={{ color: GOLD }}>
              ~€260/Monat
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
