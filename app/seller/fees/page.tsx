"use client"

import { useState, useMemo } from "react"
import {
  Receipt, TrendingUp, CreditCard, Percent, Calculator,
  ChevronDown, ChevronUp, Lightbulb, Crown, Star, Zap,
  ArrowRight, Info, BarChart3, Shield
} from "lucide-react"

const GREEN = "oklch(0.72 0.19 145)"
const GOLD = "oklch(0.78 0.14 85)"
const PURPLE = "oklch(0.65 0.15 250)"

const feeBreakdown = [
  { type: "Verkaufsprovision", description: "Provision auf jeden abgeschlossenen Verkauf", rate: "8,5%", amount: 340.00, color: GREEN },
  { type: "Zahlungsabwicklung", description: "Gebühr für Kreditkarten- und Zahlungsverarbeitung", rate: "2,9% + 0,30\u20AC", amount: 128.50, color: PURPLE },
  { type: "Listungsgebühr", description: "Gebühr pro aktivem Produktlisting pro Monat", rate: "0,20\u20AC/Listing", amount: 24.00, color: GOLD },
  { type: "Werbegebühr", description: "Kosten für bezahlte Werbeanzeigen und Promotionen", rate: "Variabel", amount: 85.00, color: GREEN },
  { type: "Premiumgebühr", description: "Monatliche Gebühr für Premium-Seller-Status", rate: "29,99\u20AC/Monat", amount: 29.99, color: PURPLE },
]

const monthlyTrend = [
  { month: "Aug", total: 480 }, { month: "Sep", total: 520 }, { month: "Okt", total: 490 },
  { month: "Nov", total: 610 }, { month: "Dez", total: 750 }, { month: "Jan", total: 607.49 },
]

const tiers = [
  { name: "Basic", icon: Zap, color: "oklch(0.55 0.03 260)", monthlyFee: 0, commission: 12, paymentFee: 2.9, listingFee: 0.25, adDiscount: 0, features: ["Bis zu 50 Listings", "Standard-Support", "Basis-Analysen"] },
  { name: "Pro", icon: Star, color: PURPLE, monthlyFee: 19.99, commission: 8.5, paymentFee: 2.5, listingFee: 0.15, adDiscount: 10, features: ["Bis zu 500 Listings", "Prioritäts-Support", "Erweiterte Analysen", "10% Werberabatt"], recommended: true },
  { name: "Premium", icon: Crown, color: GOLD, monthlyFee: 49.99, commission: 6, paymentFee: 2.0, listingFee: 0, adDiscount: 25, features: ["Unbegrenzte Listings", "Persönlicher Account-Manager", "Premium-Badge", "25% Werberabatt", "Kostenlose Listung"] },
]

const savingsTips = [
  { title: "Auf Premium upgraden", desc: "Sparen Sie bis zu 45% bei Verkaufsprovisionen", saving: "~\u20AC150/Monat", detail: "Mit dem Premium-Plan sinkt Ihre Verkaufsprovision von 12% auf 6%. Bei einem monatlichen Umsatz von \u20AC4.000 sparen Sie \u20AC240 abzüglich der \u20AC49,99 Plangebühr.", color: GOLD },
  { title: "Zahlungsoptimierung", desc: "Aktivieren Sie Sofortüberweisung für niedrigere Gebühren", saving: "~\u20AC35/Monat", detail: "Sofortüberweisungen haben 1,9% statt 2,9% Gebühr. Ermutigen Sie Kunden, diese Option zu nutzen.", color: GREEN },
  { title: "Listings konsolidieren", desc: "Entfernen Sie inaktive Listings", saving: "~\u20AC8/Monat", detail: "Sie haben 23 Listings ohne Verkäufe in den letzten 90 Tagen. Deaktivieren Sie diese.", color: PURPLE },
]

export default function FeesPage() {
  const [calcAmount, setCalcAmount] = useState(100)
  const [selectedTier, setSelectedTier] = useState(1)
  const [expandedTip, setExpandedTip] = useState<number | null>(null)

  const totalFees = feeBreakdown.reduce((sum, f) => sum + f.amount, 0)
  const maxTrend = Math.max(...monthlyTrend.map(m => m.total))

  const calcResult = useMemo(() => {
    const tier = tiers[selectedTier]
    const commission = calcAmount * (tier.commission / 100)
    const payment = calcAmount * (tier.paymentFee / 100) + 0.30
    const listing = tier.listingFee
    const total = commission + payment + listing
    const effective = calcAmount > 0 ? (total / calcAmount) * 100 : 0
    const youKeep = calcAmount - total
    return { commission, payment, listing, total, effective, youKeep }
  }, [calcAmount, selectedTier])

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in oklch, ${GREEN} 15%, transparent)` }}>
              <Receipt className="w-5 h-5" style={{ color: GREEN }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Gebühren & Provisionen</h1>
              <p className="text-sm text-muted-foreground">Transparente Übersicht aller Kosten und Optimierungsmöglichkeiten</p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Gesamtgebühren", value: `\u20AC${totalFees.toFixed(2)}`, sub: "Diesen Monat", icon: Receipt, color: GREEN },
            { label: "Plattformgebühr", value: "8,5%", sub: "Verkaufsprovision", icon: Percent, color: PURPLE },
            { label: "Zahlungsgebühr", value: "2,9%", sub: "+ \u20AC0,30 pro Transaktion", icon: CreditCard, color: GOLD },
            { label: "Effektive Rate", value: "11,8%", sub: "Alle Gebühren kombiniert", icon: TrendingUp, color: GREEN },
          ].map((card, i) => {
            const Icon = card.icon
            return (
              <div key={i} className="seller-card p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-[0.05] -translate-y-6 translate-x-6" style={{ background: card.color }} />
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `color-mix(in oklch, ${card.color} 12%, transparent)` }}>
                  <Icon className="w-4 h-4" style={{ color: card.color }} />
                </div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{card.sub}</p>
              </div>
            )
          })}
        </div>

        {/* Fee Table */}
        <div className="seller-card p-6 mb-6">
          <h2 className="text-base font-bold flex items-center gap-2 mb-5">
            <BarChart3 className="w-5 h-5" style={{ color: PURPLE }} /> Gebührenaufschlüsselung
          </h2>
          <div className="space-y-2">
            {feeBreakdown.map((row, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl transition-colors hover:bg-white/[0.02]"
                style={{ borderLeft: `3px solid ${row.color}` }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{row.type}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{row.description}</p>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: `color-mix(in oklch, ${row.color} 10%, transparent)`, color: row.color }}>{row.rate}</span>
                <span className="text-sm font-bold w-20 text-right">{"\u20AC"}{row.amount.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-4 mt-2 rounded-xl"
              style={{ background: `color-mix(in oklch, ${GREEN} 8%, transparent)`, border: `1px solid color-mix(in oklch, ${GREEN} 20%, transparent)` }}>
              <span className="text-sm font-bold" style={{ color: GREEN }}>Gesamt</span>
              <span className="text-lg font-bold" style={{ color: GREEN }}>{"\u20AC"}{totalFees.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {/* Monthly Trend */}
          <div className="seller-card p-6">
            <h2 className="text-base font-bold flex items-center gap-2 mb-5">
              <TrendingUp className="w-5 h-5" style={{ color: GOLD }} /> Monatlicher Verlauf
            </h2>
            <div className="space-y-3">
              {monthlyTrend.map((m, i) => {
                const pct = (m.total / maxTrend) * 100
                const isLatest = i === monthlyTrend.length - 1
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className={`text-xs w-8 text-right ${isLatest ? "font-bold" : "text-muted-foreground"}`}>{m.month}</span>
                    <div className="flex-1 h-8 rounded-lg overflow-hidden" style={{ background: "oklch(0.15 0.02 260)" }}>
                      <div className="h-full rounded-lg flex items-center justify-end pr-3"
                        style={{ width: `${Math.max(pct, 8)}%`, background: isLatest ? PURPLE : `linear-gradient(90deg, color-mix(in oklch, ${GREEN} 60%, transparent), ${GREEN})`, transition: "width 0.6s ease" }}>
                        <span className="text-[11px] font-bold text-white">{"\u20AC"}{m.total.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Calculator */}
          <div className="seller-card p-6">
            <h2 className="text-base font-bold flex items-center gap-2 mb-5">
              <Calculator className="w-5 h-5" style={{ color: GREEN }} /> Gebührenrechner
            </h2>
            <div className="flex gap-2 mb-4">
              {tiers.map((tier, i) => (
                <button key={tier.name} onClick={() => setSelectedTier(i)}
                  className="flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200"
                  style={{ background: selectedTier === i ? `color-mix(in oklch, ${tier.color} 20%, transparent)` : "oklch(0.15 0.02 260)", border: `1px solid ${selectedTier === i ? tier.color : "transparent"}`, color: selectedTier === i ? tier.color : undefined }}>
                  {tier.name}
                </button>
              ))}
            </div>
            <div className="mb-4">
              <label className="text-xs text-muted-foreground mb-1.5 block">Verkaufsbetrag ({"\u20AC"})</label>
              <input type="number" value={calcAmount} onChange={e => setCalcAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-4 py-3 rounded-xl text-sm font-mono border-0 outline-none" style={{ background: "oklch(0.15 0.02 260)" }} />
            </div>
            <div className="space-y-2 mb-4">
              {[
                { label: "Provision", value: calcResult.commission, color: GREEN, rate: `${tiers[selectedTier].commission}%` },
                { label: "Zahlungsgebühr", value: calcResult.payment, color: PURPLE, rate: `${tiers[selectedTier].paymentFee}%` },
                { label: "Listung", value: calcResult.listing, color: GOLD, rate: `\u20AC${tiers[selectedTier].listingFee.toFixed(2)}` },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: `color-mix(in oklch, ${item.color} 6%, transparent)` }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                    <span className="text-xs">{item.label}</span>
                    <span className="text-[10px] text-muted-foreground">({item.rate})</span>
                  </div>
                  <span className="text-xs font-mono font-semibold">{"\u20AC"}{item.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-xl" style={{ background: `color-mix(in oklch, ${GREEN} 10%, transparent)`, border: `1px solid color-mix(in oklch, ${GREEN} 25%, transparent)` }}>
              <div className="flex justify-between mb-1"><span className="text-sm font-semibold">Gesamtgebühren</span><span className="text-lg font-bold" style={{ color: PURPLE }}>{"\u20AC"}{calcResult.total.toFixed(2)}</span></div>
              <div className="flex justify-between mb-1"><span className="text-sm font-semibold">Sie behalten</span><span className="text-lg font-bold" style={{ color: GREEN }}>{"\u20AC"}{calcResult.youKeep.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-xs text-muted-foreground">Effektive Rate</span><span className="text-xs font-mono" style={{ color: GOLD }}>{calcResult.effective.toFixed(1)}%</span></div>
            </div>
          </div>
        </div>

        {/* Tier Comparison */}
        <div className="seller-card p-6 mb-6">
          <h2 className="text-base font-bold flex items-center gap-2 mb-5">
            <Crown className="w-5 h-5" style={{ color: GOLD }} /> Verkäufer-Stufen
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiers.map((tier, i) => {
              const Icon = tier.icon
              return (
                <div key={tier.name} className="relative p-5 rounded-2xl"
                  style={{ background: tier.recommended ? `color-mix(in oklch, ${tier.color} 8%, transparent)` : "oklch(0.12 0.02 260)", border: tier.recommended ? `2px solid ${tier.color}` : "1px solid oklch(1 0 0 / 0.06)" }}>
                  {tier.recommended && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: tier.color, color: "#fff" }}>Empfohlen</div>}
                  <div className="flex items-center gap-2 mb-4 mt-1">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in oklch, ${tier.color} 15%, transparent)` }}>
                      <Icon className="w-4 h-4" style={{ color: tier.color }} />
                    </div>
                    <h3 className="text-lg font-bold">{tier.name}</h3>
                  </div>
                  <div className="mb-4"><span className="text-2xl font-bold">{"\u20AC"}{tier.monthlyFee.toFixed(2)}</span><span className="text-xs text-muted-foreground">/Monat</span></div>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Provision</span><span className="font-semibold">{tier.commission}%</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Zahlungsgebühr</span><span className="font-semibold">{tier.paymentFee}%</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Listungsgebühr</span><span className="font-semibold">{tier.listingFee > 0 ? `\u20AC${tier.listingFee.toFixed(2)}` : "Kostenlos"}</span></div>
                  </div>
                  <div className="border-t pt-3" style={{ borderColor: "oklch(1 0 0 / 0.06)" }}>
                    {tier.features.map((f, j) => (
                      <div key={j} className="flex items-center gap-2 py-1.5">
                        <ArrowRight className="w-3 h-3 flex-shrink-0" style={{ color: tier.color }} />
                        <span className="text-xs">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Savings Tips */}
        <div className="seller-card p-6">
          <h2 className="text-base font-bold flex items-center gap-2 mb-5">
            <Lightbulb className="w-5 h-5" style={{ color: GOLD }} /> Spartipps
          </h2>
          <div className="space-y-3">
            {savingsTips.map((tip, i) => (
              <div key={i}>
                <button onClick={() => setExpandedTip(expandedTip === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200 hover:bg-white/[0.03]"
                  style={{ borderLeft: `3px solid ${tip.color}` }}>
                  <div className="flex items-center gap-3 text-left">
                    <Lightbulb className="w-4 h-4 flex-shrink-0" style={{ color: tip.color }} />
                    <div><p className="text-sm font-semibold">{tip.title}</p><p className="text-xs text-muted-foreground">{tip.desc}</p></div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-bold" style={{ color: GREEN }}>{tip.saving}</span>
                    {expandedTip === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>
                <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: expandedTip === i ? "200px" : "0px", opacity: expandedTip === i ? 1 : 0 }}>
                  <p className="px-4 py-3 mx-4 mb-1 rounded-b-xl text-xs text-muted-foreground leading-relaxed" style={{ background: "oklch(0.12 0.02 260)" }}>{tip.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 p-4 rounded-xl flex items-center justify-between"
            style={{ background: `color-mix(in oklch, ${GOLD} 10%, transparent)`, border: `1px solid color-mix(in oklch, ${GOLD} 25%, transparent)` }}>
            <div className="flex items-center gap-2"><Shield className="w-5 h-5" style={{ color: GOLD }} /><span className="text-sm font-semibold">Gesamtes Sparpotenzial</span></div>
            <span className="text-lg font-bold" style={{ color: GOLD }}>~{"\u20AC"}193/Monat</span>
          </div>
        </div>
      </div>
    </div>
  )
}
