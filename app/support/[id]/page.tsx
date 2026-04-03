'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, Send, Clock, CheckCircle, MessageCircle,
  AlertCircle, Headphones, User,
} from 'lucide-react'

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  open:             { label: 'Offen',          color: '#D97706', bg: '#FEF3C7' },
  in_progress:      { label: 'In Bearbeitung', color: '#2563EB', bg: '#DBEAFE' },
  waiting_customer: { label: 'Antwort nötig',  color: '#DC2626', bg: '#FEE2E2' },
  waiting_seller:   { label: 'Wartet',         color: '#D97706', bg: '#FEF3C7' },
  resolved:         { label: 'Gelöst',         color: '#16A34A', bg: '#DCFCE7' },
  closed:           { label: 'Geschlossen',    color: '#6B7280', bg: '#F3F4F6' },
}

const SCOPE_MAP: Record<string, string> = {
  order: 'Bestellung', return: 'Rückgabe', payout: 'Auszahlung',
  product: 'Produkt', account: 'Konto', general: 'Allgemein',
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

export default function CustomerTicketDetailPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const params = useParams()
  const ticketId = params.id as string

  const [ticket, setTicket] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [reply, setReply] = useState('')
  const [toast, setToast] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (authStatus === 'unauthenticated') router.push('/auth/signin')
    if (authStatus === 'authenticated') loadTicket()
  }, [authStatus])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadTicket() {
    try {
      const res = await fetch(`/api/support/${ticketId}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTicket(data.ticket)
      setMessages(data.messages ?? [])
    } catch {
      console.error('[support detail] load failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/support/${ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply.trim() }),
      })
      if (!res.ok) throw new Error()
      setReply('')
      loadTicket()
    } catch {
      setToast('Nachricht konnte nicht gesendet werden.')
      setTimeout(() => setToast(''), 3000)
    } finally {
      setSending(false)
    }
  }

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAFA' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#D97706' }} />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAFA' }}>
        <p style={{ color: '#999' }}>Ticket nicht gefunden.</p>
      </div>
    )
  }

  const st = STATUS_MAP[ticket.status] || STATUS_MAP.open
  const isClosed = ticket.status === 'closed'

  return (
    <div className="min-h-screen" style={{ background: '#FAFAFA' }}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back + header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/support"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: '#FFF', border: '1px solid #E5E5E5' }}
          >
            <ArrowLeft size={16} style={{ color: '#666' }} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate" style={{ color: '#111' }}>{ticket.subject}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ color: st.color, background: st.bg }}
              >
                {st.label}
              </span>
              <span className="text-xs" style={{ color: '#999' }}>
                {SCOPE_MAP[ticket.scope] || ticket.scope} · #{ticket.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium text-white" style={{ background: '#DC2626' }}>
            {toast}
          </div>
        )}

        {/* Messages */}
        <div className="rounded-2xl overflow-hidden mb-4" style={{ background: '#FFF', border: '1px solid #E5E5E5' }}>
          <div className="divide-y" style={{ borderColor: '#F0F0F0' }}>
            {messages.map((m: any, i: number) => {
              const isCustomer = m.sender_type === 'customer'
              return (
                <div key={m.id} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: isCustomer ? '#FEF3C7' : '#DBEAFE' }}
                    >
                      {isCustomer
                        ? <User size={13} style={{ color: '#D97706' }} />
                        : <Headphones size={13} style={{ color: '#2563EB' }} />
                      }
                    </div>
                    <span className="text-xs font-semibold" style={{ color: isCustomer ? '#D97706' : '#2563EB' }}>
                      {isCustomer ? 'Du' : 'Support-Team'}
                    </span>
                    <span className="text-xs" style={{ color: '#BBB' }}>
                      {fmtDate(m.created_at)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap pl-9" style={{ color: '#333' }}>
                    {m.body}
                  </p>
                </div>
              )
            })}
          </div>
          <div ref={bottomRef} />
        </div>

        {/* Reply box */}
        {!isClosed ? (
          <form onSubmit={handleSend} className="rounded-2xl p-4" style={{ background: '#FFF', border: '1px solid #E5E5E5' }}>
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              rows={3}
              placeholder="Deine Antwort…"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none resize-none mb-3"
              style={{ border: '1px solid #E5E5E5', background: '#FAFAFA' }}
              onFocus={e => e.currentTarget.style.borderColor = '#D97706'}
              onBlur={e => e.currentTarget.style.borderColor = '#E5E5E5'}
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={sending || !reply.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
                style={{ background: '#D97706' }}
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Senden
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-4 rounded-2xl" style={{ background: '#F3F4F6', border: '1px solid #E5E5E5' }}>
            <p className="text-sm" style={{ color: '#666' }}>Dieses Ticket ist geschlossen.</p>
          </div>
        )}
      </div>
    </div>
  )
}
