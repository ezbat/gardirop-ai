"use client"

import { useState } from "react"
import {
  Shield, ChevronDown, ChevronUp, Edit3, Eye, CheckCircle2,
  Clock, RotateCcw, Truck, Lock, CreditCard, FileText,
  AlertTriangle, BookOpen
} from "lucide-react"

const PURPLE = "oklch(0.65 0.15 250)"
const GREEN = "oklch(0.72 0.19 145)"
const GOLD = "oklch(0.78 0.14 85)"

interface Policy {
  id: string; title: string; icon: any; status: "active" | "draft"; lastUpdated: string
  required: boolean; content: string; editable: boolean
  options?: { label: string; values: string[]; current: number }
}

const policies: Policy[] = [
  { id: "return", title: "Rückgaberichtlinie", icon: RotateCcw, status: "active", lastUpdated: "10.02.2026", required: true, editable: true,
    content: "Kunden können unbenutzte Artikel innerhalb des Rückgabezeitraums zurücksenden. Der Artikel muss sich im Originalzustand befinden, mit allen Etiketten und in der Originalverpackung. Die Rückerstattung erfolgt nach Eingang und Prüfung der Rücksendung auf das ursprüngliche Zahlungsmittel.",
    options: { label: "Rückgabefrist", values: ["14 Tage", "30 Tage", "60 Tage"], current: 1 } },
  { id: "shipping", title: "Versandrichtlinie", icon: Truck, status: "active", lastUpdated: "08.02.2026", required: true, editable: true,
    content: "Bestellungen werden innerhalb von 1-3 Werktagen bearbeitet und versendet. Standardversand (DHL) dauert 2-5 Werktage. Expressversand ist gegen Aufpreis verfügbar. Tracking-Informationen werden nach dem Versand per E-Mail zugesendet." },
  { id: "privacy", title: "Datenschutzrichtlinie", icon: Lock, status: "active", lastUpdated: "01.02.2026", required: true, editable: false,
    content: "Wir erheben nur die für die Bestellabwicklung notwendigen personenbezogenen Daten. Ihre Daten werden gemäß DSGVO verarbeitet und nicht an unbefugte Dritte weitergegeben. Sie haben jederzeit das Recht auf Auskunft, Berichtigung und Löschung Ihrer Daten." },
  { id: "payment", title: "Zahlungsrichtlinie", icon: CreditCard, status: "active", lastUpdated: "05.02.2026", required: false, editable: true,
    content: "Wir akzeptieren Kreditkarten (Visa, Mastercard), PayPal, Sofortüberweisung und Klarna. Die Zahlung wird bei Bestelleingang autorisiert. Bei Rückerstattungen wird der Betrag innerhalb von 5-10 Werktagen gutgeschrieben." },
  { id: "terms", title: "Allgemeine Geschäftsbedingungen", icon: FileText, status: "draft", lastUpdated: "28.01.2026", required: true, editable: true,
    content: "Diese AGB regeln das Vertragsverhältnis zwischen dem Verkäufer und dem Kunden. Mit der Bestellung akzeptiert der Kunde diese Bedingungen. Preise verstehen sich inklusive MwSt. Der Gerichtsstand ist Berlin." },
]

const complianceItems = [
  { label: "Rückgaberichtlinie", required: true, done: true },
  { label: "Versandrichtlinie", required: true, done: true },
  { label: "Datenschutzrichtlinie", required: true, done: true },
  { label: "AGB", required: true, done: false },
  { label: "Zahlungsrichtlinie", required: false, done: true },
  { label: "Impressum", required: true, done: true },
]

export default function PoliciesPage() {
  const [expandedId, setExpandedId] = useState<string | null>("return")
  const [previewMode, setPreviewMode] = useState(false)
  const [policyOptions, setPolicyOptions] = useState<Record<string, number>>(
    Object.fromEntries(policies.filter(p => p.options).map(p => [p.id, p.options!.current]))
  )

  const completedRequired = complianceItems.filter(c => c.required && c.done).length
  const totalRequired = complianceItems.filter(c => c.required).length

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in oklch, ${GOLD} 15%, transparent)` }}>
                <Shield className="w-5 h-5" style={{ color: GOLD }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Shop-Richtlinien</h1>
                <p className="text-sm text-muted-foreground">Verwalten Sie alle Richtlinien an einem Ort</p>
              </div>
            </div>
            <button onClick={() => setPreviewMode(!previewMode)}
              className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-200"
              style={{ background: previewMode ? `color-mix(in oklch, ${PURPLE} 15%, transparent)` : "oklch(0.14 0.01 260)", color: previewMode ? PURPLE : undefined, border: previewMode ? `1px solid ${PURPLE}` : "1px solid oklch(0.2 0 0)" }}>
              <Eye className="w-3.5 h-3.5" />{previewMode ? "Bearbeiten" : "Vorschau"}
            </button>
          </div>
        </div>

        {/* Compliance Checklist */}
        <div className="seller-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" style={{ color: PURPLE }} />
              <h2 className="text-base font-bold">Compliance-Checkliste</h2>
            </div>
            <span className="text-xs font-medium px-3 py-1 rounded-full"
              style={{ background: completedRequired === totalRequired ? `color-mix(in oklch, ${GREEN} 12%, transparent)` : `color-mix(in oklch, ${GOLD} 12%, transparent)`, color: completedRequired === totalRequired ? GREEN : GOLD }}>
              {completedRequired}/{totalRequired} Pflicht erfüllt
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {complianceItems.map(item => (
              <div key={item.label} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "oklch(0.14 0.01 260)" }}>
                {item.done ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: GREEN }} /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />}
                <span className="text-xs">{item.label}</span>
                {item.required && <span className="text-[9px] text-muted-foreground ml-auto">Pflicht</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Policy Accordions */}
        <div className="space-y-3">
          {policies.map(policy => {
            const isExpanded = expandedId === policy.id
            const Icon = policy.icon
            return (
              <div key={policy.id} className="seller-card overflow-hidden transition-all duration-300">
                <button onClick={() => setExpandedId(isExpanded ? null : policy.id)}
                  className="w-full p-5 flex items-center gap-4 text-left transition-colors hover:bg-white/[0.02]">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `color-mix(in oklch, ${policy.status === "active" ? GREEN : GOLD} 12%, transparent)` }}>
                    <Icon className="w-5 h-5" style={{ color: policy.status === "active" ? GREEN : GOLD }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold">{policy.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: `color-mix(in oklch, ${policy.status === "active" ? GREEN : GOLD} 12%, transparent)`, color: policy.status === "active" ? GREEN : GOLD }}>
                        {policy.status === "active" ? "Aktiv" : "Entwurf"}
                      </span>
                      {policy.required && <span className="text-[9px] text-muted-foreground">Pflicht</span>}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />Aktualisiert: {policy.lastUpdated}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: isExpanded ? "600px" : "0px", opacity: isExpanded ? 1 : 0 }}>
                  <div className="px-5 pb-5 pt-0">
                    <div className="border-t pt-4" style={{ borderColor: "oklch(0.2 0 0)" }}>
                      {policy.options && (
                        <div className="mb-4">
                          <label className="text-xs font-semibold text-muted-foreground mb-2 block">{policy.options.label}</label>
                          <div className="flex gap-2">
                            {policy.options.values.map((val, i) => (
                              <button key={val} onClick={() => setPolicyOptions(prev => ({ ...prev, [policy.id]: i }))}
                                className="px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200"
                                style={{ background: policyOptions[policy.id] === i ? `color-mix(in oklch, ${PURPLE} 15%, transparent)` : "oklch(0.14 0.01 260)", color: policyOptions[policy.id] === i ? PURPLE : undefined, border: policyOptions[policy.id] === i ? `1px solid ${PURPLE}` : "1px solid transparent" }}>
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {previewMode ? (
                        <div className="p-4 rounded-xl text-sm leading-relaxed" style={{ background: "oklch(0.14 0.01 260)" }}>
                          {policy.content}
                        </div>
                      ) : (
                        <textarea defaultValue={policy.content} disabled={!policy.editable} rows={4}
                          className="w-full p-4 rounded-xl text-sm leading-relaxed resize-none border-0 outline-none disabled:opacity-50"
                          style={{ background: "oklch(0.14 0.01 260)" }} />
                      )}

                      {policy.editable && !previewMode && (
                        <div className="flex gap-2 mt-3">
                          <button className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-90"
                            style={{ background: GREEN, color: "#fff" }}><Edit3 className="w-3.5 h-3.5" />Speichern</button>
                          {policy.status === "draft" && (
                            <button className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-90"
                              style={{ background: PURPLE, color: "#fff" }}>Veröffentlichen</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
