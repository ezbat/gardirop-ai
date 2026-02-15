"use client"

import { useState } from "react"
import {
  Plug, Key, Copy, RefreshCw, Eye, EyeOff, Plus, Trash2,
  CheckCircle2, XCircle, AlertCircle, Globe, ExternalLink,
  BookOpen, Package, Truck, Calculator, Share2, BarChart3,
  Settings, Zap, Check
} from "lucide-react"

const PURPLE = "oklch(0.65 0.15 250)"
const GREEN = "oklch(0.72 0.19 145)"
const BLUE = "oklch(0.65 0.18 260)"

const initialApiKeys = [
  { id: 1, name: "Produktions-API", key: "wro_live_sk_7f3a...d4e8", fullKey: "wro_live_sk_7f3a9b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a", created: "02.01.2026", lastUsed: "14.02.2026" },
  { id: 2, name: "Test-API", key: "wro_test_sk_1a2b...f5g6", fullKey: "wro_test_sk_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t", created: "15.01.2026", lastUsed: "13.02.2026" },
  { id: 3, name: "Webhook-Secret", key: "wro_whsec_9x8y...a1b2", fullKey: "wro_whsec_9x8y7z6w5v4u3t2s1r0q9p8o7n6m5l4k3j2i1h", created: "20.01.2026", lastUsed: "14.02.2026" },
]

const initialWebhooks = [
  { id: 1, url: "https://erp.meinshop.de/api/webhook", events: ["Bestellung erstellt", "Bestellung aktualisiert"], active: true, lastTriggered: "Vor 5 Min." },
  { id: 2, url: "https://versand.example.com/hook", events: ["Versand erstellt"], active: true, lastTriggered: "Vor 2 Std." },
  { id: 3, url: "https://analytics.meinshop.de/events", events: ["Produkt angesehen", "Warenkorb aktualisiert"], active: false, lastTriggered: "Vor 3 Tagen" },
]

const integrations = [
  { id: 1, name: "SAP Business One", category: "ERP-System", icon: Package, status: "connected" as const, lastSync: "Vor 10 Min." },
  { id: 2, name: "DHL Versand", category: "Versand", icon: Truck, status: "connected" as const, lastSync: "Vor 30 Min." },
  { id: 3, name: "DATEV", category: "Buchhaltung", icon: Calculator, status: "disconnected" as const, lastSync: null },
  { id: 4, name: "Instagram Shopping", category: "Social Media", icon: Share2, status: "connected" as const, lastSync: "Vor 1 Std." },
  { id: 5, name: "Hermes", category: "Versand", icon: Truck, status: "error" as const, lastSync: "Fehler vor 2 Std." },
  { id: 6, name: "Xero", category: "Buchhaltung", icon: Calculator, status: "disconnected" as const, lastSync: null },
  { id: 7, name: "Shopify", category: "E-Commerce", icon: Globe, status: "connected" as const, lastSync: "Vor 15 Min." },
  { id: 8, name: "TikTok Shop", category: "Social Media", icon: Share2, status: "disconnected" as const, lastSync: null },
]

const apiUsageData = [
  { day: "Mo", calls: 1240 }, { day: "Di", calls: 1890 }, { day: "Mi", calls: 2340 },
  { day: "Do", calls: 1780 }, { day: "Fr", calls: 2890 }, { day: "Sa", calls: 950 }, { day: "So", calls: 620 },
]

const docLinks = [
  { title: "API-Referenz", desc: "Vollständige REST API Dokumentation", icon: BookOpen },
  { title: "Webhook-Leitfaden", desc: "Events und Payload-Formate", icon: Settings },
  { title: "SDK & Bibliotheken", desc: "Node.js, Python, PHP SDKs", icon: Zap },
  { title: "Integrationsbeispiele", desc: "Code-Beispiele und Tutorials", icon: Settings },
]

export default function IntegrationsPage() {
  const [apiKeys, setApiKeys] = useState(initialApiKeys)
  const [visibleKeys, setVisibleKeys] = useState<Record<number, boolean>>({})
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [webhooks, setWebhooks] = useState(initialWebhooks)
  const [serviceStatuses, setServiceStatuses] = useState<Record<number, string>>(
    Object.fromEntries(integrations.map(i => [i.id, i.status]))
  )
  const [newWebhookUrl, setNewWebhookUrl] = useState("")
  const [showNewWebhook, setShowNewWebhook] = useState(false)

  const handleCopy = (id: number, fullKey: string) => {
    navigator.clipboard?.writeText(fullKey)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleRegenerate = (id: number) => {
    setApiKeys(prev => prev.map(k => k.id === id ? { ...k, key: "wro_new_" + Math.random().toString(36).slice(2, 10) + "...", fullKey: "wro_new_" + Math.random().toString(36).slice(2, 40), created: "14.02.2026" } : k))
  }

  const handleToggleWebhook = (id: number) => setWebhooks(prev => prev.map(w => w.id === id ? { ...w, active: !w.active } : w))
  const handleDeleteWebhook = (id: number) => setWebhooks(prev => prev.filter(w => w.id !== id))
  const handleAddWebhook = () => {
    if (!newWebhookUrl.trim()) return
    setWebhooks(prev => [...prev, { id: Date.now(), url: newWebhookUrl.trim(), events: ["Bestellung erstellt"], active: true, lastTriggered: "Nie" }])
    setNewWebhookUrl("")
    setShowNewWebhook(false)
  }
  const handleToggleService = (id: number) => setServiceStatuses(prev => ({ ...prev, [id]: prev[id] === "connected" ? "disconnected" : "connected" }))

  const maxCalls = Math.max(...apiUsageData.map(d => d.calls))

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in oklch, ${PURPLE} 15%, transparent)` }}>
              <Plug className="w-5 h-5" style={{ color: PURPLE }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">API & Integrationen</h1>
              <p className="text-sm text-muted-foreground">Verbinden Sie externe Tools und verwalten Sie Ihre API-Schlüssel</p>
            </div>
          </div>
        </div>

        {/* API Keys */}
        <div className="seller-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <Key className="w-5 h-5" style={{ color: PURPLE }} />
            <h2 className="text-base font-bold">API-Schlüssel</h2>
          </div>
          <div className="space-y-3">
            {apiKeys.map(apiKey => (
              <div key={apiKey.id} className="p-4 rounded-xl" style={{ background: "oklch(0.14 0.01 260)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold">{apiKey.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Erstellt: {apiKey.created} · Zuletzt: {apiKey.lastUsed}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setVisibleKeys(prev => ({ ...prev, [apiKey.id]: !prev[apiKey.id] }))}
                      className="p-2 rounded-lg text-muted-foreground transition-colors hover:bg-white/5">
                      {visibleKeys[apiKey.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleCopy(apiKey.id, apiKey.fullKey)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all duration-200"
                      style={{ background: copiedId === apiKey.id ? `color-mix(in oklch, ${GREEN} 15%, transparent)` : "oklch(0.2 0 0)", color: copiedId === apiKey.id ? GREEN : undefined }}>
                      {copiedId === apiKey.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === apiKey.id ? "Kopiert" : "Kopieren"}
                    </button>
                    <button onClick={() => handleRegenerate(apiKey.id)} className="p-2 rounded-lg text-muted-foreground transition-colors hover:bg-white/5">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="px-3 py-2 rounded-lg font-mono text-sm" style={{ background: "oklch(0.12 0 0)", color: visibleKeys[apiKey.id] ? BLUE : "oklch(0.5 0 0)", letterSpacing: visibleKeys[apiKey.id] ? "0" : "2px" }}>
                  {visibleKeys[apiKey.id] ? apiKey.fullKey : apiKey.key}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Webhooks */}
        <div className="seller-card p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" style={{ color: PURPLE }} />
              <h2 className="text-base font-bold">Webhooks</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `color-mix(in oklch, ${PURPLE} 12%, transparent)`, color: PURPLE }}>{webhooks.length}</span>
            </div>
            <button onClick={() => setShowNewWebhook(!showNewWebhook)} className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-90"
              style={{ background: PURPLE, color: "#fff" }}>
              <Plus className="w-3.5 h-3.5" /> Webhook hinzufügen
            </button>
          </div>
          {showNewWebhook && (
            <div className="flex gap-2 mb-4 p-4 rounded-xl" style={{ background: `color-mix(in oklch, ${PURPLE} 6%, transparent)`, border: `1px solid color-mix(in oklch, ${PURPLE} 20%, transparent)` }}>
              <input value={newWebhookUrl} onChange={e => setNewWebhookUrl(e.target.value)} placeholder="https://ihre-domain.de/webhook"
                className="flex-1 px-3 py-2.5 rounded-lg text-sm border-0 outline-none" style={{ background: "oklch(0.14 0 0)" }}
                onKeyDown={e => e.key === "Enter" && handleAddWebhook()} />
              <button onClick={handleAddWebhook} className="px-4 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                style={{ background: GREEN, color: "#fff" }}>Erstellen</button>
            </div>
          )}
          <div className="space-y-3">
            {webhooks.map(webhook => (
              <div key={webhook.id} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "oklch(0.14 0.01 260)" }}>
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: webhook.active ? GREEN : "oklch(0.4 0 0)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono truncate">{webhook.url}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {webhook.events.map(event => (
                      <span key={event} className="text-[11px] px-2 py-0.5 rounded font-medium" style={{ background: `color-mix(in oklch, ${PURPLE} 12%, transparent)`, color: PURPLE }}>{event}</span>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">Zuletzt ausgelöst: {webhook.lastTriggered}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleToggleWebhook(webhook.id)} className="relative w-11 h-6 rounded-full transition-colors duration-300 cursor-pointer"
                    style={{ backgroundColor: webhook.active ? GREEN : "oklch(0.35 0 0)" }}>
                    <div className="absolute w-4.5 h-4.5 bg-white rounded-full top-[3px] transition-all duration-300" style={{ width: "18px", height: "18px", left: webhook.active ? "22px" : "3px" }} />
                  </button>
                  <button onClick={() => handleDeleteWebhook(webhook.id)} className="p-1.5 text-muted-foreground hover:text-white transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Connected Services */}
        <div className="seller-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <Globe className="w-5 h-5" style={{ color: PURPLE }} />
            <h2 className="text-base font-bold">Verbundene Dienste</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {integrations.map(integ => {
              const status = serviceStatuses[integ.id]
              const statusColor = status === "connected" ? GREEN : status === "error" ? "oklch(0.7 0.15 25)" : "oklch(0.5 0 0)"
              const statusLabel = status === "connected" ? "Verbunden" : status === "error" ? "Fehler" : "Getrennt"
              const StatusIcon = status === "connected" ? CheckCircle2 : status === "error" ? AlertCircle : XCircle
              const Icon = integ.icon
              return (
                <div key={integ.id} className="p-4 rounded-xl flex flex-col gap-3 transition-all duration-200"
                  style={{ background: "oklch(0.14 0.01 260)", border: `1px solid ${status === "connected" ? `color-mix(in oklch, ${GREEN} 20%, transparent)` : "oklch(0.2 0 0)"}` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in oklch, ${PURPLE} 12%, transparent)` }}>
                      <Icon className="w-4 h-4" style={{ color: PURPLE }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{integ.name}</p>
                      <p className="text-[11px] text-muted-foreground">{integ.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon className="w-3.5 h-3.5" style={{ color: statusColor }} />
                    <span className="text-xs font-medium" style={{ color: statusColor }}>{statusLabel}</span>
                    {integ.lastSync && status === "connected" && <span className="text-[10px] text-muted-foreground ml-auto">{integ.lastSync}</span>}
                  </div>
                  <button onClick={() => handleToggleService(integ.id)} className="w-full py-2 rounded-lg text-xs font-semibold transition-all duration-200 hover:opacity-90"
                    style={{ background: status === "connected" ? `color-mix(in oklch, oklch(0.7 0.15 25) 10%, transparent)` : `color-mix(in oklch, ${PURPLE} 15%, transparent)`, color: status === "connected" ? "oklch(0.7 0.15 25)" : PURPLE }}>
                    {status === "connected" ? "Trennen" : "Verbinden"}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* API Usage + Docs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="seller-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" style={{ color: PURPLE }} />
                <h2 className="text-base font-bold">API-Nutzung</h2>
              </div>
              <span className="text-xs text-muted-foreground">Letzte 7 Tage</span>
            </div>
            <div className="flex items-end gap-2 h-40 px-1">
              {apiUsageData.map(d => (
                <div key={d.day} className="flex-1 flex flex-col items-center h-full justify-end">
                  <span className="text-[10px] text-muted-foreground mb-1">{d.calls.toLocaleString("de-DE")}</span>
                  <div className="w-full rounded-t-md" style={{ height: `${(d.calls / maxCalls) * 100}%`, background: `linear-gradient(to top, ${PURPLE}, ${BLUE})`, transition: "height 0.5s ease", minHeight: "4px" }} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 px-1 mt-2">
              {apiUsageData.map(d => <div key={d.day} className="flex-1 text-center text-xs text-muted-foreground font-medium">{d.day}</div>)}
            </div>
            <div className="flex justify-between mt-4 p-3 rounded-xl" style={{ background: "oklch(0.14 0.01 260)" }}>
              <div><p className="text-[11px] text-muted-foreground">Gesamt</p><p className="text-lg font-bold mt-0.5">{apiUsageData.reduce((s, d) => s + d.calls, 0).toLocaleString("de-DE")}</p></div>
              <div className="text-right"><p className="text-[11px] text-muted-foreground">Tagesdurchschnitt</p><p className="text-lg font-bold mt-0.5">{Math.round(apiUsageData.reduce((s, d) => s + d.calls, 0) / 7).toLocaleString("de-DE")}</p></div>
            </div>
          </div>

          <div className="seller-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <BookOpen className="w-5 h-5" style={{ color: PURPLE }} />
              <h2 className="text-base font-bold">Dokumentation</h2>
            </div>
            <div className="space-y-3">
              {docLinks.map(doc => {
                const Icon = doc.icon
                return (
                  <div key={doc.title} className="flex items-center gap-4 p-4 rounded-xl transition-all duration-200 cursor-pointer hover:bg-white/[0.02]"
                    style={{ background: "oklch(0.14 0.01 260)" }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `color-mix(in oklch, ${PURPLE} 12%, transparent)` }}>
                      <Icon className="w-5 h-5" style={{ color: PURPLE }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{doc.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{doc.desc}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
