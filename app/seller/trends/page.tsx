"use client"

import { useState } from "react"
import {
  Radar, TrendingUp, TrendingDown, Search, Flame, Calendar,
  ArrowUpRight, ArrowDownRight, Eye, ShoppingBag, Sparkles,
  Sun, Snowflake, Leaf, Cloud, ChevronRight, Lightbulb, BarChart3
} from "lucide-react"

const trendingCategories = [
  { name: "Streetwear", growth: 34, direction: "up" as const, searches: "12.4K", color: "oklch(0.72 0.19 145)" },
  { name: "Sustainable Fashion", growth: 28, direction: "up" as const, searches: "8.7K", color: "oklch(0.72 0.19 145)" },
  { name: "Y2K Revival", growth: 22, direction: "up" as const, searches: "6.2K", color: "oklch(0.65 0.15 250)" },
  { name: "Minimalist Basics", growth: 18, direction: "up" as const, searches: "15.1K", color: "oklch(0.65 0.15 250)" },
  { name: "Athleisure", growth: 12, direction: "up" as const, searches: "9.3K", color: "oklch(0.78 0.14 85)" },
  { name: "Formal Wear", growth: -8, direction: "down" as const, searches: "3.1K", color: "oklch(0.63 0.24 25)" },
  { name: "Fast Fashion", growth: -15, direction: "down" as const, searches: "5.4K", color: "oklch(0.63 0.24 25)" },
]

const hotSearchTerms = [
  { term: "oversized hoodie", volume: "4.2K", trend: "up" as const, change: 67 },
  { term: "linen pants summer", volume: "3.8K", trend: "up" as const, change: 45 },
  { term: "vintage denim jacket", volume: "3.1K", trend: "up" as const, change: 38 },
  { term: "organic cotton tee", volume: "2.9K", trend: "up" as const, change: 31 },
  { term: "cargo pants wide", volume: "2.7K", trend: "up" as const, change: 28 },
  { term: "knit sweater chunky", volume: "2.4K", trend: "up" as const, change: 22 },
  { term: "platform sneakers", volume: "2.1K", trend: "down" as const, change: -12 },
  { term: "silk blouse", volume: "1.8K", trend: "up" as const, change: 15 },
]

const seasonalPredictions = [
  {
    season: "Spring 2026",
    icon: Leaf,
    color: "oklch(0.72 0.19 145)",
    trends: ["Pastel palettes", "Light layering", "Floral prints", "Cropped jackets"],
    confidence: 87,
  },
  {
    season: "Summer 2026",
    icon: Sun,
    color: "oklch(0.78 0.14 85)",
    trends: ["Linen everything", "Bold colors", "Cut-out details", "Maxi dresses"],
    confidence: 82,
  },
  {
    season: "Fall 2026",
    icon: Cloud,
    color: "oklch(0.7 0.18 55)",
    trends: ["Earth tones", "Oversized coats", "Leather accessories", "Layered looks"],
    confidence: 74,
  },
  {
    season: "Winter 2026",
    icon: Snowflake,
    color: "oklch(0.65 0.15 250)",
    trends: ["Puffer jackets", "Wool blends", "Dark florals", "Cozy knits"],
    confidence: 68,
  },
]

const opportunities = [
  {
    title: "Organic Cotton T-Shirts",
    reason: "High demand, low competition in your category. 42% of searches have no matching products.",
    potential: "High",
    color: "oklch(0.72 0.19 145)",
  },
  {
    title: "Oversized Hoodies (Unisex)",
    reason: "Search volume up 67% this month. Average price point allows healthy margins.",
    potential: "High",
    color: "oklch(0.72 0.19 145)",
  },
  {
    title: "Linen Blend Pants",
    reason: "Pre-summer trend building. Early movers capture 3x more sales.",
    potential: "Medium",
    color: "oklch(0.78 0.14 85)",
  },
  {
    title: "Vintage-Style Denim",
    reason: "Consistent growth for 6 months. Strong repeat purchase rate.",
    potential: "Medium",
    color: "oklch(0.78 0.14 85)",
  },
]

export default function TrendRadarPage() {
  const [searchFilter, setSearchFilter] = useState("")

  const filteredSearchTerms = hotSearchTerms.filter((t) =>
    t.term.toLowerCase().includes(searchFilter.toLowerCase())
  )

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">Trend Radar</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: "oklch(0.72 0.19 145 / 0.15)", color: "oklch(0.72 0.19 145)" }}>
                Live Data
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Spot emerging trends early and position your products for maximum impact.</p>
          </div>
        </div>

        {/* Trending Categories */}
        <div className="seller-card p-6 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: "oklch(0.72 0.19 145)" }} />
            Trending Categories
          </h2>
          <div className="space-y-3">
            {trendingCategories.map((cat, index) => {
              const isUp = cat.direction === "up"
              return (
                <div key={cat.name} className="flex items-center gap-4 p-3 rounded-xl transition-colors hover:bg-white/[0.03]">
                  <span className="w-8 text-center text-sm font-bold" style={{ color: "oklch(0.5 0.02 260)" }}>
                    #{index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{cat.name}</span>
                      {index < 3 && (
                        <Flame className="w-3.5 h-3.5" style={{ color: "oklch(0.7 0.18 55)" }} />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{cat.searches} searches/month</span>
                  </div>

                  {/* Growth Bar */}
                  <div className="w-32 hidden md:block">
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.15 0.02 260)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(Math.abs(cat.growth) * 2.5, 100)}%`,
                          background: cat.color,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {isUp ? (
                      <ArrowUpRight className="w-4 h-4" style={{ color: "oklch(0.72 0.19 145)" }} />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" style={{ color: "oklch(0.63 0.24 25)" }} />
                    )}
                    <span className="text-sm font-bold" style={{ color: isUp ? "oklch(0.72 0.19 145)" : "oklch(0.63 0.24 25)" }}>
                      {isUp ? "+" : ""}{cat.growth}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Hot Search Terms */}
          <div className="seller-card p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Search className="w-5 h-5" style={{ color: "oklch(0.78 0.14 85)" }} />
              Hot Search Terms
            </h2>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter search terms..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                style={{
                  background: "oklch(0.12 0.02 260 / 0.5)",
                  border: "1px solid oklch(1 0 0 / 0.1)",
                }}
              />
            </div>

            <div className="space-y-2">
              {filteredSearchTerms.map((term, index) => (
                <div key={term.term} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-xs font-bold text-muted-foreground">{index + 1}</span>
                    <div>
                      <span className="text-sm font-medium">{term.term}</span>
                      <p className="text-xs text-muted-foreground">{term.volume} searches</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold flex items-center gap-1"
                    style={{ color: term.trend === "up" ? "oklch(0.72 0.19 145)" : "oklch(0.63 0.24 25)" }}>
                    {term.trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {term.change > 0 ? "+" : ""}{term.change}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Product Opportunities */}
          <div className="seller-card p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" style={{ color: "oklch(0.78 0.14 85)" }} />
              Product Opportunities
            </h2>
            <div className="space-y-4">
              {opportunities.map((opp) => (
                <div key={opp.title} className="p-4 rounded-xl transition-all hover:bg-white/[0.03]"
                  style={{ border: `1px solid color-mix(in oklch, ${opp.color} 20%, transparent)` }}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold">{opp.title}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: `color-mix(in oklch, ${opp.color} 12%, transparent)`, color: opp.color }}>
                      {opp.potential} Potential
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{opp.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Seasonal Predictions */}
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" style={{ color: "oklch(0.7 0.18 55)" }} />
            Seasonal Trend Predictions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {seasonalPredictions.map((season) => {
              const SeasonIcon = season.icon
              return (
                <div key={season.season} className="seller-card p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `color-mix(in oklch, ${season.color} 12%, transparent)` }}>
                      <SeasonIcon className="w-5 h-5" style={{ color: season.color }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">{season.season}</h3>
                      <p className="text-[10px] text-muted-foreground">{season.confidence}% confidence</p>
                    </div>
                  </div>

                  {/* Confidence bar */}
                  <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ background: "oklch(0.15 0.02 260)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${season.confidence}%`, background: season.color }}
                    />
                  </div>

                  <div className="space-y-2">
                    {season.trends.map((trend) => (
                      <div key={trend} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: season.color }} />
                        {trend}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* AI Insight */}
        <div className="seller-card p-5 flex items-start gap-3"
          style={{ border: "1px solid oklch(0.65 0.15 250 / 0.2)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "oklch(0.65 0.15 250 / 0.12)" }}>
            <Sparkles className="w-5 h-5" style={{ color: "oklch(0.65 0.15 250)" }} />
          </div>
          <div>
            <h3 className="text-sm font-bold mb-1" style={{ color: "oklch(0.65 0.15 250)" }}>AI Trend Insight</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Based on current data, sustainable and organic materials show the strongest growth trajectory.
              Sellers who list eco-friendly products see 40% higher engagement. Consider adding sustainability
              tags to your existing products and sourcing organic alternatives.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
