'use client'

/**
 * /seller/orders — Seller order management page
 *
 * Fetches all orders for the authenticated seller via GET /api/seller/orders.
 * Design: clean white/light-gray, consistent with seller dashboard.
 * Language: German throughout.
 */

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import {
  Package, Loader2, Search, Truck, CheckCircle,
  Clock, XCircle, RefreshCw, Send, ShoppingBag,
  ChevronDown, ChevronUp, AlertCircle, X,
  ArrowUpDown, Euro, RotateCcw,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  id:            string
  productId:     string
  productTitle:  string
  productImage:  string | null
  quantity:      number
  price:         number
  selectedSize:  string | null
}

interface SellerOrder {
  id:             string
  state:          string
  paymentStatus:  string
  totalAmount:    number
  currency:       string
  createdAt:      string
  customerName:   string
  shippingAddress: {
    fullName?:  string
    address?:   string
    city?:      string
    district?:  string
    phone?:     string
  } | null
  items: OrderItem[]
}

interface OrderStats {
  total:   number
  paid:    number
  pending: number
  shipped: number
  revenue: number
}

// ─── State config (German labels) ────────────────────────────────────────────

const STATE_CFG: Record<string, { label: string; bg: string; color: string; icon: React.ElementType }> = {
  CREATED:          { label: 'Ausstehend',         bg: '#F3F4F6', color: '#6B7280', icon: Clock         },
  PAYMENT_PENDING:  { label: 'Zahlung offen',       bg: '#FEF3C7', color: '#D97706', icon: Clock         },
  PAID:             { label: 'Bezahlt',             bg: '#DCFCE7', color: '#16A34A', icon: CheckCircle   },
  SHIPPED:          { label: 'Versandt',            bg: '#DBEAFE', color: '#2563EB', icon: Truck         },
  DELIVERED:        { label: 'Geliefert',           bg: '#DCFCE7', color: '#16A34A', icon: CheckCircle   },
  COMPLETED:        { label: 'Abgeschlossen',       bg: '#D1FAE5', color: '#15803D', icon: CheckCircle   },
  RETURN_REQUESTED: { label: 'Rückgabe angefragt',  bg: '#FEF3C7', color: '#D97706', icon: RotateCcw     },
  RETURN_APPROVED:  { label: 'Rückgabe genehmigt',  bg: '#FED7AA', color: '#C2410C', icon: RotateCcw     },
  DISPUTE_OPENED:   { label: 'Streitfall',          bg: '#FEE2E2', color: '#DC2626', icon: AlertCircle   },
  REFUNDED:         { label: 'Erstattet',           bg: '#F3F4F6', color: '#9CA3AF', icon: XCircle       },
  CANCELLED:        { label: 'Storniert',           bg: '#FEE2E2', color: '#DC2626', icon: XCircle       },
}

function getStateCfg(state: string) {
  return STATE_CFG[state] ?? { label: state, bg: '#F3F4F6', color: '#6B7280', icon: Clock }
}

// Filter groups: each group maps to a set of state values
const FILTER_GROUPS = [
  { value: 'all',       label: 'Alle Bestellungen',     states: [] as string[] },
  { value: 'pending',   label: 'Neu / Ausstehend',      states: ['CREATED', 'PAYMENT_PENDING'] },
  { value: 'paid',      label: 'Bezahlt',               states: ['PAID'] },
  { value: 'shipped',   label: 'Versandt',              states: ['SHIPPED'] },
  { value: 'done',      label: 'Abgeschlossen',         states: ['DELIVERED', 'COMPLETED'] },
  { value: 'issues',    label: 'Rückgabe / Streit',     states: ['RETURN_REQUESTED', 'RETURN_APPROVED', 'DISPUTE_OPENED'] },
  { value: 'cancelled', label: 'Storniert / Erstattet', states: ['CANCELLED', 'REFUNDED'] },
]

const PERIOD_OPTIONS = [
  { label: '7 Tage',  value: 7  },
  { label: '30 Tage', value: 30 },
  { label: '90 Tage', value: 90 },
  { label: 'Alle',    value: 0  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number, currency = 'EUR') =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(v)

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StateBadge({ state }: { state: string }) {
  const cfg = getStateCfg(state)
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  )
}

function PaymentBadge({ status }: { status: string }) {
  const isPaid = status === 'paid'
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap"
      style={{
        background: isPaid ? '#DCFCE7' : '#FEF3C7',
        color:      isPaid ? '#16A34A' : '#D97706',
      }}
    >
      {isPaid ? 'Bezahlt' : status === 'failed' ? 'Fehlgeschlagen' : 'Ausstehend'}
    </span>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <div
      className="flex items-start gap-3 p-4 rounded-xl"
      style={{ background: '#FFF', border: '1px solid #F0F0F0' }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}
      >
        <Icon className="w-[18px] h-[18px]" style={{ color }} />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
          {label}
        </p>
        <p className="text-[22px] font-bold leading-tight" style={{ color: '#1A1A1A' }}>
          {value}
        </p>
        {sub && (
          <p className="text-[10px] mt-0.5" style={{ color: '#CCC' }}>{sub}</p>
        )}
      </div>
    </div>
  )
}

// ─── Ship modal ───────────────────────────────────────────────────────────────

const CARRIERS = ['DHL', 'UPS', 'FedEx', 'GLS', 'Hermes', 'DPD', 'Andere']

function ShipModal({
  orderId,
  userId,
  onClose,
  onShipped,
}: {
  orderId: string
  userId: string
  onClose: () => void
  onShipped: () => void
}) {
  const [carrier, setCarrier]               = useState('DHL')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState('')

  const handleSubmit = async () => {
    if (!trackingNumber.trim()) {
      setError('Bitte Trackingnummer eingeben.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/shipping/manual-ship', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ orderId, trackingNumber: trackingNumber.trim(), carrier }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Versand fehlgeschlagen')
      onShipped()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Versand fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[400px] rounded-2xl p-6 bg-white"
        style={{ boxShadow: '0 8px 48px rgba(0,0,0,0.18)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[17px] font-bold" style={{ color: '#1A1A1A' }}>
              Versandinfo eintragen
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>
              Bestellung #{orderId.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#374151' }}>
              Versanddienstleister
            </label>
            <select
              value={carrier}
              onChange={e => setCarrier(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-[13px] border outline-none focus:ring-2 focus:ring-[#D97706]/30"
              style={{ borderColor: '#E5E7EB', color: '#1A1A1A' }}
            >
              {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#374151' }}>
              Trackingnummer
            </label>
            <input
              type="text"
              value={trackingNumber}
              onChange={e => setTrackingNumber(e.target.value)}
              placeholder="z.B. 1234567890"
              className="w-full px-3 py-2.5 rounded-xl text-[13px] border outline-none focus:ring-2 focus:ring-[#D97706]/30"
              style={{ borderColor: '#E5E7EB', color: '#1A1A1A' }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {error && (
            <p className="text-[12px]" style={{ color: '#DC2626' }}>{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-medium border"
            style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
            disabled={loading}
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !trackingNumber.trim()}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2 transition-opacity"
            style={{ background: loading || !trackingNumber.trim() ? '#E5E7EB' : '#2563EB' }}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Senden…</>
            ) : (
              <><Truck className="w-4 h-4" /> Kargoya ver</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Order row ────────────────────────────────────────────────────────────────

function OrderRow({
  order,
  userId,
  onRefresh,
}: {
  order: SellerOrder
  userId: string
  onRefresh: () => void
}) {
  const [expanded, setExpanded]     = useState(false)
  const [shipOpen, setShipOpen]     = useState(false)
  const stateCfg = getStateCfg(order.state)
  const StateIcon = stateCfg.icon

  const canShip = order.state === 'PAID' || order.state === 'CREATED' || order.state === 'PAYMENT_PENDING'
  const totalItems = order.items.reduce((s, i) => s + i.quantity, 0)

  return (
    <>
      <div
        className="rounded-xl overflow-hidden transition-shadow hover:shadow-sm"
        style={{ border: '1px solid #F0F0F0', background: '#FFF' }}
      >
        {/* Main row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
          {/* Left: ID + date */}
          <div className="flex-shrink-0 min-w-0" style={{ width: 130 }}>
            <p className="text-[12px] font-bold font-mono" style={{ color: '#1A1A1A' }}>
              #{order.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: '#9CA3AF' }}>
              {fmtDate(order.createdAt)}
            </p>
          </div>

          {/* Customer */}
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium truncate" style={{ color: '#1A1A1A' }}>
              {order.customerName}
            </p>
            {/* Product previews */}
            <div className="flex items-center gap-1.5 mt-1">
              {order.items.slice(0, 3).map(item => (
                item.productImage ? (
                  <div key={item.id} className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0"
                    style={{ border: '1px solid #F0F0F0' }}>
                    <Image
                      src={item.productImage}
                      alt={item.productTitle}
                      width={32} height={32}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ) : (
                  <div key={item.id}
                    className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: '#F5F5F5', border: '1px solid #F0F0F0' }}>
                    <Package className="w-3.5 h-3.5" style={{ color: '#CCC' }} />
                  </div>
                )
              ))}
              {order.items.length > 3 && (
                <span className="text-[10px]" style={{ color: '#9CA3AF' }}>
                  +{order.items.length - 3}
                </span>
              )}
              <span className="text-[10px] ml-1" style={{ color: '#9CA3AF' }}>
                {totalItems} {totalItems === 1 ? 'Artikel' : 'Artikel'}
              </span>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <StateBadge state={order.state} />
            <PaymentBadge status={order.paymentStatus} />
          </div>

          {/* Amount */}
          <div className="text-right flex-shrink-0 min-w-[90px]">
            <p className="text-[15px] font-bold" style={{ color: '#1A1A1A' }}>
              {fmt(order.totalAmount, order.currency)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {canShip && order.paymentStatus === 'paid' && (
              <button
                onClick={() => setShipOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: '#2563EB' }}
              >
                <Truck className="w-3 h-3" />
                Versenden
              </button>
            )}
            <button
              onClick={() => setExpanded(v => !v)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
              aria-label={expanded ? 'Details einklappen' : 'Details ausklappen'}
            >
              {expanded
                ? <ChevronUp className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                : <ChevronDown className="w-4 h-4" style={{ color: '#9CA3AF' }} />
              }
            </button>
          </div>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div
            className="px-4 pb-4 space-y-4 pt-2"
            style={{ borderTop: '1px solid #F5F5F5' }}
          >
            {/* Items list */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: '#9CA3AF' }}>
                Artikel
              </p>
              <div className="space-y-2">
                {order.items.map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    {item.productImage ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
                        style={{ border: '1px solid #F0F0F0' }}>
                        <Image
                          src={item.productImage}
                          alt={item.productTitle}
                          width={40} height={40}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: '#F5F5F5' }}>
                        <Package className="w-4 h-4" style={{ color: '#CCC' }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium truncate" style={{ color: '#1A1A1A' }}>
                        {item.productTitle}
                      </p>
                      <p className="text-[10px]" style={{ color: '#9CA3AF' }}>
                        {item.selectedSize ? `Größe: ${item.selectedSize} · ` : ''}
                        {item.quantity}× · {fmt(item.price)}
                      </p>
                    </div>
                    <p className="text-[12px] font-bold flex-shrink-0" style={{ color: '#1A1A1A' }}>
                      {fmt(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping address */}
            {order.shippingAddress && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#9CA3AF' }}>
                  Lieferadresse
                </p>
                <div className="rounded-lg p-3 text-[12px] space-y-0.5"
                  style={{ background: '#F9FAFB', color: '#374151' }}>
                  {order.shippingAddress.fullName && (
                    <p className="font-medium">{order.shippingAddress.fullName}</p>
                  )}
                  {order.shippingAddress.address && <p>{order.shippingAddress.address}</p>}
                  {order.shippingAddress.city && (
                    <p>
                      {order.shippingAddress.city}
                      {order.shippingAddress.district && `, ${order.shippingAddress.district}`}
                    </p>
                  )}
                  {order.shippingAddress.phone && (
                    <p style={{ color: '#9CA3AF' }}>{order.shippingAddress.phone}</p>
                  )}
                </div>
              </div>
            )}

            {/* Meta */}
            <div className="flex items-center justify-between">
              <p className="text-[10px]" style={{ color: '#9CA3AF' }}>
                Erstellt: {fmtDateTime(order.createdAt)}
              </p>
              <p className="text-[10px] font-mono" style={{ color: '#CCC' }}>
                {order.id}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Ship modal */}
      {shipOpen && (
        <ShipModal
          orderId={order.id}
          userId={userId}
          onClose={() => setShipOpen(false)}
          onShipped={() => {
            setShipOpen(false)
            onRefresh()
          }}
        />
      )}
    </>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-[72px] rounded-xl animate-pulse" style={{ background: '#F3F4F6' }} />
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SellerOrdersPage() {
  const { data: session, status: sessionStatus } = useSession()
  const userId = session?.user?.id ?? ''

  const [orders,    setOrders]    = useState<SellerOrder[]>([])
  const [stats,     setStats]     = useState<OrderStats | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [period,    setPeriod]    = useState(30)
  const [filter,    setFilter]    = useState('all')
  const [search,    setSearch]    = useState('')
  const [sortAsc,   setSortAsc]   = useState(false)

  const fetchOrders = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError('')
    try {
      const res  = await fetch(`/api/seller/orders?period=${period}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Fehler beim Laden')
      setOrders(data.orders ?? [])
      setStats(data.stats ?? null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Laden der Bestellungen')
    } finally {
      setLoading(false)
    }
  }, [userId, period])

  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (!userId) return
    fetchOrders()
  }, [fetchOrders, sessionStatus])

  // ── Derived: filter + search + sort ──────────────────────────────────────────
  const group = FILTER_GROUPS.find(g => g.value === filter)!
  const visible = orders
    .filter(o => {
      if (group.states.length > 0 && !group.states.includes(o.state)) return false
      if (search) {
        const q = search.toLowerCase()
        const matchId   = o.id.toLowerCase().includes(q)
        const matchName = o.customerName.toLowerCase().includes(q)
        const matchProd = o.items.some(i => i.productTitle.toLowerCase().includes(q))
        if (!matchId && !matchName && !matchProd) return false
      }
      return true
    })
    .sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return sortAsc ? diff : -diff
    })

  // ── Render ────────────────────────────────────────────────────────────────────
  if (sessionStatus === 'loading' || (loading && !stats)) {
    return (
      <div className="min-h-screen p-6" style={{ background: '#F5F5F5' }}>
        <div className="max-w-5xl mx-auto">
          <div className="h-7 w-36 rounded-lg animate-pulse mb-6" style={{ background: '#E5E7EB' }} />
          <div className="grid grid-cols-5 gap-4 mb-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: '#E5E7EB' }} />
            ))}
          </div>
          <Skeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ background: '#F5F5F5' }}>
      <div className="max-w-5xl mx-auto">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-bold" style={{ color: '#1A1A1A' }}>Bestellungen</h1>
            <p className="text-[12px] mt-0.5" style={{ color: '#9CA3AF' }}>
              Alle Bestellungen für Ihre Produkte
            </p>
          </div>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium border transition-colors hover:bg-white"
            style={{ background: '#FFF', borderColor: '#E5E7EB', color: '#555' }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
        </div>

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {error && (
          <div
            className="flex items-center gap-3 p-4 rounded-xl mb-6"
            style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#DC2626' }} />
            <p className="text-[13px]" style={{ color: '#DC2626' }}>{error}</p>
            <button
              onClick={fetchOrders}
              className="ml-auto text-[12px] font-semibold underline"
              style={{ color: '#DC2626' }}
            >
              Erneut versuchen
            </button>
          </div>
        )}

        {/* ── KPI strip ────────────────────────────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <KpiCard
              label="Gesamt"
              value={String(stats.total)}
              icon={ShoppingBag}
              color="#6366F1"
            />
            <KpiCard
              label="Bezahlt"
              value={String(stats.paid)}
              icon={CheckCircle}
              color="#16A34A"
            />
            <KpiCard
              label="Ausstehend"
              value={String(stats.pending)}
              icon={Clock}
              color="#D97706"
            />
            <KpiCard
              label="Versandt"
              value={String(stats.shipped)}
              icon={Truck}
              color="#2563EB"
            />
            <KpiCard
              label="Umsatz"
              value={fmt(stats.revenue)}
              sub="nur bezahlte Bestellungen"
              icon={Euro}
              color="#22C55E"
            />
          </div>
        )}

        {/* ── Filters ──────────────────────────────────────────────────────── */}
        <div
          className="rounded-xl p-4 mb-4 space-y-3"
          style={{ background: '#FFF', border: '1px solid #F0F0F0' }}
        >
          {/* Row 1: Search + period */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Bestellnr., Kundenname, Produkt…"
                className="w-full pl-9 pr-3 py-2 rounded-lg text-[13px] border outline-none"
                style={{ borderColor: '#E5E7EB', color: '#1A1A1A' }}
              />
            </div>

            {/* Period selector */}
            <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#F5F5F5' }}>
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className="px-3 py-1.5 rounded-md text-[11px] font-medium transition-all"
                  style={{
                    background: period === opt.value ? '#FFF' : 'transparent',
                    color:      period === opt.value ? '#1A1A1A' : '#9CA3AF',
                    boxShadow:  period === opt.value ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <button
              onClick={() => setSortAsc(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium border transition-colors hover:bg-white/5"
              style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sortAsc ? 'Älteste zuerst' : 'Neueste zuerst'}
            </button>
          </div>

          {/* Row 2: Status filter pills */}
          <div className="flex gap-2 flex-wrap">
            {FILTER_GROUPS.map(g => (
              <button
                key={g.value}
                onClick={() => setFilter(g.value)}
                className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
                style={{
                  background: filter === g.value ? '#1A1A1A' : '#F5F5F5',
                  color:      filter === g.value ? '#FFF'     : '#6B7280',
                }}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Count ────────────────────────────────────────────────────────── */}
        <p className="text-[12px] mb-3" style={{ color: '#9CA3AF' }}>
          {visible.length} {visible.length === 1 ? 'Bestellung' : 'Bestellungen'} gefunden
        </p>

        {/* ── Orders list ──────────────────────────────────────────────────── */}
        {loading && visible.length === 0 ? (
          <Skeleton />
        ) : visible.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 rounded-xl"
            style={{ background: '#FFF', border: '1px solid #F0F0F0' }}
          >
            <ShoppingBag className="w-12 h-12 mb-3" style={{ color: '#E5E7EB' }} />
            <p className="text-[15px] font-semibold mb-1" style={{ color: '#1A1A1A' }}>
              Keine Bestellungen gefunden
            </p>
            <p className="text-[13px]" style={{ color: '#9CA3AF' }}>
              {search || filter !== 'all'
                ? 'Versuche andere Filter oder Suchbegriffe.'
                : 'Sie haben noch keine Bestellungen erhalten.'}
            </p>
            {(search || filter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setFilter('all') }}
                className="mt-4 px-4 py-2 rounded-lg text-[12px] font-medium"
                style={{ background: '#F5F5F5', color: '#6B7280' }}
              >
                Filter zurücksetzen
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map(order => (
              <OrderRow
                key={order.id}
                order={order}
                userId={userId}
                onRefresh={fetchOrders}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
