'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAdminToken } from '@/lib/admin-fetch'
import {
  RotateCcw, Loader2, CheckCircle, XCircle, Clock,
  Package, CreditCard, RefreshCw, ChevronDown, ChevronUp,
  Search, AlertTriangle, StickyNote, Inbox, DollarSign,
} from 'lucide-react'

// ─── Design tokens (admin dark) ─────────────────────────────────────────────

const BG   = '#0B0D14'
const SURF = '#111520'
const ELEV = '#1A1E2E'
const BDR  = '#2E3448'
const T1   = '#F0F2F8'
const T2   = '#9EA5BB'
const T3   = '#7B83A0'
const ACC  = '#6366F1'
const GRN  = '#22C55E'
const RED  = '#EF4444'
const AMB  = '#F59E0B'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:        { label: 'Offen',           color: AMB },
  approved:       { label: 'Genehmigt',       color: '#3B82F6' },
  rejected:       { label: 'Abgelehnt',       color: RED },
  received:       { label: 'Empfangen',       color: '#A855F7' },
  refund_pending: { label: 'Erstattung läuft', color: AMB },
  refunded:       { label: 'Erstattet',       color: GRN },
  cancelled:      { label: 'Storniert',       color: T3 },
}

const fmtEur = (v: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v)

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<any[]>([])
  const [summary, setSummary] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const [search, setSearch]   = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Reject / note modals
  const [rejectId, setRejectId]     = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [noteId, setNoteId]         = useState<string | null>(null)
  const [noteText, setNoteText]     = useState('')

  const load = useCallback(async () => {
    try {
      const token = getAdminToken()
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('status', filter)

      const res = await fetch(`/api/admin/returns?${params}`, {
        headers: { 'x-admin-token': token },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setReturns(data.returns ?? [])
      setSummary(data.summary ?? {})
    } catch {
      console.error('[admin/returns] load failed')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  async function adminAction(returnId: string, action: string, extra: Record<string, any> = {}) {
    setProcessing(returnId)
    try {
      const token = getAdminToken()
      const res = await fetch('/api/admin/returns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ returnId, action, ...extra }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        showToast('error', data.error || 'Aktion fehlgeschlagen.')
        return
      }
      showToast('success',
        action === 'approve' ? 'Rückgabe genehmigt.'
        : action === 'reject' ? 'Rückgabe abgelehnt.'
        : action === 'process_refund' ? `Erstattung verarbeitet${data.method === 'manual' ? ' (manuell)' : ''}.`
        : 'Notiz hinzugefügt.'
      )
      setRejectId(null); setRejectReason('')
      setNoteId(null); setNoteText('')
      await load()
    } catch {
      showToast('error', 'Ein Fehler ist aufgetreten.')
    } finally {
      setProcessing(null)
    }
  }

  // Search filter
  const filtered = returns.filter((r: any) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      r.id.toLowerCase().includes(s) ||
      r.order_id.toLowerCase().includes(s) ||
      r.customer?.name?.toLowerCase().includes(s) ||
      r.customer?.email?.toLowerCase().includes(s) ||
      r.seller?.shop_name?.toLowerCase().includes(s)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: ACC }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2"
          style={{
            background: toast.type === 'success' ? '#052e16' : '#450a0a',
            border: `1px solid ${toast.type === 'success' ? '#166534' : '#991B1B'}`,
            color: toast.type === 'success' ? GRN : RED,
          }}
        >
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: T1 }}>Rückgaben & Erstattungen</h1>
        <p className="text-sm mt-1" style={{ color: T2 }}>Alle Return-Anfragen der Plattform</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: 'Gesamt',    value: summary.total ?? 0,    color: T2 },
          { label: 'Offen',     value: summary.pending ?? 0,  color: AMB },
          { label: 'Genehmigt', value: summary.approved ?? 0, color: '#3B82F6' },
          { label: 'Empfangen', value: summary.received ?? 0, color: '#A855F7' },
          { label: 'Erstattet', value: summary.refunded ?? 0, color: GRN },
          { label: 'Abgelehnt', value: summary.rejected ?? 0, color: RED },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-3" style={{ background: ELEV, border: `1px solid ${BDR}` }}>
            <p className="text-[10px] font-medium" style={{ color: T3 }}>{k.label}</p>
            <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T3 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ID, Bestellung, Kunde, Shop..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
            style={{ background: ELEV, border: `1px solid ${BDR}`, color: T1 }}
          />
        </div>
        {/* Status filter */}
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm outline-none"
          style={{ background: ELEV, border: `1px solid ${BDR}`, color: T1 }}
        >
          <option value="all">Alle Status</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: SURF, border: `1px solid ${BDR}` }}>
          <Inbox className="w-12 h-12 mx-auto mb-3" style={{ color: T3 }} />
          <p className="text-sm" style={{ color: T2 }}>Keine Rückgaben gefunden.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ret: any) => {
            const st = STATUS_MAP[ret.status] || STATUS_MAP.pending
            const expanded = expandedId === ret.id

            return (
              <div
                key={ret.id}
                className="rounded-xl overflow-hidden"
                style={{ background: SURF, border: `1px solid ${BDR}` }}
              >
                {/* Row */}
                <button
                  onClick={() => setExpandedId(expanded ? null : ret.id)}
                  className="w-full flex items-center justify-between p-4 text-left transition"
                  style={{ ['--tw-ring-color' as any]: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = ELEV)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-bold" style={{ color: T1 }}>
                        #{ret.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold"
                        style={{ color: st.color, background: `${st.color}20` }}
                      >
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: T3 }}>
                      <span>Best. #{ret.order_id.slice(0, 8)}</span>
                      <span>·</span>
                      <span>{ret.customer?.name || ret.customer?.email || '—'}</span>
                      <span>·</span>
                      <span>{ret.seller?.shop_name || '—'}</span>
                      <span>·</span>
                      <span style={{ color: T1 }}>{fmtEur(ret.refund_amount)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: T3 }}>
                      {new Date(ret.created_at).toLocaleDateString('de-DE')}
                    </span>
                    {expanded ? <ChevronUp className="w-4 h-4" style={{ color: T3 }} /> : <ChevronDown className="w-4 h-4" style={{ color: T3 }} />}
                  </div>
                </button>

                {/* Expanded */}
                {expanded && (
                  <div className="px-4 pb-4 space-y-4" style={{ borderTop: `1px solid ${BDR}` }}>
                    {/* Info grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                      {[
                        { label: 'Kunde', value: ret.customer?.email || '—' },
                        { label: 'Shop', value: ret.seller?.shop_name || '—' },
                        { label: 'Grund', value: ret.reason },
                        { label: 'Betrag', value: fmtEur(ret.refund_amount) },
                      ].map(f => (
                        <div key={f.label} className="rounded-lg p-2" style={{ background: ELEV }}>
                          <p className="text-[10px] font-medium" style={{ color: T3 }}>{f.label}</p>
                          <p className="text-xs font-medium" style={{ color: T1 }}>{f.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Description */}
                    {ret.description && (
                      <div className="rounded-lg p-3" style={{ background: ELEV }}>
                        <p className="text-[10px] font-medium mb-1" style={{ color: T3 }}>BESCHREIBUNG</p>
                        <p className="text-xs" style={{ color: T2 }}>{ret.description}</p>
                      </div>
                    )}

                    {/* Seller response */}
                    {ret.seller_response && (
                      <div className="rounded-lg p-3" style={{ background: ELEV }}>
                        <p className="text-[10px] font-medium mb-1" style={{ color: T3 }}>VERKÄUFER-ANTWORT</p>
                        <p className="text-xs" style={{ color: T2 }}>{ret.seller_response}</p>
                      </div>
                    )}

                    {/* Admin notes */}
                    {ret.admin_notes && (
                      <div className="rounded-lg p-3" style={{ background: '#1a1520', border: `1px solid ${ACC}30` }}>
                        <p className="text-[10px] font-medium mb-1" style={{ color: ACC }}>ADMIN-NOTIZEN</p>
                        <pre className="text-xs whitespace-pre-wrap font-sans" style={{ color: T2 }}>{ret.admin_notes}</pre>
                      </div>
                    )}

                    {/* Stripe refund ID */}
                    {ret.stripe_refund_id && (
                      <div className="rounded-lg p-2" style={{ background: ELEV }}>
                        <p className="text-[10px]" style={{ color: T3 }}>
                          Stripe Refund: <span style={{ color: T1 }}>{ret.stripe_refund_id}</span>
                        </p>
                      </div>
                    )}

                    {/* ─── Actions ──────────────────────────────────────────── */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {/* Approve (admin override) */}
                      {['pending', 'rejected'].includes(ret.status) && (
                        <button
                          onClick={() => adminAction(ret.id, 'approve')}
                          disabled={processing === ret.id}
                          className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                          style={{ background: `${GRN}20`, color: GRN }}
                        >
                          {processing === ret.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          Genehmigen
                        </button>
                      )}

                      {/* Reject */}
                      {['pending'].includes(ret.status) && (
                        rejectId === ret.id ? (
                          <div className="flex items-center gap-2 w-full">
                            <input
                              value={rejectReason}
                              onChange={e => setRejectReason(e.target.value)}
                              placeholder="Ablehnungsgrund..."
                              className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none"
                              style={{ background: ELEV, border: `1px solid ${BDR}`, color: T1 }}
                            />
                            <button
                              onClick={() => adminAction(ret.id, 'reject', { rejectionReason: rejectReason })}
                              disabled={!rejectReason.trim() || processing === ret.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                              style={{ background: `${RED}20`, color: RED }}
                            >
                              Ablehnen
                            </button>
                            <button
                              onClick={() => { setRejectId(null); setRejectReason('') }}
                              className="px-2 py-1.5 rounded-lg text-xs"
                              style={{ color: T3 }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRejectId(ret.id)}
                            className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1"
                            style={{ background: `${RED}20`, color: RED }}
                          >
                            <XCircle className="w-3 h-3" />
                            Ablehnen
                          </button>
                        )
                      )}

                      {/* Process refund */}
                      {['approved', 'received'].includes(ret.status) && (
                        <button
                          onClick={() => {
                            if (confirm(`Erstattung von ${fmtEur(ret.refund_amount)} verarbeiten?`)) {
                              adminAction(ret.id, 'process_refund')
                            }
                          }}
                          disabled={processing === ret.id}
                          className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                          style={{ background: `${ACC}20`, color: ACC }}
                        >
                          {processing === ret.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <DollarSign className="w-3 h-3" />}
                          Erstattung verarbeiten
                        </button>
                      )}

                      {/* Add note */}
                      {noteId === ret.id ? (
                        <div className="flex items-center gap-2 w-full">
                          <input
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            placeholder="Admin-Notiz..."
                            className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none"
                            style={{ background: ELEV, border: `1px solid ${BDR}`, color: T1 }}
                          />
                          <button
                            onClick={() => adminAction(ret.id, 'add_note', { adminNotes: noteText })}
                            disabled={!noteText.trim() || processing === ret.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                            style={{ background: `${ACC}20`, color: ACC }}
                          >
                            Speichern
                          </button>
                          <button
                            onClick={() => { setNoteId(null); setNoteText('') }}
                            className="px-2 py-1.5 rounded-lg text-xs"
                            style={{ color: T3 }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setNoteId(ret.id)}
                          className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1"
                          style={{ background: ELEV, color: T2, border: `1px solid ${BDR}` }}
                        >
                          <StickyNote className="w-3 h-3" />
                          Notiz
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
