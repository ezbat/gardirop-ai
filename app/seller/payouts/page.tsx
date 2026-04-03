'use client'

/**
 * /seller/payouts — Premium Seller Payout Management
 *
 * Section A: Balance overview strip (available / in review / total paid out / last payout)
 * Section B: Payout request form with full state handling
 * Section C: Full payout history table
 *
 * Data: GET/POST /api/seller/payouts
 * Auth: session guard + layout gate (no race condition)
 */

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  Wallet, Clock, CheckCircle2, XCircle, AlertCircle, Loader2,
  RefreshCw, ArrowDownToLine, ArrowUpRight, TrendingUp, Info,
  CalendarDays, Hash, Building2, Ban,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type PayoutStatus = 'requested' | 'approved' | 'processing' | 'paid' | 'rejected' | 'failed'

interface Payout {
  id: string
  amount: string | number
  currency: string
  status: PayoutStatus
  requested_at: string
  approved_at:  string | null
  processing_at: string | null
  paid_at:      string | null
  rejected_at:  string | null
  failed_at:    string | null
  failure_reason:   string | null
  rejection_reason: string | null
  payout_provider:    string | null
  provider_payout_id: string | null
}

interface Balance {
  available:      number
  pending:        number
  totalWithdrawn: number
  totalPaidOut:   number
  lastPaidAt:     string | null
}

interface PayoutsData {
  success:        boolean
  currency:       string
  balance:        Balance
  hasOpenRequest: boolean
  openRequest:    Payout | null
  payouts:        Payout[]
}

// ─── Status config ────────────────────────────────────────────────────────────

type StatusCfg = { label: string; icon: React.ElementType; cls: string }

const STATUS_CFG: Record<PayoutStatus, StatusCfg> = {
  requested:  { label: 'Angefragt',      icon: Clock,        cls: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-400/30' },
  approved:   { label: 'Genehmigt',      icon: CheckCircle2, cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-400/30' },
  processing: { label: 'In Bearbeitung', icon: Loader2,      cls: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-400/30 [&>svg]:animate-spin' },
  paid:       { label: 'Ausgezahlt',     icon: CheckCircle2, cls: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-400/30' },
  rejected:   { label: 'Abgelehnt',      icon: XCircle,      cls: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-400/30' },
  failed:     { label: 'Fehlgeschlagen', icon: AlertCircle,  cls: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-400/30' },
}

function StatusBadge({ status }: { status: PayoutStatus }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.requested
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number, currency = 'EUR') {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(v)
}

function fmtDate(iso: string | null, withTime = true) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(iso))
}

function fmtRelative(iso: string | null) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Heute'
  if (days === 1) return 'Gestern'
  if (days < 7)  return `vor ${days} Tagen`
  return fmtDate(iso, false)
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, accent = false,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-2xl p-5 border ${
      accent
        ? 'bg-primary text-primary-foreground border-primary'
        : 'glass border-border'
    }`}>
      <div className={`flex items-center gap-2 mb-2 text-sm font-medium ${
        accent ? 'opacity-80' : 'text-muted-foreground'
      }`}>
        <Icon className="w-4 h-4 shrink-0" />
        {label}
      </div>
      <div className={`text-2xl font-bold tracking-tight ${accent ? '' : ''}`}>
        {value}
      </div>
      {sub && (
        <div className={`text-xs mt-1 ${accent ? 'opacity-60' : 'text-muted-foreground'}`}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ─── Open request notice ──────────────────────────────────────────────────────

function OpenRequestNotice({ payout, currency }: { payout: Payout; currency: string }) {
  const cfg = STATUS_CFG[payout.status] ?? STATUS_CFG.requested
  const Icon = cfg.icon
  return (
    <div className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border text-sm ${cfg.cls}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold">
          Offene Anfrage: {fmt(parseFloat(payout.amount as string), currency)} — {cfg.label}
        </p>
        <p className="text-xs mt-0.5 opacity-80">
          Beantragt am {fmtDate(payout.requested_at)} · Du kannst erst eine neue Anfrage stellen, wenn diese abgeschlossen ist.
        </p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SellerPayoutsPage() {
  const { status: sessionStatus } = useSession()

  const [data, setData]               = useState<PayoutsData | null>(null)
  const [loading, setLoading]         = useState(true)
  const [loadError, setLoadError]     = useState<string | null>(null)
  const [refreshing, setRefreshing]   = useState(false)
  const [amount, setAmount]           = useState('')
  const [amountError, setAmountError] = useState<string | null>(null)
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true)
    else       setLoading(true)
    setLoadError(null)
    try {
      const res  = await fetch('/api/seller/payouts', { cache: 'no-store' })
      const json = await res.json()
      if (json.success) {
        setData(json)
      } else {
        setLoadError(json.error || 'Daten konnten nicht geladen werden.')
      }
    } catch {
      setLoadError('Netzwerkfehler. Bitte erneut versuchen.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === 'authenticated') load()
  }, [sessionStatus, load])

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAmountError(null)
    setSubmitError(null)
    setSubmitSuccess(false)

    const num = parseFloat(amount)
    if (!Number.isFinite(num) || num < 10) {
      setAmountError('Mindestbetrag: €10,00')
      return
    }
    const available = data?.balance.available ?? 0
    if (num > available + 0.005) {
      setAmountError(`Betrag überschreitet das verfügbare Guthaben (${fmt(available)})`)
      return
    }

    setSubmitting(true)
    try {
      const res  = await fetch('/api/seller/payouts', {
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
        setSubmitError(json.error || 'Anfrage fehlgeschlagen.')
      }
    } catch {
      setSubmitError('Netzwerkfehler.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Full page loading ────────────────────────────────────────────────────────

  if (sessionStatus === 'loading' || (loading && !data)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    )
  }

  if (loadError && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground mb-5">{loadError}</p>
          <button
            onClick={() => load()}
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" /> Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  const currency  = data?.currency ?? 'EUR'
  const balance   = data?.balance  ?? { available: 0, pending: 0, totalWithdrawn: 0, totalPaidOut: 0, lastPaidAt: null }
  const hasOpen   = data?.hasOpenRequest ?? false
  const payouts   = data?.payouts ?? []
  const canRequest = !hasOpen && balance.available >= 10

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      <div className="py-8 px-4">
        <div className="container mx-auto max-w-4xl space-y-6">

          {/* ═══════════════════════════════════════════════════
              HEADER
          ═══════════════════════════════════════════════════ */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-2xl font-bold flex items-center gap-2">
                <Wallet className="w-6 h-6 text-primary" />
                Auszahlungen
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Anfrage · Prüfung · Überweisung
              </p>
            </div>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 glass border border-border rounded-xl text-sm hover:border-primary/40 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Aktualisieren
            </button>
          </div>

          {/* ═══════════════════════════════════════════════════
              SECTION A — BALANCE OVERVIEW
          ═══════════════════════════════════════════════════ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              icon={Wallet}
              label="Verfügbar"
              value={fmt(balance.available, currency)}
              sub="Auszahlbar"
              accent
            />
            <KpiCard
              icon={Clock}
              label="In Prüfung"
              value={fmt(balance.pending, currency)}
              sub={hasOpen ? 'Offene Anfrage' : 'Kein offen'}
            />
            <KpiCard
              icon={TrendingUp}
              label="Total ausgezahlt"
              value={fmt(balance.totalPaidOut, currency)}
              sub={balance.totalWithdrawn > 0 ? `inkl. ${fmt(balance.totalWithdrawn)}` : undefined}
            />
            <KpiCard
              icon={CalendarDays}
              label="Letzte Auszahlung"
              value={balance.lastPaidAt ? fmtRelative(balance.lastPaidAt) : '—'}
              sub={balance.lastPaidAt ? fmtDate(balance.lastPaidAt, false) : 'Noch keine'}
            />
          </div>

          {/* ═══════════════════════════════════════════════════
              SECTION B — REQUEST FORM
          ═══════════════════════════════════════════════════ */}
          <div className="glass border border-border rounded-2xl p-6">
            <h2 className="text-base font-bold mb-5 flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4 text-primary" />
              Neue Auszahlung beantragen
            </h2>

            {/* Open request notice */}
            {hasOpen && data?.openRequest && (
              <OpenRequestNotice payout={data.openRequest} currency={currency} />
            )}

            {/* Below minimum */}
            {!hasOpen && balance.available < 10 && (
              <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-border bg-muted/30 text-sm text-muted-foreground">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">Mindestguthaben nicht erreicht</p>
                  <p className="text-xs mt-0.5">
                    Für eine Auszahlung sind mindestens €10,00 erforderlich. Aktuell verfügbar: {fmt(balance.available, currency)}.
                  </p>
                </div>
              </div>
            )}

            {/* Form */}
            {canRequest && (
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Amount input */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Betrag ({currency})
                  </label>
                  <div className={`flex items-stretch h-11 rounded-xl overflow-hidden border transition-colors ${
                    amountError ? 'border-destructive' : 'border-border focus-within:border-primary'
                  }`}>
                    <span className="flex items-center px-3.5 text-sm font-medium text-muted-foreground bg-muted/40 border-r border-border shrink-0">
                      €
                    </span>
                    <input
                      type="number"
                      min="10"
                      max={balance.available}
                      step="0.01"
                      value={amount}
                      onChange={e => {
                        setAmount(e.target.value)
                        setAmountError(null)
                        setSubmitError(null)
                        setSubmitSuccess(false)
                      }}
                      placeholder={`10,00 – ${balance.available.toFixed(2)}`}
                      className="flex-1 h-full outline-none text-sm px-3 bg-transparent"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setAmount(balance.available.toFixed(2))}
                      className="flex items-center px-3.5 text-xs font-bold text-primary bg-muted/40 border-l border-border hover:bg-primary/10 transition-colors shrink-0"
                    >
                      MAX
                    </button>
                  </div>

                  {/* Inline errors */}
                  {amountError ? (
                    <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {amountError}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Verfügbar: {fmt(balance.available, currency)} · Minimum: €10,00
                    </p>
                  )}
                </div>

                {/* Submit error */}
                {submitError && (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                    <XCircle className="w-4 h-4 shrink-0" />
                    {submitError}
                  </div>
                )}

                {/* Submit success */}
                {submitSuccess && (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-green-500/10 border border-green-400/20 text-sm text-green-700 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Auszahlungsanfrage erfolgreich gestellt!
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !amount}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Wird gesendet…</>
                  ) : (
                    <><ArrowDownToLine className="w-4 h-4" /> Auszahlung beantragen</>
                  )}
                </button>
              </form>
            )}

            {/* How it works microcopy */}
            <div className="mt-6 pt-5 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Wie funktioniert die Auszahlung?
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Anfragen werden vom Admin geprüft und genehmigt.</li>
                <li>Nach Genehmigung wird die Überweisung innerhalb von 1–3 Werktagen ausgeführt.</li>
                <li>Es kann immer nur eine offene Anfrage gleichzeitig bestehen.</li>
                <li>Alle Transaktionen werden im Buchungssystem erfasst.</li>
              </ul>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════
              SECTION C — PAYOUT HISTORY
          ═══════════════════════════════════════════════════ */}
          <div className="glass border border-border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-primary" />
                Auszahlungsverlauf
              </h2>
              <span className="text-xs text-muted-foreground font-medium">
                {payouts.length} Einträge
              </span>
            </div>

            {payouts.length === 0 ? (
              /* ── Empty state ── */
              <div className="py-16 text-center">
                <Wallet className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-semibold text-muted-foreground">Noch keine Auszahlungen</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Beantrage deine erste Auszahlung sobald genug Guthaben verfügbar ist.
                </p>
              </div>
            ) : (
              <>
                {/* ── Desktop table ── */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Betrag</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Beantragt</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Genehmigt</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ausgezahlt</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Referenz</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {payouts.map(p => (
                        <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                          {/* Amount */}
                          <td className="px-6 py-3.5">
                            <span className="font-bold text-base">
                              {fmt(parseFloat(p.amount as string), p.currency)}
                            </span>
                          </td>
                          {/* Status */}
                          <td className="px-4 py-3.5">
                            <div className="space-y-1">
                              <StatusBadge status={p.status} />
                              {(p.rejection_reason || p.failure_reason) && (
                                <p className="text-[11px] text-destructive flex items-center gap-1 mt-1">
                                  <Ban className="w-3 h-3 shrink-0" />
                                  {p.rejection_reason || p.failure_reason}
                                </p>
                              )}
                            </div>
                          </td>
                          {/* Requested at */}
                          <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                            {fmtDate(p.requested_at)}
                          </td>
                          {/* Approved at */}
                          <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                            {fmtDate(p.approved_at)}
                          </td>
                          {/* Paid at */}
                          <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                            {fmtDate(p.paid_at)}
                          </td>
                          {/* Reference */}
                          <td className="px-4 py-3.5">
                            {p.provider_payout_id ? (
                              <div className="text-[11px]">
                                {p.payout_provider && (
                                  <span className="flex items-center gap-1 text-muted-foreground mb-0.5">
                                    <Building2 className="w-3 h-3" />
                                    {p.payout_provider}
                                  </span>
                                )}
                                <span className="font-mono text-muted-foreground flex items-center gap-1">
                                  <Hash className="w-3 h-3" />
                                  {p.provider_payout_id}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/40">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ── Mobile list ── */}
                <div className="md:hidden divide-y divide-border">
                  {payouts.map(p => (
                    <div key={p.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="font-bold text-base">
                          {fmt(parseFloat(p.amount as string), p.currency)}
                        </span>
                        <StatusBadge status={p.status} />
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>Beantragt: {fmtDate(p.requested_at)}</p>
                        {p.approved_at && <p>Genehmigt: {fmtDate(p.approved_at)}</p>}
                        {p.paid_at     && <p>Ausgezahlt: {fmtDate(p.paid_at)}</p>}
                        {p.provider_payout_id && (
                          <p className="font-mono">{p.payout_provider && `${p.payout_provider}: `}{p.provider_payout_id}</p>
                        )}
                        {(p.rejection_reason || p.failure_reason) && (
                          <p className="text-destructive mt-1 flex items-center gap-1">
                            <Ban className="w-3 h-3 shrink-0" />
                            {p.rejection_reason || p.failure_reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Subtle footer note */}
          <p className="text-xs text-muted-foreground text-center pb-4">
            Alle Beträge in {currency} · Auszahlungen unterliegen der Prüfung durch den Plattformbetreiber
          </p>

        </div>
      </div>
    </div>
  )
}
