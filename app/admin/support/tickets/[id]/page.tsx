'use client'

import { useState, useEffect, useRef } from 'react'
import { getAdminToken } from '@/lib/admin-fetch'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, Send, User, Store, Headphones,
  Lock, AlertTriangle, CheckCircle, Clock,
} from 'lucide-react'

// ─── Theme ──────────────────────────────────────────────────────────────────

const BG   = '#0B0D14'
const SURF = '#111520'
const ELEV = '#1A1E2E'
const BDR  = '#2E3448'
const T1   = '#F0F2F8'
const T2   = '#9EA5BB'
const T3   = '#7B83A0'
const ACC  = '#6366F1'

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  open:             { label: 'Offen',           color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  in_progress:      { label: 'In Bearbeitung',  color: '#6366F1', bg: 'rgba(99,102,241,0.15)' },
  waiting_customer: { label: 'Wartet (Kunde)',   color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  waiting_seller:   { label: 'Wartet (Seller)',  color: '#F97316', bg: 'rgba(249,115,22,0.15)' },
  resolved:         { label: 'Gelöst',          color: '#22C55E', bg: 'rgba(34,197,94,0.15)' },
  closed:           { label: 'Geschlossen',     color: '#6B7280', bg: 'rgba(107,114,128,0.15)' },
}

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low:    { label: 'Niedrig', color: '#6B7280' },
  normal: { label: 'Normal',  color: '#8B92A8' },
  high:   { label: 'Hoch',    color: '#F59E0B' },
  urgent: { label: 'Dringend', color: '#EF4444' },
}

const SCOPE_MAP: Record<string, string> = {
  order: 'Bestellung', return: 'Rückgabe', payout: 'Auszahlung',
  product: 'Produkt', account: 'Konto', general: 'Allgemein',
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminTicketDetailPage() {
  const params = useParams()
  const ticketId = params.id as string
  const token = getAdminToken()

  const [ticket, setTicket] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [reply, setReply] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [toast, setToast] = useState('')
  const [updating, setUpdating] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadTicket() }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadTicket() {
    if (!token) return
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticketId}`, {
        headers: { 'x-admin-token': token },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTicket(data.ticket)
      setMessages(data.messages ?? [])
    } catch {
      console.error('[admin/ticket detail] load failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim() || !token) return
    setSending(true)
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ message: reply.trim(), internalNote: isInternal }),
      })
      if (!res.ok) throw new Error()
      setReply('')
      setIsInternal(false)
      loadTicket()
    } catch {
      showToast('Nachricht konnte nicht gesendet werden.', true)
    } finally {
      setSending(false)
    }
  }

  async function updateTicket(updates: Record<string, string>) {
    if (!token) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error()
      showToast('Aktualisiert!')
      loadTicket()
    } catch {
      showToast('Fehler beim Aktualisieren.', true)
    } finally {
      setUpdating(false)
    }
  }

  function showToast(msg: string, isError = false) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: ACC }} />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center py-32">
        <p style={{ color: T3 }}>Ticket nicht gefunden.</p>
      </div>
    )
  }

  const st = STATUS_MAP[ticket.status] || STATUS_MAP.open
  const pr = PRIORITY_MAP[ticket.priority] || PRIORITY_MAP.normal

  return (
    <div>
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/support/tickets"
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: ELEV, border: `1px solid ${BDR}` }}
        >
          <ArrowLeft size={16} style={{ color: T2 }} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate" style={{ color: T1 }}>{ticket.subject}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-xs" style={{ color: ACC }}>#{ticket.id.slice(0, 8).toUpperCase()}</span>
            <span className="text-xs" style={{ color: T3 }}>·</span>
            <span className="text-xs" style={{ color: T3 }}>{SCOPE_MAP[ticket.scope] || ticket.scope}</span>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="mb-4 px-4 py-3 rounded-lg text-sm font-medium"
          style={{
            background: toast.includes('Fehler') ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
            color: toast.includes('Fehler') ? '#EF4444' : '#22C55E',
            border: `1px solid ${toast.includes('Fehler') ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
          }}
        >
          {toast}
        </div>
      )}

      <div className="grid grid-cols-[1fr_280px] gap-5">
        {/* Messages column */}
        <div>
          <div className="rounded-xl overflow-hidden mb-4" style={{ background: SURF, border: `1px solid ${BDR}` }}>
            {messages.map((m: any, i: number) => {
              const isAdmin = m.sender_type === 'admin'
              const isInternalNote = m.internal_note
              const isSeller = m.sender_type === 'seller'
              const isCustomer = m.sender_type === 'customer'

              let senderLabel = 'Kunde'
              let senderColor = '#F59E0B'
              let senderBg = 'rgba(245,158,11,0.15)'
              let SenderIcon = User

              if (isAdmin) {
                senderLabel = isInternalNote ? 'Interne Notiz' : 'Admin'
                senderColor = isInternalNote ? '#F97316' : ACC
                senderBg = isInternalNote ? 'rgba(249,115,22,0.1)' : 'rgba(99,102,241,0.15)'
                SenderIcon = isInternalNote ? Lock : Headphones
              } else if (isSeller) {
                senderLabel = 'Verkäufer'
                senderColor = '#8B5CF6'
                senderBg = 'rgba(139,92,246,0.15)'
                SenderIcon = Store
              }

              return (
                <div
                  key={m.id}
                  className="px-5 py-4"
                  style={{
                    borderBottom: i < messages.length - 1 ? `1px solid ${BDR}` : undefined,
                    background: isInternalNote ? 'rgba(249,115,22,0.05)' : undefined,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: senderBg }}
                    >
                      <SenderIcon size={13} style={{ color: senderColor }} />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: senderColor }}>
                      {senderLabel}
                    </span>
                    {isInternalNote && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(249,115,22,0.15)', color: '#F97316' }}>
                        INTERN
                      </span>
                    )}
                    <span className="text-xs" style={{ color: T3 }}>
                      {fmtDate(m.created_at)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap pl-9" style={{ color: isInternalNote ? '#F97316' : T1 }}>
                    {m.body}
                  </p>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Reply box */}
          <form onSubmit={handleSend} className="rounded-xl p-4" style={{ background: SURF, border: `1px solid ${BDR}` }}>
            <div className="flex items-center gap-3 mb-3">
              <button
                type="button"
                onClick={() => setIsInternal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: !isInternal ? ACC : 'transparent',
                  color: !isInternal ? '#FFF' : T3,
                  border: `1px solid ${!isInternal ? ACC : BDR}`,
                }}
              >
                <Send size={11} className="inline mr-1" />
                Antwort
              </button>
              <button
                type="button"
                onClick={() => setIsInternal(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: isInternal ? '#F97316' : 'transparent',
                  color: isInternal ? '#FFF' : T3,
                  border: `1px solid ${isInternal ? '#F97316' : BDR}`,
                }}
              >
                <Lock size={11} className="inline mr-1" />
                Interne Notiz
              </button>
            </div>
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              rows={3}
              placeholder={isInternal ? 'Interne Notiz (nur für Admins sichtbar)…' : 'Antwort an Kunden/Seller…'}
              className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none resize-none mb-3"
              style={{
                background: ELEV,
                border: `1px solid ${isInternal ? 'rgba(249,115,22,0.3)' : BDR}`,
                color: T1,
              }}
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={sending || !reply.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-all"
                style={{ background: isInternal ? '#F97316' : ACC }}
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : isInternal ? <Lock size={14} /> : <Send size={14} />}
                {isInternal ? 'Notiz speichern' : 'Senden'}
              </button>
            </div>
          </form>
        </div>

        {/* Right sidebar — ticket info + actions */}
        <div className="space-y-4">
          {/* Ticket info */}
          <div className="rounded-xl p-4" style={{ background: SURF, border: `1px solid ${BDR}` }}>
            <h3 className="text-xs font-semibold uppercase mb-3" style={{ color: T3 }}>Ticket-Details</h3>
            <div className="space-y-3">
              <div>
                <p className="text-[11px] mb-1" style={{ color: T3 }}>Status</p>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ color: st.color, background: st.bg }}
                >
                  {st.label}
                </span>
              </div>
              <div>
                <p className="text-[11px] mb-1" style={{ color: T3 }}>Priorität</p>
                <span className="text-xs font-medium" style={{ color: pr.color }}>
                  {ticket.priority === 'urgent' && <AlertTriangle size={10} className="inline mr-1" />}
                  {pr.label}
                </span>
              </div>
              <div>
                <p className="text-[11px] mb-1" style={{ color: T3 }}>Erstellt</p>
                <span className="text-xs" style={{ color: T2 }}>{fmtDate(ticket.created_at)}</span>
              </div>
              {ticket.user && (
                <div>
                  <p className="text-[11px] mb-1" style={{ color: T3 }}>Benutzer</p>
                  <span className="text-xs" style={{ color: T2 }}>
                    {ticket.user.full_name || ticket.user.name || ticket.user.email}
                  </span>
                </div>
              )}
              {ticket.seller && (
                <div>
                  <p className="text-[11px] mb-1" style={{ color: T3 }}>Shop</p>
                  <span className="text-xs" style={{ color: T2 }}>{ticket.seller.shop_name}</span>
                </div>
              )}
              {ticket.scope_id && (
                <div>
                  <p className="text-[11px] mb-1" style={{ color: T3 }}>Verknüpfung</p>
                  <span className="font-mono text-xs" style={{ color: ACC }}>
                    {ticket.scope_id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-xl p-4" style={{ background: SURF, border: `1px solid ${BDR}` }}>
            <h3 className="text-xs font-semibold uppercase mb-3" style={{ color: T3 }}>Aktionen</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] block mb-1" style={{ color: T3 }}>Status ändern</label>
                <select
                  value={ticket.status}
                  onChange={e => updateTicket({ status: e.target.value })}
                  disabled={updating}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
                  style={{ background: ELEV, border: `1px solid ${BDR}`, color: T1 }}
                >
                  {Object.entries(STATUS_MAP).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] block mb-1" style={{ color: T3 }}>Priorität ändern</label>
                <select
                  value={ticket.priority}
                  onChange={e => updateTicket({ priority: e.target.value })}
                  disabled={updating}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
                  style={{ background: ELEV, border: `1px solid ${BDR}`, color: T1 }}
                >
                  {Object.entries(PRIORITY_MAP).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
