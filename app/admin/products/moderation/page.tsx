'use client'

/**
 * Admin — Produktmoderation
 *
 * Full moderation panel: pending / approved / rejected / needs_changes tabs,
 * search, paginated table, detail drawer with images, seller info, actions,
 * rejection reason input, and internal admin notes.
 *
 * Design tokens:
 *   BG #0B0D14  SURF #111520  ELEV #1A1E2E
 *   BDR #252A3C  T1 #F0F2F8  T2 #8B92A8  T3 #515A72  ACC #6366F1
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Search, RefreshCw, X, Check, AlertCircle, Loader2,
  ChevronLeft, ChevronRight, Package, ExternalLink,
  AlertTriangle, Clock, CheckCircle, XCircle, Edit3,
  Image as ImageIcon,
} from 'lucide-react'
import { AdminNotesPanel } from '@/components/admin/AdminNotesPanel'

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG   = '#0B0D14'
const SURF = '#111520'
const ELEV = '#1A1E2E'
const BDR  = '#2E3448'
const T1   = '#F0F2F8'
const T2   = '#9EA5BB'
const T3   = '#7B83A0'
const ACC  = '#6366F1'

// ─── Types ────────────────────────────────────────────────────────────────────
type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'needs_changes' | 'all'

interface Product {
  id:                string
  title:             string
  description:       string | null
  price:             number
  images:            string[] | null
  stock_quantity:    number
  moderation_status: string
  moderation_notes:  string | null
  moderated_at:      string | null
  category:          string | null
  brand:             string | null
  created_at:        string
  seller_id:         string
  seller:            { id: string; shop_name: string; shop_slug: string } | null
}

interface Counts {
  pending:       number
  rejected:      number
  needs_changes: number
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  pending:       { label: 'Ausstehend',  bg: 'rgba(245,158,11,0.12)', text: '#FCD34D',  icon: <Clock        style={{ width: 11, height: 11 }} /> },
  approved:      { label: 'Genehmigt',   bg: 'rgba(16,185,129,0.12)', text: '#6EE7B7',  icon: <CheckCircle  style={{ width: 11, height: 11 }} /> },
  rejected:      { label: 'Abgelehnt',   bg: 'rgba(239,68,68,0.12)',  text: '#FCA5A5',  icon: <XCircle      style={{ width: 11, height: 11 }} /> },
  needs_changes: { label: 'Änderungen',  bg: 'rgba(99,102,241,0.12)', text: '#A5B4FC',  icon: <Edit3        style={{ width: 11, height: 11 }} /> },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, bg: 'rgba(107,114,128,0.12)', text: '#9CA3AF', icon: null }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 20,
      background: cfg.bg, color: cfg.text,
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {cfg.icon}{cfg.label}
    </span>
  )
}

function Spinner() {
  return (
    <div style={{
      width: 32, height: 32,
      border: `3px solid ${BDR}`, borderTopColor: ACC,
      borderRadius: '50%', animation: 'adm-spin 0.8s linear infinite',
    }} />
  )
}

// ─── Auth Gate ────────────────────────────────────────────────────────────────
function AuthGate({ onAuth }: { onAuth: (tok: string) => void }) {
  const [tok,  setTok]  = useState('')
  const [err,  setErr]  = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tok.trim()) return
    setBusy(true); setErr('')
    try {
      const res = await fetch('/api/admin/products/moderation?status=pending&limit=1', {
        headers: { 'x-admin-token': tok.trim() },
      })
      if (res.status === 401) { setErr('Ungültiges Admin-Token'); setBusy(false); return }
      localStorage.setItem('adminToken', tok.trim())
      onAuth(tok.trim())
    } catch { setErr('Verbindungsfehler'); setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes adm-spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ width: 420, background: SURF, border: `1px solid ${BDR}`, borderRadius: 16, padding: 40 }}>
        <p style={{ color: T1, fontSize: 18, fontWeight: 700, margin: '0 0 24px' }}>Admin — Produktmoderation</p>
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

// ─── Detail Drawer ────────────────────────────────────────────────────────────
interface DrawerProps {
  product:    Product
  adminToken: string
  onClose:    () => void
  onAction:   (action: 'approve' | 'reject' | 'needs_changes', reason: string) => Promise<void>
  acting:     boolean
}

function ProductDrawer({ product, adminToken, onClose, onAction, acting }: DrawerProps) {
  const [action,  setAction]  = useState<'approve' | 'reject' | 'needs_changes' | null>(null)
  const [reason,  setReason]  = useState('')
  const [imgIdx,  setImgIdx]  = useState(0)
  const [err,     setErr]     = useState('')

  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : []

  const handleConfirm = async () => {
    if (!action) return
    if (action !== 'approve' && !reason.trim()) { setErr('Bitte Grund angeben'); return }
    setErr('')
    await onAction(action, reason.trim())
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40 }}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 480, background: SURF, zIndex: 50,
        display: 'flex', flexDirection: 'column',
        borderLeft: `1px solid ${BDR}`,
        boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
      }}>
        {/* Drawer header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `1px solid ${BDR}`, flexShrink: 0,
        }}>
          <div>
            <p style={{ color: T1, fontSize: 14, fontWeight: 700, margin: 0 }}>Produktdetails</p>
            <p style={{ color: T3, fontSize: 11, margin: '2px 0 0', fontFamily: 'monospace' }}>{product.id}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T3 }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* Image gallery */}
          {images.length > 0 ? (
            <div style={{ marginBottom: 20 }}>
              <div style={{
                width: '100%', height: 220, borderRadius: 10, overflow: 'hidden',
                background: ELEV, position: 'relative', border: `1px solid ${BDR}`,
              }}>
                <img
                  src={images[imgIdx]}
                  alt={product.title}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                {images.length > 1 && (
                  <div style={{
                    position: 'absolute', bottom: 8, left: 0, right: 0,
                    display: 'flex', justifyContent: 'center', gap: 6,
                  }}>
                    {images.map((_, i) => (
                      <button
                        key={i} onClick={() => setImgIdx(i)}
                        style={{
                          width: 8, height: 8, borderRadius: '50%', border: 'none',
                          cursor: 'pointer',
                          background: i === imgIdx ? '#fff' : 'rgba(255,255,255,0.3)',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {images.map((img, i) => (
                    <div
                      key={i} onClick={() => setImgIdx(i)}
                      style={{
                        width: 52, height: 52, borderRadius: 6, overflow: 'hidden',
                        border: `2px solid ${i === imgIdx ? ACC : BDR}`, cursor: 'pointer',
                      }}
                    >
                      <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              width: '100%', height: 120, borderRadius: 10, background: ELEV,
              border: `1px solid ${BDR}`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', marginBottom: 20,
            }}>
              <ImageIcon style={{ width: 28, height: 28, color: T3 }} />
            </div>
          )}

          {/* Title + status */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
            <h2 style={{ color: T1, fontSize: 16, fontWeight: 700, margin: 0, flex: 1, lineHeight: 1.4 }}>
              {product.title}
            </h2>
            <StatusBadge status={product.moderation_status} />
          </div>

          {/* Metadata grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px',
            background: ELEV, borderRadius: 10, padding: '14px 16px',
            border: `1px solid ${BDR}`, marginBottom: 16,
          }}>
            {[
              ['Preis',       `€${Number(product.price ?? 0).toFixed(2)}`],
              ['Bestand',     String(product.stock_quantity ?? 0)],
              ['Kategorie',   product.category ?? '—'],
              ['Marke',       product.brand    ?? '—'],
              ['Verkäufer',   product.seller?.shop_name ?? '—'],
              ['Eingestellt', new Date(product.created_at).toLocaleDateString('de-DE')],
            ].map(([k, v]) => (
              <div key={k}>
                <p style={{ fontSize: 10, color: T3, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{k}</p>
                <p style={{ fontSize: 13, color: T1, margin: 0, fontWeight: 500 }}>{v}</p>
              </div>
            ))}
          </div>

          {/* Description */}
          {product.description && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 10, color: T3, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Beschreibung</p>
              <p style={{ fontSize: 13, color: T2, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {product.description}
              </p>
            </div>
          )}

          {/* Existing moderation notes */}
          {product.moderation_notes && (
            <div style={{
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
            }}>
              <p style={{ fontSize: 10, color: '#FCD34D', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Moderationsnotiz</p>
              <p style={{ fontSize: 13, color: T1, margin: 0 }}>{product.moderation_notes}</p>
            </div>
          )}

          {/* ── Actions ── */}
          <div style={{
            background: ELEV, border: `1px solid ${BDR}`,
            borderRadius: 10, padding: '16px', marginBottom: 20,
          }}>
            <p style={{ fontSize: 11, color: T3, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px', fontWeight: 700 }}>
              Moderationsaktion
            </p>

            {/* Action selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {([
                { id: 'approve',       label: 'Genehmigen',   color: '#10B981', hover: 'rgba(16,185,129,0.15)' },
                { id: 'reject',        label: 'Ablehnen',     color: '#EF4444', hover: 'rgba(239,68,68,0.15)' },
                { id: 'needs_changes', label: 'Änderungen',   color: '#6366F1', hover: 'rgba(99,102,241,0.15)' },
              ] as const).map(btn => (
                <button
                  key={btn.id}
                  onClick={() => { setAction(btn.id); setErr('') }}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer',
                    border: `1px solid ${action === btn.id ? btn.color : BDR}`,
                    background: action === btn.id ? `${btn.hover}` : 'transparent',
                    color: action === btn.id ? btn.color : T2,
                    transition: 'all 150ms',
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Reason textarea (shown for reject + needs_changes) */}
            {action && action !== 'approve' && (
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={action === 'reject' ? 'Ablehnungsgrund (Pflichtfeld)…' : 'Erforderliche Änderungen (Pflichtfeld)…'}
                rows={3}
                style={{
                  width: '100%', background: BG,
                  border: `1px solid ${err ? 'rgba(239,68,68,0.5)' : BDR}`,
                  borderRadius: 8, padding: '8px 12px', color: T1, fontSize: 13,
                  outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                  boxSizing: 'border-box', marginBottom: 10,
                }}
              />
            )}

            {err && <p style={{ color: '#FCA5A5', fontSize: 12, margin: '0 0 10px' }}>{err}</p>}

            {action && (
              <button
                onClick={handleConfirm}
                disabled={acting}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 8,
                  background: action === 'approve' ? '#10B981' : action === 'reject' ? '#EF4444' : ACC,
                  color: '#fff', border: 'none', fontSize: 13, fontWeight: 700,
                  cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.65 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {acting && <Loader2 style={{ width: 14, height: 14, animation: 'adm-spin 0.8s linear infinite' }} />}
                {action === 'approve' ? 'Produkt genehmigen' : action === 'reject' ? 'Produkt ablehnen' : 'Änderungen anfordern'}
              </button>
            )}
          </div>

          {/* Seller quick-link */}
          {product.seller && (
            <div style={{ marginBottom: 20 }}>
              <a
                href={`/admin/seller-applications?search=${encodeURIComponent(product.seller.shop_name)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 12, color: ACC, textDecoration: 'none',
                }}
              >
                <ExternalLink style={{ width: 12, height: 12 }} />
                {product.seller.shop_name} aufrufen
              </a>
            </div>
          )}

          {/* Internal notes */}
          <AdminNotesPanel
            resourceType="product"
            resourceId={product.id}
            adminToken={adminToken}
          />
        </div>
      </div>

      <style>{`@keyframes adm-spin { to { transform: rotate(360deg) } }`}</style>
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProductModerationPage() {
  const [token,     setToken]     = useState<string>('')
  const [authed,    setAuthed]    = useState(false)
  const [products,  setProducts]  = useState<Product[]>([])
  const [counts,    setCounts]    = useState<Counts>({ pending: 0, rejected: 0, needs_changes: 0 })
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(1)
  const [status,    setStatus]    = useState<ModerationStatus>('pending')
  const [search,    setSearch]    = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [selected,  setSelected]  = useState<Product | null>(null)
  const [acting,    setActing]    = useState(false)
  const [toast,     setToast]     = useState('')
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const LIMIT = 20

  // On mount: try cached token
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('adminToken') ?? '' : ''
    if (saved) { setToken(saved); setAuthed(true) }
  }, [])

  const load = useCallback(async (tok: string, p: number, s: ModerationStatus, q: string) => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({
        status: s, page: String(p), limit: String(LIMIT), ...(q ? { search: q } : {}),
      })
      const res  = await fetch(`/api/admin/products/moderation?${params}`, {
        headers: { 'x-admin-token': tok },
      })
      const data = await res.json()
      if (res.status === 401) { setAuthed(false); return }
      if (!data.success) { setError(data.error ?? 'Fehler'); return }
      setProducts(data.products ?? [])
      setTotal(data.total ?? 0)
      setCounts(data.counts ?? { pending: 0, rejected: 0, needs_changes: 0 })
    } catch { setError('Netzwerkfehler') }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (authed) load(token, page, status, search)
  }, [authed, token, page, status, load]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchChange = (val: string) => {
    setSearch(val)
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => { setPage(1); load(token, 1, status, val) }, 400)
  }

  const handleTabChange = (s: ModerationStatus) => {
    setStatus(s); setPage(1); setSearch(''); load(token, 1, s, '')
  }

  const handleAction = async (action: 'approve' | 'reject' | 'needs_changes', reason: string) => {
    if (!selected) return
    setActing(true)
    try {
      const res  = await fetch('/api/admin/products/moderation', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body:    JSON.stringify({ productId: selected.id, action, reason }),
      })
      const data = await res.json()
      if (data.success) {
        const label = action === 'approve' ? 'genehmigt' : action === 'reject' ? 'abgelehnt' : 'Änderungen angefordert'
        setToast(`Produkt ${label}`)
        setTimeout(() => setToast(''), 3000)
        setSelected(null)
        load(token, page, status, search)
      }
    } catch {}
    setActing(false)
  }

  const handleAuth = (tok: string) => { setToken(tok); setAuthed(true) }

  const totalPages = Math.ceil(total / LIMIT)

  if (!authed) return <AuthGate onAuth={handleAuth} />

  const TABS: { id: ModerationStatus; label: string; count?: number }[] = [
    { id: 'pending',       label: 'Ausstehend', count: counts.pending },
    { id: 'all',           label: 'Alle' },
    { id: 'approved',      label: 'Genehmigt' },
    { id: 'rejected',      label: 'Abgelehnt', count: counts.rejected },
    { id: 'needs_changes', label: 'Änderungen', count: counts.needs_changes },
  ]

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '32px 40px' }}>
      <style>{`@keyframes adm-spin { to { transform: rotate(360deg) } }`}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: '#10B981', color: '#fff', borderRadius: 10,
          padding: '12px 20px', fontSize: 14, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}>
          <Check style={{ width: 14, height: 14, display: 'inline', marginRight: 8 }} />
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ color: T1, fontSize: 22, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.4px' }}>
            Produktmoderation
          </h1>
          <p style={{ color: T3, fontSize: 13, margin: 0 }}>
            Eingesendete Produkte prüfen, genehmigen oder ablehnen
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: T3 }} />
            <input
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Titel oder Produkt-ID…"
              style={{
                background: SURF, border: `1px solid ${BDR}`, borderRadius: 8,
                padding: '9px 12px 9px 32px', color: T1, fontSize: 13,
                outline: 'none', width: 240,
              }}
            />
          </div>
          {/* Refresh */}
          <button
            onClick={() => load(token, page, status, search)}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: SURF, border: `1px solid ${BDR}`, borderRadius: 8,
              padding: '9px 14px', color: T2, fontSize: 13, cursor: 'pointer',
            }}
          >
            <RefreshCw style={{ width: 13, height: 13, animation: loading ? 'adm-spin 0.8s linear infinite' : 'none' }} />
            Aktualisieren
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${BDR}`, paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              padding: '9px 16px', fontSize: 13, fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer',
              color: status === tab.id ? T1 : T3,
              borderBottom: status === tab.id ? `2px solid ${ACC}` : '2px solid transparent',
              marginBottom: -1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span style={{
                background: tab.id === 'pending' ? 'rgba(245,158,11,0.2)' : 'rgba(99,102,241,0.2)',
                color:      tab.id === 'pending' ? '#FCD34D' : '#A5B4FC',
                borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 700,
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 10, padding: '10px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AlertCircle style={{ width: 15, height: 15, color: '#FCA5A5' }} />
          <p style={{ color: '#FCA5A5', fontSize: 13, margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Table */}
      <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 12, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px 1fr 160px 100px 80px 100px 120px',
          gap: 0, padding: '10px 16px',
          borderBottom: `1px solid ${BDR}`,
        }}>
          {['Bild', 'Titel', 'Verkäufer', 'Kategorie', 'Preis', 'Bestand', 'Status'].map(h => (
            <p key={h} style={{ fontSize: 10, fontWeight: 700, color: T3, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</p>
          ))}
        </div>

        {/* Rows */}
        {loading && products.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Spinner />
          </div>
        ) : products.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Package style={{ width: 36, height: 36, color: T3, margin: '0 auto 12px' }} />
            <p style={{ color: T2, fontSize: 14, margin: 0 }}>
              {search ? 'Keine Produkte gefunden' : `Keine ${status === 'pending' ? 'ausstehenden' : ''} Produkte`}
            </p>
          </div>
        ) : (
          products.map((p, i) => {
            const thumb = Array.isArray(p.images) && p.images[0] ? p.images[0] : null
            return (
              <div
                key={p.id}
                onClick={() => setSelected(p)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 1fr 160px 100px 80px 80px 120px',
                  gap: 0, padding: '12px 16px', cursor: 'pointer',
                  borderBottom: i < products.length - 1 ? `1px solid ${BDR}` : 'none',
                  transition: 'background 120ms',
                  background: selected?.id === p.id ? ELEV : 'transparent',
                }}
                onMouseEnter={e => { if (selected?.id !== p.id) (e.currentTarget as HTMLDivElement).style.background = '#0E1019' }}
                onMouseLeave={e => { if (selected?.id !== p.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
              >
                {/* Thumbnail */}
                <div style={{
                  width: 44, height: 44, borderRadius: 6, overflow: 'hidden',
                  background: ELEV, border: `1px solid ${BDR}`, flexShrink: 0,
                }}>
                  {thumb
                    ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    : <ImageIcon style={{ width: 18, height: 18, color: T3, margin: '13px auto', display: 'block' }} />
                  }
                </div>

                {/* Title */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden', paddingRight: 12 }}>
                  <p style={{ color: T1, fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.title}
                  </p>
                  <p style={{ color: T3, fontSize: 11, margin: '2px 0 0', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.id}
                  </p>
                </div>

                {/* Seller */}
                <p style={{ color: T2, fontSize: 12, margin: 0, display: 'flex', alignItems: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.seller?.shop_name ?? '—'}
                </p>

                {/* Category */}
                <p style={{ color: T2, fontSize: 12, margin: 0, display: 'flex', alignItems: 'center' }}>
                  {p.category ?? '—'}
                </p>

                {/* Price */}
                <p style={{ color: T1, fontSize: 13, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center' }}>
                  €{Number(p.price ?? 0).toFixed(2)}
                </p>

                {/* Stock */}
                <p style={{
                  color: (p.stock_quantity ?? 0) === 0 ? '#FCA5A5' : T1,
                  fontSize: 12, margin: 0, display: 'flex', alignItems: 'center',
                }}>
                  {p.stock_quantity ?? 0}
                </p>

                {/* Status */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <StatusBadge status={p.moderation_status} />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <p style={{ color: T3, fontSize: 13, margin: 0 }}>
            {total} Produkte · Seite {page} von {totalPages}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                background: SURF, border: `1px solid ${BDR}`, borderRadius: 8,
                padding: '7px 12px', cursor: page === 1 ? 'not-allowed' : 'pointer',
                opacity: page === 1 ? 0.4 : 1, color: T2,
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
              }}
            >
              <ChevronLeft style={{ width: 14, height: 14 }} /> Zurück
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                background: SURF, border: `1px solid ${BDR}`, borderRadius: 8,
                padding: '7px 12px', cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages ? 0.4 : 1, color: T2,
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
              }}
            >
              Weiter <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      )}

      {/* Drawer */}
      {selected && (
        <ProductDrawer
          product={selected}
          adminToken={token}
          onClose={() => setSelected(null)}
          onAction={handleAction}
          acting={acting}
        />
      )}
    </div>
  )
}
