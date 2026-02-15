"use client"

import { useState } from "react"
import {
  Share2, Instagram, Facebook, Link2, ExternalLink,
  Users, Heart, Eye, MessageSquare, Calendar,
  Image, ShoppingBag, ArrowUpRight, TrendingUp,
  ChevronRight, Sparkles, Plus, CheckCircle2
} from "lucide-react"

const platforms = [
  {
    id: "instagram",
    name: "Instagram",
    icon: Instagram,
    color: "oklch(0.65 0.15 330)",
    connected: false,
    followers: "0",
    engagement: "0%",
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: Share2,
    color: "oklch(0.7 0.18 55)",
    connected: false,
    followers: "0",
    engagement: "0%",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: Facebook,
    color: "oklch(0.55 0.18 250)",
    connected: false,
    followers: "0",
    engagement: "0%",
  },
]

const socialMetrics = [
  { label: "Total Followers", value: "0", icon: Users, color: "oklch(0.65 0.15 250)", change: "+0%" },
  { label: "Total Engagement", value: "0", icon: Heart, color: "oklch(0.63 0.24 25)", change: "+0%" },
  { label: "Social Traffic", value: "0", icon: Eye, color: "oklch(0.72 0.19 145)", change: "+0%" },
  { label: "Social Sales", value: "\u20AC0", icon: ShoppingBag, color: "oklch(0.78 0.14 85)", change: "+0%" },
]

const calendarDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const contentIdeas = [
  { title: "Behind the Scenes", desc: "Show your production process or workspace.", type: "Reel / Story" },
  { title: "Product Styling", desc: "Create outfit combinations with your products.", type: "Post / Carousel" },
  { title: "Customer Spotlight", desc: "Share customer photos and testimonials.", type: "Post / Story" },
  { title: "New Arrival Reveal", desc: "Build anticipation for upcoming products.", type: "Reel / Live" },
]

export default function SocialCommercePage() {
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null)

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">Social Commerce</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: "oklch(0.65 0.15 330 / 0.15)", color: "oklch(0.65 0.15 330)" }}>
                Connect & Sell
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Connect your social media channels and turn followers into customers.</p>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {socialMetrics.map((metric) => {
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
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-bold tracking-tight">{metric.value}</p>
                  <span className="text-xs font-semibold mb-1" style={{ color: "oklch(0.72 0.19 145)" }}>
                    {metric.change}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Connected Platforms */}
        <div className="seller-card p-6 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Link2 className="w-5 h-5" style={{ color: "oklch(0.65 0.15 250)" }} />
            Connected Platforms
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {platforms.map((platform) => {
              const PlatformIcon = platform.icon
              const isConnecting = connectingPlatform === platform.id
              return (
                <div key={platform.id} className="p-5 rounded-xl transition-all"
                  style={{
                    background: "oklch(0.12 0.02 260 / 0.5)",
                    border: platform.connected
                      ? `2px solid ${platform.color}`
                      : "2px solid oklch(1 0 0 / 0.06)",
                  }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ background: `color-mix(in oklch, ${platform.color} 15%, transparent)` }}>
                        <PlatformIcon className="w-6 h-6" style={{ color: platform.color }} />
                      </div>
                      <div>
                        <h3 className="font-semibold">{platform.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {platform.connected ? "Connected" : "Not connected"}
                        </p>
                      </div>
                    </div>
                    {platform.connected && (
                      <CheckCircle2 className="w-5 h-5" style={{ color: "oklch(0.72 0.19 145)" }} />
                    )}
                  </div>

                  {platform.connected ? (
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="p-2.5 rounded-lg text-center" style={{ background: "oklch(0.1 0.02 260 / 0.5)" }}>
                        <p className="text-lg font-bold">{platform.followers}</p>
                        <p className="text-[10px] text-muted-foreground">Followers</p>
                      </div>
                      <div className="p-2.5 rounded-lg text-center" style={{ background: "oklch(0.1 0.02 260 / 0.5)" }}>
                        <p className="text-lg font-bold">{platform.engagement}</p>
                        <p className="text-[10px] text-muted-foreground">Engagement</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mb-4">
                      Connect your {platform.name} account to sync products and track social sales.
                    </p>
                  )}

                  <button
                    onClick={() => setConnectingPlatform(platform.id)}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                    style={
                      platform.connected
                        ? { background: "oklch(0.15 0.02 260)", color: "oklch(0.7 0.02 260)" }
                        : { background: platform.color, color: "#fff" }
                    }
                  >
                    {platform.connected ? "Manage" : "Connect"}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Content Calendar */}
          <div className="seller-card p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" style={{ color: "oklch(0.7 0.18 55)" }} />
              Content Calendar
            </h2>

            <div className="grid grid-cols-7 gap-2 mb-4">
              {calendarDays.map((day) => (
                <div key={day} className="text-center text-[10px] font-semibold text-muted-foreground uppercase py-1">
                  {day}
                </div>
              ))}
              {Array.from({ length: 28 }, (_, i) => {
                const hasContent = [3, 7, 10, 14, 17, 21, 24].includes(i)
                return (
                  <div
                    key={i}
                    className="aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-colors cursor-pointer hover:bg-white/[0.06]"
                    style={{
                      background: hasContent ? "oklch(0.72 0.19 145 / 0.12)" : "oklch(0.12 0.02 260 / 0.3)",
                      border: hasContent ? "1px solid oklch(0.72 0.19 145 / 0.3)" : "1px solid transparent",
                    }}
                  >
                    {i + 1}
                  </div>
                )
              })}
            </div>

            <button className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 flex items-center justify-center gap-2"
              style={{ background: "oklch(0.7 0.18 55 / 0.12)", color: "oklch(0.7 0.18 55)" }}>
              <Plus className="w-4 h-4" />
              Schedule Post
            </button>
          </div>

          {/* Content Ideas */}
          <div className="seller-card p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: "oklch(0.78 0.14 85)" }} />
              Content Ideas
            </h2>
            <div className="space-y-3">
              {contentIdeas.map((idea) => (
                <div key={idea.title} className="p-4 rounded-xl hover:bg-white/[0.03] transition-colors"
                  style={{ border: "1px solid oklch(1 0 0 / 0.06)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold">{idea.title}</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: "oklch(0.65 0.15 250 / 0.12)", color: "oklch(0.65 0.15 250)" }}>
                      {idea.type}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{idea.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Share Products */}
        <div className="seller-card p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Image className="w-5 h-5" style={{ color: "oklch(0.72 0.19 145)" }} />
            Share Products to Social Media
          </h2>
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: "oklch(0.72 0.19 145 / 0.1)" }}>
              <Share2 className="w-8 h-8" style={{ color: "oklch(0.72 0.19 145 / 0.4)" }} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Connect a platform first</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Connect at least one social media platform above to start sharing your products and reaching a wider audience.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
