'use client'

/**
 * Admin — Risk & Operations Dashboard
 *
 * Rule-based operational overview: failed payouts, pending payouts,
 * refunded orders, high-refund sellers, stuck orders, zero-product sellers.
 * Calls GET /api/admin/risk-ops (x-admin-token auth).
 *
 * Design tokens:
 *   BG #0B0D14  SURF #111520  ELEV #1A1E2E
 *   BDR #252A3C  T1 #F0F2F8  T2 #8B92A8  T3 #515A72  ACC #6366F1
 */

import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, AlertTriangle, Clock, DollarSign,
  Package, Users, TrendingDown, ShieldAlert,
  ChevronDown, ChevronUp, X, ExternalLink,
} from 'lucide-react'
import { AdminNotesPanel } from '@/components/admin/AdminNotesPanel'

// ─── Design tokens ──────────────────────────────────────────────────────────────
const BG   = '#0B0D14'
const SURF = '#111520'
const ELEV = '#1A1E2E'
const BDR  = '#2E3448'
const T1   = '#F0F2F8'
const T2   = '#9EA5BB'
const T3   = '#7B83A0'
const ACC  = '#6366F1'

// ─── Types ──────────────────────────────────────────────────────────────────────
interface KPIs {
  failedPayouts:      number
  pendingPayouts:     number
  refundedOrders:     number
  pendingModeration:  number
  stuckOrders:        number
  zeroProductSellers: number
  highRefundSellers:  number
}

interface FailedPayout {
  id: string
  seller_id: string
  amount: number
  currency: string
  status: string
  failure_reason: string | null
  rejection_reason: string | null
  failed_at: string | null
  rejected_at: string | null
  requested_at: string
  seller: { id: string; shop_name: string } | null
}

interface PendingPayout {
  id: string
  seller_id: string
  amount: number
  currency: string
  status: string
  requested_at: string
  seller: { id: string; shop_name: string } | null
}

interface RefundedOrder {
  id: string
  state: string
  total_amount: number
  refund_amount: number
  seller_id: string
  created_at: string
  seller: { id: string; shop_name: string } | null
}

interface HighRefundSeller {
  seller_id: string
  shop_name: string
  refund_count: number
  total_refund_amount: number
}

interface StuckOrder {
  id: string
  state: string
  total_amount: number
  created_at: string
  hours_stuck: number
}

interface ZeroProductSeller {
  id: string
  shop_name: string
  created_at: string
  days_since_approval: number
}

interface DashboardData {
  kpis:               KPIs
  failedPayouts:      FailedPayout[]
  pendingPayouts:     PendingPayout[]
  refundedOrders:     RefundedOrder[]
  highRefundSellers:  HighRefundSeller[]
  stuckOrders:        StuckOrder[]
  zeroProductSellers: ZeroProductSeller[]
}

type NoteTarget = { type: 'seller' | 'payout' | 'order'; id: string; label: string } | null

// ─── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n: number, currency = 'EUR') {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(n)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

// ─── Spinner ────────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{
      width: 32, height: 32,
      border: `3px solid ${BDR}`, borderTopColor: ACC,
      borderRadius: '50%', animation: 'rsk-spin 0.8s linear infinite',
    }} />
  )
}

// ─── Auth Gate ──────────────────────────────────────────────────────────────────
function AuthGate({ onAuth }: { onAuth: (tok: string) => void }) {
  const [tok, setTok] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tok.trim()) return
    setBusy(true); setErr('')
    try {
      const res = await fetch('/api/admin/risk-ops', {
        headers: { 'x-admin-token': tok.trim() },
      })
      if (res.status === 401) { setErr('Ungültiges Admin-Token'); setBusy(false); return }
      localStorage.setItem('adminToken', tok.trim())
      onAuth(tok.trim())
    } catch { setErr('Verbindungsfehler'); setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes rsk-spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ width: 420, background: SURF, border: `1px solid ${BDR}`, borderRadius: 16, padding: 40 }}>
        <p style={{ color: T1, fontSize: 18, fontWeight: 700, margin: '0 0 24px' }}>Admin — Risk & Operations</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password" value={tok} onChange={e => setTok(e.target.value)}
            placeholder="Admin-Token" autoFocus
            style={{
              width: '100%', background: ELEV, border: `1px solid ${err ? 'rgba(239,68,68,0.5)' : BDR}`,
              borderRadius: 8, padding: '11px 14px', color: T1, fontSize: 14, outline: 'none',
              boxSizing: 'border-box', marginBottom: err ? 8 : 16,
            }}
          />
          {err && <p style={{ color: '#FCA5A5', fontSize: 13, margin: '0 0 14px' }}>{err}</p>}
          <button
            type="submit" disabled={busy || !tok.trim()}
            style={{
              width: '100%', background: ACC, color: '#fff', border: 'none',
              borderRadius: 8, padding: '11px 0', fontSize: 14, fontWeight: 600,
              cursor: busy || !tok.trim() ? 'not-allowed' : 'pointer', opacity: busy || !tok.trim() ? 0.65 : 1,
            }}
          >
            {busy ? 'Prüfen…' : 'Zugang'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── KPI Card ───────────────────────────────────────────────────────────────────
function KPICard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div style={{
      background: SURF, border: `1px solid ${BDR}`, borderRadius: 12,
      padding: '18px 20px', flex: '1 1 0', minWidth: 150,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: `${color}15`,
        }}>
          {icon}
        </div>
        <span style={{ fontSize: 11, color: T3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
      </div>
      <p style={{ fontSize: 26, fontWeight: 700, color: value > 0 ? color : T2, margin: 0 }}>
        {value}
      </p>
    </div>
  )
}

// ─── Collapsible Section ────────────────────────────────────────────────────────
function Section({ title, icon, count, children }: {
  title: string; icon: React.ReactNode; count: number; children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 12, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {icon}
          <span style={{ fontSize: 14, fontWeight: 700, color: T1 }}>{title}</span>
          {count > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: ACC,
              background: 'rgba(99,102,241,0.15)', borderRadius: 10,
              padding: '2px 8px',
            }}>
              {count}
            </span>
          )}
        </div>
        {open
          ? <ChevronUp   style={{ width: 16, height: 16, color: T3 }} />
          : <ChevronDown style={{ width: 16, height: 16, color: T3 }} />
        }
      </button>
      {open && <div style={{ borderTop: `1px solid ${BDR}` }}>{children}</div>}
    </div>
  )
}

// ─── Table header cell ──────────────────────────────────────────────────────────
function TH({ children, width }: { children: React.ReactNode; width?: number | string }) {
  return (
    <th style={{
      fontSize: 10, fontWeight: 700, color: T3, textTransform: 'uppercase',
      letterSpacing: '0.06em', padding: '10px 12px', textAlign: 'left',
      whiteSpace: 'nowrap', width,
    }}>
      {children}
    </th>
  )
}

function TD({ children, mono, warn }: { children: React.ReactNode; mono?: boolean; warn?: boolean }) {
  return (
    <td style={{
      padding: '10px 12px', fontSize: 13,
      color: warn ? '#FCA5A5' : T1,
      fontFamily: mono ? 'monospace' : 'inherit',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </td>
  )
}

// ─── Notes Slide-over ───────────────────────────────────────────────────────────
function NotesDrawer({ target, adminToken, onClose }: { target: NoteTarget; adminToken: string; onClose: () => void }) {
  if (!target) return null
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 400, background: SURF, zIndex: 50,
        display: 'flex', flexDirection: 'column',
        borderLeft: `1px solid ${BDR}`,
        boxShadow: '-6px 0 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `1px solid ${BDR}`, flexShrink: 0,
        }}>
          <div>
            <p style={{ color: T1, fontSize: 14, fontWeight: 700, margin: 0 }}>Notizen — {target.label}</p>
            <p style={{ color: T3, fontSize: 11, margin: '2px 0 0', fontFamily: 'monospace' }}>{target.id}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T3 }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <AdminNotesPanel resourceType={target.type} resourceId={target.id} adminToken={adminToken} />
        </div>
      </div>
    </>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function RiskOpsPage() {
  const [token,   setToken]   = useState('')
  const [authed,  setAuthed]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [data,    setData]    = useState<DashboardData | null>(null)
  const [noteTarget, setNoteTarget] = useState<NoteTarget>(null)

  // On mount: try cached token
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('adminToken') ?? '' : ''
    if (saved) { setToken(saved); setAuthed(true) }
  }, [])

  const load = useCallback(async (tok: string) => {
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/admin/risk-ops', { headers: { 'x-admin-token': tok } })
      if (res.status === 401) { setAuthed(false); return }
      const json = await res.json()
      if (!json.success) { setError(json.error ?? 'Fehler'); setLoading(false); return }
      setData(json as DashboardData)
    } catch { setError('Netzwerkfehler') }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (authed && token) load(token)
  }, [authed, token, load])

  const handleAuth = (tok: string) => { setToken(tok); setAuthed(true) }

  if (!authed) return <AuthGate onAuth={handleAuth} />

  const kpis = data?.kpis

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '32px 40px' }}>
      <style>{`@keyframes rsk-spin { to { transform: rotate(360deg) } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ color: T1, fontSize: 22, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.4px' }}>
            Risk & Operations
          </h1>
          <p style={{ color: T3, fontSize: 13, margin: 0 }}>
            Operative Übersicht — regelbasierte Erkennung, keine Scores
          </p>
        </div>
        <button
          onClick={() => load(token)}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: SURF, border: `1px solid ${BDR}`, borderRadius: 8,
            padding: '9px 14px', color: T2, fontSize: 13, cursor: 'pointer',
          }}
        >
          <RefreshCw style={{ width: 13, height: 13, animation: loading ? 'rsk-spin 0.8s linear infinite' : 'none' }} />
          Aktualisieren
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 10, padding: '10px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AlertTriangle style={{ width: 15, height: 15, color: '#FCA5A5' }} />
          <p style={{ color: '#FCA5A5', fontSize: 13, margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Spinner />
        </div>
      )}

      {/* Dashboard */}
      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── KPI Strip ── */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <KPICard
              icon={<AlertTriangle style={{ width: 16, height: 16, color: '#EF4444' }} />}
              label="Fehlgesch. Auszahlungen"
              value={kpis!.failedPayouts}
              color="#EF4444"
            />
            <KPICard
              icon={<Clock style={{ width: 16, height: 16, color: '#F59E0B' }} />}
              label="Ausst. Auszahlungen"
              value={kpis!.pendingPayouts}
              color="#F59E0B"
            />
            <KPICard
              icon={<DollarSign style={{ width: 16, height: 16, color: '#F97316' }} />}
              label="Erstattete Bestellungen"
              value={kpis!.refundedOrders}
              color="#F97316"
            />
            <KPICard
              icon={<Package style={{ width: 16, height: 16, color: '#8B5CF6' }} />}
              label="Ausst. Moderation"
              value={kpis!.pendingModeration}
              color="#8B5CF6"
            />
            <KPICard
              icon={<ShieldAlert style={{ width: 16, height: 16, color: '#EC4899' }} />}
              label="Hängende Bestellungen"
              value={kpis!.stuckOrders}
              color="#EC4899"
            />
            <KPICard
              icon={<Users style={{ width: 16, height: 16, color: '#6366F1' }} />}
              label="Inaktive Verkäufer"
              value={kpis!.zeroProductSellers}
              color="#6366F1"
            />
            <KPICard
              icon={<TrendingDown style={{ width: 16, height: 16, color: '#DC2626' }} />}
              label="Risikoverkäufer"
              value={kpis!.highRefundSellers}
              color="#DC2626"
            />
          </div>

          {/* ── Section 1: Fehlgeschlagene Auszahlungen ── */}
          <Section
            title="Fehlgeschlagene Auszahlungen"
            icon={<AlertTriangle style={{ width: 15, height: 15, color: '#EF4444' }} />}
            count={data.failedPayouts.length}
          >
            {data.failedPayouts.length === 0 ? (
              <p style={{ color: T3, fontSize: 13, padding: '24px 20px', textAlign: 'center' }}>
                Keine fehlgeschlagenen Auszahlungen
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: `1px solid ${BDR}` }}>
                    <TH>Verkäufer</TH>
                    <TH>Betrag</TH>
                    <TH>Status</TH>
                    <TH>Grund</TH>
                    <TH>Zeitpunkt</TH>
                    <TH width={60}>Notizen</TH>
                  </tr></thead>
                  <tbody>
                    {data.failedPayouts.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: i < data.failedPayouts.length - 1 ? `1px solid ${BDR}` : 'none' }}>
                        <TD>
                          <span style={{ color: T1, fontWeight: 600 }}>{p.seller?.shop_name ?? '—'}</span>
                        </TD>
                        <TD mono>{fmt(p.amount, p.currency)}</TD>
                        <TD warn={p.status === 'failed'}>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                            background: p.status === 'failed' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                            color: p.status === 'failed' ? '#FCA5A5' : '#FCD34D',
                          }}>
                            {p.status}
                          </span>
                        </TD>
                        <TD>
                          <span style={{ color: T2, fontSize: 12 }}>
                            {p.failure_reason || p.rejection_reason || '—'}
                          </span>
                        </TD>
                        <TD>{fmtDate(p.failed_at || p.rejected_at || p.requested_at)}</TD>
                        <TD>
                          <button
                            onClick={() => setNoteTarget({ type: 'payout', id: p.id, label: `Auszahlung · ${p.seller?.shop_name ?? p.id.slice(0,8)}` })}
                            style={{
                              background: ELEV, border: `1px solid ${BDR}`, borderRadius: 6,
                              padding: '4px 8px', cursor: 'pointer', color: ACC, fontSize: 11, fontWeight: 600,
                            }}
                          >
                            Notiz
                          </button>
                        </TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* ── Section 2: Ausstehende Auszahlungen ── */}
          <Section
            title="Ausstehende Auszahlungen"
            icon={<Clock style={{ width: 15, height: 15, color: '#F59E0B' }} />}
            count={data.pendingPayouts.length}
          >
            {data.pendingPayouts.length === 0 ? (
              <p style={{ color: T3, fontSize: 13, padding: '24px 20px', textAlign: 'center' }}>
                Keine ausstehenden Auszahlungen
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: `1px solid ${BDR}` }}>
                    <TH>Verkäufer</TH>
                    <TH>Betrag</TH>
                    <TH>Status</TH>
                    <TH>Angefordert</TH>
                    <TH>Wartezeit</TH>
                    <TH width={60}>Notizen</TH>
                  </tr></thead>
                  <tbody>
                    {data.pendingPayouts.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: i < data.pendingPayouts.length - 1 ? `1px solid ${BDR}` : 'none' }}>
                        <TD>
                          <span style={{ color: T1, fontWeight: 600 }}>{p.seller?.shop_name ?? '—'}</span>
                        </TD>
                        <TD mono>{fmt(p.amount, p.currency)}</TD>
                        <TD>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                            background: 'rgba(245,158,11,0.12)', color: '#FCD34D',
                          }}>
                            {p.status}
                          </span>
                        </TD>
                        <TD>{fmtDate(p.requested_at)}</TD>
                        <TD>
                          <span style={{ color: daysSince(p.requested_at) > 3 ? '#FCA5A5' : T2 }}>
                            {daysSince(p.requested_at)} Tage
                          </span>
                        </TD>
                        <TD>
                          <button
                            onClick={() => setNoteTarget({ type: 'payout', id: p.id, label: `Auszahlung · ${p.seller?.shop_name ?? p.id.slice(0,8)}` })}
                            style={{
                              background: ELEV, border: `1px solid ${BDR}`, borderRadius: 6,
                              padding: '4px 8px', cursor: 'pointer', color: ACC, fontSize: 11, fontWeight: 600,
                            }}
                          >
                            Notiz
                          </button>
                        </TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* ── Section 3: Erstattete Bestellungen ── */}
          <Section
            title="Erstattete Bestellungen"
            icon={<DollarSign style={{ width: 15, height: 15, color: '#F97316' }} />}
            count={data.refundedOrders.length}
          >
            {data.refundedOrders.length === 0 ? (
              <p style={{ color: T3, fontSize: 13, padding: '24px 20px', textAlign: 'center' }}>
                Keine erstatteten Bestellungen
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: `1px solid ${BDR}` }}>
                    <TH>Bestell-ID</TH>
                    <TH>Status</TH>
                    <TH>Gesamt</TH>
                    <TH>Erstattung</TH>
                    <TH>Verkäufer</TH>
                    <TH>Alter</TH>
                    <TH width={60}>Notizen</TH>
                  </tr></thead>
                  <tbody>
                    {data.refundedOrders.map((o, i) => (
                      <tr key={o.id} style={{ borderBottom: i < data.refundedOrders.length - 1 ? `1px solid ${BDR}` : 'none' }}>
                        <TD mono>
                          <span style={{ fontSize: 12 }}>{o.id.slice(0, 8)}…</span>
                        </TD>
                        <TD>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                            background: 'rgba(239,68,68,0.12)', color: '#FCA5A5',
                          }}>
                            {o.state}
                          </span>
                        </TD>
                        <TD mono>{fmt(o.total_amount)}</TD>
                        <TD mono warn>{fmt(o.refund_amount ?? 0)}</TD>
                        <TD>
                          <span style={{ color: T1, fontWeight: 600 }}>{o.seller?.shop_name ?? '—'}</span>
                        </TD>
                        <TD>{daysSince(o.created_at)} Tage</TD>
                        <TD>
                          <button
                            onClick={() => setNoteTarget({ type: 'order', id: o.id, label: `Bestellung · ${o.id.slice(0,8)}` })}
                            style={{
                              background: ELEV, border: `1px solid ${BDR}`, borderRadius: 6,
                              padding: '4px 8px', cursor: 'pointer', color: ACC, fontSize: 11, fontWeight: 600,
                            }}
                          >
                            Notiz
                          </button>
                        </TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* ── Section 4: Risikoverkäufer mit hoher Stornoquote ── */}
          <Section
            title="Risikoverkäufer — hohe Stornoquote"
            icon={<TrendingDown style={{ width: 15, height: 15, color: '#DC2626' }} />}
            count={data.highRefundSellers.length}
          >
            {data.highRefundSellers.length === 0 ? (
              <p style={{ color: T3, fontSize: 13, padding: '24px 20px', textAlign: 'center' }}>
                Keine Risikoverkäufer (≥2 Erstattungen)
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: `1px solid ${BDR}` }}>
                    <TH>Verkäufer</TH>
                    <TH>Erstattungen</TH>
                    <TH>Erstattungssumme</TH>
                    <TH width={80}>Aktionen</TH>
                  </tr></thead>
                  <tbody>
                    {data.highRefundSellers.map((s, i) => (
                      <tr key={s.seller_id} style={{ borderBottom: i < data.highRefundSellers.length - 1 ? `1px solid ${BDR}` : 'none' }}>
                        <TD>
                          <span style={{ color: T1, fontWeight: 600 }}>{s.shop_name}</span>
                        </TD>
                        <TD warn>
                          <span style={{ fontWeight: 700 }}>{s.refund_count}</span>
                        </TD>
                        <TD mono warn>{fmt(s.total_refund_amount)}</TD>
                        <TD>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <a
                              href={`/admin/seller-applications?search=${encodeURIComponent(s.shop_name)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                background: ELEV, border: `1px solid ${BDR}`, borderRadius: 6,
                                padding: '4px 6px', color: T2, display: 'flex', alignItems: 'center',
                              }}
                            >
                              <ExternalLink style={{ width: 12, height: 12 }} />
                            </a>
                            <button
                              onClick={() => setNoteTarget({ type: 'seller', id: s.seller_id, label: `Verkäufer · ${s.shop_name}` })}
                              style={{
                                background: ELEV, border: `1px solid ${BDR}`, borderRadius: 6,
                                padding: '4px 8px', cursor: 'pointer', color: ACC, fontSize: 11, fontWeight: 600,
                              }}
                            >
                              Notiz
                            </button>
                          </div>
                        </TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* ── Section 5: Hängende Bestellungen ── */}
          <Section
            title="Hängende Bestellungen"
            icon={<ShieldAlert style={{ width: 15, height: 15, color: '#EC4899' }} />}
            count={data.stuckOrders.length}
          >
            {data.stuckOrders.length === 0 ? (
              <p style={{ color: T3, fontSize: 13, padding: '24px 20px', textAlign: 'center' }}>
                Keine hängenden Bestellungen (&gt;24h)
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: `1px solid ${BDR}` }}>
                    <TH>Bestell-ID</TH>
                    <TH>Status</TH>
                    <TH>Betrag</TH>
                    <TH>Erstellt</TH>
                    <TH>Hängt seit</TH>
                    <TH width={60}>Notizen</TH>
                  </tr></thead>
                  <tbody>
                    {data.stuckOrders.map((o, i) => (
                      <tr key={o.id} style={{ borderBottom: i < data.stuckOrders.length - 1 ? `1px solid ${BDR}` : 'none' }}>
                        <TD mono>
                          <span style={{ fontSize: 12 }}>{o.id.slice(0, 8)}…</span>
                        </TD>
                        <TD>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                            background: 'rgba(236,72,153,0.12)', color: '#F9A8D4',
                          }}>
                            {o.state}
                          </span>
                        </TD>
                        <TD mono>{fmt(o.total_amount)}</TD>
                        <TD>{fmtDate(o.created_at)}</TD>
                        <TD warn>
                          <span style={{ fontWeight: 700 }}>{o.hours_stuck}h</span>
                        </TD>
                        <TD>
                          <button
                            onClick={() => setNoteTarget({ type: 'order', id: o.id, label: `Bestellung · ${o.id.slice(0,8)}` })}
                            style={{
                              background: ELEV, border: `1px solid ${BDR}`, borderRadius: 6,
                              padding: '4px 8px', cursor: 'pointer', color: ACC, fontSize: 11, fontWeight: 600,
                            }}
                          >
                            Notiz
                          </button>
                        </TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* ── Section 6: Inaktive Verkäufer ── */}
          <Section
            title="Inaktive Verkäufer — keine genehmigten Produkte"
            icon={<Users style={{ width: 15, height: 15, color: '#6366F1' }} />}
            count={data.zeroProductSellers.length}
          >
            {data.zeroProductSellers.length === 0 ? (
              <p style={{ color: T3, fontSize: 13, padding: '24px 20px', textAlign: 'center' }}>
                Keine inaktiven Verkäufer (aktiv &gt;7 Tage, 0 genehmigte Produkte)
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: `1px solid ${BDR}` }}>
                    <TH>Verkäufer</TH>
                    <TH>Registriert</TH>
                    <TH>Tage seit Genehmigung</TH>
                    <TH width={80}>Aktionen</TH>
                  </tr></thead>
                  <tbody>
                    {data.zeroProductSellers.map((s, i) => (
                      <tr key={s.id} style={{ borderBottom: i < data.zeroProductSellers.length - 1 ? `1px solid ${BDR}` : 'none' }}>
                        <TD>
                          <span style={{ color: T1, fontWeight: 600 }}>{s.shop_name}</span>
                        </TD>
                        <TD>{fmtDate(s.created_at)}</TD>
                        <TD warn={s.days_since_approval > 14}>
                          <span style={{ fontWeight: 600 }}>{s.days_since_approval} Tage</span>
                        </TD>
                        <TD>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <a
                              href={`/admin/seller-applications?search=${encodeURIComponent(s.shop_name)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                background: ELEV, border: `1px solid ${BDR}`, borderRadius: 6,
                                padding: '4px 6px', color: T2, display: 'flex', alignItems: 'center',
                              }}
                            >
                              <ExternalLink style={{ width: 12, height: 12 }} />
                            </a>
                            <button
                              onClick={() => setNoteTarget({ type: 'seller', id: s.id, label: `Verkäufer · ${s.shop_name}` })}
                              style={{
                                background: ELEV, border: `1px solid ${BDR}`, borderRadius: 6,
                                padding: '4px 8px', cursor: 'pointer', color: ACC, fontSize: 11, fontWeight: 600,
                              }}
                            >
                              Notiz
                            </button>
                          </div>
                        </TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* Notes Drawer */}
      <NotesDrawer target={noteTarget} adminToken={token} onClose={() => setNoteTarget(null)} />
    </div>
  )
}
