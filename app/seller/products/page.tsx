'use client'

/**
 * /seller/products — Premium Seller Products Management
 *
 * Sections:
 *   A — KPI strip (total / approved / pending / rejected / out-of-stock / low-stock / inactive)
 *   B — Action bar (search · status filter · stock filter · sort · new product · refresh)
 *   C — Product table (default) / card grid (toggle)
 *   D — Loading skeleton / empty state / error banner
 *
 * Data:  GET  /api/seller/products  (session-based, maybeSingle, no race condition)
 * Write: PATCH /api/seller/products  (toggle is_active — visibility)
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Package, Plus, Search, RefreshCw, Edit2, Eye, EyeOff,
  LayoutGrid, LayoutList, AlertCircle, CheckCircle2,
  Clock, XCircle, Archive, AlertTriangle, TrendingDown,
  ArrowUpDown,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductRow {
  id: string
  title: string
  price: number
  compareAtPrice: number | null
  images: string[]
  stockQuantity: number
  lowStockThreshold: number
  isLowStock: boolean
  isOutOfStock: boolean
  moderationStatus: string
  isActive: boolean
  category: string | null
  brand: string | null
  sku: string | null
  createdAt: string
}

interface KPIs {
  total: number
  approved: number
  pending: number
  rejected: number
  inactive: number
  outOfStock: number
  lowStock: number
}

interface ApiResponse {
  success: boolean
  products: ProductRow[]
  kpis: KPIs
  seller?: { id: string; shopName: string }
  error?: string
}

type SortKey      = 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc'
type StockFilter  = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
type StatusFilter = 'all' | 'approved' | 'pending' | 'rejected' | 'inactive'
type ViewMode     = 'table' | 'grid'

// ─── Design tokens ────────────────────────────────────────────────────────────

const BG   = '#F5F5F5'
const CARD = '#FFFFFF'
const BDR  = '#D4D4D4'
const T1   = '#1A1A1A'
const T2   = '#3D3D3D'
const T3   = '#6B6B6B'
const ACC  = '#D97706'

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  approved: { label: 'Freigegeben', bg: '#DCFCE7', color: '#16A34A' },
  pending:  { label: 'In Prüfung',  bg: '#FEF3C7', color: '#D97706' },
  rejected: { label: 'Abgelehnt',   bg: '#FEE2E2', color: '#DC2626' },
  inactive: { label: 'Inaktiv',     bg: '#F3F4F6', color: '#6B7280' },
}

function getStatusCfg(moderationStatus: string, isActive: boolean) {
  // Show moderation status first (pending/rejected always visible regardless of isActive)
  if (moderationStatus === 'pending')  return STATUS_CFG.pending
  if (moderationStatus === 'rejected') return STATUS_CFG.rejected
  // Only show "Inaktiv" when seller explicitly deactivated an approved product
  if (!isActive) return STATUS_CFG.inactive
  return STATUS_CFG[moderationStatus] ?? STATUS_CFG.pending
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  })
}

function fmtPrice(v: number) {
  return `€${v.toFixed(2).replace('.', ',')}`
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: number
  icon: React.ElementType
  iconColor: string
  iconBg: string
  active?: boolean
  onClick?: () => void
}

function KpiCard({ label, value, icon: Icon, iconColor, iconBg, active, onClick }: KpiCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border transition-all duration-150 hover:shadow-sm"
      style={{
        background:  CARD,
        border:      `1px solid ${active ? ACC : BDR}`,
        padding:     '14px 16px',
        boxShadow:   active ? `0 0 0 2px ${ACC}22` : undefined,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg }}
        >
          <Icon className="w-[18px] h-[18px]" style={{ color: iconColor }} />
        </div>
        <div className="min-w-0">
          <p className="text-[22px] font-bold leading-none mb-0.5" style={{ color: T1 }}>{value}</p>
          <p className="text-[11px] leading-none truncate"          style={{ color: T3 }}>{label}</p>
        </div>
      </div>
    </button>
  )
}

// ─── Stock badge ──────────────────────────────────────────────────────────────

function StockBadge({ qty, threshold }: { qty: number; threshold: number }) {
  if (qty === 0) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
        style={{ background: '#FEE2E2', color: '#DC2626' }}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#DC2626]" />
        Kein Lager
      </span>
    )
  }
  if (qty <= threshold) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
        style={{ background: '#FEF3C7', color: '#D97706' }}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#D97706]" />
        {qty} niedrig
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: '#DCFCE7', color: '#16A34A' }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#16A34A]" />
      {qty}
    </span>
  )
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border p-4 animate-pulse"
          style={{ background: CARD, borderColor: BDR }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#F0F0F0] flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-5 bg-[#F0F0F0] rounded w-8" />
              <div className="h-2.5 bg-[#F0F0F0] rounded w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-5 py-3 border-b"
          style={{ borderColor: '#F0F0F0' }}
        >
          <div className="w-10 h-10 rounded-lg bg-[#F0F0F0] animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="h-3 bg-[#F0F0F0] animate-pulse rounded w-2/5" />
            <div className="h-2.5 bg-[#F0F0F0] animate-pulse rounded w-1/5" />
          </div>
          <div className="h-3 bg-[#F0F0F0] animate-pulse rounded w-14 flex-shrink-0" />
          <div className="h-5 bg-[#F0F0F0] animate-pulse rounded-full w-20 flex-shrink-0" />
          <div className="h-5 bg-[#F0F0F0] animate-pulse rounded-full w-24 flex-shrink-0" />
          <div className="h-3 bg-[#F0F0F0] animate-pulse rounded w-12 flex-shrink-0" />
          <div className="flex gap-1.5 flex-shrink-0">
            {[0,1,2].map(j => <div key={j} className="h-7 w-7 bg-[#F0F0F0] animate-pulse rounded-lg" />)}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Sortable table header cell ────────────────────────────────────────────────

function SortHeader({
  label, sortKey, currentSort, onSort,
}: {
  label: string; sortKey: SortKey; currentSort: SortKey; onSort: (k: SortKey) => void
}) {
  return (
    <button
      className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
      style={{ color: currentSort.startsWith(sortKey.replace(/_asc|_desc/, '')) ? ACC : T3 }}
      onClick={() => onSort(sortKey)}
    >
      {label}
      <ArrowUpDown className="w-3 h-3 opacity-60" />
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SellerProductsPage() {
  const { status } = useSession()

  const [data,       setData]       = useState<ApiResponse | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [stockFilter,  setStockFilter]  = useState<StockFilter>('all')
  const [sort,         setSort]         = useState<SortKey>('newest')
  const [viewMode,     setViewMode]     = useState<ViewMode>('table')
  const [togglingId,   setTogglingId]   = useState<string | null>(null)

  // ── Data loading ────────────────────────────────────────────────────────

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else        setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/seller/products', { cache: 'no-store' })
      const json = await res.json() as ApiResponse
      if (!json.success) setError(json.error ?? 'Unbekannter Fehler')
      else               setData(json)
    } catch {
      setError('Netzwerkfehler — bitte erneut versuchen.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') load()
  }, [status, load])

  // ── Visibility toggle (optimistic) ────────────────────────────────────

  const handleToggleVisibility = async (product: ProductRow) => {
    if (togglingId) return
    const nextActive = !product.isActive
    setTogglingId(product.id)

    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        products: prev.products.map(p =>
          p.id === product.id ? { ...p, isActive: nextActive } : p
        ),
        kpis: {
          ...prev.kpis,
          inactive: nextActive
            ? Math.max(0, prev.kpis.inactive - 1)
            : prev.kpis.inactive + 1,
        },
      }
    })

    try {
      const res = await fetch('/api/seller/products', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ productId: product.id, isActive: nextActive }),
      })
      if (!res.ok) throw new Error('update failed')
    } catch {
      // Revert on failure
      setData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          products: prev.products.map(p =>
            p.id === product.id ? { ...p, isActive: product.isActive } : p
          ),
          kpis: {
            ...prev.kpis,
            inactive: nextActive
              ? prev.kpis.inactive + 1
              : Math.max(0, prev.kpis.inactive - 1),
          },
        }
      })
    } finally {
      setTogglingId(null)
    }
  }

  // ── Sort helper ─────────────────────────────────────────────────────────

  const handleSort = (key: SortKey) => {
    setSort(prev => {
      if (prev === key) {
        if (key.endsWith('_asc'))  return key.replace('_asc',  '_desc') as SortKey
        if (key.endsWith('_desc')) return key.replace('_desc', '_asc')  as SortKey
      }
      return key
    })
  }

  // ── Filtered + sorted products ────────────────────────────────────────

  const filtered = useMemo<ProductRow[]>(() => {
    if (!data) return []
    let list = data.products

    if (statusFilter !== 'all') {
      list = list.filter(p => {
        if (statusFilter === 'inactive') return !p.isActive && p.moderationStatus === 'approved'
        return p.moderationStatus === statusFilter
      })
    }

    if (stockFilter !== 'all') {
      list = list.filter(p => {
        if (stockFilter === 'out_of_stock') return p.isOutOfStock
        if (stockFilter === 'low_stock')    return p.isLowStock
        if (stockFilter === 'in_stock')     return !p.isOutOfStock && !p.isLowStock
        return true
      })
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
      )
    }

    const out = [...list]
    switch (sort) {
      case 'oldest':     out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));  break
      case 'price_asc':  out.sort((a, b) => a.price - b.price);                       break
      case 'price_desc': out.sort((a, b) => b.price - a.price);                       break
      case 'stock_asc':  out.sort((a, b) => a.stockQuantity - b.stockQuantity);       break
      case 'stock_desc': out.sort((a, b) => b.stockQuantity - a.stockQuantity);       break
      default:           out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }
    return out
  }, [data, statusFilter, stockFilter, search, sort])

  // ── KPI filter shortcut ───────────────────────────────────────────────

  const setKpiFilter = (sf: StatusFilter, stf: StockFilter = 'all') => {
    setStatusFilter(sf)
    setStockFilter(stf)
    setSearch('')
  }

  // ──────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────

  const kpis = data?.kpis

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* ── Page header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[22px] font-bold leading-tight" style={{ color: T1 }}>
              Produktverwaltung
            </h1>
            {data && (
              <p className="text-[13px] mt-0.5" style={{ color: T3 }}>
                {data.seller?.shopName} · {data.kpis.total} Produkte gesamt
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(true)}
              disabled={loading || refreshing}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors border"
              style={{ background: CARD, borderColor: BDR, color: T3 }}
              title="Aktualisieren"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/seller/products/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white"
              style={{ background: ACC }}
            >
              <Plus className="w-4 h-4" />
              Neues Produkt
            </Link>
          </div>
        </div>

        {/* ── Error banner ─────────────────────────────────────────────── */}
        {error && !loading && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl border"
            style={{ background: '#FEF2F2', borderColor: '#FECACA' }}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#DC2626]" />
            <p className="text-[13px] text-[#DC2626] flex-1">{error}</p>
            <button
              onClick={() => load()}
              className="text-[12px] font-semibold px-3 py-1 rounded-lg border border-[#DC2626] text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors"
            >
              Wiederholen
            </button>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────── */}
        {/* SECTION A — KPI Strip                                         */}
        {/* ────────────────────────────────────────────────────────────── */}

        {loading ? <KpiSkeleton /> : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <KpiCard
              label="Gesamt"
              value={kpis?.total ?? 0}
              icon={Package}
              iconColor="#6366F1"
              iconBg="rgba(99,102,241,0.12)"
              active={statusFilter === 'all' && stockFilter === 'all'}
              onClick={() => setKpiFilter('all')}
            />
            <KpiCard
              label="Freigegeben"
              value={kpis?.approved ?? 0}
              icon={CheckCircle2}
              iconColor="#16A34A"
              iconBg="rgba(22,163,74,0.12)"
              active={statusFilter === 'approved'}
              onClick={() => setKpiFilter('approved')}
            />
            <KpiCard
              label="In Prüfung"
              value={kpis?.pending ?? 0}
              icon={Clock}
              iconColor="#D97706"
              iconBg="rgba(217,119,6,0.12)"
              active={statusFilter === 'pending'}
              onClick={() => setKpiFilter('pending')}
            />
            <KpiCard
              label="Abgelehnt"
              value={kpis?.rejected ?? 0}
              icon={XCircle}
              iconColor="#DC2626"
              iconBg="rgba(220,38,38,0.12)"
              active={statusFilter === 'rejected'}
              onClick={() => setKpiFilter('rejected')}
            />
            <KpiCard
              label="Kein Lager"
              value={kpis?.outOfStock ?? 0}
              icon={TrendingDown}
              iconColor="#DC2626"
              iconBg="rgba(220,38,38,0.10)"
              active={stockFilter === 'out_of_stock'}
              onClick={() => { setStockFilter('out_of_stock'); setStatusFilter('all') }}
            />
            <KpiCard
              label="Niedriger Bestand"
              value={kpis?.lowStock ?? 0}
              icon={AlertTriangle}
              iconColor="#F97316"
              iconBg="rgba(249,115,22,0.12)"
              active={stockFilter === 'low_stock'}
              onClick={() => { setStockFilter('low_stock'); setStatusFilter('all') }}
            />
            <KpiCard
              label="Inaktiv"
              value={kpis?.inactive ?? 0}
              icon={Archive}
              iconColor="#6B7280"
              iconBg="rgba(107,114,128,0.12)"
              active={statusFilter === 'inactive'}
              onClick={() => setKpiFilter('inactive')}
            />
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────── */}
        {/* SECTION B — Action Bar                                        */}
        {/* ────────────────────────────────────────────────────────────── */}

        <div
          className="flex flex-wrap items-center gap-3 p-4 rounded-xl border"
          style={{ background: CARD, borderColor: BDR }}
        >
          {/* Search input */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: T3 }} />
            <input
              type="text"
              placeholder="Titel, Kategorie, SKU…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border text-[13px] outline-none transition-colors"
              style={{ background: '#FAFAFA', borderColor: search ? ACC : BDR, color: T1 }}
            />
          </div>

          {/* Status filter pills */}
          <div className="flex items-center gap-1 flex-wrap">
            {([
              { value: 'all',      label: 'Alle' },
              { value: 'approved', label: 'Freigegeben' },
              { value: 'pending',  label: 'In Prüfung' },
              { value: 'rejected', label: 'Abgelehnt' },
              { value: 'inactive', label: 'Inaktiv' },
            ] as { value: StatusFilter; label: string }[]).map(opt => (
              <button
                key={opt.value}
                onClick={() => { setStatusFilter(opt.value); setStockFilter('all') }}
                className="px-3 py-1 rounded-full text-[12px] font-medium transition-all border"
                style={{
                  background:  statusFilter === opt.value ? ACC          : 'transparent',
                  color:       statusFilter === opt.value ? '#FFF'       : T2,
                  borderColor: statusFilter === opt.value ? ACC          : BDR,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Stock filter */}
          <select
            value={stockFilter}
            onChange={e => { setStockFilter(e.target.value as StockFilter); setStatusFilter('all') }}
            className="px-3 py-2 rounded-lg border text-[12px] outline-none cursor-pointer"
            style={{ background: '#FAFAFA', borderColor: stockFilter !== 'all' ? ACC : BDR, color: T1 }}
          >
            <option value="all">Alle Bestände</option>
            <option value="in_stock">Lagernd</option>
            <option value="low_stock">Niedriger Bestand</option>
            <option value="out_of_stock">Ausverkauft</option>
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            className="px-3 py-2 rounded-lg border text-[12px] outline-none cursor-pointer"
            style={{ background: '#FAFAFA', borderColor: BDR, color: T1 }}
          >
            <option value="newest">Neueste zuerst</option>
            <option value="oldest">Älteste zuerst</option>
            <option value="price_desc">Preis: hoch → tief</option>
            <option value="price_asc">Preis: tief → hoch</option>
            <option value="stock_asc">Bestand aufsteigend</option>
            <option value="stock_desc">Bestand absteigend</option>
          </select>

          {/* View toggle */}
          <div
            className="flex items-center rounded-lg border overflow-hidden flex-shrink-0"
            style={{ borderColor: BDR }}
          >
            {([
              { mode: 'table', Icon: LayoutList, title: 'Tabellenansicht' },
              { mode: 'grid',  Icon: LayoutGrid, title: 'Kachelansicht'   },
            ] as { mode: ViewMode; Icon: React.ElementType; title: string }[]).map(({ mode, Icon, title }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="px-2.5 py-1.5 transition-colors"
                style={{
                  background: viewMode === mode ? T1      : '#FAFAFA',
                  color:      viewMode === mode ? '#FFF'  : T3,
                }}
                title={title}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Result count */}
        {!loading && data && (
          <p className="text-[12px] -mt-1" style={{ color: T3 }}>
            {filtered.length === data.kpis.total
              ? `${filtered.length} Produkte`
              : `${filtered.length} von ${data.kpis.total} Produkten`}
          </p>
        )}

        {/* ────────────────────────────────────────────────────────────── */}
        {/* SECTION C — Product Table / Grid                              */}
        {/* ────────────────────────────────────────────────────────────── */}

        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: CARD, borderColor: BDR }}
        >
          {/* ── Loading ─────────────────────────────────────────────── */}
          {loading && <TableSkeleton />}

          {/* ── Empty state ─────────────────────────────────────────── */}
          {!loading && filtered.length === 0 && (
            <div className="py-20 flex flex-col items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: '#F5F5F5' }}
              >
                <Package className="w-8 h-8" style={{ color: T3 }} />
              </div>
              <div className="text-center">
                <p className="text-[15px] font-semibold mb-1" style={{ color: T1 }}>
                  {data?.kpis.total === 0 ? 'Noch keine Produkte' : 'Keine Produkte gefunden'}
                </p>
                <p className="text-[13px]" style={{ color: T3 }}>
                  {data?.kpis.total === 0
                    ? 'Erstelle dein erstes Produkt und starte mit dem Verkaufen.'
                    : 'Passe deine Filter an, um Produkte zu finden.'}
                </p>
              </div>
              {data?.kpis.total === 0 && (
                <Link
                  href="/seller/products/create"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-semibold text-white"
                  style={{ background: ACC }}
                >
                  <Plus className="w-4 h-4" />
                  Erstes Produkt erstellen
                </Link>
              )}
            </div>
          )}

          {/* ── TABLE VIEW ──────────────────────────────────────────── */}
          {!loading && filtered.length > 0 && viewMode === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BDR}`, background: '#FAFAFA' }}>
                    <th className="w-[56px] pl-5 py-3" />
                    <th className="px-3 py-3 text-left">
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: T3 }}>Produkt</span>
                    </th>
                    <th className="hidden md:table-cell px-3 py-3 text-left">
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: T3 }}>Kategorie</span>
                    </th>
                    <th className="px-3 py-3 text-right">
                      <div className="flex justify-end">
                        <SortHeader label="Preis" sortKey="price_desc" currentSort={sort} onSort={handleSort} />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left">
                      <SortHeader label="Bestand" sortKey="stock_asc" currentSort={sort} onSort={handleSort} />
                    </th>
                    <th className="px-3 py-3 text-left">
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: T3 }}>Status</span>
                    </th>
                    <th className="hidden lg:table-cell px-3 py-3 text-left">
                      <SortHeader label="Erstellt" sortKey="newest" currentSort={sort} onSort={handleSort} />
                    </th>
                    <th className="px-5 py-3 text-left" style={{ width: '112px' }}>
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: T3 }}>Aktionen</span>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((product, idx) => {
                    const sc       = getStatusCfg(product.moderationStatus, product.isActive)
                    const isLive   = product.moderationStatus === 'approved' && product.isActive
                    const toggling = togglingId === product.id
                    const thumb    = product.images[0] ?? null

                    return (
                      <tr
                        key={product.id}
                        className="group transition-colors"
                        style={{
                          borderBottom:  idx < filtered.length - 1 ? `1px solid #F5F5F5` : undefined,
                          background:    product.isActive ? 'transparent' : 'rgba(107,114,128,0.03)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                        onMouseLeave={e => (e.currentTarget.style.background = product.isActive ? 'transparent' : 'rgba(107,114,128,0.03)')}
                      >
                        {/* Thumbnail */}
                        <td className="pl-5 pr-2 py-3 w-[56px]">
                          <div
                            className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
                            style={{ background: '#F5F5F5', border: `1px solid ${BDR}` }}
                          >
                            {thumb ? (
                              <Image
                                src={thumb}
                                alt={product.title}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-4 h-4" style={{ color: T3 }} />
                            )}
                          </div>
                        </td>

                        {/* Title + SKU */}
                        <td className="px-3 py-3" style={{ maxWidth: '220px' }}>
                          <p
                            className="text-[13px] font-semibold leading-tight line-clamp-1"
                            style={{ color: product.isActive ? T1 : T3 }}
                          >
                            {product.title}
                          </p>
                          {(product.sku || product.brand) && (
                            <p className="text-[11px] mt-0.5 truncate" style={{ color: T3 }}>
                              {[product.brand, product.sku ? `SKU: ${product.sku}` : null]
                                .filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </td>

                        {/* Category */}
                        <td className="hidden md:table-cell px-3 py-3">
                          {product.category && (
                            <span
                              className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium"
                              style={{ background: '#F3F4F6', color: '#374151' }}
                            >
                              {product.category}
                            </span>
                          )}
                        </td>

                        {/* Price */}
                        <td className="px-3 py-3 text-right">
                          <span className="text-[13px] font-semibold" style={{ color: T1 }}>
                            {fmtPrice(product.price)}
                          </span>
                          {product.compareAtPrice && product.compareAtPrice > product.price && (
                            <p className="text-[11px] line-through" style={{ color: T3 }}>
                              {fmtPrice(product.compareAtPrice)}
                            </p>
                          )}
                        </td>

                        {/* Stock */}
                        <td className="px-3 py-3">
                          <StockBadge qty={product.stockQuantity} threshold={product.lowStockThreshold} />
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3">
                          <span
                            className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap"
                            style={{ background: sc.bg, color: sc.color }}
                          >
                            {sc.label}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="hidden lg:table-cell px-3 py-3">
                          <span className="text-[12px]" style={{ color: T3 }}>
                            {fmtDate(product.createdAt)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">

                            {/* Edit */}
                            <Link
                              href={`/seller/products/${product.id}/edit`}
                              className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors"
                              style={{ borderColor: BDR, background: '#FAFAFA', color: T2 }}
                              title="Bearbeiten"
                              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#F0F0F0')}
                              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#FAFAFA')}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Link>

                            {/* View live */}
                            {isLive ? (
                              <Link
                                href={`/products/${product.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors"
                                style={{ borderColor: '#BBF7D0', background: '#F0FDF4', color: '#16A34A' }}
                                title="Im Shop ansehen"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Link>
                            ) : (
                              <span
                                className="w-7 h-7 rounded-lg flex items-center justify-center border"
                                style={{ borderColor: BDR, background: '#FAFAFA', color: T3, opacity: 0.35, cursor: 'not-allowed' }}
                                title={!product.isActive ? 'Produkt ist inaktiv' : 'Noch nicht freigegeben'}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </span>
                            )}

                            {/* Toggle visibility */}
                            <button
                              onClick={() => handleToggleVisibility(product)}
                              disabled={!!togglingId}
                              className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors"
                              style={{
                                borderColor: product.isActive ? BDR        : '#FDE68A',
                                background:  product.isActive ? '#FAFAFA'  : '#FFFBEB',
                                color:       product.isActive ? T3         : '#D97706',
                                opacity:     toggling ? 0.45 : 1,
                                cursor:      togglingId && !toggling ? 'not-allowed' : 'pointer',
                              }}
                              title={product.isActive ? 'Deaktivieren' : 'Aktivieren'}
                              onMouseEnter={e => {
                                if (togglingId) return
                                ;(e.currentTarget as HTMLElement).style.background =
                                  product.isActive ? '#FEE2E2' : '#DCFCE7'
                              }}
                              onMouseLeave={e => {
                                ;(e.currentTarget as HTMLElement).style.background =
                                  product.isActive ? '#FAFAFA' : '#FFFBEB'
                              }}
                            >
                              {product.isActive
                                ? <EyeOff className="w-3.5 h-3.5" />
                                : <Eye    className="w-3.5 h-3.5" />
                              }
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── GRID VIEW ───────────────────────────────────────────── */}
          {!loading && filtered.length > 0 && viewMode === 'grid' && (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map(product => {
                const sc       = getStatusCfg(product.moderationStatus, product.isActive)
                const isLive   = product.moderationStatus === 'approved' && product.isActive
                const toggling = togglingId === product.id
                const thumb    = product.images[0] ?? null

                return (
                  <div
                    key={product.id}
                    className="rounded-xl border overflow-hidden transition-shadow hover:shadow-sm"
                    style={{ borderColor: BDR, opacity: product.isActive ? 1 : 0.7 }}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-square" style={{ background: '#F5F5F5' }}>
                      {thumb ? (
                        <Image src={thumb} alt={product.title} fill className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Package className="w-8 h-8" style={{ color: T3 }} />
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ background: sc.bg, color: sc.color }}
                        >
                          {sc.label}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3 space-y-2">
                      <p
                        className="text-[13px] font-semibold leading-tight line-clamp-2"
                        style={{ color: T1 }}
                      >
                        {product.title}
                      </p>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14px] font-bold" style={{ color: T1 }}>
                          {fmtPrice(product.price)}
                        </span>
                        <StockBadge qty={product.stockQuantity} threshold={product.lowStockThreshold} />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <Link
                          href={`/seller/products/${product.id}/edit`}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors"
                          style={{ borderColor: BDR, color: T2, background: '#FAFAFA' }}
                        >
                          <Edit2 className="w-3 h-3" />
                          Bearbeiten
                        </Link>

                        {isLive ? (
                          <Link
                            href={`/products/${product.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-7 h-7 rounded-lg flex items-center justify-center border flex-shrink-0"
                            style={{ borderColor: '#BBF7D0', background: '#F0FDF4', color: '#16A34A' }}
                            title="Im Shop ansehen"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                        ) : (
                          <span
                            className="w-7 h-7 rounded-lg flex items-center justify-center border flex-shrink-0"
                            style={{ borderColor: BDR, background: '#FAFAFA', color: T3, opacity: 0.35, cursor: 'not-allowed' }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </span>
                        )}

                        <button
                          onClick={() => handleToggleVisibility(product)}
                          disabled={!!togglingId}
                          className="w-7 h-7 rounded-lg flex items-center justify-center border flex-shrink-0 transition-colors"
                          style={{
                            borderColor: product.isActive ? BDR       : '#FDE68A',
                            background:  product.isActive ? '#FAFAFA' : '#FFFBEB',
                            color:       product.isActive ? T3        : '#D97706',
                            opacity:     toggling ? 0.45 : 1,
                          }}
                          title={product.isActive ? 'Deaktivieren' : 'Aktivieren'}
                        >
                          {product.isActive
                            ? <EyeOff className="w-3.5 h-3.5" />
                            : <Eye    className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="h-6" />
      </div>
    </div>
  )
}
