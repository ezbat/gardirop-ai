'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Wallet, Clock, CheckCircle, XCircle, AlertCircle,
  ArrowDownToLine, Loader2, RefreshCw, ChevronRight,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type PayoutStatus = 'requested' | 'approved' | 'processing' | 'paid' | 'rejected' | 'failed'

interface Payout {
  id: string
  amount: number
  currency: string
  status: PayoutStatus
  requested_at: string
  approved_at: string | null
  paid_at: string | null
  rejected_at: string | null
  rejection_reason: string | null
  failure_reason: string | null
  payout_provider: string | null
  provider_payout_id: string | null
}

interface PayoutsData {
  success: boolean
  availableBalance: number
  currency: string
  hasOpenRequest: boolean
  payouts: Payout[]
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS: Record<PayoutStatus, { label: string; bg: string; color: string; Icon: React.ElementType }> = {
  requested:  { label: 'Angefragt',     bg: '#FEF3C7', color: '#D97706', Icon: Clock         },
  approved:   { label: 'Genehmigt',     bg: '#D1FAE5', color: '#059669', Icon: CheckCircle   },
  processing: { label: 'In Bearbeitung',bg: '#DBEAFE', color: '#2563EB', Icon: Loader2       },
  paid:       { label: 'Ausgezahlt',    bg: '#D1FAE5', color: '#059669', Icon: CheckCircle   },
  rejected:   { label: 'Abgelehnt',     bg: '#FEE2E2', color: '#DC2626', Icon: XCircle       },
  failed:     { label: 'Fehlgeschlagen',bg: '#FEE2E2', color: '#DC2626', Icon: AlertCircle   },
}

function StatusBadge({ status }: { status: PayoutStatus }) {
  const cfg = STATUS[status] ?? STATUS.requested
  const Icon = cfg.Icon
  return (
    <span
      className="inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-full text-[11px] font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <Icon className="w-[10px] h-[10px]" />
      {cfg.label}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SellerPayoutsPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()

  const [data, setData]           = useState<PayoutsData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [amount, setAmount]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // ── Auth redirect ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/auth/login')
  }, [sessionStatus, router])

  // ── Load data ──────────────────────────────────────────────────────────────
  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const res = await fetch('/api/seller/payouts', { cache: 'no-store' })
      const json = await res.json()
      if (json.success) setData(json)
      else setError(json.error || 'Fehler beim Laden')
    } catch {
      setError('Netzwerkfehler')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { if (sessionStatus === 'authenticated') load() }, [sessionStatus, load])

  // ── Submit payout request ──────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(false)

    const num = parseFloat(amount)
    if (!Number.isFinite(num) || num < 10) {
      setSubmitError('Mindestbetrag: €10,00')
      return
    }
    if (data && num > data.availableBalance + 0.005) {
      setSubmitError(`Nicht genug Guthaben. Verfügbar: ${fmt(data.availableBalance, data.currency)}`)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/seller/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: num }),
      })
      const json = await res.json()
      if (json.success) {
        setSubmitSuccess(true)
        setAmount('')
        load(true)
      } else {
        setSubmitError(json.error || 'Fehler bei der Anfrage')
      }
    } catch {
      setSubmitError('Netzwerkfehler')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Utils ──────────────────────────────────────────────────────────────────
  function fmt(v: number, currency = 'EUR') {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(v)
  }
  function fmtDate(iso: string | null) {
    if (!iso) return '—'
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (sessionStatus === 'loading' || (loading && !data)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F5F5' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#D97706' }} />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F5F5' }}>
        <div className="text-center">
          <p className="text-[14px] mb-3" style={{ color: '#999' }}>{error}</p>
          <button
            onClick={() => load()}
            className="px-4 py-2 rounded-[6px] text-[13px] font-semibold"
            style={{ background: '#D97706', color: '#FFF' }}
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  const currency = data?.currency || 'EUR'
  const available = data?.availableBalance ?? 0
  const hasOpen   = data?.hasOpenRequest ?? false

  return (
    <div className="min-h-screen" style={{ background: '#F5F5F5' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="px-4 md:px-8 py-[20px]" style={{ background: '#FFFFFF', borderBottom: '1px solid #F0F0F0' }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-bold" style={{ color: '#1A1A1A' }}>Auszahlungen</h1>
            <p className="text-[12px] mt-[2px]" style={{ color: '#999' }}>
              Anfrage · Genehmigung · Überweisung
            </p>
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-[5px] px-[10px] py-[7px] rounded-[6px] text-[12px]"
            style={{ background: '#F5F5F5', color: '#555' }}
          >
            <RefreshCw className={`w-[13px] h-[13px] ${refreshing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-[24px] space-y-[20px]">

        {/* ── Balance card ───────────────────────────────────── */}
        <div
          className="rounded-[12px] p-[24px]"
          style={{ background: '#131921', color: '#FFFFFF' }}
        >
          <div className="flex items-center gap-[8px] mb-[6px]">
            <Wallet className="w-[16px] h-[16px]" style={{ color: '#D97706' }} />
            <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Verfügbares Guthaben
            </span>
          </div>
          <div className="text-[36px] font-bold tracking-tight">
            {fmt(available, currency)}
          </div>
          <p className="text-[11px] mt-[6px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Berechnet aus bestätigten Bestellungen abzüglich bereits angeforderter Auszahlungen
          </p>
        </div>

        {/* ── Request form ───────────────────────────────────── */}
        <div
          className="rounded-[12px] p-[24px]"
          style={{ background: '#FFFFFF', border: '1px solid #F0F0F0' }}
        >
          <h2 className="text-[15px] font-bold mb-[16px]" style={{ color: '#1A1A1A' }}>
            Neue Auszahlung beantragen
          </h2>

          {hasOpen ? (
            <div
              className="flex items-center gap-[8px] px-[12px] py-[10px] rounded-[8px] text-[13px]"
              style={{ background: '#FEF3C7', color: '#92400E' }}
            >
              <Clock className="w-[14px] h-[14px] flex-shrink-0" />
              Du hast bereits eine offene Auszahlungsanfrage. Bitte warte auf die Bearbeitung.
            </div>
          ) : available < 10 ? (
            <div
              className="flex items-center gap-[8px] px-[12px] py-[10px] rounded-[8px] text-[13px]"
              style={{ background: '#F5F5F5', color: '#888' }}
            >
              <AlertCircle className="w-[14px] h-[14px] flex-shrink-0" />
              Mindestbetrag für Auszahlungen: €10,00
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-[12px]">
              <div>
                <label className="block text-[12px] font-medium mb-[5px]" style={{ color: '#555' }}>
                  Betrag ({currency})
                </label>
                <div
                  className="flex items-stretch h-[44px] rounded-[8px] overflow-hidden"
                  style={{ border: '1px solid #E5E5E5' }}
                >
                  <span
                    className="flex items-center px-[12px] text-[14px] font-medium flex-shrink-0"
                    style={{ background: '#F8F8F8', color: '#888', borderRight: '1px solid #E5E5E5' }}
                  >
                    {currency === 'EUR' ? '€' : currency}
                  </span>
                  <input
                    type="number"
                    min="10"
                    max={available}
                    step="0.01"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setSubmitError(null); setSubmitSuccess(false) }}
                    placeholder={`max. ${available.toFixed(2)}`}
                    className="flex-1 h-full outline-none text-[14px] px-[12px]"
                    style={{ background: '#FFFFFF', color: '#1A1A1A' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setAmount(available.toFixed(2))}
                    className="flex items-center px-[10px] text-[11px] font-semibold flex-shrink-0"
                    style={{ background: '#F8F8F8', color: '#D97706', borderLeft: '1px solid #E5E5E5' }}
                  >
                    Max
                  </button>
                </div>
                <p className="text-[11px] mt-[4px]" style={{ color: '#AAA' }}>
                  Verfügbar: {fmt(available, currency)} · Minimum: €10,00
                </p>
              </div>

              {submitError && (
                <div
                  className="flex items-center gap-[6px] px-[10px] py-[8px] rounded-[6px] text-[12px]"
                  style={{ background: '#FEE2E2', color: '#DC2626' }}
                >
                  <AlertCircle className="w-[13px] h-[13px] flex-shrink-0" />
                  {submitError}
                </div>
              )}

              {submitSuccess && (
                <div
                  className="flex items-center gap-[6px] px-[10px] py-[8px] rounded-[6px] text-[12px]"
                  style={{ background: '#D1FAE5', color: '#059669' }}
                >
                  <CheckCircle className="w-[13px] h-[13px] flex-shrink-0" />
                  Auszahlungsanfrage erfolgreich gestellt!
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !amount}
                className="flex items-center gap-[6px] px-[16px] py-[10px] rounded-[8px] text-[13px] font-semibold disabled:opacity-50"
                style={{ background: '#D97706', color: '#FFF' }}
              >
                {submitting
                  ? <><Loader2 className="w-[14px] h-[14px] animate-spin" /> Wird gesendet…</>
                  : <><ArrowDownToLine className="w-[14px] h-[14px]" /> Auszahlung beantragen</>
                }
              </button>
            </form>
          )}
        </div>

        {/* ── History ────────────────────────────────────────── */}
        <div
          className="rounded-[12px] overflow-hidden"
          style={{ background: '#FFFFFF', border: '1px solid #F0F0F0' }}
        >
          <div className="px-[20px] py-[14px]" style={{ borderBottom: '1px solid #F5F5F5' }}>
            <h2 className="text-[15px] font-bold" style={{ color: '#1A1A1A' }}>Verlauf</h2>
          </div>

          {!data?.payouts.length ? (
            <div className="py-[40px] text-center">
              <Wallet className="w-[28px] h-[28px] mx-auto mb-[8px]" style={{ color: '#E0E0E0' }} />
              <p className="text-[13px]" style={{ color: '#BBB' }}>Noch keine Auszahlungen</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: '#F5F5F5' }}>
              {data.payouts.map((p) => (
                <div key={p.id} className="px-[20px] py-[14px] flex items-center gap-[12px]">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-[8px] mb-[3px]">
                      <span className="text-[14px] font-bold" style={{ color: '#1A1A1A' }}>
                        {fmt(p.amount, p.currency)}
                      </span>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="text-[11px]" style={{ color: '#AAA' }}>
                      Beantragt: {fmtDate(p.requested_at)}
                      {p.paid_at && <span className="ml-[10px]">Ausgezahlt: {fmtDate(p.paid_at)}</span>}
                      {p.provider_payout_id && (
                        <span className="ml-[10px] font-mono" style={{ color: '#BBB' }}>
                          {p.payout_provider && `${p.payout_provider}: `}{p.provider_payout_id}
                        </span>
                      )}
                    </div>
                    {(p.rejection_reason || p.failure_reason) && (
                      <p className="text-[11px] mt-[3px]" style={{ color: '#DC2626' }}>
                        {p.rejection_reason || p.failure_reason}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-[14px] h-[14px] flex-shrink-0" style={{ color: '#DDD' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Info box ───────────────────────────────────────── */}
        <div
          className="rounded-[10px] px-[16px] py-[12px] text-[11px] leading-relaxed"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}
        >
          <p className="font-semibold mb-[4px]">Wie funktioniert die Auszahlung?</p>
          <ul className="list-disc list-inside space-y-[2px]">
            <li>Anfragen werden vom Admin geprüft und genehmigt.</li>
            <li>Nach Genehmigung wird die Überweisung innerhalb von 1–3 Werktagen ausgeführt.</li>
            <li>Jede Auszahlung wird in unserem Buchungssystem erfasst.</li>
            <li>Du kannst immer nur eine offene Anfrage gleichzeitig haben.</li>
          </ul>
        </div>

      </div>
    </div>
  )
}
