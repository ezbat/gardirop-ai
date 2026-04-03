'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  RotateCcw, Loader2, CheckCircle, XCircle, Clock,
  Package, ArrowLeft, RefreshCw, CreditCard, ChevronDown, ChevronUp,
} from 'lucide-react'

// ─── Status config ──────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:        { label: 'Angefragt',       color: '#D97706', bg: '#FEF3C7', icon: Clock },
  approved:       { label: 'Genehmigt',       color: '#2563EB', bg: '#DBEAFE', icon: CheckCircle },
  rejected:       { label: 'Abgelehnt',       color: '#DC2626', bg: '#FEE2E2', icon: XCircle },
  received:       { label: 'Empfangen',       color: '#7C3AED', bg: '#EDE9FE', icon: Package },
  refund_pending: { label: 'Erstattung läuft', color: '#D97706', bg: '#FEF3C7', icon: RefreshCw },
  refunded:       { label: 'Erstattet',       color: '#16A34A', bg: '#DCFCE7', icon: CreditCard },
  cancelled:      { label: 'Storniert',       color: '#6B7280', bg: '#F3F4F6', icon: XCircle },
}

// ─── Timeline steps ─────────────────────────────────────────────────────────

function getTimelineSteps(ret: any) {
  const steps = [
    { label: 'Angefragt', done: true, date: ret.requested_at },
    { label: 'In Prüfung', done: ['approved', 'rejected', 'received', 'refund_pending', 'refunded'].includes(ret.status), date: ret.reviewed_at },
  ]

  if (ret.status === 'rejected') {
    steps.push({ label: 'Abgelehnt', done: true, date: ret.reviewed_at })
  } else {
    steps.push({ label: 'Genehmigt', done: ['approved', 'received', 'refund_pending', 'refunded'].includes(ret.status), date: ret.reviewed_at })
    steps.push({ label: 'Erstattet', done: ret.status === 'refunded', date: ret.refund_processed_at })
  }

  return steps
}

export default function CustomerReturnsPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const [returns, setReturns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (authStatus === 'unauthenticated') router.push('/auth/signin')
    if (authStatus === 'authenticated') loadReturns()
  }, [authStatus])

  async function loadReturns() {
    try {
      const res = await fetch('/api/returns')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setReturns(data.returns ?? [])
    } catch {
      console.error('[returns] load failed')
    } finally {
      setLoading(false)
    }
  }

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAFA' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#D97706' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#FAFAFA' }}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.push('/orders')}
            className="p-2 rounded-lg hover:bg-white/10 transition"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: '#1A1A1A' }} />
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>
              Meine Rückgaben
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>
              Übersicht deiner Rückgabe-Anfragen
            </p>
          </div>
        </div>

        {returns.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: '#FFF', border: '1px solid #E5E5E5' }}>
            <RotateCcw className="w-14 h-14 mx-auto mb-4" style={{ color: '#D1D5DB' }} />
            <h2 className="text-lg font-bold mb-2" style={{ color: '#1A1A1A' }}>
              Keine Rückgaben
            </h2>
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
              Du hast noch keine Rückgabe-Anfrage gestellt.
            </p>
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition"
              style={{ background: '#D97706', color: '#FFF' }}
            >
              Zu meinen Bestellungen
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {returns.map((ret: any) => {
              const st = STATUS_MAP[ret.status] || STATUS_MAP.pending
              const Icon = st.icon
              const expanded = expandedId === ret.id
              const timeline = getTimelineSteps(ret)

              return (
                <div
                  key={ret.id}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: '#FFF', border: '1px solid #E5E5E5' }}
                >
                  {/* Header row */}
                  <button
                    onClick={() => setExpandedId(expanded ? null : ret.id)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold" style={{ color: '#1A1A1A' }}>
                          Rückgabe #{ret.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ background: st.bg, color: st.color }}
                        >
                          <Icon className="w-3 h-3" />
                          {st.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs" style={{ color: '#6B7280' }}>
                        <span>Bestellung #{ret.order_id.slice(0, 8).toUpperCase()}</span>
                        <span>•</span>
                        <span>{new Date(ret.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <span>•</span>
                        <span className="font-semibold" style={{ color: '#1A1A1A' }}>
                          {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(ret.refund_amount)}
                        </span>
                      </div>
                    </div>
                    {expanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                  </button>

                  {/* Expanded detail */}
                  {expanded && (
                    <div className="px-5 pb-5 space-y-4" style={{ borderTop: '1px solid #F3F4F6' }}>
                      {/* Timeline */}
                      <div className="flex items-center gap-0 pt-4 overflow-x-auto">
                        {timeline.map((step, i) => (
                          <div key={i} className="flex items-center">
                            <div className="flex flex-col items-center min-w-[80px]">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                                style={{
                                  background: step.done ? '#D97706' : '#E5E7EB',
                                  color: step.done ? '#FFF' : '#9CA3AF',
                                }}
                              >
                                {step.done ? '✓' : i + 1}
                              </div>
                              <span
                                className="text-[10px] mt-1 text-center whitespace-nowrap"
                                style={{ color: step.done ? '#1A1A1A' : '#9CA3AF' }}
                              >
                                {step.label}
                              </span>
                              {step.date && (
                                <span className="text-[9px]" style={{ color: '#9CA3AF' }}>
                                  {new Date(step.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                                </span>
                              )}
                            </div>
                            {i < timeline.length - 1 && (
                              <div
                                className="h-0.5 w-8 mx-1"
                                style={{ background: timeline[i + 1]?.done ? '#D97706' : '#E5E7EB' }}
                              />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Reason */}
                      <div className="rounded-xl p-4" style={{ background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                        <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Grund</p>
                        <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>{ret.reasonLabel}</p>
                        {ret.description && (
                          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{ret.description}</p>
                        )}
                      </div>

                      {/* Rejection reason */}
                      {ret.status === 'rejected' && ret.rejection_reason && (
                        <div className="rounded-xl p-4" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                          <p className="text-xs font-semibold mb-1" style={{ color: '#DC2626' }}>Ablehnungsgrund</p>
                          <p className="text-sm" style={{ color: '#991B1B' }}>{ret.rejection_reason}</p>
                        </div>
                      )}

                      {/* Seller response */}
                      {ret.seller_response && (
                        <div className="rounded-xl p-4" style={{ background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                          <p className="text-xs font-semibold mb-1" style={{ color: '#0369A1' }}>Antwort des Verkäufers</p>
                          <p className="text-sm" style={{ color: '#0C4A6E' }}>{ret.seller_response}</p>
                        </div>
                      )}

                      {/* Approved info */}
                      {ret.status === 'approved' && (
                        <div className="rounded-xl p-4" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                          <p className="text-sm" style={{ color: '#1E40AF' }}>
                            ✓ Rückgabe genehmigt. Bitte sende das Produkt innerhalb von 7 Tagen an den Verkäufer zurück.
                          </p>
                        </div>
                      )}

                      {/* Refunded info */}
                      {ret.status === 'refunded' && (
                        <div className="rounded-xl p-4" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                          <p className="text-sm" style={{ color: '#166534' }}>
                            ✓ Erstattung von{' '}
                            <strong>
                              {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(ret.refund_amount)}
                            </strong>{' '}
                            wurde veranlasst. Die Gutschrift erscheint in 5–10 Werktagen.
                          </p>
                        </div>
                      )}

                      {/* Order items preview */}
                      {ret.order?.items?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-2" style={{ color: '#6B7280' }}>Bestellte Artikel</p>
                          <div className="space-y-2">
                            {ret.order.items.slice(0, 3).map((item: any) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-3 rounded-lg p-2"
                                style={{ background: '#F9FAFB' }}
                              >
                                {item.product?.images?.[0] && (
                                  <img
                                    src={item.product.images[0]}
                                    alt=""
                                    className="w-10 h-10 rounded-lg object-cover"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate" style={{ color: '#1A1A1A' }}>
                                    {item.product?.title || 'Artikel'}
                                  </p>
                                  <p className="text-xs" style={{ color: '#6B7280' }}>
                                    Menge: {item.quantity}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
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
    </div>
  )
}
