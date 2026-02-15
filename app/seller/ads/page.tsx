"use client"

import { useState } from "react"
import {
  Megaphone, Plus, Rocket, LayoutGrid, Image, BarChart3,
  DollarSign, Calendar, Users, Eye, MousePointerClick, TrendingUp,
  Pause, Trash2, ArrowUpRight, Target, Zap
} from "lucide-react"

const campaignTypes = [
  {
    id: "product-boost",
    label: "Product Boost",
    description: "Increase visibility of individual products in search results and category pages.",
    icon: Rocket,
    color: "oklch(0.72 0.19 145)",
    features: ["Top search placement", "Category highlights", "Smart targeting"],
  },
  {
    id: "featured-placement",
    label: "Featured Placement",
    description: "Get your products featured on the homepage and explore page for maximum exposure.",
    icon: LayoutGrid,
    color: "oklch(0.65 0.15 250)",
    features: ["Homepage banner", "Explore feed priority", "Curated collections"],
  },
  {
    id: "banner-ad",
    label: "Banner Ad",
    description: "Create eye-catching banner advertisements across the platform.",
    icon: Image,
    color: "oklch(0.78 0.14 85)",
    features: ["Custom creatives", "A/B testing", "Retargeting"],
  },
]

const performanceMetrics = [
  { label: "Impressions", value: "0", icon: Eye, color: "oklch(0.65 0.15 250)" },
  { label: "Clicks", value: "0", icon: MousePointerClick, color: "oklch(0.78 0.14 85)" },
  { label: "CTR", value: "0%", icon: TrendingUp, color: "oklch(0.72 0.19 145)" },
  { label: "Spend", value: "\u20AC0.00", icon: DollarSign, color: "oklch(0.7 0.18 55)" },
]

export default function AdsBoostPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [budget, setBudget] = useState("10")
  const [duration, setDuration] = useState("7")
  const [audience, setAudience] = useState("all")

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">Ads & Boost</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: "oklch(0.65 0.15 250 / 0.15)", color: "oklch(0.65 0.15 250)" }}>
                Marketing
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Boost your product visibility and reach more customers with targeted ads.</p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
            style={{ background: "oklch(0.72 0.19 145)", color: "#fff" }}
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {performanceMetrics.map((metric) => {
            const Icon = metric.icon
            return (
              <div key={metric.label} className="seller-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `color-mix(in oklch, ${metric.color} 12%, transparent)` }}>
                    <Icon className="w-5 h-5" style={{ color: metric.color }} />
                  </div>
                </div>
                <p className="text-[13px] text-muted-foreground mb-1">{metric.label}</p>
                <p className="text-2xl font-bold tracking-tight">{metric.value}</p>
              </div>
            )
          })}
        </div>

        {/* Active Campaigns Table */}
        <div className="seller-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5" style={{ color: "oklch(0.78 0.14 85)" }} />
              Active Campaigns
            </h2>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: "oklch(0.7 0.18 55 / 0.12)", color: "oklch(0.7 0.18 55)" }}>
              0 active
            </span>
          </div>

          {/* Table Header */}
          <div className="hidden md:grid grid-cols-7 gap-4 px-4 py-3 rounded-xl text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2"
            style={{ background: "oklch(0.15 0.02 260 / 0.5)" }}>
            <span className="col-span-2">Campaign</span>
            <span>Type</span>
            <span>Budget</span>
            <span>Duration</span>
            <span>Performance</span>
            <span>Actions</span>
          </div>

          {/* Empty State */}
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: "oklch(0.65 0.15 250 / 0.1)" }}>
              <Megaphone className="w-8 h-8" style={{ color: "oklch(0.65 0.15 250 / 0.4)" }} />
            </div>
            <h3 className="text-lg font-semibold mb-2">No active campaigns</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Create your first campaign to start boosting your product visibility and drive more sales.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
              style={{ background: "oklch(0.72 0.19 145)", color: "#fff" }}
            >
              <Zap className="w-4 h-4" />
              Launch First Campaign
            </button>
          </div>
        </div>

        {/* Create Campaign Panel */}
        {showCreate && (
          <div className="seller-card p-6 mb-6"
            style={{ border: "1px solid oklch(0.72 0.19 145 / 0.3)" }}>
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5" style={{ color: "oklch(0.72 0.19 145)" }} />
              Create New Campaign
            </h2>

            {/* Campaign Type Selection */}
            <div className="mb-6">
              <label className="text-sm font-semibold mb-3 block">1. Choose Campaign Type</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {campaignTypes.map((type) => {
                  const TypeIcon = type.icon
                  const isSelected = selectedType === type.id
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className="text-left p-5 rounded-xl transition-all"
                      style={{
                        background: isSelected
                          ? `color-mix(in oklch, ${type.color} 10%, transparent)`
                          : "oklch(0.12 0.02 260 / 0.5)",
                        border: isSelected
                          ? `2px solid ${type.color}`
                          : "2px solid oklch(1 0 0 / 0.06)",
                      }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                        style={{ background: `color-mix(in oklch, ${type.color} 15%, transparent)` }}>
                        <TypeIcon className="w-5 h-5" style={{ color: type.color }} />
                      </div>
                      <h3 className="font-semibold mb-1">{type.label}</h3>
                      <p className="text-xs text-muted-foreground mb-3">{type.description}</p>
                      <div className="space-y-1">
                        {type.features.map((f) => (
                          <div key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ArrowUpRight className="w-3 h-3" style={{ color: type.color }} />
                            {f}
                          </div>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Budget & Duration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                  <DollarSign className="w-4 h-4" style={{ color: "oklch(0.72 0.19 145)" }} />
                  2. Daily Budget
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">{"\u20AC"}</span>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    min="1"
                    max="1000"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium"
                    style={{
                      background: "oklch(0.12 0.02 260 / 0.5)",
                      border: "1px solid oklch(1 0 0 / 0.1)",
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">Min {"\u20AC"}1 / Max {"\u20AC"}1,000 per day</p>
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                  <Calendar className="w-4 h-4" style={{ color: "oklch(0.65 0.15 250)" }} />
                  3. Duration (Days)
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium appearance-none cursor-pointer"
                  style={{
                    background: "oklch(0.12 0.02 260 / 0.5)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                  }}
                >
                  <option value="3">3 days</option>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Total budget: {"\u20AC"}{(parseFloat(budget || "0") * parseInt(duration || "0")).toFixed(2)}
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                  <Target className="w-4 h-4" style={{ color: "oklch(0.78 0.14 85)" }} />
                  4. Target Audience
                </label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium appearance-none cursor-pointer"
                  style={{
                    background: "oklch(0.12 0.02 260 / 0.5)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                  }}
                >
                  <option value="all">All Users</option>
                  <option value="fashion">Fashion Enthusiasts</option>
                  <option value="new">New Users</option>
                  <option value="returning">Returning Customers</option>
                  <option value="high-value">High-Value Shoppers</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1.5">Reach the right audience</p>
              </div>
            </div>

            {/* Summary & Launch */}
            <div className="flex items-center justify-between p-4 rounded-xl"
              style={{ background: "oklch(0.72 0.19 145 / 0.06)", border: "1px solid oklch(0.72 0.19 145 / 0.15)" }}>
              <div>
                <p className="text-sm font-semibold">Campaign Summary</p>
                <p className="text-xs text-muted-foreground">
                  {selectedType ? campaignTypes.find(t => t.id === selectedType)?.label : "Select a type"} {" \u2022 "}
                  {"\u20AC"}{budget}/day {" \u2022 "} {duration} days {" \u2022 "}
                  Total: {"\u20AC"}{(parseFloat(budget || "0") * parseInt(duration || "0")).toFixed(2)}
                </p>
              </div>
              <button
                disabled={!selectedType}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
                style={{ background: "oklch(0.72 0.19 145)", color: "#fff" }}
              >
                <Rocket className="w-4 h-4" />
                Launch Campaign
              </button>
            </div>
          </div>
        )}

        {/* Campaign Tips */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: "Boost Best Sellers",
              desc: "Products with good reviews convert 3x better when boosted.",
              color: "oklch(0.72 0.19 145)",
              icon: TrendingUp,
            },
            {
              title: "Optimal Timing",
              desc: "Campaigns perform best on weekday evenings and weekends.",
              color: "oklch(0.65 0.15 250)",
              icon: Calendar,
            },
            {
              title: "A/B Test Creatives",
              desc: "Test different images and descriptions to find what resonates.",
              color: "oklch(0.78 0.14 85)",
              icon: Target,
            },
          ].map((tip) => {
            const TipIcon = tip.icon
            return (
              <div key={tip.title} className="seller-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: `color-mix(in oklch, ${tip.color} 12%, transparent)` }}>
                    <TipIcon className="w-4 h-4" style={{ color: tip.color }} />
                  </div>
                  <h3 className="text-sm font-semibold">{tip.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{tip.desc}</p>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
