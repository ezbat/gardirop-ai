'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  Headphones, Loader2, Plus, Clock, CheckCircle, MessageCircle,
  ArrowRight, AlertCircle, Inbox, ChevronRight,
} from 'lucide-react'

// ─── Status config ──────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  open:             { label: 'Offen',            color: '#D97706', bg: '#FEF3C7', icon: Clock },
  in_progress:      { label: 'In Bearbeitung',   color: '#2563EB', bg: '#DBEAFE', icon: MessageCircle },
  waiting_customer: { label: 'Wartet',           color: '#D97706', bg: '#FEF3C7', icon: Clock },
  waiting_seller:   { label: 'Antwort nötig',    color: '#DC2626', bg: '#FEE2E2', icon: AlertCircle },
  resolved:         { label: 'Gelöst',           color: '#16A34A', bg: '#DCFCE7', icon: CheckCircle },
  closed:           { label: 'Geschlossen',      color: '#6B7280', bg: '#F3F4F6', icon: CheckCircle },
}

const SCOPE_MAP: Record<string, string> = {
  order: 'Bestellung', return: 'Rückgabe', payout: 'Auszahlung',
  product: 'Produkt', account: 'Konto', general: 'Allgemein',
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function SellerSupportPage() {
  const { data: session, status: authStatus } = useSession()
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')

  const [subject, setSubject] = useState('')
  const [scope, setScope] = useState('general')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (authStatus === 'authenticated') loadTickets()
  }, [authStatus])

  async function loadTickets() {
    try {
      const res = await fetch('/api/seller/support')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTickets(data.tickets ?? [])
    } catch {
      console.error('[seller/support] load failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/seller/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), scope, message: message.trim() }),
      })
      if (!res.ok) throw new Error()
      setSubject('')
      setScope('general')
      setMessage('')
      setShowForm(false)
      setToast('Ticket wurde erstellt!')
      setTimeout(() => setToast(''), 3000)
      loadTickets()
    } catch {
      setToast('Fehler beim Erstellen.')
      setTimeout(() => setToast(''), 3000)
    } finally {
      setSubmitting(false)
    }
  }

  // KPI counts
  const open = tickets.filter(t => t.status === 'open').length
  const inProgress = tickets.filter(t => t.status === 'in_progress').length
  const waitingSeller = tickets.filter(t => t.status === 'waiting_seller').length
  const resolved = tickets.filter(t => t.status === 'resolved').length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#D97706' }} />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#FEF3C7' }}>
            <Headphones size={20} style={{ color: '#D97706' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#111' }}>Support</h1>
            <p className="text-sm" style={{ color: '#666' }}>{tickets.length} Tickets</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: '#D97706' }}
        >
          <Plus size={16} />
          Neues Ticket
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Offen', val: open, color: '#D97706', bg: '#FEF3C7' },
          { label: 'In Bearbeitung', val: inProgress, color: '#2563EB', bg: '#DBEAFE' },
          { label: 'Antwort nötig', val: waitingSeller, color: '#DC2626', bg: '#FEE2E2' },
          { label: 'Gelöst', val: resolved, color: '#16A34A', bg: '#DCFCE7' },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-3 text-center" style={{ background: '#FFF', border: '1px solid #E5E5E5' }}>
            <p className="text-xl font-bold" style={{ color: k.color }}>{k.val}</p>
            <p className="text-xs mt-0.5" style={{ color: '#888' }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium text-white" style={{ background: toast.includes('Fehler') ? '#DC2626' : '#16A34A' }}>
          {toast}
        </div>
      )}

      {/* New ticket form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-2xl p-6" style={{ background: '#FFF', border: '1px solid #E5E5E5' }}>
          <h3 className="text-base font-semibold mb-4" style={{ color: '#111' }}>Neues Support-Ticket</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#333' }}>Betreff *</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Kurze Beschreibung"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={{ border: '1px solid #E5E5E5', background: '#FAFAFA' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#333' }}>Kategorie</label>
              <select
                value={scope}
                onChange={e => setScope(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={{ border: '1px solid #E5E5E5', background: '#FAFAFA' }}
              >
                {Object.entries(SCOPE_MAP).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#333' }}>Nachricht *</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                placeholder="Beschreibe dein Anliegen…"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{ border: '1px solid #E5E5E5', background: '#FAFAFA' }}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ color: '#666' }}>
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={submitting || !subject.trim() || !message.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                style={{ background: '#D97706' }}
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                Absenden
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tickets */}
      {tickets.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: '#FFF', border: '1px solid #E5E5E5' }}>
          <Inbox size={40} style={{ color: '#CCC' }} className="mx-auto mb-3" />
          <p className="text-base font-medium" style={{ color: '#999' }}>Keine Tickets vorhanden</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t: any) => {
            const st = STATUS_MAP[t.status] || STATUS_MAP.open
            const Icon = st.icon
            return (
              <Link
                key={t.id}
                href={`/seller/support/${t.id}`}
                className="block rounded-2xl p-5 transition-all hover:shadow-md"
                style={{ background: '#FFF', border: '1px solid #E5E5E5' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ color: st.color, background: st.bg }}
                      >
                        <Icon size={12} />
                        {st.label}
                      </span>
                      <span className="text-xs" style={{ color: '#999' }}>
                        {SCOPE_MAP[t.scope] || t.scope}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold truncate" style={{ color: '#111' }}>
                      {t.subject}
                    </h3>
                    <p className="text-xs mt-1" style={{ color: '#999' }}>
                      #{t.id.slice(0, 8).toUpperCase()} · {fmtDate(t.last_message_at || t.created_at)}
                    </p>
                  </div>
                  <ChevronRight size={18} style={{ color: '#CCC' }} className="shrink-0 mt-1" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
