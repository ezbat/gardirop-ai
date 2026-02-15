"use client"

import { useState, useEffect, useRef } from "react"
import {
  Trophy, Truck, SmilePlus, RotateCcw, Image, MessageCircle,
  TrendingUp, TrendingDown, ChevronRight, Lightbulb, Target,
  Award, Star, Zap, ArrowUpRight, ArrowDownRight, Info,
  Clock, ShieldCheck, Sparkles, BarChart3
} from "lucide-react"

// ─── TYPES ─────────────────────────────────────────────
interface ScoreCategory {
  label: string
  score: number
  maxScore: number
  color: string
  bgColor: string
  icon: any
  description: string
  tip: string
}

interface MonthlyScore {
  month: string
  score: number
  avg: number
}

// ─── ANIMATED COUNTER HOOK ────────────────────────────
function useCountUp(end: number, duration = 1400) {
  const [count, setCount] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    if (end === 0) { setCount(0); return }
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(end * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [end, duration])

  return count
}

// ─── ANIMATED RING COMPONENT ──────────────────────────
function ScoreRing({ score, size = 200, strokeWidth = 12 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const [offset, setOffset] = useState(circumference)
  const animatedScore = useCountUp(score, 1800)

  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(circumference - (score / 100) * circumference)
    }, 200)
    return () => clearTimeout(timer)
  }, [score, circumference])

  const tierLabel = score >= 80 ? "Gold Seller" : score >= 60 ? "Rising Star" : "New Seller"
  const tierColor = score >= 80 ? "oklch(0.78 0.14 85)" : score >= 60 ? "oklch(0.65 0.15 250)" : "oklch(0.55 0.03 260)"
  const TierIcon = score >= 80 ? Trophy : score >= 60 ? Star : Zap

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <defs>
            <linearGradient id="scoreRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.78 0.14 85)" />
              <stop offset="50%" stopColor="oklch(0.72 0.19 145)" />
              <stop offset="100%" stopColor="oklch(0.65 0.15 250)" />
            </linearGradient>
            <filter id="ringGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            stroke="oklch(0.2 0.02 260)"
          />
          {/* Score arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            stroke="url(#scoreRingGrad)"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            filter="url(#ringGlow)"
            style={{ transition: "stroke-dashoffset 1.8s cubic-bezier(0.4, 0, 0.2, 1)" }}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold tracking-tight">{animatedScore}</span>
          <span className="text-sm text-muted-foreground mt-0.5">/100</span>
        </div>
      </div>

      {/* Tier badge */}
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-full mt-4"
        style={{
          background: `color-mix(in oklch, ${tierColor} 15%, transparent)`,
          border: `1px solid color-mix(in oklch, ${tierColor} 30%, transparent)`
        }}
      >
        <TierIcon className="w-4 h-4" style={{ color: tierColor }} />
        <span className="text-sm font-bold" style={{ color: tierColor }}>{tierLabel}</span>
      </div>
    </div>
  )
}

// ─── CATEGORY PROGRESS BAR ────────────────────────────
function CategoryBar({ category, index }: { category: ScoreCategory; index: number }) {
  const [width, setWidth] = useState(0)
  const Icon = category.icon
  const percentage = (category.score / category.maxScore) * 100

  useEffect(() => {
    const timer = setTimeout(() => setWidth(percentage), 300 + index * 150)
    return () => clearTimeout(timer)
  }, [percentage, index])

  const isGood = percentage >= 80
  const isOk = percentage >= 60 && percentage < 80

  return (
    <div className="seller-card p-5">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: category.bgColor }}
        >
          <Icon className="w-5 h-5" style={{ color: category.color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold">{category.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold" style={{ color: category.color }}>
                {category.score}
              </span>
              <span className="text-xs text-muted-foreground">/{category.maxScore}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-3">{category.description}</p>

          {/* Progress bar */}
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "oklch(0.2 0.02 260)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${width}%`,
                background: category.color,
                transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: `0 0 8px color-mix(in oklch, ${category.color} 40%, transparent)`
              }}
            />
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-1.5 mt-2">
            {isGood ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: "oklch(0.72 0.19 145)" }}>
                <ShieldCheck className="w-3 h-3" /> Excellent
              </span>
            ) : isOk ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: "oklch(0.78 0.14 85)" }}>
                <TrendingUp className="w-3 h-3" /> Good - Room to improve
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: "oklch(0.7 0.18 55)" }}>
                <Info className="w-3 h-3" /> Needs attention
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SCORE HISTORY MINI CHART ─────────────────────────
function ScoreHistoryChart({ data }: { data: MonthlyScore[] }) {
  const maxScore = 100
  const chartHeight = 180
  const chartWidth = 100
  const padding = { top: 10, bottom: 25, left: 0, right: 0 }
  const plotHeight = chartHeight - padding.top - padding.bottom
  const pointSpacing = chartWidth / (data.length - 1)

  const getY = (score: number) => padding.top + plotHeight - (score / maxScore) * plotHeight

  // Build path for "your score" line
  const yourPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${i * pointSpacing} ${getY(d.score)}`)
    .join(" ")

  // Build path for "average" line
  const avgPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${i * pointSpacing} ${getY(d.avg)}`)
    .join(" ")

  // Area fill path for "your score"
  const areaPath = `${yourPath} L ${(data.length - 1) * pointSpacing} ${chartHeight - padding.bottom} L 0 ${chartHeight - padding.bottom} Z`

  return (
    <div className="seller-card p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" style={{ color: "oklch(0.65 0.15 250)" }} />
          Score History
        </h3>
        <span className="text-xs text-muted-foreground">Last 6 months</span>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`-10 0 ${chartWidth + 20} ${chartHeight}`}
          className="w-full"
          style={{ minWidth: 320, maxHeight: 220 }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.72 0.19 145)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="oklch(0.72 0.19 145)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((v) => (
            <line
              key={v}
              x1={0}
              y1={getY(v)}
              x2={chartWidth}
              y2={getY(v)}
              stroke="oklch(0.2 0.02 260)"
              strokeDasharray="3 3"
            />
          ))}

          {/* Area fill */}
          <path d={areaPath} fill="url(#areaFill)" />

          {/* Average line */}
          <path d={avgPath} fill="none" stroke="oklch(0.45 0.03 260)" strokeWidth="1.5" strokeDasharray="4 4" />

          {/* Your score line */}
          <path d={yourPath} fill="none" stroke="oklch(0.72 0.19 145)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data points - your score */}
          {data.map((d, i) => (
            <g key={`point-${i}`}>
              <circle cx={i * pointSpacing} cy={getY(d.score)} r="4" fill="oklch(0.72 0.19 145)" />
              <circle cx={i * pointSpacing} cy={getY(d.score)} r="2" fill="oklch(0.12 0.02 260)" />
              {/* Score label */}
              <text
                x={i * pointSpacing}
                y={getY(d.score) - 10}
                textAnchor="middle"
                fill="oklch(0.72 0.19 145)"
                fontSize="5"
                fontWeight="700"
              >
                {d.score}
              </text>
            </g>
          ))}

          {/* Average points */}
          {data.map((d, i) => (
            <circle
              key={`avg-${i}`}
              cx={i * pointSpacing}
              cy={getY(d.avg)}
              r="2.5"
              fill="oklch(0.45 0.03 260)"
            />
          ))}

          {/* Month labels */}
          {data.map((d, i) => (
            <text
              key={`label-${i}`}
              x={i * pointSpacing}
              y={chartHeight - 5}
              textAnchor="middle"
              fill="oklch(0.5 0.02 260)"
              fontSize="5"
            >
              {d.month}
            </text>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 rounded-full" style={{ background: "oklch(0.72 0.19 145)" }} />
          <span className="text-xs text-muted-foreground">Your Score</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 rounded-full" style={{ background: "oklch(0.45 0.03 260)", borderTop: "1px dashed oklch(0.45 0.03 260)" }} />
          <span className="text-xs text-muted-foreground">Avg. Seller</span>
        </div>
      </div>
    </div>
  )
}

// ─── COMPARISON SECTION ───────────────────────────────
function ComparisonSection({ categories }: { categories: ScoreCategory[] }) {
  const avgScores: Record<string, number> = {
    "Shipping Speed": 72,
    "Customer Satisfaction": 68,
    "Return Rate": 75,
    "Content Quality": 60,
    "Response Time": 65,
  }

  return (
    <div className="seller-card p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Target className="w-5 h-5" style={{ color: "oklch(0.78 0.14 85)" }} />
          Your Score vs. Average Seller
        </h3>
      </div>

      <div className="space-y-4">
        {categories.map((cat) => {
          const avg = avgScores[cat.label] || 65
          const diff = cat.score - avg
          const isAhead = diff > 0

          return (
            <div key={cat.label} className="group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{cat.label}</span>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-bold"
                    style={{
                      background: isAhead ? "oklch(0.72 0.19 145 / 0.12)" : "oklch(0.7 0.18 55 / 0.12)",
                      color: isAhead ? "oklch(0.72 0.19 145)" : "oklch(0.7 0.18 55)",
                    }}
                  >
                    {isAhead ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {isAhead ? "+" : ""}{diff}
                  </span>
                </div>
              </div>

              {/* Dual bar comparison */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground w-8">You</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.2 0.02 260)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${cat.score}%`,
                        background: cat.color,
                        transition: "width 1s ease",
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold w-8 text-right" style={{ color: cat.color }}>{cat.score}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground w-8">Avg</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.2 0.02 260)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${avg}%`,
                        background: "oklch(0.45 0.03 260)",
                        transition: "width 1s ease",
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground w-8 text-right">{avg}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Overall comparison summary */}
      <div
        className="mt-6 p-4 rounded-xl flex items-center gap-3"
        style={{
          background: "oklch(0.72 0.19 145 / 0.08)",
          border: "1px solid oklch(0.72 0.19 145 / 0.15)",
        }}
      >
        <Award className="w-5 h-5 flex-shrink-0" style={{ color: "oklch(0.72 0.19 145)" }} />
        <p className="text-xs" style={{ color: "oklch(0.72 0.19 145)" }}>
          <span className="font-semibold">You are outperforming</span> the average seller in 4 out of 5 categories. Keep up the great work!
        </p>
      </div>
    </div>
  )
}

// ─── TIPS SECTION ─────────────────────────────────────
function TipsSection({ categories }: { categories: ScoreCategory[] }) {
  const sortedByNeed = [...categories].sort((a, b) => (a.score / a.maxScore) - (b.score / b.maxScore))

  return (
    <div className="seller-card p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Lightbulb className="w-5 h-5" style={{ color: "oklch(0.78 0.14 85)" }} />
          Improvement Tips
        </h3>
        <span
          className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{ background: "oklch(0.65 0.15 250 / 0.12)", color: "oklch(0.65 0.15 250)" }}
        >
          Prioritized
        </span>
      </div>

      <div className="space-y-3">
        {sortedByNeed.map((cat, index) => {
          const Icon = cat.icon
          const percentage = (cat.score / cat.maxScore) * 100
          const urgency = percentage < 70 ? "High" : percentage < 85 ? "Medium" : "Low"
          const urgencyColor = percentage < 70 ? "oklch(0.7 0.18 55)" : percentage < 85 ? "oklch(0.78 0.14 85)" : "oklch(0.72 0.19 145)"

          return (
            <div
              key={cat.label}
              className="flex items-start gap-4 p-4 rounded-xl transition-all hover:bg-white/[0.03]"
              style={{
                border: `1px solid color-mix(in oklch, ${cat.color} 12%, transparent)`,
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: cat.bgColor }}
              >
                <Icon className="w-4 h-4" style={{ color: cat.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">{cat.label}</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                    style={{
                      background: `color-mix(in oklch, ${urgencyColor} 12%, transparent)`,
                      color: urgencyColor,
                    }}
                  >
                    {urgency} priority
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{cat.tip}</p>
              </div>
              <span className="text-lg font-bold flex-shrink-0" style={{ color: cat.color }}>
                {cat.score}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────
export default function SellerScorePage() {
  const overallScore = 78

  // ─── MOCK DATA: CATEGORIES ──────────────────────────
  const categories: ScoreCategory[] = [
    {
      label: "Shipping Speed",
      score: 85,
      maxScore: 100,
      color: "oklch(0.65 0.15 250)",
      bgColor: "oklch(0.65 0.15 250 / 0.12)",
      icon: Truck,
      description: "Average time from order to dispatch. Based on last 90 days.",
      tip: "Your average ship time is 1.2 days. Try to dispatch within 24 hours for all orders to reach 90+. Consider pre-packaging popular items.",
    },
    {
      label: "Customer Satisfaction",
      score: 82,
      maxScore: 100,
      color: "oklch(0.72 0.19 145)",
      bgColor: "oklch(0.72 0.19 145 / 0.12)",
      icon: SmilePlus,
      description: "Based on reviews, ratings, and repeat purchase rate.",
      tip: "You have a 4.3-star average. Add a thank-you note to orders and respond to negative reviews within 24 hours to improve this score.",
    },
    {
      label: "Return Rate",
      score: 90,
      maxScore: 100,
      color: "oklch(0.78 0.14 85)",
      bgColor: "oklch(0.78 0.14 85 / 0.12)",
      icon: RotateCcw,
      description: "Lower return rate = higher score. Measures product accuracy.",
      tip: "Your return rate is just 3.2% -- excellent! Keep it low by providing accurate descriptions and high-quality product photos.",
    },
    {
      label: "Content Quality",
      score: 65,
      maxScore: 100,
      color: "oklch(0.65 0.15 250)",
      bgColor: "oklch(0.65 0.15 250 / 0.12)",
      icon: Image,
      description: "Photo quality, description completeness, tag usage.",
      tip: "12 of your listings lack size charts. Add at least 4 photos per product and use all available tags. Complete descriptions boost visibility by 35%.",
    },
    {
      label: "Response Time",
      score: 70,
      maxScore: 100,
      color: "oklch(0.7 0.18 55)",
      bgColor: "oklch(0.7 0.18 55 / 0.12)",
      icon: MessageCircle,
      description: "Average time to first reply to customer inquiries.",
      tip: "Your average response time is 4.5 hours. Aim for under 2 hours. Enable mobile notifications and set up auto-reply templates for common questions.",
    },
  ]

  // ─── MOCK DATA: HISTORY ─────────────────────────────
  const scoreHistory: MonthlyScore[] = [
    { month: "Sep", score: 62, avg: 66 },
    { month: "Oct", score: 68, avg: 67 },
    { month: "Nov", score: 71, avg: 68 },
    { month: "Dec", score: 74, avg: 69 },
    { month: "Jan", score: 75, avg: 68 },
    { month: "Feb", score: 78, avg: 69 },
  ]

  const scoreDelta = scoreHistory[scoreHistory.length - 1].score - scoreHistory[scoreHistory.length - 2].score

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="max-w-5xl mx-auto">

        {/* ─── HEADER ─────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight">Seller Score</h1>
            <span
              className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "oklch(0.78 0.14 85 / 0.15)", color: "oklch(0.78 0.14 85)" }}
            >
              Performance
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Your performance score based on shipping, satisfaction, returns, content, and response time. Higher score = lower commission.
          </p>
        </div>

        {/* ─── SCORE RING + SUMMARY ───────────────── */}
        <div className="seller-card p-8 mb-6">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Ring */}
            <ScoreRing score={overallScore} size={200} strokeWidth={14} />

            {/* Summary stats */}
            <div className="flex-1 w-full">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {/* Monthly change */}
                <div className="text-center p-4 rounded-xl" style={{ background: "oklch(0.15 0.02 260 / 0.5)" }}>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {scoreDelta >= 0 ? (
                      <TrendingUp className="w-4 h-4" style={{ color: "oklch(0.72 0.19 145)" }} />
                    ) : (
                      <TrendingDown className="w-4 h-4" style={{ color: "oklch(0.7 0.18 55)" }} />
                    )}
                    <span
                      className="text-lg font-bold"
                      style={{ color: scoreDelta >= 0 ? "oklch(0.72 0.19 145)" : "oklch(0.7 0.18 55)" }}
                    >
                      {scoreDelta >= 0 ? "+" : ""}{scoreDelta}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">vs. Last Month</span>
                </div>

                {/* Best category */}
                <div className="text-center p-4 rounded-xl" style={{ background: "oklch(0.15 0.02 260 / 0.5)" }}>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Award className="w-4 h-4" style={{ color: "oklch(0.78 0.14 85)" }} />
                    <span className="text-lg font-bold" style={{ color: "oklch(0.78 0.14 85)" }}>90</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Best: Return Rate</span>
                </div>

                {/* Focus area */}
                <div className="text-center p-4 rounded-xl col-span-2 sm:col-span-1" style={{ background: "oklch(0.15 0.02 260 / 0.5)" }}>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Target className="w-4 h-4" style={{ color: "oklch(0.7 0.18 55)" }} />
                    <span className="text-lg font-bold" style={{ color: "oklch(0.7 0.18 55)" }}>65</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Focus: Content</span>
                </div>
              </div>

              {/* Commission info */}
              <div
                className="mt-4 p-3 rounded-xl flex items-center gap-3"
                style={{
                  background: "oklch(0.78 0.14 85 / 0.08)",
                  border: "1px solid oklch(0.78 0.14 85 / 0.15)",
                }}
              >
                <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: "oklch(0.78 0.14 85)" }} />
                <p className="text-xs" style={{ color: "oklch(0.78 0.14 85)" }}>
                  <span className="font-semibold">Score 80+</span> to unlock Gold Seller benefits: 2% lower commission, priority placement, and a Gold badge on your shop.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── CATEGORY BREAKDOWN ─────────────────── */}
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <ChevronRight className="w-5 h-5" style={{ color: "oklch(0.65 0.15 250)" }} />
            Category Breakdown
          </h2>
          <div className="space-y-3">
            {categories.map((cat, index) => (
              <CategoryBar key={cat.label} category={cat} index={index} />
            ))}
          </div>
        </div>

        {/* ─── HISTORY + COMPARISON GRID ──────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ScoreHistoryChart data={scoreHistory} />
          <ComparisonSection categories={categories} />
        </div>

        {/* ─── TIPS SECTION ───────────────────────── */}
        <TipsSection categories={categories} />

      </div>
    </div>
  )
}
