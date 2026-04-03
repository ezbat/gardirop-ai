'use client'

import { useState, useEffect } from 'react'
import { getAdminToken } from '@/lib/admin-fetch'
import Link from 'next/link'
import {
  Headphones, Loader2, Search, Clock, CheckCircle, MessageCircle,
  AlertCircle, ChevronRight, AlertTriangle, User, Store,
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

// ─── Status / priority / scope maps ────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  open:             { label: 'Offen',           color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',  icon: Clock },
  in_progress:      { label: 'In Bearbeitung',  color: '#6366F1', bg: 'rgba(99,102,241,0.15)',  icon: MessageCircle },
  waiting_customer: { label: 'Wartet (Kunde)',   color: '#EF4444', bg: 'rgba(239,68,68,0.15)',   icon: AlertCircle },
  waiting_seller:   { label: 'Wartet (Seller)',  color: '#F97316', bg: 'rgba(249,115,22,0.15)',  icon: AlertCircle },
  resolved:         { label: 'Gelöst',          color: '#22C55E', bg: 'rgba(34,197,94,0.15)',   icon: CheckCircle },
  closed:           { label: 'Geschlossen',     color: '#6B7280', bg: 'rgba(107,114,128,0.15)', icon: CheckCircle },
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

export default function AdminSupportTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [summary, setSummary] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  useEffect(() => { loadTickets() }, [])

  async function loadTickets() {
    const token = getAdminToken()
    if (!token) return
    try {
      const res = await fetch('/api/admin/support/tickets', {
        headers: { 'x-admin-token': token },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTickets(data.tickets ?? [])
      setSummary(data.summary ?? {})
    } catch {
      console.error('[admin/support] load failed')
    } finally {
      setLoading(false)
    }
  }

  // Client-side filter
  let filtered = tickets
  if (statusFilter !== 'all') filtered = filtered.filter(t => t.status === statusFilter)
  if (priorityFilter !== 'all') filtered = filtered.filter(t => t.priority === priorityFilter)
  if (search) {
    const s = search.toLowerCase()
    filtered = filtered.filter(t =>
      t.id.toLowerCase().includes(s) ||
      t.subject.toLowerCase().includes(s) ||
      t.user?.name?.toLowerCase().includes(s) ||
      t.user?.email?.toLowerCase().includes(s) ||
      t.seller?.shop_name?.toLowerCase().includes(s)
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: ACC }} />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.2)' }}>
          <Headphones size={20} color={ACC} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: T1 }}>Support-Tickets</h1>
          <p className="text-sm" style={{ color: T2 }}>{tickets.length} gesamt</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Offen',       val: summary.open ?? 0,        color: '#F59E0B' },
          { label: 'Bearbeitung', val: summary.in_progress ?? 0, color: ACC },
          { label: 'Wartend',     val: summary.waiting ?? 0,     color: '#F97316' },
          { label: 'Gelöst',     val: summary.resolved ?? 0,    color: '#22C55E' },
          { label: 'Dringend',    val: summary.urgent ?? 0,      color: '#EF4444' },
          { label: 'Gesamt',      val: summary.total ?? 0,       color: T2 },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-3 text-center" style={{ background: SURF, border: `1px solid ${BDR}` }}>
            <p className="text-lg font-bold" style={{ color: k.color }}>{k.val}</p>
            <p className="text-[11px] mt-0.5" style={{ color: T3 }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T3 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Suchen…"
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: ELEV, border: `1px solid ${BDR}`, color: T1 }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: ELEV, border: `1px solid ${BDR}`, color: T1 }}
        >
          <option value="all">Alle Status</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: ELEV, border: `1px solid ${BDR}`, color: T1 }}
        >
          <option value="all">Alle Prioritäten</option>
          {Object.entries(PRIORITY_MAP).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Tickets table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ background: SURF, border: `1px solid ${BDR}` }}>
          <p className="text-sm" style={{ color: T3 }}>Keine Tickets gefunden.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: SURF, border: `1px solid ${BDR}` }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BDR}` }}>
                {['Ticket', 'Betreff', 'Von', 'Typ', 'Status', 'Priorität', 'Letzte Nachricht'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: T3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t: any) => {
                const st = STATUS_MAP[t.status] || STATUS_MAP.open
                const Icon = st.icon
                const pr = PRIORITY_MAP[t.priority] || PRIORITY_MAP.normal
                return (
                  <tr
                    key={t.id}
                    className="transition-colors cursor-pointer"
                    style={{ borderBottom: `1px solid ${BDR}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = ELEV)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/admin/support/tickets/${t.id}`} className="font-mono text-xs" style={{ color: ACC }}>
                        #{t.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/support/tickets/${t.id}`} className="font-medium truncate block max-w-[200px]" style={{ color: T1 }}>
                        {t.subject}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {t.seller ? (
                          <>
                            <Store size={12} style={{ color: T3 }} />
                            <span className="text-xs" style={{ color: T2 }}>{t.seller.shop_name}</span>
                          </>
                        ) : (
                          <>
                            <User size={12} style={{ color: T3 }} />
                            <span className="text-xs" style={{ color: T2 }}>{t.user?.name || t.user?.email || '—'}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: T3 }}>{SCOPE_MAP[t.scope] || t.scope}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                        style={{ color: st.color, background: st.bg }}
                      >
                        <Icon size={10} />
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium" style={{ color: pr.color }}>
                        {t.priority === 'urgent' && <AlertTriangle size={10} className="inline mr-1" />}
                        {pr.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: T3 }}>
                        {fmtDate(t.last_message_at || t.created_at)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
