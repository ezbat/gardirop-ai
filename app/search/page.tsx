'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { Search, SlidersHorizontal, ChevronDown, X } from 'lucide-react'
import { ProductCard, type ProductCardDTO } from '@/components/storefront/ProductCard'
import { SkeletonRow } from '@/components/storefront/SkeletonCard'

// ─── Types ───────────────────────────────────────────────────────────────────

type SortKey = 'relevance' | 'new' | 'price_asc' | 'price_desc'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'relevance',  label: 'Relevanz'           },
  { key: 'new',        label: 'Neueste zuerst'     },
  { key: 'price_asc',  label: 'Preis: günstigste'  },
  { key: 'price_desc', label: 'Preis: teuerste'    },
]

// ─── Inner component (requires Suspense boundary for useSearchParams) ─────────

function SearchPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const prefersReduced = useReducedMotion()

  const q = searchParams.get('q') ?? ''
  const [inputValue, setInputValue] = useState(q)
  const [sort, setSort]             = useState<SortKey>('relevance')
  const [products, setProducts]     = useState<ProductCardDTO[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading]       = useState(false)
  const [sortOpen, setSortOpen]     = useState(false)

  useEffect(() => { setInputValue(q) }, [q])

  const fetchResults = useCallback(async (query: string, sortKey: SortKey) => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/storefront/search?q=${encodeURIComponent(query)}&limit=24&sort=${sortKey}`,
        { cache: 'no-store' },
      )
      const data = await res.json()
      if (data.success) {
        setProducts(data.products ?? [])
        setSuggestions((data.suggestions ?? []).map((s: { text: string }) => s.text))
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (q) fetchResults(q, sort)
    else { setProducts([]); setSuggestions([]) }
  }, [q, sort, fetchResults])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const v = inputValue.trim()
    if (!v) return
    router.push(`/search?q=${encodeURIComponent(v)}`)
  }

  const sortLabel = SORT_OPTIONS.find((o) => o.key === sort)?.label ?? 'Relevanz'

  return (
    <div className="min-h-screen" style={{ background: '#FAFAFA' }}>

      {/* ── Sticky search bar ────────────────────────────── */}
      <div
        className="sticky top-0 z-30 py-[12px]"
        style={{ background: '#FFFFFF', borderBottom: '1px solid #F0F0F0' }}
      >
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <form onSubmit={handleSearch}>
            <div
              className="flex items-stretch h-[44px] rounded-[8px] overflow-hidden"
              style={{ border: '2px solid #D97706' }}
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Produkte suchen…"
                className="flex-1 h-full outline-none text-[14px] px-[14px]"
                style={{ background: '#FFFFFF', color: '#1A1A1A', border: 'none' }}
                autoFocus={!q}
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => setInputValue('')}
                  className="flex-shrink-0 h-full px-[10px] flex items-center"
                  style={{ background: '#FFFFFF' }}
                  aria-label="Suche löschen"
                >
                  <X className="w-[14px] h-[14px]" style={{ color: '#AAA' }} />
                </button>
              )}
              <button
                type="submit"
                className="flex-shrink-0 h-full w-[50px] flex items-center justify-center"
                style={{ background: '#D97706' }}
                aria-label="Suchen"
              >
                <Search className="w-[18px] h-[18px]" style={{ color: '#FFFFFF' }} />
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-[24px]">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-[20px] flex-wrap gap-[10px]">
          <div>
            {q ? (
              <>
                <h1 className="text-[18px] font-bold" style={{ color: '#1A1A1A' }}>
                  Suchergebnisse für &ldquo;{q}&rdquo;
                </h1>
                {!loading && (
                  <p className="text-[12px] mt-[2px]" style={{ color: '#999' }}>
                    {products.length} Produkte gefunden
                  </p>
                )}
              </>
            ) : (
              <h1 className="text-[18px] font-bold" style={{ color: '#1A1A1A' }}>
                Suche
              </h1>
            )}
          </div>

          {/* Sort */}
          {q && (
            <div className="relative">
              <button
                onClick={() => setSortOpen((o) => !o)}
                className="flex items-center gap-[6px] px-[12px] py-[8px] rounded-[8px]
                  text-[12px] font-medium"
                style={{ background: '#FFFFFF', border: '1px solid #E5E5E5', color: '#555' }}
              >
                <SlidersHorizontal className="w-[13px] h-[13px]" />
                {sortLabel}
                <ChevronDown className="w-[12px] h-[12px]" />
              </button>
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                  <div
                    className="absolute right-0 top-[calc(100%+4px)] z-20 rounded-[8px]
                      py-[4px] min-w-[180px]"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E5E5E5',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    }}
                  >
                    {SORT_OPTIONS.map((o) => (
                      <button
                        key={o.key}
                        onClick={() => { setSort(o.key); setSortOpen(false) }}
                        className="block w-full text-left px-[12px] py-[8px] text-[12px]"
                        style={{
                          color:      sort === o.key ? '#D97706' : '#333',
                          background: sort === o.key ? '#FFFBEB' : 'transparent',
                          fontWeight: sort === o.key ? 700 : 400,
                        }}
                        onMouseEnter={(e) => { if (sort !== o.key) e.currentTarget.style.background = '#F8F8F8' }}
                        onMouseLeave={(e) => { if (sort !== o.key) e.currentTarget.style.background = 'transparent' }}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Suggestion pills ─────────────────────────────── */}
        {!loading && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-[6px] mb-[20px]">
            {suggestions.slice(0, 6).map((s) => (
              <button
                key={s}
                onClick={() => router.push(`/search?q=${encodeURIComponent(s)}`)}
                className="px-[10px] py-[5px] rounded-full text-[11px] font-medium"
                style={{ background: '#FFFFFF', border: '1px solid #E5E5E5', color: '#555' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#D97706'; e.currentTarget.style.color = '#D97706' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E5E5E5'; e.currentTarget.style.color = '#555' }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* ── Loading ──────────────────────────────────────── */}
        {loading && <SkeletonRow count={8} />}

        {/* ── Results grid ─────────────────────────────────── */}
        {!loading && products.length > 0 && (
          <motion.div
            initial={prefersReduced ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-[12px]"
          >
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} animate={!prefersReduced} index={i} />
            ))}
          </motion.div>
        )}

        {/* ── Empty results ─────────────────────────────────── */}
        {!loading && q && !products.length && (
          <div className="py-[80px] text-center">
            <div
              className="w-[56px] h-[56px] rounded-full flex items-center justify-center mx-auto mb-[16px]"
              style={{ background: '#F5F5F5' }}
            >
              <Search className="w-[24px] h-[24px]" style={{ color: '#DDD' }} />
            </div>
            <h2 className="text-[16px] font-bold mb-[8px]" style={{ color: '#1A1A1A' }}>
              Keine Ergebnisse für &ldquo;{q}&rdquo;
            </h2>
            <p className="text-[13px] mb-[20px]" style={{ color: '#999' }}>
              Versuche andere Suchbegriffe oder durchstöbere unsere Kategorien
            </p>
            <button
              onClick={() => router.push('/store')}
              className="inline-flex items-center px-[20px] py-[10px] rounded-[8px]
                text-[13px] font-bold"
              style={{ background: '#D97706', color: '#FFF' }}
            >
              Alle Produkte ansehen
            </button>
          </div>
        )}

        {/* ── No query placeholder ─────────────────────────── */}
        {!q && !loading && (
          <div className="py-[80px] text-center">
            <Search className="w-[32px] h-[32px] mx-auto mb-[12px]" style={{ color: '#DDD' }} />
            <p className="text-[15px] font-medium mb-[4px]" style={{ color: '#555' }}>
              Was suchst du?
            </p>
            <p className="text-[13px]" style={{ color: '#AAA' }}>
              Gib einen Suchbegriff ein, um Produkte zu finden
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page (Suspense boundary required for useSearchParams) ───────────────────

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAFA' }}>
          <div className="flex gap-[5px]">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-[7px] h-[7px] rounded-full animate-pulse"
                style={{ background: '#D97706', animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      }
    >
      <SearchPageInner />
    </Suspense>
  )
}
