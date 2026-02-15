"use client"

import { useState } from "react"
import {
  Filter, Eye, ShoppingCart, CreditCard, CheckCircle2,
  TrendingDown, Monitor, Smartphone, Tablet, Search,
  Share2, Globe, Mail, Megaphone, Clock, ArrowDown,
  BarChart3, Zap
} from "lucide-react"

const PURPLE = "oklch(0.65 0.15 250)"
const GREEN = "oklch(0.72 0.19 145)"
const GOLD = "oklch(0.78 0.14 85)"
const BLUE = "oklch(0.65 0.18 260)"

const funnelStages = [
  { name: "Impressionen", value: 45200, icon: Eye, color: BLUE },
  { name: "Seitenbesuche", value: 12400, icon: Globe, color: PURPLE },
  { name: "Warenkorb", value: 2180, icon: ShoppingCart, color: GOLD },
  { name: "Kauf", value: 890, icon: CheckCircle2, color: GREEN },
]

const deviceData = [
  { device: "Desktop", icon: Monitor, visitors: 5800, conversion: 4.2, color: PURPLE },
  { device: "Mobile", icon: Smartphone, visitors: 5400, conversion: 2.8, color: GREEN },
  { device: "Tablet", icon: Tablet, visitors: 1200, conversion: 3.5, color: GOLD },
]

const trafficSources = [
  { source: "Organisch", icon: Search, visitors: 5200, pct: 42, color: GREEN },
  { source: "Social Media", icon: Share2, visitors: 3100, pct: 25, color: PURPLE },
  { source: "Direkt", icon: Globe, visitors: 2480, pct: 20, color: BLUE },
  { source: "Werbung", icon: Megaphone, visitors: 1620, pct: 13, color: GOLD },
]

const topEntryPages = [
  { name: "Vintage Lederjacke", visits: 2840, conversion: 5.2 },
  { name: "Oversized Hoodie", visits: 2120, conversion: 4.8 },
  { name: "Designer Sneaker", visits: 1890, conversion: 3.9 },
  { name: "Kaschmir Pullover", visits: 1560, conversion: 6.1 },
  { name: "Slim Fit Jeans", visits: 1340, conversion: 3.2 },
]

const dropoffReasons = [
  { stage: "Impressionen \u2192 Besuche", rate: 72.6, reason: "Vorschaubild/Titel nicht ansprechend genug" },
  { stage: "Besuche \u2192 Warenkorb", rate: 82.4, reason: "Preis, fehlende Größen oder langsame Ladezeit" },
  { stage: "Warenkorb \u2192 Kauf", rate: 59.2, reason: "Versandkosten, fehlende Zahlungsmethode" },
]

const abTests = [
  { name: "Produktbilder: Lifestyle vs Studio", variantA: "Studio", variantB: "Lifestyle", resultA: 3.2, resultB: 4.8, winner: "B", metric: "Konversionsrate %" },
  { name: "CTA-Button: Farbe", variantA: "Lila", variantB: "Gold", resultA: 2.9, resultB: 3.4, winner: "B", metric: "Klickrate %" },
]

const timeToData = [
  { range: "< 1 Tag", pct: 35 },
  { range: "1-3 Tage", pct: 28 },
  { range: "3-7 Tage", pct: 20 },
  { range: "7-14 Tage", pct: 12 },
  { range: "> 14 Tage", pct: 5 },
]

export default function FunnelPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in oklch, ${PURPLE} 15%, transparent)` }}>
              <Filter className="w-5 h-5" style={{ color: PURPLE }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Sales Funnel</h1>
              <p className="text-sm text-muted-foreground">Visualisieren Sie den Kundenweg vom Entdecken bis zum Kauf</p>
            </div>
          </div>
        </div>

        {/* Visual Funnel */}
        <div className="seller-card p-6 mb-6">
          <h2 className="text-base font-bold mb-6">Verkaufstrichter</h2>
          <div className="flex flex-col items-center gap-1">
            {funnelStages.map((stage, i) => {
              const widthPct = 100 - (i * 20)
              const Icon = stage.icon
              const prevValue = i > 0 ? funnelStages[i - 1].value : null
              const convRate = prevValue ? ((stage.value / prevValue) * 100).toFixed(1) : null
              return (
                <div key={stage.name} className="w-full flex flex-col items-center">
                  {convRate && (
                    <div className="flex items-center gap-1.5 py-2">
                      <ArrowDown className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-mono font-medium" style={{ color: GOLD }}>{convRate}%</span>
                      <span className="text-[10px] text-muted-foreground">Konversion</span>
                    </div>
                  )}
                  <div className="relative rounded-xl flex items-center justify-between px-6 py-4 transition-all duration-500"
                    style={{ width: `${widthPct}%`, background: `color-mix(in oklch, ${stage.color} 12%, transparent)`, border: `1px solid color-mix(in oklch, ${stage.color} 25%, transparent)` }}>
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" style={{ color: stage.color }} />
                      <span className="text-sm font-semibold">{stage.name}</span>
                    </div>
                    <span className="text-lg font-bold" style={{ color: stage.color }}>{stage.value.toLocaleString("de-DE")}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-6 p-4 rounded-xl flex items-center justify-between"
            style={{ background: `color-mix(in oklch, ${GREEN} 8%, transparent)`, border: `1px solid color-mix(in oklch, ${GREEN} 20%, transparent)` }}>
            <span className="text-sm font-semibold">Gesamte Konversionsrate</span>
            <span className="text-lg font-bold" style={{ color: GREEN }}>{((funnelStages[3].value / funnelStages[0].value) * 100).toFixed(2)}%</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Besucher gesamt", value: "12.400", icon: Eye, color: BLUE },
            { label: "Warenkorb-Rate", value: "17,6%", icon: ShoppingCart, color: GOLD },
            { label: "Checkout-Rate", value: "40,8%", icon: CreditCard, color: PURPLE },
            { label: "Kaufrate", value: "7,2%", icon: CheckCircle2, color: GREEN },
          ].map((stat, i) => {
            const Icon = stat.icon
            return (
              <div key={i} className="seller-card p-5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `color-mix(in oklch, ${stat.color} 12%, transparent)` }}>
                  <Icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {/* Drop-off Analysis */}
          <div className="seller-card p-6">
            <h2 className="text-base font-bold flex items-center gap-2 mb-5">
              <TrendingDown className="w-5 h-5" style={{ color: "oklch(0.7 0.15 25)" }} /> Abbruchanalyse
            </h2>
            <div className="space-y-4">
              {dropoffReasons.map((d, i) => (
                <div key={i} className="p-4 rounded-xl" style={{ background: "oklch(0.14 0.01 260)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{d.stage}</span>
                    <span className="text-sm font-bold" style={{ color: "oklch(0.7 0.15 25)" }}>{d.rate}% Abbruch</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: "oklch(0.2 0 0)" }}>
                    <div className="h-full rounded-full" style={{ width: `${d.rate}%`, background: `linear-gradient(90deg, oklch(0.7 0.15 25), oklch(0.6 0.15 25))` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{d.reason}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Device Breakdown */}
          <div className="seller-card p-6">
            <h2 className="text-base font-bold flex items-center gap-2 mb-5">
              <Monitor className="w-5 h-5" style={{ color: PURPLE }} /> Konversion nach Gerät
            </h2>
            <div className="space-y-4">
              {deviceData.map(d => {
                const Icon = d.icon
                const totalVisitors = deviceData.reduce((s, dd) => s + dd.visitors, 0)
                const pct = (d.visitors / totalVisitors) * 100
                return (
                  <div key={d.device} className="p-4 rounded-xl" style={{ background: "oklch(0.14 0.01 260)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in oklch, ${d.color} 12%, transparent)` }}>
                          <Icon className="w-4 h-4" style={{ color: d.color }} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{d.device}</p>
                          <p className="text-[11px] text-muted-foreground">{d.visitors.toLocaleString("de-DE")} Besucher ({pct.toFixed(0)}%)</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold" style={{ color: d.color }}>{d.conversion}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.2 0 0)" }}>
                      <div className="h-full rounded-full" style={{ width: `${d.conversion * 15}%`, background: d.color, transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          {/* Traffic Sources */}
          <div className="seller-card p-6">
            <h2 className="text-base font-bold flex items-center gap-2 mb-5">
              <BarChart3 className="w-5 h-5" style={{ color: GREEN }} /> Traffic-Quellen
            </h2>
            <div className="space-y-3">
              {trafficSources.map(s => {
                const Icon = s.icon
                return (
                  <div key={s.source} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `color-mix(in oklch, ${s.color} 12%, transparent)` }}>
                      <Icon className="w-4 h-4" style={{ color: s.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{s.source}</span>
                        <span className="text-muted-foreground">{s.visitors.toLocaleString("de-DE")} ({s.pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.2 0 0)" }}>
                        <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top Entry Pages */}
          <div className="seller-card p-6">
            <h2 className="text-base font-bold flex items-center gap-2 mb-5">
              <Zap className="w-5 h-5" style={{ color: GOLD }} /> Top-Einstiegsseiten
            </h2>
            <div className="space-y-2">
              {topEntryPages.map((page, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "oklch(0.14 0.01 260)" }}>
                  <span className="text-xs font-bold w-5 text-center" style={{ color: i < 3 ? GOLD : "oklch(0.4 0 0)" }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{page.name}</p>
                    <p className="text-[10px] text-muted-foreground">{page.visits.toLocaleString("de-DE")} Besuche</p>
                  </div>
                  <span className="text-xs font-bold" style={{ color: GREEN }}>{page.conversion}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Time to Purchase + A/B Tests */}
          <div className="space-y-5">
            <div className="seller-card p-6">
              <h2 className="text-sm font-bold flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4" style={{ color: PURPLE }} /> Zeit bis zum Kauf
              </h2>
              <div className="space-y-2">
                {timeToData.map(t => (
                  <div key={t.range} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-16 text-right">{t.range}</span>
                    <div className="flex-1 h-5 rounded overflow-hidden" style={{ background: "oklch(0.2 0 0)" }}>
                      <div className="h-full rounded flex items-center justify-end pr-2" style={{ width: `${t.pct}%`, background: PURPLE }}>
                        <span className="text-[9px] font-bold text-white">{t.pct}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="seller-card p-6">
              <h2 className="text-sm font-bold flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4" style={{ color: GOLD }} /> A/B-Testergebnisse
              </h2>
              {abTests.map((test, i) => (
                <div key={i} className="p-3 rounded-xl mb-2" style={{ background: "oklch(0.14 0.01 260)" }}>
                  <p className="text-xs font-medium mb-2">{test.name}</p>
                  <div className="flex gap-2">
                    <div className={`flex-1 p-2 rounded-lg text-center ${test.winner === "A" ? "" : ""}`}
                      style={{ background: test.winner === "A" ? `color-mix(in oklch, ${GREEN} 10%, transparent)` : "oklch(0.18 0 0)", border: test.winner === "A" ? `1px solid color-mix(in oklch, ${GREEN} 25%, transparent)` : "1px solid transparent" }}>
                      <p className="text-[10px] text-muted-foreground">A: {test.variantA}</p>
                      <p className="text-sm font-bold" style={{ color: test.winner === "A" ? GREEN : undefined }}>{test.resultA}%</p>
                    </div>
                    <div className="flex-1 p-2 rounded-lg text-center"
                      style={{ background: test.winner === "B" ? `color-mix(in oklch, ${GREEN} 10%, transparent)` : "oklch(0.18 0 0)", border: test.winner === "B" ? `1px solid color-mix(in oklch, ${GREEN} 25%, transparent)` : "1px solid transparent" }}>
                      <p className="text-[10px] text-muted-foreground">B: {test.variantB}</p>
                      <p className="text-sm font-bold" style={{ color: test.winner === "B" ? GREEN : undefined }}>{test.resultB}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
