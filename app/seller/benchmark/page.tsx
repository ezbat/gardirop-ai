"use client"

import { useState } from "react"
import {
  Target, Trophy, TrendingUp, TrendingDown, Award, Star,
  ArrowRight, Lightbulb, BarChart3, Medal, Clock, Percent
} from "lucide-react"

const PURPLE = "oklch(0.65 0.15 250)"
const GREEN = "oklch(0.72 0.19 145)"
const GOLD = "oklch(0.78 0.14 85)"
const BRONZE = "oklch(0.65 0.12 55)"

const benchmarks = [
  { name: "Umsatz", yours: 4200, average: 3100, top10: 8500, unit: "\u20AC", better: true },
  { name: "Bewertungen", yours: 4.2, average: 3.8, top10: 4.8, unit: "\u2605", better: true },
  { name: "Versandzeit", yours: 1.8, average: 2.5, top10: 1.2, unit: "Tage", better: true, lowerIsBetter: true },
  { name: "Rücklaufquote", yours: 3.2, average: 5.1, top10: 1.5, unit: "%", better: true, lowerIsBetter: true },
  { name: "Antwortzeit", yours: 4.5, average: 8.2, top10: 2.1, unit: "Std.", better: true, lowerIsBetter: true },
  { name: "Konversionsrate", yours: 3.8, average: 2.9, top10: 6.2, unit: "%", better: true },
]

const monthlyRanks = [
  { month: "Sep", rank: 145 }, { month: "Okt", rank: 128 }, { month: "Nov", rank: 112 },
  { month: "Dez", rank: 89 }, { month: "Jan", rank: 76 }, { month: "Feb", rank: 67 },
]

const peerStats = [
  { label: "Top-Seller Ø Umsatz", value: "\u20AC12.400/Mo", color: GOLD },
  { label: "Top-Seller Ø Bewertung", value: "4.7 \u2605", color: GOLD },
  { label: "Top-Seller Ø Versandzeit", value: "1.1 Tage", color: GREEN },
  { label: "Top-Seller Ø Rücklaufquote", value: "1.2%", color: GREEN },
]

const improvements = [
  { tip: "Versandzeit auf unter 1.5 Tage reduzieren", impact: "Hoch", area: "Versand", color: GREEN },
  { tip: "Produktfotos professionell aufbereiten", impact: "Mittel", area: "Konversion", color: PURPLE },
  { tip: "Antwortzeit auf unter 3 Stunden senken", impact: "Hoch", area: "Service", color: GOLD },
  { tip: "Rückgabegründe analysieren und Beschreibungen verbessern", impact: "Mittel", area: "Qualität", color: BRONZE },
]

export default function BenchmarkPage() {
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month")

  const rank = 67
  const totalSellers = 1240
  const percentile = Math.round((1 - rank / totalSellers) * 100)
  const tierLabel = percentile >= 90 ? "Platin" : percentile >= 75 ? "Gold" : percentile >= 50 ? "Silber" : "Bronze"
  const tierColor = percentile >= 90 ? PURPLE : percentile >= 75 ? GOLD : percentile >= 50 ? "oklch(0.6 0.05 260)" : BRONZE

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in oklch, ${GOLD} 15%, transparent)` }}>
              <Target className="w-5 h-5" style={{ color: GOLD }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Performance Benchmark</h1>
              <p className="text-sm text-muted-foreground">Vergleichen Sie Ihre Performance mit anderen Verkäufern</p>
            </div>
          </div>
        </div>

        {/* Rank Card */}
        <div className="seller-card p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-5">
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="oklch(0.2 0 0)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={tierColor} strokeWidth="8"
                    strokeDasharray={`${percentile * 2.64} ${264 - percentile * 2.64}`}
                    strokeLinecap="round" style={{ transition: "stroke-dasharray 0.8s ease" }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Trophy className="w-6 h-6 mb-0.5" style={{ color: tierColor }} />
                  <span className="text-lg font-bold">#{rank}</span>
                </div>
              </div>
              <div>
                <p className="text-xl font-bold">Platz {rank} von {totalSellers.toLocaleString("de-DE")} Verkäufern</p>
                <p className="text-sm text-muted-foreground mt-1">Top {100 - percentile}% aller WEARO-Verkäufer</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: `color-mix(in oklch, ${tierColor} 15%, transparent)`, color: tierColor }}>
                    <Medal className="w-3 h-3 inline mr-1" />{tierLabel}
                  </span>
                  <span className="text-xs flex items-center gap-1" style={{ color: GREEN }}>
                    <TrendingUp className="w-3.5 h-3.5" />+9 Plätze diesen Monat
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              {peerStats.map((stat, i) => (
                <div key={i} className="p-3 rounded-xl text-center min-w-[120px]" style={{ background: "oklch(0.14 0.01 260)" }}>
                  <p className="text-[10px] text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-sm font-bold" style={{ color: stat.color }}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Benchmark Bars */}
        <div className="seller-card p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5" style={{ color: PURPLE }} /> Kategorie-Vergleich
            </h2>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: PURPLE }} />Sie</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: "oklch(0.4 0 0)" }} />Durchschnitt</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: GOLD }} />Top 10%</span>
            </div>
          </div>
          <div className="space-y-5">
            {benchmarks.map(b => {
              const maxVal = Math.max(b.yours, b.average, b.top10) * 1.1
              const yoursW = (b.yours / maxVal) * 100
              const avgW = (b.average / maxVal) * 100
              const topW = (b.top10 / maxVal) * 100
              const isGood = b.lowerIsBetter ? b.yours <= b.average : b.yours >= b.average
              return (
                <div key={b.name}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{b.name}</span>
                    <span className="text-xs flex items-center gap-1" style={{ color: isGood ? GREEN : "oklch(0.7 0.15 25)" }}>
                      {isGood ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {isGood ? "Überdurchschnittlich" : "Verbesserungsbedarf"}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-20">Sie</span>
                      <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ background: "oklch(0.15 0.02 260)" }}>
                        <div className="h-full rounded-md flex items-center justify-end pr-2" style={{ width: `${yoursW}%`, background: PURPLE, transition: "width 0.8s ease" }}>
                          <span className="text-[10px] font-bold text-white">{b.yours}{b.unit !== "\u20AC" && b.unit !== "\u2605" ? "" : ""} {b.unit}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-20">Durchschnitt</span>
                      <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ background: "oklch(0.15 0.02 260)" }}>
                        <div className="h-full rounded-md flex items-center justify-end pr-2" style={{ width: `${avgW}%`, background: "oklch(0.4 0 0)", transition: "width 0.8s ease" }}>
                          <span className="text-[10px] font-bold text-white">{b.average} {b.unit}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-20">Top 10%</span>
                      <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ background: "oklch(0.15 0.02 260)" }}>
                        <div className="h-full rounded-md flex items-center justify-end pr-2" style={{ width: `${topW}%`, background: GOLD, transition: "width 0.8s ease" }}>
                          <span className="text-[10px] font-bold text-white">{b.top10} {b.unit}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Rank Progress */}
          <div className="seller-card p-6">
            <h2 className="text-base font-bold flex items-center gap-2 mb-5">
              <TrendingUp className="w-5 h-5" style={{ color: GREEN }} /> Rangentwicklung
            </h2>
            <div className="space-y-3">
              {monthlyRanks.map((m, i) => {
                const maxRank = 200
                const pct = ((maxRank - m.rank) / maxRank) * 100
                const isLatest = i === monthlyRanks.length - 1
                const improved = i > 0 ? monthlyRanks[i - 1].rank - m.rank : 0
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className={`text-xs w-8 text-right ${isLatest ? "font-bold" : "text-muted-foreground"}`}>{m.month}</span>
                    <div className="flex-1 h-8 rounded-lg overflow-hidden" style={{ background: "oklch(0.15 0.02 260)" }}>
                      <div className="h-full rounded-lg flex items-center justify-end pr-3"
                        style={{ width: `${Math.max(pct, 15)}%`, background: isLatest ? GOLD : GREEN, transition: "width 0.8s ease" }}>
                        <span className="text-[11px] font-bold text-white">#{m.rank}</span>
                      </div>
                    </div>
                    {improved > 0 && <span className="text-[10px] font-medium" style={{ color: GREEN }}>+{improved}</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Improvement Suggestions */}
          <div className="seller-card p-6">
            <h2 className="text-base font-bold flex items-center gap-2 mb-5">
              <Lightbulb className="w-5 h-5" style={{ color: GOLD }} /> Verbesserungsvorschläge
            </h2>
            <div className="space-y-3">
              {improvements.map((imp, i) => (
                <div key={i} className="p-4 rounded-xl flex items-start gap-3" style={{ background: "oklch(0.14 0.01 260)", borderLeft: `3px solid ${imp.color}` }}>
                  <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: imp.color }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{imp.tip}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ background: `color-mix(in oklch, ${imp.color} 10%, transparent)`, color: imp.color }}>{imp.area}</span>
                      <span className="text-[10px] text-muted-foreground">Auswirkung: {imp.impact}</span>
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
