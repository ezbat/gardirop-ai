"use client"

import { useState, useEffect, useRef } from "react"
import {
  Trophy, Truck, Star, RotateCcw, HeadphonesIcon, BadgeEuro,
  TrendingUp, TrendingDown, ChevronRight, Lightbulb, Target,
  Award, Zap, ArrowUpRight, Info, AlertTriangle,
  Clock, ShieldCheck, Sparkles, BarChart3, Package, ThumbsUp,
  Crown, Medal, CircleDot
} from "lucide-react"
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend,
  BarChart, Bar
} from "recharts"

// ─── OKLCH COLOR CONSTANTS ─────────────────────────────
const COLORS = {
  purple: "oklch(0.65 0.15 250)",
  green: "oklch(0.72 0.19 145)",
  gold: "oklch(0.78 0.14 85)",
  red: "oklch(0.7 0.15 25)",
  blue: "oklch(0.65 0.18 260)",
}

// ─── ANIMATED COUNTER HOOK ─────────────────────────────
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

// ─── CUSTOM RECHARTS TOOLTIP ──────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="px-3 py-2 rounded-lg text-xs"
      style={{
        background: "oklch(0.15 0.02 260 / 0.95)",
        border: "1px solid oklch(1 0 0 / 0.1)",
        backdropFilter: "blur(8px)",
      }}
    >
      <p className="font-semibold mb-1" style={{ color: "oklch(0.85 0 0)" }}>{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.color }} />
          <span style={{ color: "oklch(0.7 0 0)" }}>{entry.name}:</span>
          <span className="font-bold" style={{ color: entry.color }}>{entry.value}</span>
        </p>
      ))}
    </div>
  )
}

// ─── OVERALL SCORE: RADIAL BAR CHART ──────────────────
function OverallScoreSection() {
  const score = 87
  const animatedScore = useCountUp(score, 1800)

  const radialData = [
    { name: "Score", value: score, fill: "url(#scoreGradient)" },
  ]

  return (
    <div className="seller-card p-8 mb-6">
      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Radial Bar Chart */}
        <div className="relative" style={{ width: 220, height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="72%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              data={radialData}
              barSize={14}
            >
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.14 85)" />
                  <stop offset="50%" stopColor="oklch(0.72 0.19 145)" />
                  <stop offset="100%" stopColor="oklch(0.65 0.18 260)" />
                </linearGradient>
              </defs>
              <RadialBar
                dataKey="value"
                cornerRadius={10}
                background={{ fill: "oklch(0.2 0.02 260)" }}
                max={100}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold tracking-tight">{animatedScore}</span>
            <span className="text-sm text-muted-foreground">/100</span>
            <span
              className="text-sm font-bold mt-1"
              style={{ color: COLORS.green }}
            >
              Sehr Gut
            </span>
          </div>
        </div>

        {/* Summary stats */}
        <div className="flex-1 w-full">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {/* Monthly change */}
            <div className="text-center p-4 rounded-xl" style={{ background: "oklch(0.15 0.02 260 / 0.5)" }}>
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-4 h-4" style={{ color: COLORS.green }} />
                <span className="text-lg font-bold" style={{ color: COLORS.green }}>+3</span>
              </div>
              <span className="text-[11px] text-muted-foreground">vs. Vormonat</span>
            </div>

            {/* Best category */}
            <div className="text-center p-4 rounded-xl" style={{ background: "oklch(0.15 0.02 260 / 0.5)" }}>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Award className="w-4 h-4" style={{ color: COLORS.gold }} />
                <span className="text-lg font-bold" style={{ color: COLORS.gold }}>95</span>
              </div>
              <span className="text-[11px] text-muted-foreground">Bester: Service</span>
            </div>

            {/* Focus area */}
            <div className="text-center p-4 rounded-xl col-span-2 sm:col-span-1" style={{ background: "oklch(0.15 0.02 260 / 0.5)" }}>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="w-4 h-4" style={{ color: COLORS.red }} />
                <span className="text-lg font-bold" style={{ color: COLORS.red }}>78</span>
              </div>
              <span className="text-[11px] text-muted-foreground">Fokus: Preis</span>
            </div>
          </div>

          {/* Commission info */}
          <div
            className="mt-4 p-3 rounded-xl flex items-center gap-3"
            style={{
              background: `color-mix(in oklch, ${COLORS.gold} 8%, transparent)`,
              border: `1px solid color-mix(in oklch, ${COLORS.gold} 15%, transparent)`,
            }}
          >
            <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.gold }} />
            <p className="text-xs" style={{ color: COLORS.gold }}>
              <span className="font-semibold">Gold-Status aktiv!</span> Du profitierst von 2% niedrigerer Provision und bevorzugter Platzierung.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SCORE BREAKDOWN: RADAR CHART ─────────────────────
function ScoreBreakdownRadar() {
  const radarData = [
    { axis: "Lieferung", score: 92, fullMark: 100 },
    { axis: "Qualität", score: 88, fullMark: 100 },
    { axis: "Service", score: 95, fullMark: 100 },
    { axis: "Preis", score: 78, fullMark: 100 },
    { axis: "Bewertungen", score: 85, fullMark: 100 },
    { axis: "Retouren", score: 82, fullMark: 100 },
  ]

  return (
    <div className="seller-card p-6">
      <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
        <CircleDot className="w-5 h-5" style={{ color: COLORS.purple }} />
        Score-Aufschlüsselung
      </h3>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid
              stroke="oklch(0.3 0.02 260)"
              strokeDasharray="3 3"
            />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "oklch(0.7 0 0)", fontSize: 12, fontWeight: 600 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fill: "oklch(0.4 0 0)", fontSize: 10 }}
              tickCount={5}
            />
            <Radar
              name="Dein Score"
              dataKey="score"
              stroke="oklch(0.65 0.15 250)"
              fill="oklch(0.65 0.15 250)"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      {/* Score chips below radar */}
      <div className="flex flex-wrap justify-center gap-2 mt-2">
        {radarData.map((d) => (
          <span
            key={d.axis}
            className="px-2.5 py-1 rounded-full text-[11px] font-bold"
            style={{
              background: `color-mix(in oklch, ${COLORS.purple} 12%, transparent)`,
              color: COLORS.purple,
            }}
          >
            {d.axis}: {d.score}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── SCORE HISTORY: LINE CHART (12 MONTHS) ────────────
function ScoreHistoryLine() {
  const historyData = [
    { month: "Mär", score: 79, avg: 72 },
    { month: "Apr", score: 80, avg: 72 },
    { month: "Mai", score: 78, avg: 73 },
    { month: "Jun", score: 81, avg: 73 },
    { month: "Jul", score: 82, avg: 74 },
    { month: "Aug", score: 80, avg: 73 },
    { month: "Sep", score: 83, avg: 74 },
    { month: "Okt", score: 82, avg: 74 },
    { month: "Nov", score: 84, avg: 75 },
    { month: "Dez", score: 85, avg: 75 },
    { month: "Jan", score: 84, avg: 74 },
    { month: "Feb", score: 87, avg: 75 },
  ]

  return (
    <div className="seller-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" style={{ color: COLORS.blue }} />
          Score-Verlauf
        </h3>
        <span className="text-xs text-muted-foreground">Letzte 12 Monate</span>
      </div>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={historyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
            <XAxis
              dataKey="month"
              tick={{ fill: "oklch(0.55 0 0)", fontSize: 11 }}
              axisLine={{ stroke: "oklch(0.25 0.02 260)" }}
              tickLine={false}
            />
            <YAxis
              domain={[50, 100]}
              tick={{ fill: "oklch(0.55 0 0)", fontSize: 11 }}
              axisLine={{ stroke: "oklch(0.25 0.02 260)" }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Threshold lines */}
            <ReferenceLine
              y={60}
              stroke="oklch(0.55 0.08 260)"
              strokeDasharray="6 4"
              label={{ value: "Silber (60)", position: "insideTopRight", fill: "oklch(0.55 0.08 260)", fontSize: 10 }}
            />
            <ReferenceLine
              y={75}
              stroke="oklch(0.78 0.14 85)"
              strokeDasharray="6 4"
              label={{ value: "Gold (75)", position: "insideTopRight", fill: "oklch(0.78 0.14 85)", fontSize: 10 }}
            />
            <ReferenceLine
              y={90}
              stroke="oklch(0.65 0.15 250)"
              strokeDasharray="6 4"
              label={{ value: "Platin (90)", position: "insideTopRight", fill: "oklch(0.65 0.15 250)", fontSize: 10 }}
            />
            <Line
              type="monotone"
              dataKey="avg"
              name="Durchschnitt"
              stroke="oklch(0.45 0.03 260)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="score"
              name="Dein Score"
              stroke={COLORS.green}
              strokeWidth={2.5}
              dot={{ fill: COLORS.green, r: 3 }}
              activeDot={{ r: 5, fill: COLORS.green, stroke: "oklch(0.12 0.02 260)", strokeWidth: 2 }}
            />
            <Legend
              verticalAlign="bottom"
              height={30}
              iconType="line"
              formatter={(value: string) => (
                <span style={{ color: "oklch(0.6 0 0)", fontSize: 11 }}>{value}</span>
              )}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── INDIVIDUAL METRIC CARDS (6) ──────────────────────
function MetricCards() {
  const metrics = [
    {
      label: "Liefergeschwindigkeit",
      score: 92,
      detail: "\u00D8 2.1 Tage",
      icon: Truck,
      color: COLORS.green,
      trend: "+4",
      trendUp: true,
    },
    {
      label: "Produktqualität",
      score: 88,
      detail: "4.2% Retoure",
      icon: Package,
      color: COLORS.blue,
      trend: "+2",
      trendUp: true,
    },
    {
      label: "Kundenservice",
      score: 95,
      detail: "\u00D8 1.4h Antwortzeit",
      icon: HeadphonesIcon,
      color: COLORS.purple,
      trend: "+5",
      trendUp: true,
    },
    {
      label: "Preis-Leistung",
      score: 78,
      detail: "Index 0.95",
      icon: BadgeEuro,
      color: COLORS.gold,
      trend: "-2",
      trendUp: false,
    },
    {
      label: "Bewertungen",
      score: 85,
      detail: "4.7\u2605 Durchschnitt",
      icon: Star,
      color: COLORS.gold,
      trend: "+1",
      trendUp: true,
    },
    {
      label: "Retourenmanagement",
      score: 82,
      detail: "\u00D8 1.8 Tage Bearbeitung",
      icon: RotateCcw,
      color: COLORS.red,
      trend: "+3",
      trendUp: true,
    },
  ]

  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <ChevronRight className="w-5 h-5" style={{ color: COLORS.purple }} />
        Einzelne Metriken
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon
          const percentage = m.score
          const status = percentage >= 90 ? "Exzellent" : percentage >= 80 ? "Gut" : percentage >= 70 ? "Befriedigend" : "Verbesserungsbedarf"
          const statusColor = percentage >= 90 ? COLORS.green : percentage >= 80 ? COLORS.blue : percentage >= 70 ? COLORS.gold : COLORS.red

          return (
            <div key={m.label} className="seller-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `color-mix(in oklch, ${m.color} 12%, transparent)` }}
                >
                  <Icon className="w-5 h-5" style={{ color: m.color }} />
                </div>
                <div className="flex items-center gap-1">
                  {m.trendUp ? (
                    <ArrowUpRight className="w-3.5 h-3.5" style={{ color: COLORS.green }} />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" style={{ color: COLORS.red }} />
                  )}
                  <span
                    className="text-xs font-bold"
                    style={{ color: m.trendUp ? COLORS.green : COLORS.red }}
                  >
                    {m.trend}
                  </span>
                </div>
              </div>

              <div className="mb-2">
                <span className="text-sm font-semibold">{m.label}</span>
              </div>

              <div className="flex items-end justify-between mb-3">
                <span className="text-3xl font-bold" style={{ color: m.color }}>{m.score}</span>
                <span className="text-xs text-muted-foreground">{m.detail}</span>
              </div>

              {/* Progress bar */}
              <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: "oklch(0.2 0.02 260)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${percentage}%`,
                    background: m.color,
                    transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: `0 0 8px color-mix(in oklch, ${m.color} 40%, transparent)`,
                  }}
                />
              </div>

              <span
                className="inline-flex items-center gap-1 text-[11px] font-medium"
                style={{ color: statusColor }}
              >
                <ShieldCheck className="w-3 h-3" />
                {status}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── MONTHLY PERFORMANCE: STACKED BAR CHART ───────────
function MonthlyPerformanceBars() {
  const barData = [
    { month: "Sep", Lieferung: 88, Qualität: 85, Service: 90, Preis: 75, Bewertungen: 82, Retouren: 78 },
    { month: "Okt", Lieferung: 89, Qualität: 86, Service: 91, Preis: 76, Bewertungen: 83, Retouren: 79 },
    { month: "Nov", Lieferung: 90, Qualität: 87, Service: 92, Preis: 76, Bewertungen: 84, Retouren: 80 },
    { month: "Dez", Lieferung: 91, Qualität: 86, Service: 93, Preis: 77, Bewertungen: 84, Retouren: 81 },
    { month: "Jan", Lieferung: 91, Qualität: 87, Service: 94, Preis: 77, Bewertungen: 85, Retouren: 81 },
    { month: "Feb", Lieferung: 92, Qualität: 88, Service: 95, Preis: 78, Bewertungen: 85, Retouren: 82 },
  ]

  return (
    <div className="seller-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" style={{ color: COLORS.gold }} />
          Monatliche Leistung
        </h3>
        <span className="text-xs text-muted-foreground">Letzte 6 Monate</span>
      </div>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
            <XAxis
              dataKey="month"
              tick={{ fill: "oklch(0.55 0 0)", fontSize: 11 }}
              axisLine={{ stroke: "oklch(0.25 0.02 260)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "oklch(0.55 0 0)", fontSize: 11 }}
              axisLine={{ stroke: "oklch(0.25 0.02 260)" }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="square"
              iconSize={10}
              formatter={(value: string) => (
                <span style={{ color: "oklch(0.6 0 0)", fontSize: 10 }}>{value}</span>
              )}
            />
            <Bar dataKey="Lieferung" stackId="a" fill={COLORS.green} radius={[0, 0, 0, 0]} />
            <Bar dataKey="Qualität" stackId="a" fill={COLORS.blue} />
            <Bar dataKey="Service" stackId="a" fill={COLORS.purple} />
            <Bar dataKey="Preis" stackId="a" fill={COLORS.gold} />
            <Bar dataKey="Bewertungen" stackId="a" fill="oklch(0.7 0.12 200)" />
            <Bar dataKey="Retouren" stackId="a" fill={COLORS.red} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── PENALTIES SECTION ────────────────────────────────
function PenaltiesSection() {
  const penalties = [
    {
      date: "12. Jan 2026",
      reason: "Verspätete Lieferung - Bestellung #WR-4821",
      points: -2,
    },
    {
      date: "25. Jan 2026",
      reason: "Verspätete Lieferung - Bestellung #WR-5103",
      points: -2,
    },
    {
      date: "03. Feb 2026",
      reason: "Verspätete Lieferung - Bestellung #WR-5287",
      points: -1,
    },
  ]

  const totalPenalty = penalties.reduce((sum, p) => sum + p.points, 0)

  return (
    <div className="seller-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" style={{ color: COLORS.red }} />
          Abzüge & Strafen
        </h3>
        <span
          className="px-2.5 py-1 rounded-full text-xs font-bold"
          style={{
            background: `color-mix(in oklch, ${COLORS.red} 12%, transparent)`,
            color: COLORS.red,
          }}
        >
          {totalPenalty} Punkte
        </span>
      </div>

      <div className="space-y-3">
        {penalties.map((p, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-3 rounded-xl"
            style={{
              background: `color-mix(in oklch, ${COLORS.red} 5%, transparent)`,
              border: `1px solid color-mix(in oklch, ${COLORS.red} 12%, transparent)`,
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `color-mix(in oklch, ${COLORS.red} 15%, transparent)` }}
            >
              <Clock className="w-4 h-4" style={{ color: COLORS.red }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{p.reason}</p>
              <p className="text-xs text-muted-foreground">{p.date}</p>
            </div>
            <span className="text-sm font-bold flex-shrink-0" style={{ color: COLORS.red }}>
              {p.points}
            </span>
          </div>
        ))}
      </div>

      <div
        className="mt-4 p-3 rounded-xl flex items-center gap-3"
        style={{
          background: `color-mix(in oklch, ${COLORS.gold} 8%, transparent)`,
          border: `1px solid color-mix(in oklch, ${COLORS.gold} 15%, transparent)`,
        }}
      >
        <Info className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.gold }} />
        <p className="text-xs" style={{ color: COLORS.gold }}>
          3 verspätete Lieferungen im letzten Monat. Versuche, alle Bestellungen innerhalb von 48 Stunden zu versenden, um Abzüge zu vermeiden.
        </p>
      </div>
    </div>
  )
}

// ─── TIPS TO IMPROVE ──────────────────────────────────
function ImprovementTips() {
  const tips = [
    {
      icon: BadgeEuro,
      title: "Preis-Leistungs-Verhältnis verbessern",
      description: "Dein Preis-Index liegt bei 0.95. Überprüfe deine Preise im Vergleich zu ähnlichen Produkten und biete Bundle-Angebote an, um den wahrgenommenen Wert zu steigern.",
      impact: "+5-8 Punkte",
      color: COLORS.gold,
    },
    {
      icon: Truck,
      title: "Lieferzeiten weiter optimieren",
      description: "Nutze vorverpackte Artikel für Bestseller und erwäge einen Expressversand-Partner. Ziel: Alle Bestellungen am selben Tag versenden.",
      impact: "+3-5 Punkte",
      color: COLORS.green,
    },
    {
      icon: RotateCcw,
      title: "Retourenquote senken",
      description: "Füge detaillierte Größentabellen und 360°-Produktfotos hinzu. Kunden, die die richtige Größe bestellen, retournieren 40% seltener.",
      impact: "+4-6 Punkte",
      color: COLORS.blue,
    },
    {
      icon: ThumbsUp,
      title: "Mehr Bewertungen sammeln",
      description: "Sende eine freundliche Bewertungsanfrage 3 Tage nach Lieferung. Biete einen 5%-Gutschein für die nächste Bestellung als Dankeschön an.",
      impact: "+3-4 Punkte",
      color: COLORS.purple,
    },
  ]

  return (
    <div className="seller-card p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Lightbulb className="w-5 h-5" style={{ color: COLORS.gold }} />
          Verbesserungsvorschläge
        </h3>
        <span
          className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{
            background: `color-mix(in oklch, ${COLORS.purple} 12%, transparent)`,
            color: COLORS.purple,
          }}
        >
          Priorisiert
        </span>
      </div>

      <div className="space-y-3">
        {tips.map((tip, i) => {
          const Icon = tip.icon
          return (
            <div
              key={i}
              className="flex items-start gap-4 p-4 rounded-xl transition-all hover:bg-white/[0.03]"
              style={{
                border: `1px solid color-mix(in oklch, ${tip.color} 12%, transparent)`,
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `color-mix(in oklch, ${tip.color} 12%, transparent)` }}
              >
                <Icon className="w-4 h-4" style={{ color: tip.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">{tip.title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-2">{tip.description}</p>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold"
                  style={{
                    background: `color-mix(in oklch, ${COLORS.green} 12%, transparent)`,
                    color: COLORS.green,
                  }}
                >
                  <Zap className="w-3 h-3" />
                  Geschätzter Effekt: {tip.impact}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── BADGE STATUS ─────────────────────────────────────
function BadgeStatus() {
  const currentScore = 87
  const platinThreshold = 90
  const pointsNeeded = platinThreshold - currentScore

  const tiers = [
    { name: "Silber", min: 60, color: "oklch(0.55 0.08 260)", icon: Medal },
    { name: "Gold", min: 75, color: COLORS.gold, icon: Trophy },
    { name: "Platin", min: 90, color: COLORS.purple, icon: Crown },
  ]

  return (
    <div className="seller-card p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Trophy className="w-5 h-5" style={{ color: COLORS.gold }} />
          Badge-Status
        </h3>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: `color-mix(in oklch, ${COLORS.gold} 15%, transparent)`,
            border: `1px solid color-mix(in oklch, ${COLORS.gold} 30%, transparent)`,
          }}
        >
          <Trophy className="w-4 h-4" style={{ color: COLORS.gold }} />
          <span className="text-sm font-bold" style={{ color: COLORS.gold }}>Gold</span>
        </div>
      </div>

      {/* Progress to Platin */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Fortschritt zu Platin</span>
          <span className="text-sm font-bold">
            <span style={{ color: COLORS.green }}>{currentScore}</span>
            <span className="text-muted-foreground"> / {platinThreshold}</span>
          </span>
        </div>
        <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "oklch(0.2 0.02 260)" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${(currentScore / platinThreshold) * 100}%`,
              background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.purple})`,
              transition: "width 1.5s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: `0 0 12px color-mix(in oklch, ${COLORS.gold} 40%, transparent)`,
            }}
          />
          {/* Marker indicators for tiers */}
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="absolute top-0 h-full w-0.5"
              style={{
                left: `${(tier.min / platinThreshold) * 100}%`,
                background: tier.color,
                opacity: 0.5,
              }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {tiers.map((tier) => {
            const TierIcon = tier.icon
            return (
              <div key={tier.name} className="flex items-center gap-1">
                <TierIcon className="w-3 h-3" style={{ color: tier.color }} />
                <span className="text-[10px] font-medium" style={{ color: tier.color }}>
                  {tier.name} ({tier.min})
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Callout */}
      <div
        className="p-4 rounded-xl flex items-center gap-3"
        style={{
          background: `color-mix(in oklch, ${COLORS.purple} 8%, transparent)`,
          border: `1px solid color-mix(in oklch, ${COLORS.purple} 15%, transparent)`,
        }}
      >
        <Crown className="w-5 h-5 flex-shrink-0" style={{ color: COLORS.purple }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: COLORS.purple }}>
            Nur noch {pointsNeeded} Punkte bis Platin!
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Platin-Seller erhalten 4% niedrigere Provision, ein exklusives Badge und Premium-Support.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────
export default function SellerScorePage() {
  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="max-w-5xl mx-auto">

        {/* ─── HEADER ─────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight">Verkäufer-Score</h1>
            <span
              className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: `color-mix(in oklch, ${COLORS.gold} 15%, transparent)`,
                color: COLORS.gold,
              }}
            >
              Leistung
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Dein Leistungs-Score basierend auf Lieferung, Qualität, Service, Preis, Bewertungen und Retouren. Höherer Score = niedrigere Provision.
          </p>
        </div>

        {/* ─── 1. OVERALL SCORE (RadialBarChart) ── */}
        <OverallScoreSection />

        {/* ─── 2. RADAR + 3. LINE CHART GRID ────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ScoreBreakdownRadar />
          <ScoreHistoryLine />
        </div>

        {/* ─── 4. INDIVIDUAL METRIC CARDS (6) ───── */}
        <MetricCards />

        {/* ─── 5. MONTHLY PERFORMANCE (BarChart) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <MonthlyPerformanceBars />
          <PenaltiesSection />
        </div>

        {/* ─── 7. TIPS TO IMPROVE ────────────────── */}
        <div className="mb-6">
          <ImprovementTips />
        </div>

        {/* ─── 8. BADGE STATUS ───────────────────── */}
        <BadgeStatus />

      </div>
    </div>
  )
}
