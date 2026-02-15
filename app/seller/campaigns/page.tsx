"use client"

import { useState } from "react"
import {
  FlaskConical, Plus, Zap, Gift, Heart, Snowflake,
  Clock, Tag, Users, BarChart3, ArrowRight, Sparkles,
  Calendar, Percent, ChevronRight, Target
} from "lucide-react"

const templates = [
  {
    id: "flash-sale",
    label: "Flash Sale",
    description: "Create urgency with time-limited discounts. Perfect for clearing inventory or driving quick sales.",
    icon: Zap,
    color: "oklch(0.63 0.24 25)",
    duration: "24-72 hours",
    avgLift: "+45% sales",
    features: ["Countdown timer", "Limited stock badges", "Email blast to followers"],
  },
  {
    id: "bundle-deal",
    label: "Bundle Deal",
    description: "Combine related products at a special price. Increases average order value and moves more inventory.",
    icon: Gift,
    color: "oklch(0.65 0.15 250)",
    duration: "1-4 weeks",
    avgLift: "+30% AOV",
    features: ["Smart product pairing", "Custom bundle pages", "Cross-sell widgets"],
  },
  {
    id: "loyalty-program",
    label: "Loyalty Program",
    description: "Reward repeat customers with points, exclusive offers, and early access to new products.",
    icon: Heart,
    color: "oklch(0.72 0.19 145)",
    duration: "Ongoing",
    avgLift: "+60% retention",
    features: ["Points system", "VIP tiers", "Birthday rewards"],
  },
  {
    id: "seasonal",
    label: "Seasonal Campaign",
    description: "Capitalize on holidays and seasonal trends with themed promotions and curated collections.",
    icon: Snowflake,
    color: "oklch(0.7 0.18 55)",
    duration: "2-6 weeks",
    avgLift: "+55% traffic",
    features: ["Themed storefront", "Gift guides", "Special packaging option"],
  },
]

const recentCampaigns: Array<{
  id: string; name: string; type: string; status: string; startDate: string; endDate: string; revenue: string
}> = []

export default function CampaignLabPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [campaignName, setCampaignName] = useState("")
  const [discount, setDiscount] = useState("15")

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">Campaign Lab</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: "oklch(0.65 0.15 250 / 0.15)", color: "oklch(0.65 0.15 250)" }}>
                Experimental
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Design, test, and optimize marketing campaigns to grow your business.</p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
            style={{ background: "oklch(0.65 0.15 250)", color: "#fff" }}
          >
            <Plus className="w-4 h-4" />
            Create Campaign
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Active Campaigns", value: "0", icon: Target, color: "oklch(0.72 0.19 145)" },
            { label: "Total Reach", value: "0", icon: Users, color: "oklch(0.65 0.15 250)" },
            { label: "Avg. Conversion", value: "0%", icon: BarChart3, color: "oklch(0.78 0.14 85)" },
            { label: "Revenue from Campaigns", value: "\u20AC0", icon: Sparkles, color: "oklch(0.7 0.18 55)" },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="seller-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `color-mix(in oklch, ${stat.color} 12%, transparent)` }}>
                    <Icon className="w-5 h-5" style={{ color: stat.color }} />
                  </div>
                </div>
                <p className="text-[13px] text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
              </div>
            )
          })}
        </div>

        {/* Campaign List (Empty State) */}
        <div className="seller-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FlaskConical className="w-5 h-5" style={{ color: "oklch(0.65 0.15 250)" }} />
              Your Campaigns
            </h2>
          </div>

          {recentCampaigns.length > 0 ? (
            <div className="space-y-3">
              {/* Campaign rows would go here */}
            </div>
          ) : (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: "oklch(0.65 0.15 250 / 0.1)" }}>
                <FlaskConical className="w-8 h-8" style={{ color: "oklch(0.65 0.15 250 / 0.4)" }} />
              </div>
              <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Choose a campaign template below to get started, or create a custom campaign from scratch.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
                style={{ background: "oklch(0.65 0.15 250)", color: "#fff" }}
              >
                <Sparkles className="w-4 h-4" />
                Start from Template
              </button>
            </div>
          )}
        </div>

        {/* Campaign Templates */}
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: "oklch(0.78 0.14 85)" }} />
            Campaign Templates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => {
              const TemplateIcon = template.icon
              const isSelected = selectedTemplate === template.id
              return (
                <button
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template.id)
                    setShowCreate(true)
                  }}
                  className="text-left seller-card p-6 transition-all group"
                  style={isSelected ? { border: `2px solid ${template.color}` } : undefined}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: `color-mix(in oklch, ${template.color} 12%, transparent)` }}>
                      <TemplateIcon className="w-6 h-6" style={{ color: template.color }} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded-lg text-[10px] font-semibold"
                        style={{ background: `color-mix(in oklch, ${template.color} 10%, transparent)`, color: template.color }}>
                        {template.avgLift}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold mb-1.5">{template.label}</h3>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{template.description}</p>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {template.duration}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {template.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ChevronRight className="w-3 h-3" style={{ color: template.color }} />
                        {feature}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: template.color }}>
                    Use this template <ArrowRight className="w-3 h-3" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Create Campaign Form */}
        {showCreate && (
          <div className="seller-card p-6"
            style={{ border: "1px solid oklch(0.65 0.15 250 / 0.3)" }}>
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5" style={{ color: "oklch(0.65 0.15 250)" }} />
              Create Campaign
              {selectedTemplate && (
                <span className="text-sm font-normal text-muted-foreground">
                  {" \u2022 "} {templates.find(t => t.id === selectedTemplate)?.label}
                </span>
              )}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="text-sm font-semibold mb-2 block">Campaign Name</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g., Spring Collection Launch"
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{
                    background: "oklch(0.12 0.02 260 / 0.5)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                  }}
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                  <Percent className="w-4 h-4" style={{ color: "oklch(0.63 0.24 25)" }} />
                  Discount %
                </label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  min="5"
                  max="80"
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{
                    background: "oklch(0.12 0.02 260 / 0.5)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                  }}
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                  <Calendar className="w-4 h-4" style={{ color: "oklch(0.65 0.15 250)" }} />
                  Start Date
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{
                    background: "oklch(0.12 0.02 260 / 0.5)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                  }}
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                  <Calendar className="w-4 h-4" style={{ color: "oklch(0.7 0.18 55)" }} />
                  End Date
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{
                    background: "oklch(0.12 0.02 260 / 0.5)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => { setShowCreate(false); setSelectedTemplate(null) }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
                style={{ background: "oklch(0.65 0.15 250)", color: "#fff" }}
              >
                <Sparkles className="w-4 h-4" />
                Create Campaign
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
