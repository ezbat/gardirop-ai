"use client"

import { useState } from "react"
import {
  Trophy, TrendingUp, Target, Award, Star, Zap,
  Medal, ShieldCheck, Clock, Package, MessageCircle
} from "lucide-react"
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, BarChart, Bar, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts"

const radarData = [
  { kategorie: "Lieferung", du: 88, durchschnitt: 72, top10: 95 },
  { kategorie: "Zufriedenheit", du: 92, durchschnitt: 75, top10: 97 },
  { kategorie: "Qualität", du: 85, durchschnitt: 70, top10: 94 },
  { kategorie: "Preis-Leistung", du: 78, durchschnitt: 68, top10: 90 },
  { kategorie: "Sortiment", du: 72, durchschnitt: 65, top10: 88 },
  { kategorie: "Kommunikation", du: 95, durchschnitt: 71, top10: 96 },
]

const rankHistory = [
  { month: "Mär", rang: 1200 }, { month: "Apr", rang: 1150 }, { month: "Mai", rang: 1080 },
  { month: "Jun", rang: 1020 }, { month: "Jul", rang: 980 }, { month: "Aug", rang: 945 },
  { month: "Sep", rang: 910 }, { month: "Okt", rang: 892 }, { month: "Nov", rang: 875 },
  { month: "Dez", rang: 860 }, { month: "Jan", rang: 852 }, { month: "Feb", rang: 847 },
]

const categoryComparison = [
  { kategorie: "Lieferzeit", du: 88, avg: 72, top: 95 },
  { kategorie: "Bewertung", du: 92, avg: 75, top: 97 },
  { kategorie: "Retouren", du: 85, avg: 70, top: 94 },
  { kategorie: "Antwortzeit", du: 95, avg: 71, top: 96 },
  { kategorie: "Sortiment", du: 72, avg: 65, top: 88 },
  { kategorie: "Preis", du: 78, avg: 68, top: 90 },
]

const achievements = [
  { name: "Schnellversender", icon: Zap, unlocked: true, desc: "95% in <2 Tagen" },
  { name: "Top-Bewertet", icon: Star, unlocked: true, desc: "Ø 4.7★ (200+)" },
  { name: "Bestseller", icon: Trophy, unlocked: true, desc: "500+ Bestellungen" },
  { name: "Kommunikator", icon: MessageCircle, unlocked: true, desc: "Antwort <2h" },
  { name: "Qualitätssiegel", icon: ShieldCheck, unlocked: true, desc: "Retoure <5%" },
  { name: "Trendsetter", icon: TrendingUp, unlocked: false, desc: "Top 5% Kategorie" },
  { name: "Platin-Verkäufer", icon: Medal, unlocked: false, desc: "Score über 90" },
  { name: "Inventar-Profi", icon: Package, unlocked: false, desc: "0 Ausverkäufe 90T" },
]

const radialData = [{ name: "Perzentil", value: 93.2, fill: "oklch(0.78 0.14 85)" }]

const tips = [
  { title: "Sortiment erweitern", impact: "Hoch", punkte: "+8", desc: "15+ Accessoires hinzufügen für bessere Sortimentsbreite" },
  { title: "Preise optimieren", impact: "Hoch", punkte: "+6", desc: "3 Produkte liegen 15% über dem Marktdurchschnitt" },
  { title: "Schnellere Lieferung", impact: "Mittel", punkte: "+3", desc: "Same-Day Versand für Top 10 Produkte aktivieren" },
  { title: "Mehr Varianten", impact: "Mittel", punkte: "+4", desc: "Beliebte Produkte in weiteren Größen/Farben anbieten" },
]

export default function SellerBenchmarkPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Performance Benchmark</h1>
        <p className="text-sm" style={{ color: "oklch(0.65 0.03 260)" }}>Vergleiche deine Leistung mit anderen Verkäufern</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="seller-card p-5 rounded-xl flex flex-col items-center">
          <p className="text-sm mb-2" style={{ color: "oklch(0.65 0.03 260)" }}>Dein Rang</p>
          <div style={{ width: 160, height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270} data={radialData}>
                <RadialBar dataKey="value" cornerRadius={10} background={{ fill: "oklch(0.2 0.02 260)" }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-3xl font-bold -mt-2">#847</p>
          <p className="text-xs" style={{ color: "oklch(0.65 0.03 260)" }}>von 12.450 Verkäufern</p>
          <div className="mt-2 px-3 py-1 rounded-full text-xs font-medium" style={{ background: "color-mix(in oklch, oklch(0.78 0.14 85) 15%, transparent)", color: "oklch(0.78 0.14 85)" }}>Top 6,8%</div>
        </div>

        <div className="seller-card p-5 rounded-xl flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: "linear-gradient(135deg, oklch(0.78 0.14 85), oklch(0.7 0.12 55))" }}>
            <Trophy className="w-8 h-8 text-black" />
          </div>
          <p className="text-xl font-bold">Gold-Verkäufer</p>
          <p className="text-xs mt-1" style={{ color: "oklch(0.65 0.03 260)" }}>Seit Oktober 2024</p>
          <div className="w-full mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: "oklch(0.65 0.03 260)" }}>Fortschritt zu Platin</span>
              <span className="font-medium">87/90</span>
            </div>
            <div className="w-full h-2.5 rounded-full" style={{ background: "oklch(0.2 0.02 260)" }}>
              <div className="h-full rounded-full" style={{ width: "96.7%", background: "linear-gradient(90deg, oklch(0.78 0.14 85), oklch(0.65 0.15 250))" }} />
            </div>
            <p className="text-xs mt-1" style={{ color: "oklch(0.72 0.19 145)" }}>Noch 3 Punkte bis Platin!</p>
          </div>
        </div>

        <div className="seller-card p-5 rounded-xl">
          <h3 className="font-semibold mb-3">Peer-Vergleich</h3>
          <div className="space-y-3">
            {[
              { label: "Ø Lieferzeit", du: "2,1 Tage", avg: "3,4 Tage" },
              { label: "Ø Bewertung", du: "4,7★", avg: "4,1★" },
              { label: "Retourenquote", du: "4,2%", avg: "8,7%" },
              { label: "Antwortzeit", du: "1,4h", avg: "4,8h" },
              { label: "Conv. Rate", du: "3,8%", avg: "2,4%" },
            ].map((m) => (
              <div key={m.label} className="flex items-center justify-between text-sm">
                <span style={{ color: "oklch(0.65 0.03 260)" }}>{m.label}</span>
                <div className="flex items-center gap-3">
                  <span className="font-medium" style={{ color: "oklch(0.72 0.19 145)" }}>{m.du}</span>
                  <span className="text-xs" style={{ color: "oklch(0.5 0.02 260)" }}>vs {m.avg}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="seller-card p-5 rounded-xl">
        <h3 className="font-semibold mb-1">Leistungsprofil</h3>
        <p className="text-xs mb-4" style={{ color: "oklch(0.65 0.03 260)" }}>Du vs. Durchschnitt vs. Top 10%</p>
        <div style={{ height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="oklch(0.25 0.02 260)" />
              <PolarAngleAxis dataKey="kategorie" stroke="oklch(0.6 0.02 260)" fontSize={12} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="oklch(0.3 0.02 260)" fontSize={10} />
              <Radar name="Top 10%" dataKey="top10" stroke="oklch(0.78 0.14 85)" fill="oklch(0.78 0.14 85)" fillOpacity={0.1} strokeWidth={1} />
              <Radar name="Durchschnitt" dataKey="durchschnitt" stroke="oklch(0.5 0.02 260)" fill="oklch(0.5 0.02 260)" fillOpacity={0.05} strokeDasharray="4 4" />
              <Radar name="Du" dataKey="du" stroke="oklch(0.65 0.15 250)" fill="oklch(0.65 0.15 250)" fillOpacity={0.2} strokeWidth={2} />
              <Legend />
              <Tooltip contentStyle={{ background: "oklch(0.2 0.02 260)", border: "1px solid oklch(0.3 0.02 260)", borderRadius: "8px" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="seller-card p-5 rounded-xl">
          <h3 className="font-semibold mb-1">Rangentwicklung</h3>
          <p className="text-xs mb-4" style={{ color: "oklch(0.65 0.03 260)" }}>Letzte 12 Monate</p>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rankHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
                <XAxis dataKey="month" stroke="oklch(0.5 0.02 260)" fontSize={12} />
                <YAxis stroke="oklch(0.5 0.02 260)" fontSize={12} reversed domain={[800, 1250]} tickFormatter={(v) => `#${v}`} />
                <Tooltip contentStyle={{ background: "oklch(0.2 0.02 260)", border: "1px solid oklch(0.3 0.02 260)", borderRadius: "8px" }} formatter={(v: number) => [`#${v}`, "Rang"]} />
                <Line type="monotone" dataKey="rang" stroke="oklch(0.72 0.19 145)" strokeWidth={2.5} dot={{ fill: "oklch(0.72 0.19 145)", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="seller-card p-5 rounded-xl">
          <h3 className="font-semibold mb-1">Kategorien-Vergleich</h3>
          <p className="text-xs mb-4" style={{ color: "oklch(0.65 0.03 260)" }}>Punktzahl pro Kategorie</p>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryComparison} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
                <XAxis type="number" domain={[0, 100]} stroke="oklch(0.5 0.02 260)" fontSize={12} />
                <YAxis dataKey="kategorie" type="category" stroke="oklch(0.5 0.02 260)" fontSize={11} width={80} />
                <Tooltip contentStyle={{ background: "oklch(0.2 0.02 260)", border: "1px solid oklch(0.3 0.02 260)", borderRadius: "8px" }} />
                <Legend />
                <Bar dataKey="du" name="Du" fill="oklch(0.65 0.15 250)" radius={[0, 4, 4, 0]} barSize={8} />
                <Bar dataKey="avg" name="Ø" fill="oklch(0.5 0.02 260)" radius={[0, 4, 4, 0]} barSize={8} />
                <Bar dataKey="top" name="Top 10%" fill="oklch(0.78 0.14 85)" radius={[0, 4, 4, 0]} barSize={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="seller-card p-5 rounded-xl">
        <h3 className="font-semibold mb-4">Auszeichnungen</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {achievements.map((a) => (
            <div key={a.name} className="p-3 rounded-xl text-center" style={{ background: a.unlocked ? "color-mix(in oklch, oklch(0.78 0.14 85) 8%, transparent)" : "oklch(0.15 0.01 260)", opacity: a.unlocked ? 1 : 0.5 }}>
              <div className="w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ background: a.unlocked ? "color-mix(in oklch, oklch(0.78 0.14 85) 20%, transparent)" : "oklch(0.2 0.01 260)" }}>
                <a.icon className="w-5 h-5" style={{ color: a.unlocked ? "oklch(0.78 0.14 85)" : "oklch(0.4 0.02 260)" }} />
              </div>
              <p className="text-xs font-medium">{a.name}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "oklch(0.55 0.02 260)" }}>{a.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="seller-card p-5 rounded-xl">
        <h3 className="font-semibold mb-4">Verbesserungsvorschläge</h3>
        <div className="space-y-3">
          {tips.map((tip) => (
            <div key={tip.title} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "oklch(0.15 0.01 260)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `color-mix(in oklch, ${tip.impact === "Hoch" ? "oklch(0.72 0.19 145)" : "oklch(0.65 0.15 250)"} 15%, transparent)` }}>
                <Target className="w-4 h-4" style={{ color: tip.impact === "Hoch" ? "oklch(0.72 0.19 145)" : "oklch(0.65 0.15 250)" }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{tip.title}</p>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: `color-mix(in oklch, ${tip.impact === "Hoch" ? "oklch(0.72 0.19 145)" : "oklch(0.65 0.15 250)"} 15%, transparent)`, color: tip.impact === "Hoch" ? "oklch(0.72 0.19 145)" : "oklch(0.65 0.15 250)" }}>{tip.impact}</span>
                  <span className="text-xs font-bold" style={{ color: "oklch(0.72 0.19 145)" }}>{tip.punkte}</span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.02 260)" }}>{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
