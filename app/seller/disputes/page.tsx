"use client"

import { useState, useMemo } from "react"
import {
  Scale, AlertTriangle, CheckCircle2, Clock, Search,
  ChevronDown, ChevronUp, MessageSquare, ArrowUpRight,
  ShieldCheck, XCircle, Package, RefreshCw, TrendingUp
} from "lucide-react"

const PURPLE = "oklch(0.65 0.15 250)"
const GREEN = "oklch(0.72 0.19 145)"
const GOLD = "oklch(0.78 0.14 85)"
const RED = "oklch(0.7 0.15 25)"

type DisputeStatus = "open" | "in_progress" | "resolved" | "escalated"
type Priority = "low" | "medium" | "high"

interface Dispute {
  id: number; orderId: string; customer: string; reason: string; amount: number
  dateFiled: string; status: DisputeStatus; priority: Priority
  timeline: { date: string; action: string; actor: string }[]
  resolutionType?: string
}

const STATUS_CONFIG: Record<DisputeStatus, { label: string; color: string }> = {
  open: { label: "Offen", color: GOLD },
  in_progress: { label: "In Bearbeitung", color: PURPLE },
  resolved: { label: "Gelöst", color: GREEN },
  escalated: { label: "Eskaliert", color: RED },
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  low: { label: "Niedrig", color: GREEN },
  medium: { label: "Mittel", color: GOLD },
  high: { label: "Hoch", color: RED },
}

const mockDisputes: Dispute[] = [
  { id: 1, orderId: "#2891", customer: "Anna K.", reason: "Artikel nicht erhalten", amount: 89.99, dateFiled: "12.02.2026", status: "open", priority: "high",
    timeline: [{ date: "12.02.2026", action: "Streitfall eröffnet", actor: "Anna K." }, { date: "12.02.2026", action: "Automatische Benachrichtigung gesendet", actor: "System" }] },
  { id: 2, orderId: "#2847", customer: "Peter M.", reason: "Defekter Artikel", amount: 149.50, dateFiled: "10.02.2026", status: "in_progress", priority: "medium",
    timeline: [{ date: "10.02.2026", action: "Streitfall eröffnet", actor: "Peter M." }, { date: "11.02.2026", action: "Fotos angefordert", actor: "Sie" }, { date: "11.02.2026", action: "Fotos hochgeladen", actor: "Peter M." }] },
  { id: 3, orderId: "#2803", customer: "Maria S.", reason: "Falsche Größe erhalten", amount: 65.00, dateFiled: "08.02.2026", status: "resolved", priority: "low",
    timeline: [{ date: "08.02.2026", action: "Streitfall eröffnet", actor: "Maria S." }, { date: "09.02.2026", action: "Ersatzlieferung angeboten", actor: "Sie" }, { date: "09.02.2026", action: "Angebot akzeptiert", actor: "Maria S." }, { date: "10.02.2026", action: "Gelöst - Ersatzlieferung", actor: "System" }],
    resolutionType: "Ersatzlieferung" },
  { id: 4, orderId: "#2756", customer: "Jan W.", reason: "Qualität entspricht nicht Beschreibung", amount: 199.99, dateFiled: "05.02.2026", status: "escalated", priority: "high",
    timeline: [{ date: "05.02.2026", action: "Streitfall eröffnet", actor: "Jan W." }, { date: "06.02.2026", action: "Antwort gesendet", actor: "Sie" }, { date: "07.02.2026", action: "Antwort abgelehnt", actor: "Jan W." }, { date: "08.02.2026", action: "An Plattform-Mediation eskaliert", actor: "System" }] },
  { id: 5, orderId: "#2712", customer: "Sophie L.", reason: "Verspätete Lieferung", amount: 45.00, dateFiled: "02.02.2026", status: "resolved", priority: "low",
    timeline: [{ date: "02.02.2026", action: "Streitfall eröffnet", actor: "Sophie L." }, { date: "03.02.2026", action: "Teilrückerstattung (10%) angeboten", actor: "Sie" }, { date: "03.02.2026", action: "Akzeptiert", actor: "Sophie L." }],
    resolutionType: "Teilrückerstattung" },
]

const TABS = ["Alle", "Offen", "In Bearbeitung", "Gelöst", "Eskaliert"] as const
const tabStatusMap: Record<string, DisputeStatus | null> = { "Alle": null, "Offen": "open", "In Bearbeitung": "in_progress", "Gelöst": "resolved", "Eskaliert": "escalated" }

export default function DisputesPage() {
  const [activeTab, setActiveTab] = useState<string>("Alle")
  const [search, setSearch] = useState("")
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const filtered = useMemo(() => {
    let list = mockDisputes
    const status = tabStatusMap[activeTab]
    if (status) list = list.filter(d => d.status === status)
    if (search) list = list.filter(d => d.orderId.toLowerCase().includes(search.toLowerCase()) || d.customer.toLowerCase().includes(search.toLowerCase()) || d.reason.toLowerCase().includes(search.toLowerCase()))
    return list
  }, [activeTab, search])

  const stats = {
    open: mockDisputes.filter(d => d.status === "open").length,
    resolved: mockDisputes.filter(d => d.status === "resolved").length,
    rate: Math.round((mockDisputes.filter(d => d.status === "resolved").length / mockDisputes.length) * 100),
    avgDays: 2.4,
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in oklch, ${GOLD} 15%, transparent)` }}>
              <Scale className="w-5 h-5" style={{ color: GOLD }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Streitfälle</h1>
              <p className="text-sm text-muted-foreground">Verwalten und lösen Sie Kundenstreitigkeiten professionell</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Offene Streitfälle", value: stats.open.toString(), icon: AlertTriangle, color: GOLD },
            { label: "Gelöst (Monat)", value: stats.resolved.toString(), icon: CheckCircle2, color: GREEN },
            { label: "Lösungsrate", value: `${stats.rate}%`, icon: TrendingUp, color: PURPLE },
            { label: "Ø Lösungszeit", value: `${stats.avgDays} Tage`, icon: Clock, color: "oklch(0.65 0.18 260)" },
          ].map((stat, i) => {
            const Icon = stat.icon
            return (
              <div key={i} className="seller-card p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-[0.05] -translate-y-6 translate-x-6" style={{ background: stat.color }} />
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `color-mix(in oklch, ${stat.color} 12%, transparent)` }}>
                  <Icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
            )
          })}
        </div>

        {/* Filters */}
        <div className="seller-card p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex gap-1 flex-wrap">
              {TABS.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className="px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200"
                  style={{ background: activeTab === tab ? `color-mix(in oklch, ${GOLD} 15%, transparent)` : "transparent", color: activeTab === tab ? GOLD : undefined, border: activeTab === tab ? `1px solid color-mix(in oklch, ${GOLD} 30%, transparent)` : "1px solid transparent" }}>
                  {tab}
                </button>
              ))}
            </div>
            <div className="relative ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen..."
                className="pl-9 pr-4 py-2 rounded-xl text-sm border-0 outline-none w-56" style={{ background: "oklch(0.14 0.01 260)" }} />
            </div>
          </div>
        </div>

        {/* Dispute Cards */}
        <div className="space-y-3">
          {filtered.map(dispute => {
            const statusConfig = STATUS_CONFIG[dispute.status]
            const priorityConfig = PRIORITY_CONFIG[dispute.priority]
            const isExpanded = expandedId === dispute.id
            return (
              <div key={dispute.id} className="seller-card overflow-hidden transition-all duration-300">
                <button onClick={() => setExpandedId(isExpanded ? null : dispute.id)}
                  className="w-full p-5 flex items-center gap-4 text-left transition-colors hover:bg-white/[0.02]">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `color-mix(in oklch, ${statusConfig.color} 12%, transparent)` }}>
                    <Scale className="w-5 h-5" style={{ color: statusConfig.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold">Bestellung {dispute.orderId}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `color-mix(in oklch, ${statusConfig.color} 12%, transparent)`, color: statusConfig.color }}>{statusConfig.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: `color-mix(in oklch, ${priorityConfig.color} 10%, transparent)`, color: priorityConfig.color }}>{priorityConfig.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{dispute.customer} · {dispute.reason}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold">{"\u20AC"}{dispute.amount.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{dispute.dateFiled}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                </button>

                <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: isExpanded ? "500px" : "0px", opacity: isExpanded ? 1 : 0 }}>
                  <div className="px-5 pb-5 pt-0">
                    <div className="border-t pt-4 mb-4" style={{ borderColor: "oklch(0.2 0 0)" }}>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Verlauf</h3>
                      <div className="space-y-3">
                        {dispute.timeline.map((entry, i) => (
                          <div key={i} className="flex gap-3 items-start">
                            <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: i === 0 ? statusConfig.color : "oklch(0.3 0 0)" }} />
                            <div>
                              <p className="text-xs">{entry.action}</p>
                              <p className="text-[10px] text-muted-foreground">{entry.date} · {entry.actor}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {dispute.resolutionType && (
                      <div className="p-3 rounded-xl mb-4 flex items-center gap-2" style={{ background: `color-mix(in oklch, ${GREEN} 8%, transparent)`, border: `1px solid color-mix(in oklch, ${GREEN} 20%, transparent)` }}>
                        <ShieldCheck className="w-4 h-4" style={{ color: GREEN }} />
                        <span className="text-xs font-medium" style={{ color: GREEN }}>Lösung: {dispute.resolutionType}</span>
                      </div>
                    )}
                    {dispute.status !== "resolved" && (
                      <div className="flex gap-2">
                        <button className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-90"
                          style={{ background: PURPLE, color: "#fff" }}><MessageSquare className="w-3.5 h-3.5" />Antworten</button>
                        {dispute.status !== "escalated" && (
                          <button className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-90"
                            style={{ background: `color-mix(in oklch, ${RED} 12%, transparent)`, color: RED, border: `1px solid color-mix(in oklch, ${RED} 25%, transparent)` }}>
                            <ArrowUpRight className="w-3.5 h-3.5" />Eskalieren
                          </button>
                        )}
                        <button className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-90"
                          style={{ background: `color-mix(in oklch, ${GREEN} 12%, transparent)`, color: GREEN, border: `1px solid color-mix(in oklch, ${GREEN} 25%, transparent)` }}>
                          <CheckCircle2 className="w-3.5 h-3.5" />Lösen
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="seller-card p-12 text-center">
              <Scale className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-semibold mb-1">Keine Streitfälle gefunden</p>
              <p className="text-xs text-muted-foreground">Passen Sie Ihre Filter an oder führen Sie eine neue Suche durch</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
