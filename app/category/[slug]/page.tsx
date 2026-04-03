'use client'

/**
 * /category/[slug] — Category Product Listing Page (PLP)
 *
 * Premium PLP with:
 *   - Breadcrumb + category header + result count
 *   - Desktop: filter sidebar + product grid
 *   - Mobile: sticky controls + filter drawer
 *   - Sort dropdown (Relevanz, Neueste, Preis↑, Preis↓)
 *   - Filters: price range, brand, in-stock
 *   - Active filter pills with clear-all
 *   - Skeleton loading, empty states, load-more pagination
 *   - 2/3/4 column responsive grid using existing ProductCard
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronRight, SlidersHorizontal, X, ArrowUpDown,
  Package, Search, Check, ChevronDown, Loader2,
} from 'lucide-react'
import { ProductCard, type ProductCardDTO } from '@/components/storefront/ProductCard'

// ─── Design tokens ───────────────────────────────────────────────────────────

const BG  = 'var(--lux-bg, #0E0E10)'
const L1  = 'var(--lux-layer-1, #141416)'
const L2  = 'var(--lux-layer-2, #1B1B1E)'
const T1  = 'rgba(255,255,255,0.92)'
const T2  = 'rgba(255,255,255,0.60)'
const T3  = 'rgba(255,255,255,0.35)'
const BDR = 'rgba(255,255,255,0.08)'
const ACC = '#D97706'

// Turkish → German category name mapping (DB may have Turkish names)
const TR_TO_DE: Record<string, string> = {
  'Üst Giyim':        'Oberbekleidung',
  'Alt Giyim':        'Unterbekleidung',
  'Ayakkabı':         'Schuhe',
  'Aksesuar':         'Accessoires',
  'Çanta':            'Taschen',
  'Takı':             'Schmuck',
  'Spor Giyim':       'Sportbekleidung',
  'Dış Giyim':        'Oberbekleidung',
  'İç Giyim':         'Unterwäsche',
  'Elektronik':       'Elektronik',
  'Ev & Yaşam':       'Haus & Wohnen',
}
function trDe(name: string): string { return TR_TO_DE[name] || name }

// ─── Types ───────────────────────────────────────────────────────────────────

interface CategoryInfo { slug: string; name: string }
interface BrandInfo    { name: string; count: number }
interface Filters      { availableBrands: BrandInfo[]; priceMin: number; priceMax: number }

type SortKey = 'relevance' | 'newest' | 'price_asc' | 'price_desc'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'relevance',  label: 'Relevanz'               },
  { value: 'newest',     label: 'Neueste'                 },
  { value: 'price_asc',  label: 'Preis: niedrig → hoch'  },
  { value: 'price_desc', label: 'Preis: hoch → niedrig'  },
]

const PAGE_SIZE = 24

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtPrice(v: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v)
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CategoryPLPPage() {
  const { slug } = useParams<{ slug: string }>()

  // Data
  const [category, setCategory] = useState<CategoryInfo | null>(null)
  const [filters,  setFilters]  = useState<Filters | null>(null)
  const [products, setProducts] = useState<ProductCardDTO[]>([])
  const [total,    setTotal]    = useState(0)

  // UI state
  const [loading,      setLoading]      = useState(true)
  const [loadingMore,  setLoadingMore]  = useState(false)
  const [notFound,     setNotFound]     = useState(false)
  const [page,         setPage]         = useState(1)
  const [sort,         setSort]         = useState<SortKey>('relevance')
  const [sortOpen,     setSortOpen]     = useState(false)
  const [drawerOpen,   setDrawerOpen]   = useState(false)

  // Active filters
  const [minPrice,     setMinPrice]     = useState('')
  const [maxPrice,     setMaxPrice]     = useState('')
  const [brands,       setBrands]       = useState<Set<string>>(new Set())
  const [inStock,      setInStock]      = useState(false)

  // ── Fetch data ────────────────────────────────────────────────────────────

  const buildUrl = useCallback((p: number) => {
    const params = new URLSearchParams()
    params.set('sort', sort)
    params.set('page', String(p))
    params.set('limit', String(PAGE_SIZE))
    if (minPrice) params.set('minPrice', minPrice)
    if (maxPrice) params.set('maxPrice', maxPrice)
    if (brands.size > 0) params.set('brand', Array.from(brands).join(','))
    if (inStock) params.set('inStock', '1')
    return `/api/category/${slug}?${params}`
  }, [slug, sort, minPrice, maxPrice, brands, inStock])

  const fetchPage = useCallback(async (p: number, append = false) => {
    if (!slug) return
    if (append) setLoadingMore(true)
    else        setLoading(true)

    try {
      const res  = await fetch(buildUrl(p))
      const json = await res.json()

      if (!json.success) {
        if (res.status === 404) setNotFound(true)
        return
      }

      setCategory(json.category)
      setFilters(json.filters)
      setTotal(json.total)
      setPage(p)

      if (append) {
        setProducts(prev => [...prev, ...json.products])
      } else {
        setProducts(json.products)
      }
    } catch {
      // Network error — keep existing data
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [slug, buildUrl])

  // Initial load + re-fetch on filter/sort changes
  useEffect(() => {
    setNotFound(false)
    fetchPage(1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, sort, minPrice, maxPrice, brands, inStock])

  const hasMore = products.length < total

  // ── Active filter pills ──────────────────────────────────────────────────

  const activeFilters = useMemo(() => {
    const pills: { key: string; label: string; onRemove: () => void }[] = []
    if (minPrice) pills.push({
      key: 'minPrice',
      label: `Ab ${fmtPrice(Number(minPrice))}`,
      onRemove: () => setMinPrice(''),
    })
    if (maxPrice) pills.push({
      key: 'maxPrice',
      label: `Bis ${fmtPrice(Number(maxPrice))}`,
      onRemove: () => setMaxPrice(''),
    })
    for (const b of brands) {
      pills.push({
        key: `brand-${b}`,
        label: b,
        onRemove: () => setBrands(prev => {
          const next = new Set(prev)
          next.delete(b)
          return next
        }),
      })
    }
    if (inStock) pills.push({
      key: 'inStock',
      label: 'Auf Lager',
      onRemove: () => setInStock(false),
    })
    return pills
  }, [minPrice, maxPrice, brands, inStock])

  const clearAllFilters = () => {
    setMinPrice('')
    setMaxPrice('')
    setBrands(new Set())
    setInStock(false)
  }

  // ── Toggle brand ─────────────────────────────────────────────────────────

  const toggleBrand = (name: string) => {
    setBrands(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  // ── 404 ──────────────────────────────────────────────────────────────────

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="text-center max-w-sm">
          <Package size={48} style={{ color: T3 }} className="mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2" style={{ color: T1 }}>
            Kategorie nicht gefunden
          </p>
          <p className="text-sm mb-6" style={{ color: T2 }}>
            Diese Kategorie existiert nicht oder enthält keine Produkte.
          </p>
          <Link
            href="/categories"
            className="inline-block px-6 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: ACC, color: '#fff' }}
          >
            Alle Kategorien
          </Link>
        </div>
      </div>
    )
  }

  // ── Filter sidebar content (reused in desktop + mobile drawer) ───────────

  const FilterSidebarContent = (
    <div className="space-y-6">
      {/* Price range */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: T2 }}>
          Preis
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            placeholder={filters ? String(filters.priceMin) : '0'}
            value={minPrice}
            onChange={e => setMinPrice(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: L2, border: `1px solid ${BDR}`, color: T1 }}
          />
          <span className="text-xs shrink-0" style={{ color: T3 }}>—</span>
          <input
            type="number"
            min={0}
            placeholder={filters ? String(filters.priceMax) : '999'}
            value={maxPrice}
            onChange={e => setMaxPrice(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: L2, border: `1px solid ${BDR}`, color: T1 }}
          />
        </div>
        {filters && (
          <p className="text-[11px] mt-1.5" style={{ color: T3 }}>
            {fmtPrice(filters.priceMin)} — {fmtPrice(filters.priceMax)}
          </p>
        )}
      </div>

      {/* In stock */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: T2 }}>
          Verfügbarkeit
        </p>
        <button
          onClick={() => setInStock(!inStock)}
          className="flex items-center gap-2.5 w-full text-left text-sm py-1.5"
          style={{ color: T1 }}
        >
          <span
            className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
            style={{
              borderColor: inStock ? ACC : 'rgba(255,255,255,0.2)',
              background: inStock ? ACC : 'transparent',
            }}
          >
            {inStock && <Check size={11} color="#fff" strokeWidth={3} />}
          </span>
          Nur auf Lager
        </button>
      </div>

      {/* Brands */}
      {filters && filters.availableBrands.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: T2 }}>
            Marke
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {filters.availableBrands.map(b => (
              <button
                key={b.name}
                onClick={() => toggleBrand(b.name)}
                className="flex items-center gap-2.5 w-full text-left text-sm py-1"
                style={{ color: T1 }}
              >
                <span
                  className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                  style={{
                    borderColor: brands.has(b.name) ? ACC : 'rgba(255,255,255,0.2)',
                    background: brands.has(b.name) ? ACC : 'transparent',
                  }}
                >
                  {brands.has(b.name) && <Check size={11} color="#fff" strokeWidth={3} />}
                </span>
                <span className="truncate">{b.name}</span>
                <span className="ml-auto text-[11px] shrink-0" style={{ color: T3 }}>
                  {b.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: BG }}>

      {/* ── Mobile filter drawer ─────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer */}
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl p-6 pb-10 max-h-[80vh] overflow-y-auto"
            style={{ background: L1 }}
          >
            <div className="flex items-center justify-between mb-6">
              <p className="font-semibold" style={{ color: T1 }}>Filter</p>
              <button onClick={() => setDrawerOpen(false)}>
                <X size={20} style={{ color: T2 }} />
              </button>
            </div>
            {FilterSidebarContent}
            <button
              onClick={() => setDrawerOpen(false)}
              className="w-full mt-6 py-3 rounded-xl text-sm font-semibold"
              style={{ background: ACC, color: '#fff' }}
            >
              {total} Ergebnisse anzeigen
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">

        {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
        <nav className="flex items-center gap-1.5 text-xs mb-5" style={{ color: T3 }}>
          <Link href="/" className="hover:underline" style={{ color: T2 }}>Startseite</Link>
          <ChevronRight size={12} />
          <Link href="/categories" className="hover:underline" style={{ color: T2 }}>Kategorien</Link>
          <ChevronRight size={12} />
          <span style={{ color: T1 }}>{trDe(category?.name ?? slug)}</span>
        </nav>

        {/* ── Category header ────────────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: T1 }}>
            {loading && !category ? (
              <span className="inline-block h-8 w-48 rounded-lg animate-pulse" style={{ background: L2 }} />
            ) : (
              trDe(category?.name ?? slug)
            )}
          </h1>
          {!loading && (
            <p className="text-sm" style={{ color: T2 }}>
              {total} {total === 1 ? 'Produkt' : 'Produkte'}
            </p>
          )}
        </div>

        {/* ── Controls bar ───────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 mb-6 pb-4"
          style={{ borderBottom: `1px solid ${BDR}` }}
        >
          {/* Mobile filter button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium"
            style={{ background: L1, border: `1px solid ${BDR}`, color: T1 }}
          >
            <SlidersHorizontal size={15} />
            Filter
            {activeFilters.length > 0 && (
              <span
                className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                style={{ background: ACC, color: '#fff' }}
              >
                {activeFilters.length}
              </span>
            )}
          </button>

          {/* Sort dropdown */}
          <div className="relative ml-auto">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium"
              style={{ background: L1, border: `1px solid ${BDR}`, color: T1 }}
            >
              <ArrowUpDown size={14} />
              {SORT_OPTIONS.find(o => o.value === sort)?.label}
              <ChevronDown size={14} style={{ color: T3 }} />
            </button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                <div
                  className="absolute right-0 top-full mt-1 w-56 rounded-xl p-1.5 z-20 shadow-xl"
                  style={{ background: L1, border: `1px solid ${BDR}` }}
                >
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setSort(opt.value); setSortOpen(false) }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
                      style={{
                        color: sort === opt.value ? ACC : T1,
                        background: sort === opt.value ? `${ACC}15` : 'transparent',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Active filter pills ────────────────────────────────────────── */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {activeFilters.map(pill => (
              <button
                key={pill.key}
                onClick={pill.onRemove}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                style={{ background: `${ACC}18`, color: ACC, border: `1px solid ${ACC}30` }}
              >
                {pill.label}
                <X size={12} />
              </button>
            ))}
            <button
              onClick={clearAllFilters}
              className="text-xs font-medium px-2 py-1"
              style={{ color: T2 }}
            >
              Alle entfernen
            </button>
          </div>
        )}

        {/* ── Main layout: sidebar + grid ─────────────────────────────────── */}
        <div className="flex gap-8">

          {/* Desktop filter sidebar */}
          <aside
            className="hidden lg:block w-56 shrink-0 sticky top-20 self-start rounded-2xl p-5"
            style={{ background: L1, border: `1px solid ${BDR}` }}
          >
            <p className="text-xs font-bold uppercase tracking-wider mb-5" style={{ color: T2 }}>
              Filter
            </p>
            {FilterSidebarContent}
          </aside>

          {/* Product grid area */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <ProductGridSkeleton />
            ) : products.length === 0 ? (
              <EmptyState hasFilters={activeFilters.length > 0} onClear={clearAllFilters} />
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {products.map(p => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>

                {/* Load more */}
                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={() => fetchPage(page + 1, true)}
                      disabled={loadingMore}
                      className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold transition-colors"
                      style={{
                        background: L1,
                        border: `1px solid ${BDR}`,
                        color: T1,
                        opacity: loadingMore ? 0.6 : 1,
                      }}
                    >
                      {loadingMore ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : null}
                      {loadingMore ? 'Laden...' : 'Mehr laden'}
                    </button>
                  </div>
                )}

                {/* End of results */}
                {!hasMore && products.length > 0 && (
                  <p className="text-center text-xs mt-8" style={{ color: T3 }}>
                    Alle {total} Produkte angezeigt
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden" style={{ background: L1, border: `1px solid ${BDR}` }}>
          <div className="aspect-[3/4] animate-pulse" style={{ background: L2 }} />
          <div className="p-3 space-y-2">
            <div className="h-3 w-3/4 rounded animate-pulse" style={{ background: L2 }} />
            <div className="h-3 w-1/2 rounded animate-pulse" style={{ background: L2 }} />
            <div className="h-4 w-1/3 rounded animate-pulse" style={{ background: L2 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="text-center py-20">
      <Search size={40} style={{ color: T3 }} className="mx-auto mb-4" />
      <p className="text-base font-semibold mb-2" style={{ color: T1 }}>
        Keine Produkte gefunden
      </p>
      <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: T2 }}>
        {hasFilters
          ? 'Versuche andere Filter oder entferne einige, um mehr Ergebnisse zu sehen.'
          : 'In dieser Kategorie gibt es aktuell keine Produkte.'}
      </p>
      {hasFilters && (
        <button
          onClick={onClear}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: ACC, color: '#fff' }}
        >
          Filter zurücksetzen
        </button>
      )}
    </div>
  )
}
