'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  RotateCcw, Loader2, CheckCircle, XCircle, Clock,
  Package, CreditCard, RefreshCw, ChevronDown, ChevronUp,
  AlertTriangle, Inbox,
} from 'lucide-react'

// ─── Status ─────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending:        { label: 'Offen',           color: '#D97706', bg: '#FEF3C7' },
  approved:       { label: 'Genehmigt',       color: '#2563EB', bg: '#DBEAFE' },
  rejected:       { label: 'Abgelehnt',       color: '#DC2626', bg: '#FEE2E2' },
  received:       { label: 'Empfangen',       color: '#7C3AED', bg: '#EDE9FE' },
  refund_pending: { label: 'Erstattung läuft', color: '#D97706', bg: '#FEF3C7' },
  refunded:       { label: 'Erstattet',       color: '#16A34A', bg: '#DCFCE7' },
  cancelled:      { label: 'Storniert',       color: '#6B7280', bg: '#F3F4F6' },
}

const fmtEur = (v: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v)

export default function SellerReturnsPage() {
  const { data: session } = useSession()
  const [returns, setReturns] = useState<any[]>([])
  const [summary, setSummary] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [sellerMsg, setSellerMsg] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/seller/returns')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setReturns(data.returns ?? [])
      setSummary(data.summary ?? {})
    } catch {
      console.error('[seller/returns] load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleAction(returnId: string, action: string, extra: Record<string, any> = {}) {
    setProcessing(returnId)
    try {
      const res = await fetch('/api/seller/returns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnId, action, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast('error', data.error || 'Aktion fehlgeschlagen.')
        return
      }
      showToast('success',
        action === 'approve' ? 'Rückgabe genehmigt.'
        : action === 'reject' ? 'Rückgabe abgelehnt.'
        : 'Als empfangen markiert.'
      )
      setRejectId(null)
      setRejectReason('')
      setSellerMsg('')
      await load()
    } catch {
      showToast('error', 'Ein Fehler ist aufgetreten.')
    } finally {
      setProcessing(null)
    }
  }

  const filtered = filter === 'all' ? returns : returns.filter(r => r.status === filter)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#D97706' }} />
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
            background: toast.type === 'success' ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${toast.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
            color: toast.type === 'success' ? '#166534' : '#991B1B',
          }}
        >
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Rückgaben</h1>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
          Verwalte Rückgabe-Anfragen deiner Kunden
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Offen',     value: summary.pending ?? 0, color: '#D97706', bg: '#FEF3C7' },
          { label: 'Genehmigt', value: summary.approved ?? 0, color: '#2563EB', bg: '#DBEAFE' },
          { label: 'Erstattet', value: summary.refunded ?? 0, color: '#16A34A', bg: '#DCFCE7' },
          { label: 'Gesamt',    value: summary.total ?? 0,    color: '#6B7280', bg: '#F3F4F6' },
        ].map(k => (
          <div
            key={k.label}
            className="rounded-xl p-4"
            style={{ background: '#FFF', border: '1px solid #E5E5E5' }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>{k.label}</p>
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'Alle' },
          { key: 'pending', label: 'Offen' },
          { key: 'approved', label: 'Genehmigt' },
          { key: 'received', label: 'Empfangen' },
          { key: 'refunded', label: 'Erstattet' },
          { key: 'rejected', label: 'Abgelehnt' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition"
            style={{
              background: filter === t.key ? '#D97706' : '#FFF',
              color: filter === t.key ? '#FFF' : '#374151',
              border: filter === t.key ? '1px solid #D97706' : '1px solid #E5E5E5',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: '#FFF', border: '1px solid #E5E5E5' }}>
          <Inbox className="w-12 h-12 mx-auto mb-3" style={{ color: '#D1D5DB' }} />
          <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
            {filter === 'all' ? 'Keine Rückgabe-Anfragen vorhanden.' : `Keine Rückgaben mit Status "${STATUS_MAP[filter]?.label || filter}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ret: any) => {
            const st = STATUS_MAP[ret.status] || STATUS_MAP.pending
            const expanded = expandedId === ret.id
            const isPending = ret.status === 'pending'
            const isApproved = ret.status === 'approved'

            return (
              <div
                key={ret.id}
                className="rounded-2xl overflow-hidden"
                style={{ background: '#FFF', border: `1px solid ${isPending ? '#FDE68A' : '#E5E5E5'}` }}
              >
                {/* Row header */}
                <button
                  onClick={() => setExpandedId(expanded ? null : ret.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-bold" style={{ color: '#1A1A1A' }}>
                        #{ret.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ background: st.bg, color: st.color }}
                      >
                        {st.label}
                      </span>
                      {isPending && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: '#FEF3C7', color: '#92400E' }}>
                          AKTION ERFORDERLICH
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: '#6B7280' }}>
                      <span>Bestellung #{ret.order_id.slice(0, 8).toUpperCase()}</span>
                      <span>•</span>
                      <span>{ret.customer?.name || ret.customer?.full_name || 'Kunde'}</span>
                      <span>•</span>
                      <span>{ret.reasonLabel}</span>
                      <span>•</span>
                      <span className="font-semibold" style={{ color: '#1A1A1A' }}>{fmtEur(ret.refund_amount)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>
                      {new Date(ret.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                    </span>
                    {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {/* Expanded */}
                {expanded && (
                  <div className="px-4 pb-4 space-y-4" style={{ borderTop: '1px solid #F3F4F6' }}>
                    {/* Customer + reason */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                      <div className="rounded-xl p-3" style={{ background: '#F9FAFB' }}>
                        <p className="text-[10px] font-semibold mb-1" style={{ color: '#6B7280' }}>KUNDE</p>
                        <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>
                          {ret.customer?.full_name || ret.customer?.name || '—'}
                        </p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>{ret.customer?.email || '—'}</p>
                      </div>
                      <div className="rounded-xl p-3" style={{ background: '#F9FAFB' }}>
                        <p className="text-[10px] font-semibold mb-1" style={{ color: '#6B7280' }}>RÜCKGABEGRUND</p>
                        <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>{ret.reasonLabel}</p>
                        {ret.description && (
                          <p className="text-xs mt-1" style={{ color: '#6B7280' }}>{ret.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Order items */}
                    {ret.order?.items?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold mb-2" style={{ color: '#6B7280' }}>BESTELLTE ARTIKEL</p>
                        <div className="space-y-2">
                          {ret.order.items.map((item: any) => (
                            <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: '#F9FAFB' }}>
                              {item.product?.images?.[0] && (
                                <img src={item.product.images[0]} alt="" className="w-10 h-10 rounded object-cover" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: '#1A1A1A' }}>{item.product?.title || 'Artikel'}</p>
                                <p className="text-xs" style={{ color: '#6B7280' }}>Menge: {item.quantity}</p>
                              </div>
                              <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{fmtEur(item.price || 0)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rejection reason display */}
                    {ret.status === 'rejected' && ret.rejection_reason && (
                      <div className="rounded-xl p-3" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                        <p className="text-xs font-semibold" style={{ color: '#DC2626' }}>Ablehnungsgrund</p>
                        <p className="text-sm mt-1" style={{ color: '#991B1B' }}>{ret.rejection_reason}</p>
                      </div>
                    )}

                    {/* Seller response display */}
                    {ret.seller_response && (
                      <div className="rounded-xl p-3" style={{ background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                        <p className="text-xs font-semibold" style={{ color: '#0369A1' }}>Deine Antwort</p>
                        <p className="text-sm mt-1" style={{ color: '#0C4A6E' }}>{ret.seller_response}</p>
                      </div>
                    )}

                    {/* ─── Pending: approve/reject ────────────────────────────── */}
                    {isPending && (
                      <div className="space-y-3">
                        {rejectId === ret.id ? (
                          // Reject form
                          <div className="space-y-3">
                            <textarea
                              value={rejectReason}
                              onChange={e => setRejectReason(e.target.value)}
                              rows={2}
                              placeholder="Ablehnungsgrund (Pflichtfeld)..."
                              className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                              style={{ border: '1px solid #E5E5E5', color: '#1A1A1A' }}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setRejectId(null); setRejectReason('') }}
                                className="flex-1 px-3 py-2 rounded-xl text-sm font-semibold"
                                style={{ background: '#F3F4F6', color: '#374151' }}
                              >
                                Abbrechen
                              </button>
                              <button
                                onClick={() => handleAction(ret.id, 'reject', { rejectionReason: rejectReason })}
                                disabled={!rejectReason.trim() || processing === ret.id}
                                className="flex-1 px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-1"
                                style={{ background: '#DC2626' }}
                              >
                                {processing === ret.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                Ablehnen
                              </button>
                            </div>
                          </div>
                        ) : (
                          // Action buttons
                          <div className="space-y-3">
                            <textarea
                              value={expandedId === ret.id ? sellerMsg : ''}
                              onChange={e => setSellerMsg(e.target.value)}
                              rows={2}
                              placeholder="Nachricht an Kunden (optional)..."
                              className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                              style={{ border: '1px solid #E5E5E5', color: '#1A1A1A' }}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => setRejectId(ret.id)}
                                className="flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1 transition"
                                style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
                              >
                                <XCircle className="w-4 h-4" />
                                Ablehnen
                              </button>
                              <button
                                onClick={() => handleAction(ret.id, 'approve', { response: sellerMsg || undefined })}
                                disabled={processing === ret.id}
                                className="flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1 transition disabled:opacity-50"
                                style={{ background: '#16A34A' }}
                              >
                                {processing === ret.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                Genehmigen
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ─── Approved: mark received ────────────────────────────── */}
                    {isApproved && (
                      <div className="space-y-3">
                        <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#2563EB' }} />
                          <p className="text-xs" style={{ color: '#1E40AF' }}>
                            Warte auf Rücksendung des Kunden. Sobald du das Paket erhalten hast, markiere es als empfangen.
                          </p>
                        </div>
                        <button
                          onClick={() => handleAction(ret.id, 'received')}
                          disabled={processing === ret.id}
                          className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1 transition disabled:opacity-50"
                          style={{ background: '#7C3AED' }}
                        >
                          {processing === ret.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                          Als empfangen markieren
                        </button>
                      </div>
                    )}

                    {/* Refunded */}
                    {ret.status === 'refunded' && (
                      <div className="rounded-xl p-3" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                        <p className="text-sm" style={{ color: '#166534' }}>
                          ✓ Erstattung von <strong>{fmtEur(ret.refund_amount)}</strong> wurde veranlasst.
                          {ret.refund_processed_at && (
                            <span className="ml-1">
                              ({new Date(ret.refund_processed_at).toLocaleDateString('de-DE')})
                            </span>
                          )}
                        </p>
                      </div>
                    )}
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
