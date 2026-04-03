'use client'

/**
 * SearchOverlay — Premium fullscreen search experience.
 *
 * At rest: only a search icon is visible in the header.
 * On click: a fullscreen overlay slides in with a large input,
 * trending searches, category pills, and instant product results.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Search, X, ArrowRight, TrendingUp, Clock, Sparkles, ChevronRight,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Suggestion { text: string; reason: string }
interface CategoryHit { name: string; slug: string }
interface ProductHit {
  id: string; title: string; price: number; currency: string
  images: string[]; discountPercent?: number; compareAtPrice?: number
  category?: string
}
interface SearchData {
  suggestions: Suggestion[]; categories: CategoryHit[]
  products: ProductHit[]; preview: ProductHit | null
}

// ─── Trending / default content ──────────────────────────────────────────────

const TRENDING_SEARCHES = [
  'Sneaker', 'Sommerkleid', 'Jacken', 'Accessoires', 'Sportbekleidung', 'Taschen',
]

const QUICK_CATEGORIES = [
  { label: 'Mode', slug: 'Oberbekleidung', emoji: '👗' },
  { label: 'Schuhe', slug: 'Schuhe', emoji: '👟' },
  { label: 'Schmuck', slug: 'Accessoires', emoji: '💎' },
  { label: 'Sport', slug: 'Sportbekleidung', emoji: '🏃' },
  { label: 'Taschen', slug: 'Çanta', emoji: '👜' },
  { label: 'Kleider', slug: 'Kleid', emoji: '✨' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtPrice(n: number, cur = 'EUR') {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency', currency: cur,
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n)
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-white font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

interface SearchOverlayProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const router = useRouter()
  const prefersReduced = useReducedMotion()
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const [query, setQuery] = useState('')
  const [data, setData] = useState<SearchData | null>(null)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  useEffect(() => { setMounted(true) }, [])

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('wearo-recent-searches')
      if (stored) setRecentSearches(JSON.parse(stored).slice(0, 5))
    } catch {}
  }, [isOpen])

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
      // Fetch initial suggestions
      if (!data && !query) doSearch('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handler)
      return () => document.removeEventListener('keydown', handler)
    }
  }, [isOpen, onClose])

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const doSearch = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/storefront/search?q=${encodeURIComponent(q)}&limit=8`,
        { cache: 'no-store' },
      )
      const json = await res.json()
      if (json.success) {
        setData(json as SearchData)
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [])

  // ── Handlers ───────────────────────────────────────────────────────────────
  function navigate(href: string) {
    onClose()
    router.push(href)
  }

  function saveSearch(term: string) {
    try {
      const prev = JSON.parse(localStorage.getItem('wearo-recent-searches') || '[]') as string[]
      const next = [term, ...prev.filter(s => s !== term)].slice(0, 8)
      localStorage.setItem('wearo-recent-searches', JSON.stringify(next))
    } catch {}
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const q = query.trim()
    if (!q) return
    saveSearch(q)
    navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(val), 220)
  }

  function searchFor(term: string) {
    saveSearch(term)
    navigate(`/search?q=${encodeURIComponent(term)}`)
  }

  function clearRecent() {
    localStorage.removeItem('wearo-recent-searches')
    setRecentSearches([])
  }

  const suggestions = data?.suggestions ?? []
  const products = data?.products ?? []
  const hasResults = query.length > 0 && (suggestions.length > 0 || products.length > 0)
  const showDefault = !query || (!hasResults && !loading)

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="search-overlay"
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9998]"
          style={{ background: 'rgba(8, 10, 16, 0.92)', backdropFilter: 'blur(20px)' }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center
              transition-all duration-150 hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.65)' }}
            aria-label="Suche schließen"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content wrapper */}
          <motion.div
            initial={prefersReduced ? {} : { y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={prefersReduced ? {} : { y: -20, opacity: 0 }}
            transition={{ duration: 0.25, delay: 0.05, ease: 'easeOut' }}
            className="max-w-2xl mx-auto px-5 pt-16 md:pt-24"
          >
            {/* ── Search Input ─────────────────────────────────── */}
            <form onSubmit={handleSubmit} className="relative mb-8">
              <div
                className="flex items-center h-14 rounded-2xl overflow-hidden transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: '0 0 40px rgba(217,119,6,0.08)',
                }}
              >
                <Search className="w-5 h-5 ml-5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.55)' }} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={handleChange}
                  placeholder="Suche nach Produkten, Marken, Kategorien..."
                  className="flex-1 h-full bg-transparent outline-none text-base px-4 text-white
                    placeholder:text-white/30"
                  autoComplete="off"
                  spellCheck={false}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => { setQuery(''); setData(null); inputRef.current?.focus() }}
                    className="flex-shrink-0 px-3 h-full flex items-center hover:bg-white/5 transition-colors"
                  >
                    <X className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.6)' }} />
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-shrink-0 h-full px-5 flex items-center justify-center transition-colors
                    hover:bg-white/5"
                  style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <ArrowRight className="w-5 h-5" style={{ color: '#D97706' }} />
                </button>
              </div>

              {/* Loading indicator */}
              {loading && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
                  className="absolute bottom-0 left-0 h-[2px] w-full origin-left"
                  style={{ background: 'linear-gradient(90deg, transparent, #D97706, transparent)' }}
                />
              )}
            </form>

            {/* ── Default state: trending + recent + categories ── */}
            {showDefault && (
              <motion.div
                initial={prefersReduced ? {} : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className="space-y-8"
              >
                {/* Recent searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.55)' }} />
                        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.55)' }}>
                          Letzte Suchen
                        </span>
                      </div>
                      <button
                        onClick={clearRecent}
                        className="text-[11px] transition-colors hover:text-white/60"
                        style={{ color: 'rgba(255,255,255,0.65)' }}
                      >
                        Löschen
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((term) => (
                        <button
                          key={term}
                          onClick={() => searchFor(term)}
                          className="px-3.5 py-1.5 rounded-full text-sm transition-all duration-150
                            hover:bg-white/12 hover:border-white/20"
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: 'rgba(255,255,255,0.6)',
                          }}
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending searches */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-3.5 h-3.5" style={{ color: '#D97706' }} />
                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      Im Trend
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {TRENDING_SEARCHES.map((term) => (
                      <button
                        key={term}
                        onClick={() => searchFor(term)}
                        className="px-3.5 py-1.5 rounded-full text-sm transition-all duration-150
                          hover:bg-amber-500/20 hover:border-amber-500/30"
                        style={{
                          background: 'rgba(217,119,6,0.08)',
                          border: '1px solid rgba(217,119,6,0.15)',
                          color: 'rgba(255,255,255,0.65)',
                        }}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick categories */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.55)' }} />
                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      Kategorien entdecken
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {QUICK_CATEGORIES.map((cat) => (
                      <button
                        key={cat.slug}
                        onClick={() => navigate(`/store?cat=${cat.slug}`)}
                        className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl
                          transition-all duration-150 hover:bg-white/8 hover:scale-[1.04]"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <span className="text-xl">{cat.emoji}</span>
                        <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>
                          {cat.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Results state ────────────────────────────────── */}
            {query && !showDefault && (
              <motion.div
                initial={prefersReduced ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div>
                    <span className="text-[10px] font-medium uppercase tracking-wider mb-2 block"
                      style={{ color: 'rgba(255,255,255,0.55)' }}>
                      Vorschläge
                    </span>
                    <div className="space-y-0.5">
                      {suggestions.slice(0, 5).map((s, i) => (
                        <button
                          key={i}
                          onClick={() => searchFor(s.text)}
                          className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg
                            transition-colors duration-100 hover:bg-white/6"
                        >
                          <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.65)' }} />
                          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                            <HighlightMatch text={s.text} query={query} />
                          </span>
                          <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0" style={{ color: 'rgba(255,255,255,0.6)' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Product results */}
                {products.length > 0 && (
                  <div>
                    <span className="text-[10px] font-medium uppercase tracking-wider mb-3 block"
                      style={{ color: 'rgba(255,255,255,0.55)' }}>
                      Produkte
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {products.slice(0, 8).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => navigate(`/products/${p.id}`)}
                          className="group text-left rounded-xl overflow-hidden transition-all duration-200
                            hover:scale-[1.03] hover:shadow-lg"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          {/* Image */}
                          <div className="relative aspect-square bg-white/5 overflow-hidden">
                            {p.images?.[0] ? (
                              <Image
                                src={p.images[0]}
                                alt={p.title}
                                fill
                                sizes="160px"
                                className="object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-white/10" />
                              </div>
                            )}
                            {p.discountPercent && p.discountPercent > 0 && (
                              <div
                                className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold"
                                style={{ background: '#DC2626', color: '#FFF' }}
                              >
                                -{p.discountPercent}%
                              </div>
                            )}
                          </div>
                          {/* Info */}
                          <div className="p-2.5">
                            <p className="text-[11px] font-medium line-clamp-1 mb-1"
                              style={{ color: 'rgba(255,255,255,0.7)' }}>
                              {p.title}
                            </p>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xs font-bold" style={{ color: '#D97706' }}>
                                {fmtPrice(p.price, p.currency)}
                              </span>
                              {p.compareAtPrice && p.compareAtPrice > p.price && (
                                <span className="text-[10px] line-through" style={{ color: 'rgba(255,255,255,0.65)' }}>
                                  {fmtPrice(p.compareAtPrice, p.currency)}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* See all results */}
                    <button
                      onClick={handleSubmit}
                      className="flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl w-full justify-center
                        transition-all duration-150 hover:bg-amber-500/15"
                      style={{
                        background: 'rgba(217,119,6,0.08)',
                        border: '1px solid rgba(217,119,6,0.15)',
                        color: '#D97706',
                      }}
                    >
                      <span className="text-sm font-medium">
                        Alle Ergebnisse für &ldquo;{query.slice(0, 30)}&rdquo;
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* No results */}
                {!loading && !suggestions.length && !products.length && (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <Search className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.45)' }} />
                    </div>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      Keine Ergebnisse für &ldquo;{query.slice(0, 40)}&rdquo;
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      Versuche einen anderen Suchbegriff
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

// ─── Trigger button (for use in nav header) ──────────────────────────────────

interface SearchTriggerProps {
  onClick: () => void
  className?: string
}

export function SearchTrigger({ onClick, className = '' }: SearchTriggerProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 px-4 py-2 rounded-full transition-all duration-200
        hover:bg-black/5 active:scale-[0.97] ${className}`}
      style={{
        background: 'rgba(0,0,0,0.03)',
        border: '1px solid rgba(0,0,0,0.06)',
      }}
      aria-label="Suche öffnen"
    >
      <Search className="w-4 h-4" style={{ color: '#999' }} />
      <span className="text-sm hidden sm:inline" style={{ color: '#AAA' }}>
        Suchen...
      </span>
      <kbd className="hidden md:inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded
        border" style={{ color: '#CCC', borderColor: 'rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.02)' }}>
        /
      </kbd>
    </button>
  )
}
