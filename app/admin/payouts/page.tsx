'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Wallet, Clock, CheckCircle, XCircle, AlertCircle,
  Loader2, RefreshCw, CheckSquare, Ban, CreditCard,
  ChevronDown, Search,
} from 'lucide-react'

/**
 * Design tokens:
 *   page bg   #0B0D14   surface  #111520   elevated  #1A1E2E
 *   border    #252A3C   subtle   #1E2235
 *   text-1    #F0F2F8   text-2   #8B92A8   text-3    #515A72
 */

// ─── Types ────────────────────────────────────────────────────────────────────

type PayoutStatus = 'requested' | 'approved' | 'processing' | 'paid' | 'rejected' | 'failed'

interface PayoutRow {
  id: string
  amount: number
  currency: string
  status: PayoutStatus
  requested_at: string
  approved_at: string | null
  processing_at: string | null
  paid_at: string | null
  rejected_at: string | null
  rejection_reason: string | null
  failure_reason: string | null
  payout_provider: string | null
  provider_payout_id: string | null
  approved_by: string | null
  paid_by: string | null
  ledger_tx_id: string | null
  seller: { id: string; shop_name: string; user_id: string } | null
}

interface AdminPayoutsData {
  success: boolean
  payouts: PayoutRow[]
  summary: Record<string, number>
}

// ─── Status config ────────────────────────────────────────────────────────────
// All backgrounds use rgba so they're readable on dark surfaces.

const STATUS_CFG: Record<PayoutStatus, { label: string; bg: string; color: string; Icon: React.ElementType }> = {
  requested:  { label: 'Angefragt',      bg: 'rgba(245,158,11,0.15)',  color: '#FCD34D', Icon: Clock       },
  approved:   { label: 'Genehmigt',      bg: 'rgba(99,102,241,0.15)', color: '#A5B4FC', Icon: CheckCircle },
  processing: { label: 'In Bearbeitung', bg: 'rgba(168,85,247,0.15)', color: '#C084FC', Icon: Loader2     },
  paid:       { label: 'Ausgezahlt',     bg: 'rgba(16,185,129,0.15)', color: '#6EE7B7', Icon: CheckCircle },
  rejected:   { label: 'Abgelehnt',      bg: 'rgba(239,68,68,0.15)',  color: '#FCA5A5', Icon: XCircle     },
  failed:     { label: 'Fehlgeschlagen', bg: 'rgba(239,68,68,0.15)',  color: '#FCA5A5', Icon: AlertCircle },
}

function StatusBadge({ status }: { status: PayoutStatus }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.requested
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

// ─── Reject modal ─────────────────────────────────────────────────────────────

function RejectModal({
  payout,
  onCancel,
  onConfirm,
}: {
  payout: PayoutRow
  onCancel: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const [busy, setBusy]     = useState(false)

  async function submit() {
    if (!reason.trim()) return
    setBusy(true)
    await onConfirm(reason.trim())
    setBusy(false)
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.65)' }}
        onClick={onCancel}
      />
      <div
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-[400px] max-w-[calc(100vw-32px)] rounded-[14px] p-[24px]"
        style={{ background: '#111520', border: '1px solid #252A3C', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
      >
        <h3 className="text-[16px] font-bold mb-[4px]" style={{ color: '#F0F2F8' }}>
          Auszahlung ablehnen
        </h3>
        <p className="text-[12px] mb-[16px]" style={{ color: '#515A72' }}>
          {payout.seller?.shop_name} · €{Number(payout.amount).toFixed(2)}
        </p>

        <label className="block text-[12px] font-medium mb-[5px]" style={{ color: '#8B92A8' }}>
          Grund (wird dem Seller angezeigt) *
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="z.B. Konto nicht verifiziert, Verdacht auf Betrug…"
          className="w-full rounded-[6px] p-[10px] text-[13px] outline-none resize-none
            focus:ring-2 focus:ring-red-500/40"
          style={{
            border: '1px solid #252A3C',
            background: '#1A1E2E',
            color: '#F0F2F8',
          }}
        />

        <div className="flex gap-[8px] mt-[14px]">
          <button
            onClick={onCancel}
            className="flex-1 py-[9px] rounded-[6px] text-[13px] font-medium
              hover:bg-[#252A3C] transition-colors"
            style={{ background: '#1A1E2E', color: '#8B92A8', border: '1px solid #252A3C' }}
          >
            Abbrechen
          </button>
          <button
            onClick={submit}
            disabled={busy || !reason.trim()}
            className="flex-1 py-[9px] rounded-[6px] text-[13px] font-semibold
              bg-red-700 hover:bg-red-600 active:bg-red-800 text-white
              disabled:opacity-40 transition-colors"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Ablehnen'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Mark Paid modal ──────────────────────────────────────────────────────────

function MarkPaidModal({
  payout,
  onCancel,
  onConfirm,
}: {
  payout: PayoutRow
  onCancel: () => void
  onConfirm: (providerPayoutId: string, payoutProvider: string) => void
}) {
  const [providerPayoutId, setProviderPayoutId] = useState('')
  const [payoutProvider, setPayoutProvider]     = useState('manual')
  const [busy, setBusy]                         = useState(false)

  async function submit() {
    setBusy(true)
    await onConfirm(providerPayoutId.trim(), payoutProvider)
    setBusy(false)
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.65)' }}
        onClick={onCancel}
      />
      <div
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-[420px] max-w-[calc(100vw-32px)] rounded-[14px] p-[24px]"
        style={{ background: '#111520', border: '1px solid #252A3C', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
      >
        <h3 className="text-[16px] font-bold mb-[4px]" style={{ color: '#F0F2F8' }}>
          Als ausgezahlt markieren
        </h3>
        <p className="text-[12px] mb-[16px]" style={{ color: '#515A72' }}>
          {payout.seller?.shop_name} · €{Number(payout.amount).toFixed(2)} · {payout.currency}
        </p>

        <div className="space-y-[10px]">
          <div>
            <label className="block text-[12px] font-medium mb-[5px]" style={{ color: '#8B92A8' }}>
              Zahlungsanbieter
            </label>
            <div
              className="relative flex items-center h-[38px] rounded-[6px]"
              style={{ border: '1px solid #252A3C', background: '#1A1E2E' }}
            >
              <select
                value={payoutProvider}
                onChange={(e) => setPayoutProvider(e.target.value)}
                className="w-full h-full px-[10px] text-[13px] outline-none appearance-none"
                style={{ background: 'transparent', color: '#F0F2F8' }}
              >
                <option value="manual">Manual / Banküberweisung</option>
                <option value="stripe">Stripe</option>
                <option value="wise">Wise</option>
                <option value="paypal">PayPal</option>
                <option value="sepa">SEPA</option>
              </select>
              <ChevronDown className="absolute right-[8px] w-[13px] h-[13px] pointer-events-none" style={{ color: '#515A72' }} />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium mb-[5px]" style={{ color: '#8B92A8' }}>
              Referenz-ID (optional)
            </label>
            <input
              type="text"
              value={providerPayoutId}
              onChange={(e) => setProviderPayoutId(e.target.value)}
              placeholder="z.B. Stripe Transfer ID, IBAN-Referenz…"
              className="w-full h-[38px] rounded-[6px] px-[10px] text-[13px] outline-none
                focus:ring-2 focus:ring-indigo-500/40"
              style={{ border: '1px solid #252A3C', background: '#1A1E2E', color: '#F0F2F8' }}
            />
          </div>
        </div>

        {/* Warning */}
        <div
          className="mt-[14px] px-[10px] py-[8px] rounded-[6px] text-[11px] leading-relaxed"
          style={{ background: 'rgba(245,158,11,0.12)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.25)' }}
        >
          ⚠️ Dies schreibt einen unwiderruflichen Buchungssatz in das Hauptbuch. Nur bestätigen, wenn die Überweisung erfolgt ist.
        </div>

        <div className="flex gap-[8px] mt-[14px]">
          <button
            onClick={onCancel}
            className="flex-1 py-[9px] rounded-[6px] text-[13px] font-medium
              hover:bg-[#252A3C] transition-colors"
            style={{ background: '#1A1E2E', color: '#8B92A8', border: '1px solid #252A3C' }}
          >
            Abbrechen
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="flex-1 py-[9px] rounded-[6px] text-[13px] font-semibold
              bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white
              disabled:opacity-40 transition-colors"
          >
            {busy
              ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              : 'Bestätigen & Buchen'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const FILTER_TABS: { key: string; label: string }[] = [
  { key: '',           label: 'Alle'           },
  { key: 'requested',  label: 'Angefragt'      },
  { key: 'approved',   label: 'Genehmigt'      },
  { key: 'processing', label: 'In Bearbeitung' },
  { key: 'paid',       label: 'Ausgezahlt'     },
  { key: 'rejected',   label: 'Abgelehnt'      },
]

export default function AdminPayoutsPage() {
  const [adminToken, setAdminToken] = useState('')
  const [authed, setAuthed]         = useState(false)
  const [authError, setAuthError]   = useState(false)

  const [data, setData]               = useState<AdminPayoutsData | null>(null)
  const [loading, setLoading]         = useState(false)
  const [refreshing, setRefreshing]   = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch]           = useState('')

  const [rejectTarget, setRejectTarget]     = useState<PayoutRow | null>(null)
  const [paidTarget, setPaidTarget]         = useState<PayoutRow | null>(null)
  const [actionError, setActionError]       = useState<string | null>(null)
  const [actionSuccess, setActionSuccess]   = useState<string | null>(null)

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    else setRefreshing(true)
    setActionError(null)
    setActionSuccess(null)

    const url = filterStatus
      ? `/api/admin/payouts?status=${filterStatus}`
      : '/api/admin/payouts'

    const res  = await fetch(url, { headers: { 'x-admin-token': adminToken }, cache: 'no-store' })
    const json = await res.json()

    if (res.status === 401)  { setAuthError(true); setAuthed(false) }
    else if (json.success)   { setData(json); setAuthError(false) }

    setLoading(false)
    setRefreshing(false)
  }, [adminToken, filterStatus])

  useEffect(() => { if (authed) load() }, [authed, filterStatus, load])

  // ── Auth ────────────────────────────────────────────────────────────────────
  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    if (!adminToken.trim()) return
    setAuthError(false)
    setLoading(true)
    const res  = await fetch('/api/admin/payouts', { headers: { 'x-admin-token': adminToken } })
    if (res.status === 401) { setAuthError(true); setLoading(false); return }
    const json = await res.json()
    if (json.success) { setData(json); setAuthed(true) }
    else { setAuthError(true) }
    setLoading(false)
  }

  // ── Action ──────────────────────────────────────────────────────────────────
  async function doAction(action: string, payoutId: string, extra: Record<string, string> = {}) {
    setActionError(null)
    const res  = await fetch('/api/admin/payouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ action, payoutId, ...extra }),
    })
    const json = await res.json()
    if (!json.success) { setActionError(json.error || 'Fehler') }
    else { setActionSuccess(`Aktion '${action}' erfolgreich ausgeführt`); load(true) }
    return json.success
  }

  // ── Utils ───────────────────────────────────────────────────────────────────
  function fmt(v: number, currency = 'EUR') {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(v)
  }
  function fmtDate(iso: string | null) {
    if (!iso) return '—'
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso))
  }

  // ── Auth gate ───────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B0D14' }}>
        <div
          className="w-[360px] rounded-[14px] p-[28px]"
          style={{ background: '#111520', border: '1px solid #252A3C', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
        >
          <div className="flex items-center gap-[8px] mb-[20px]">
            <Wallet className="w-[18px] h-[18px]" style={{ color: '#A5B4FC' }} />
            <h1 className="text-[16px] font-bold" style={{ color: '#F0F2F8' }}>Admin — Auszahlungen</h1>
          </div>
          <form onSubmit={handleAuth} className="space-y-[12px]">
            <div>
              <label className="block text-[12px] font-medium mb-[5px]" style={{ color: '#8B92A8' }}>
                Admin Token
              </label>
              <input
                type="password"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                placeholder="ADMIN_TOKEN"
                className="w-full h-[40px] rounded-[6px] px-[10px] text-[13px] outline-none
                  focus:ring-2 focus:ring-indigo-500/40"
                style={{
                  border: `1px solid ${authError ? '#EF4444' : '#252A3C'}`,
                  background: '#1A1E2E',
                  color: '#F0F2F8',
                }}
                autoFocus
              />
              {authError && (
                <p className="text-[11px] mt-[3px]" style={{ color: '#FCA5A5' }}>
                  Ungültiger Token
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-[10px] rounded-[6px] text-[13px] font-semibold
                bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white
                disabled:opacity-40 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Anmelden'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Main ────────────────────────────────────────────────────────────────────

  const rows = (data?.payouts ?? []).filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.seller?.shop_name?.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      String(p.amount).includes(q)
    )
  })

  const summary = data?.summary ?? {}

  return (
    <div className="min-h-screen" style={{ background: '#0B0D14' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        className="px-4 md:px-8 py-[18px]"
        style={{ background: '#111520', borderBottom: '1px solid #1E2235' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-[10px]">
          <div>
            <h1 className="text-[20px] font-bold" style={{ color: '#F0F2F8' }}>Auszahlungen</h1>
            <p className="text-[12px] mt-[2px]" style={{ color: '#515A72' }}>
              Genehmigen · Ablehnen · Buchen
            </p>
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-[5px] px-[10px] py-[7px] rounded-[6px] text-[12px]
              hover:bg-[#252A3C] transition-colors disabled:opacity-40"
            style={{ background: '#1A1E2E', color: '#8B92A8', border: '1px solid #252A3C' }}
          >
            <RefreshCw className={`w-[13px] h-[13px] ${refreshing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-[20px] space-y-[16px]">

        {/* ── Summary cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-[10px]">
          {FILTER_TABS.slice(1).map((t) => (
            <div
              key={t.key}
              className="rounded-[10px] px-[14px] py-[12px] cursor-pointer transition-colors"
              style={{
                background: '#111520',
                border: `1px solid ${filterStatus === t.key ? '#6366F1' : '#252A3C'}`,
              }}
              onClick={() => setFilterStatus(filterStatus === t.key ? '' : t.key)}
            >
              <div className="text-[20px] font-bold" style={{ color: '#F0F2F8' }}>
                {summary[t.key] ?? 0}
              </div>
              <div className="text-[11px]" style={{ color: '#515A72' }}>{t.label}</div>
            </div>
          ))}
        </div>

        {/* ── Feedback banners ──────────────────────────────────────────── */}
        {actionError && (
          <div
            className="flex items-center gap-[8px] px-[12px] py-[10px] rounded-[8px] text-[13px]"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            <AlertCircle className="w-[14px] h-[14px] flex-shrink-0" />
            {actionError}
          </div>
        )}
        {actionSuccess && (
          <div
            className="flex items-center gap-[8px] px-[12px] py-[10px] rounded-[8px] text-[13px]"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.25)' }}
          >
            <CheckCircle className="w-[14px] h-[14px] flex-shrink-0" />
            {actionSuccess}
          </div>
        )}

        {/* ── Filter tabs + search + table ──────────────────────────────── */}
        <div
          className="rounded-[12px] overflow-hidden"
          style={{ background: '#111520', border: '1px solid #252A3C' }}
        >
          {/* Filter tabs */}
          <div
            className="flex items-center gap-0 overflow-x-auto px-[4px]"
            style={{ borderBottom: '1px solid #1E2235' }}
          >
            {FILTER_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilterStatus(t.key)}
                className="px-[14px] py-[11px] text-[12px] font-medium whitespace-nowrap flex-shrink-0
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
                style={{
                  color: filterStatus === t.key ? '#A5B4FC' : '#515A72',
                  borderBottom: filterStatus === t.key ? '2px solid #6366F1' : '2px solid transparent',
                }}
              >
                {t.label}
                {t.key && summary[t.key] ? (
                  <span
                    className="ml-[4px] px-[5px] py-[1px] rounded-full text-[10px] font-bold"
                    style={{ background: 'rgba(99,102,241,0.2)', color: '#A5B4FC' }}
                  >
                    {summary[t.key]}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="px-[14px] py-[10px]" style={{ borderBottom: '1px solid #1E2235' }}>
            <div
              className="flex items-center gap-[6px] h-[34px] rounded-[6px] px-[10px]"
              style={{ border: '1px solid #252A3C', background: '#1A1E2E' }}
            >
              <Search className="w-[13px] h-[13px] flex-shrink-0" style={{ color: '#515A72' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Shop-Name, Betrag, ID…"
                className="flex-1 outline-none text-[12px]"
                style={{ color: '#F0F2F8', background: 'transparent' }}
              />
            </div>
          </div>

          {/* Table body */}
          {loading ? (
            <div className="py-[48px] flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#6366F1' }} />
            </div>
          ) : !rows.length ? (
            <div className="py-[48px] text-center">
              <p className="text-[13px]" style={{ color: '#515A72' }}>
                {search ? 'Keine Treffer für diese Suche' : 'Keine Auszahlungen'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#1A1E2E', borderBottom: '1px solid #252A3C' }}>
                    {['Shop', 'Betrag', 'Status', 'Beantragt', 'Ausgezahlt / Abgelehnt', 'Aktionen'].map((h) => (
                      <th
                        key={h}
                        className="px-[14px] py-[10px] text-left text-[11px] font-semibold uppercase tracking-wide"
                        style={{ color: '#515A72', whiteSpace: 'nowrap' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p, idx) => (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid #1E2235',
                        background: idx % 2 === 1 ? 'rgba(26,30,46,0.4)' : 'transparent',
                      }}
                    >
                      <td className="px-[14px] py-[12px]">
                        <div className="font-semibold" style={{ color: '#F0F2F8' }}>
                          {p.seller?.shop_name || '—'}
                        </div>
                        <div className="text-[10px] font-mono mt-[1px]" style={{ color: '#515A72' }}>
                          {p.id.slice(0, 8)}…
                        </div>
                      </td>
                      <td className="px-[14px] py-[12px]">
                        <span className="font-bold" style={{ color: '#F0F2F8' }}>
                          {fmt(p.amount, p.currency)}
                        </span>
                      </td>
                      <td className="px-[14px] py-[12px]">
                        <StatusBadge status={p.status} />
                        {p.rejection_reason && (
                          <div className="text-[10px] mt-[3px]" style={{ color: '#FCA5A5' }}>
                            {p.rejection_reason}
                          </div>
                        )}
                        {p.ledger_tx_id && (
                          <div className="text-[10px] mt-[2px] font-mono" style={{ color: '#515A72' }}>
                            L:{p.ledger_tx_id.slice(0, 8)}
                          </div>
                        )}
                      </td>
                      <td className="px-[14px] py-[12px]" style={{ color: '#8B92A8', whiteSpace: 'nowrap' }}>
                        {fmtDate(p.requested_at)}
                      </td>
                      <td className="px-[14px] py-[12px]" style={{ color: '#8B92A8', whiteSpace: 'nowrap' }}>
                        {p.paid_at ? fmtDate(p.paid_at) : p.rejected_at ? fmtDate(p.rejected_at) : '—'}
                        {p.payout_provider && (
                          <div className="text-[10px]" style={{ color: '#515A72' }}>
                            {p.payout_provider}{p.provider_payout_id ? ` · ${p.provider_payout_id}` : ''}
                          </div>
                        )}
                      </td>

                      {/* ── Action buttons ── CRITICAL FIX: solid bg + white text ── */}
                      <td className="px-[14px] py-[12px]">
                        <div className="flex items-center gap-[6px]">

                          {/* Approve — solid blue */}
                          {p.status === 'requested' && (
                            <button
                              onClick={() => doAction('approve', p.id)}
                              className="flex items-center gap-[3px] px-[8px] py-[5px] rounded-[5px]
                                text-[11px] font-semibold
                                bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white
                                transition-colors"
                              title="Genehmigen"
                            >
                              <CheckSquare className="w-[11px] h-[11px]" />
                              Genehmigen
                            </button>
                          )}

                          {/* Mark Paid — solid emerald */}
                          {(p.status === 'approved' || p.status === 'processing') && (
                            <button
                              onClick={() => setPaidTarget(p)}
                              className="flex items-center gap-[3px] px-[8px] py-[5px] rounded-[5px]
                                text-[11px] font-semibold
                                bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white
                                transition-colors"
                              title="Als ausgezahlt markieren"
                            >
                              <CreditCard className="w-[11px] h-[11px]" />
                              Buchen
                            </button>
                          )}

                          {/* Reject — solid red */}
                          {['requested', 'approved'].includes(p.status) && (
                            <button
                              onClick={() => setRejectTarget(p)}
                              className="flex items-center gap-[3px] px-[8px] py-[5px] rounded-[5px]
                                text-[11px] font-semibold
                                bg-red-700 hover:bg-red-600 active:bg-red-800 text-white
                                transition-colors"
                              title="Ablehnen"
                            >
                              <Ban className="w-[11px] h-[11px]" />
                              Ablehnen
                            </button>
                          )}

                          {/* Terminal states */}
                          {['paid', 'rejected', 'failed'].includes(p.status) && (
                            <span className="text-[11px]" style={{ color: '#515A72' }}>—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {rejectTarget && (
        <RejectModal
          payout={rejectTarget}
          onCancel={() => setRejectTarget(null)}
          onConfirm={async (reason) => {
            const ok = await doAction('reject', rejectTarget.id, { reason })
            if (ok) setRejectTarget(null)
          }}
        />
      )}
      {paidTarget && (
        <MarkPaidModal
          payout={paidTarget}
          onCancel={() => setPaidTarget(null)}
          onConfirm={async (providerPayoutId, payoutProvider) => {
            const ok = await doAction('mark_paid', paidTarget.id, { providerPayoutId, payoutProvider })
            if (ok) setPaidTarget(null)
          }}
        />
      )}

    </div>
  )
}
