'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Search, X, ArrowRight, ChevronRight } from 'lucide-react'
import { ProductQuickPreviewCard } from './ProductQuickPreviewCard'
import type { ProductCardDTO } from './ProductCard'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Suggestion {
  text: string
  reason: string
}

interface CategoryHit {
  name: string
  slug: string
}

interface ProductHit {
  id: string
  title: string
  price: number
  currency: string
  images: string[]
  discountPercent?: number
  compareAtPrice?: number
  category?: string
}

interface SearchData {
  suggestions: Suggestion[]
  categories: CategoryHit[]
  products: ProductHit[]
  preview: ProductHit | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Bold the portion of `text` that matches `query` (case-insensitive). */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <strong style={{ color: '#1A1A1A', fontWeight: 700 }}>
        {text.slice(idx, idx + query.length)}
      </strong>
      {text.slice(idx + query.length)}
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SearchExperienceProps {
  /** Additional className on the wrapper div */
  className?: string
}

export function SearchExperience({ className = '' }: SearchExperienceProps) {
  const router = useRouter()
  const prefersReduced = useReducedMotion()
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<SearchData | null>(null)
  const [loading, setLoading] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [previewProduct, setPreviewProduct] = useState<ProductHit | null>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const [mounted, setMounted] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => { setMounted(true) }, [])

  // ── Flat item list for keyboard nav ──────────────────────────────────────
  const suggestions = data?.suggestions ?? []
  const products = data?.products ?? []
  const flatItems: Array<
    | { type: 'suggestion'; item: Suggestion }
    | { type: 'product'; item: ProductHit }
  > = [
    ...suggestions.map((s) => ({ type: 'suggestion' as const, item: s })),
    ...products.map((p) => ({ type: 'product' as const, item: p })),
  ]

  // ── Preview update when highlight changes ────────────────────────────────
  useEffect(() => {
    if (highlightIndex < 0) {
      setPreviewProduct(data?.preview ?? null)
      return
    }
    const hi = flatItems[highlightIndex]
    if (!hi) { setPreviewProduct(data?.preview ?? null); return }
    if (hi.type === 'product') {
      setPreviewProduct(hi.item)
    } else {
      setPreviewProduct(data?.preview ?? null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightIndex, data])

  // ── Dropdown positioning (fixed, below full 92-px header) ───────────────
  const updatePosition = useCallback(() => {
    if (!wrapperRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()
    const HEADER_H = 100 // 60 (layer1) + 40 (layer2)
    const maxW = Math.min(840, window.innerWidth - 32)
    const centerX = rect.left + rect.width / 2
    const left = Math.max(16, Math.min(window.innerWidth - maxW - 16, centerX - maxW / 2))
    setDropdownStyle({ position: 'fixed', top: HEADER_H + 4, left, width: maxW, zIndex: 9999 })
  }, [])

  useEffect(() => {
    if (!isOpen) return
    updatePosition()
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [isOpen, updatePosition])

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const dropdown = document.getElementById('wearo-search-dropdown')
      const clickedInsideWrapper = wrapperRef.current?.contains(e.target as Node)
      const clickedInsideDropdown = dropdown?.contains(e.target as Node)
      if (!clickedInsideWrapper && !clickedInsideDropdown) close()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const doSearch = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/storefront/search?q=${encodeURIComponent(q)}&limit=6`,
        { cache: 'no-store' },
      )
      const json: { success: boolean } & SearchData = await res.json()
      if (json.success) {
        setData(json as SearchData)
        setPreviewProduct((json as SearchData).preview)
        setHighlightIndex(-1)
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────
  function open() {
    setIsOpen(true)
    if (!data) doSearch(query)
  }

  function close() {
    setIsOpen(false)
    setHighlightIndex(-1)
  }

  function navigate(href: string) {
    close()
    router.push(href)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    setHighlightIndex(-1)
    if (!isOpen) setIsOpen(true)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(val), 200)
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const q = query.trim()
    if (!q) return
    navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { close(); inputRef.current?.blur(); return }
    if (!isOpen) { if (e.key !== 'Tab') setIsOpen(true); return }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((p) => (p + 1) % Math.max(flatItems.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((p) => (p <= 0 ? flatItems.length - 1 : p - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const hi = highlightIndex >= 0 ? flatItems[highlightIndex] : null
      if (hi?.type === 'suggestion') {
        navigate(`/search?q=${encodeURIComponent(hi.item.text)}`)
      } else if (hi?.type === 'product') {
        navigate(`/products/${hi.item.id}`)
      } else {
        handleSubmit()
      }
    }
  }

  function clearQuery() {
    setQuery('')
    setData(null)
    setHighlightIndex(-1)
    doSearch('')
    inputRef.current?.focus()
  }

  const cats = data?.categories ?? []
  const suggStartIdx = 0
  const prodStartIdx = suggestions.length

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Input wrapper ─────────────────────────────────── */}
      <div ref={wrapperRef} className={`relative ${className}`}>
        <form onSubmit={handleSubmit}>
          <div
            className="flex items-stretch h-[40px] rounded-[8px] overflow-hidden transition-all duration-150"
            style={{
              border: `2px solid #D97706`,
              boxShadow: isOpen
                ? '0 0 0 3px rgba(217,119,6,0.25)'
                : '0 0 0 1px rgba(217,119,6,0.2)',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleChange}
              onFocus={open}
              onKeyDown={handleKeyDown}
              placeholder="Was suchst du?"
              className="flex-1 h-full outline-none text-[14px] px-[12px]"
              style={{ background: '#FFFFFF', color: '#1A1A1A', border: 'none' }}
              role="combobox"
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              aria-autocomplete="list"
              aria-activedescendant={
                highlightIndex >= 0 ? `si-${highlightIndex}` : undefined
              }
              aria-label="Produkte suchen"
              aria-controls={isOpen ? 'wearo-search-dropdown' : undefined}
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button
                type="button"
                onClick={clearQuery}
                className="flex-shrink-0 h-full px-[8px] flex items-center"
                style={{ background: '#FFFFFF' }}
                aria-label="Suche löschen"
              >
                <X className="w-[13px] h-[13px]" style={{ color: '#AAA' }} />
              </button>
            )}
            <button
              type="submit"
              className="flex-shrink-0 h-full w-[46px] flex items-center justify-center"
              style={{ background: '#D97706' }}
              aria-label="Suchen"
            >
              <Search className="w-[17px] h-[17px]" style={{ color: '#FFFFFF' }} />
            </button>
          </div>
        </form>
      </div>

      {/* ── Dropdown portal ───────────────────────────────── */}
      {mounted &&
        isOpen &&
        createPortal(
          <AnimatePresence>
            <motion.div
              id="wearo-search-dropdown"
              key="drop"
              initial={prefersReduced ? {} : { opacity: 0, scale: 0.98, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={prefersReduced ? {} : { opacity: 0, scale: 0.98, y: -6 }}
              transition={{ duration: 0.1, ease: 'easeOut' }}
              style={dropdownStyle}
              role="listbox"
              aria-label="Suchergebnisse"
            >
              <div
                className="rounded-[10px] overflow-hidden"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E5E5',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
                }}
              >
                {/* ── Three columns ─────────────────────────── */}
                <div className="flex">

                  {/* Col A — Suggestions + categories */}
                  <div
                    className="flex-1 min-w-0 py-[6px]"
                    style={{ borderRight: '1px solid #F0F0F0' }}
                  >
                    {suggestions.length > 0 && (
                      <>
                        <div className="px-[14px] py-[5px]">
                          <span
                            className="text-[9px] uppercase font-bold tracking-[0.08em]"
                            style={{ color: '#CCC' }}
                          >
                            Suchvorschläge
                          </span>
                        </div>
                        {suggestions.map((s, i) => {
                          const fi = suggStartIdx + i
                          const isHl = highlightIndex === fi
                          return (
                            <button
                              key={i}
                              id={`si-${fi}`}
                              role="option"
                              aria-selected={isHl}
                              onClick={() => navigate(`/search?q=${encodeURIComponent(s.text)}`)}
                              onMouseEnter={() => setHighlightIndex(fi)}
                              className="flex items-center gap-[8px] w-full text-left px-[14px] py-[7px]
                                transition-colors duration-75"
                              style={{ background: isHl ? '#FFFBEB' : 'transparent' }}
                            >
                              <Search
                                className="w-[11px] h-[11px] flex-shrink-0"
                                style={{ color: '#CCC' }}
                              />
                              <span
                                className="text-[13px] truncate"
                                style={{ color: '#333' }}
                              >
                                <HighlightMatch text={s.text} query={query} />
                              </span>
                            </button>
                          )
                        })}
                      </>
                    )}

                    {cats.length > 0 && (
                      <>
                        <div className="px-[14px] pt-[8px] pb-[4px]">
                          <span
                            className="text-[9px] uppercase font-bold tracking-[0.08em]"
                            style={{ color: '#CCC' }}
                          >
                            Kategorien
                          </span>
                        </div>
                        {cats.slice(0, 5).map((cat) => (
                          <button
                            key={cat.slug}
                            onClick={() => navigate(`/store?cat=${cat.slug}`)}
                            className="flex items-center gap-[8px] w-full text-left px-[14px] py-[6px]
                              transition-colors duration-75"
                            style={{ color: '#555' }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = '#F8F8F8')
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = 'transparent')
                            }
                          >
                            <div
                              className="w-[4px] h-[4px] rounded-full flex-shrink-0"
                              style={{ background: '#D97706' }}
                            />
                            <span className="text-[12px]">{cat.name}</span>
                          </button>
                        ))}
                      </>
                    )}

                    {/* Empty / loading state for left col */}
                    {!suggestions.length && !cats.length && !loading && (
                      <div className="px-[14px] py-[20px]">
                        <p className="text-[12px]" style={{ color: '#CCC' }}>
                          {query ? `Keine Vorschläge für „${query.slice(0, 20)}"` : 'Tippe, um zu suchen'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Col B — Product hits */}
                  <div
                    className="flex-[1.3] min-w-0 py-[6px]"
                    style={{ borderRight: '1px solid #F0F0F0' }}
                  >
                    <div className="px-[14px] py-[5px]">
                      <span
                        className="text-[9px] uppercase font-bold tracking-[0.08em]"
                        style={{ color: '#CCC' }}
                      >
                        Produkte
                      </span>
                    </div>

                    {loading ? (
                      <div className="px-[14px] py-[10px] flex gap-[4px]">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-[5px] h-[5px] rounded-full animate-pulse"
                            style={{ background: '#D97706', animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                    ) : products.length > 0 ? (
                      <>
                        {products.slice(0, 5).map((p, i) => {
                          const fi = prodStartIdx + i
                          const isHl = highlightIndex === fi
                          return (
                            <button
                              key={p.id}
                              id={`si-${fi}`}
                              role="option"
                              aria-selected={isHl}
                              onClick={() => navigate(`/products/${p.id}`)}
                              onMouseEnter={() => {
                                setHighlightIndex(fi)
                                setPreviewProduct(p)
                              }}
                              className="flex items-center gap-[10px] w-full text-left
                                px-[14px] py-[6px] transition-colors duration-75"
                              style={{ background: isHl ? '#FFFBEB' : 'transparent' }}
                            >
                              <div
                                className="w-[38px] h-[38px] rounded-[5px] overflow-hidden flex-shrink-0"
                                style={{ background: '#F5F5F5' }}
                              >
                                {p.images[0] && (
                                  <Image
                                    src={p.images[0]}
                                    alt={p.title}
                                    width={38}
                                    height={38}
                                    className="object-cover w-full h-full"
                                  />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p
                                  className="text-[12px] font-medium truncate"
                                  style={{ color: '#1A1A1A' }}
                                >
                                  {p.title}
                                </p>
                                <div className="flex items-baseline gap-[4px] mt-[1px]">
                                  <span
                                    className="text-[11px] font-bold"
                                    style={{ color: '#D97706' }}
                                  >
                                    €{p.price.toFixed(2)}
                                  </span>
                                  {p.compareAtPrice && p.compareAtPrice > p.price && (
                                    <span
                                      className="text-[10px] line-through"
                                      style={{ color: '#AAA' }}
                                    >
                                      €{p.compareAtPrice.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          )
                        })}

                        {/* See all results CTA */}
                        <button
                          onClick={handleSubmit}
                          className="flex items-center gap-[6px] w-full text-left
                            px-[14px] py-[8px] mt-[2px] transition-colors duration-75"
                          style={{ borderTop: '1px solid #F5F5F5' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#FFFBEB')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <span
                            className="text-[12px] font-semibold"
                            style={{ color: '#D97706' }}
                          >
                            Alle Ergebnisse anzeigen
                          </span>
                          <ArrowRight
                            className="w-[11px] h-[11px]"
                            style={{ color: '#D97706' }}
                          />
                        </button>
                      </>
                    ) : (
                      !loading && (
                        <div className="px-[14px] py-[20px]">
                          <p className="text-[12px]" style={{ color: '#CCC' }}>
                            {query
                              ? 'Keine passenden Produkte'
                              : 'Populäre Produkte laden…'}
                          </p>
                        </div>
                      )
                    )}
                  </div>

                  {/* Col C — Preview card (desktop only) */}
                  <div
                    className="hidden lg:flex w-[168px] flex-shrink-0 flex-col p-[12px]"
                    style={{ background: '#FAFAFA' }}
                  >
                    <span
                      className="text-[9px] uppercase font-bold tracking-[0.08em] mb-[8px]"
                      style={{ color: '#CCC' }}
                    >
                      Vorschau
                    </span>
                    {previewProduct ? (
                      <ProductQuickPreviewCard
                        product={previewProduct as ProductCardDTO}
                        onClose={close}
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-[40px] h-[60px] rounded-[6px] bg-[#F0F0F0] mx-auto mb-[8px]" />
                          <p className="text-[10px]" style={{ color: '#CCC' }}>
                            Produkt hier
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer bar: "See all results for X" */}
                {query && (
                  <div
                    className="px-[14px] py-[9px]"
                    style={{ borderTop: '1px solid #F5F5F5', background: '#FAFAFA' }}
                  >
                    <button
                      onClick={handleSubmit}
                      className="flex items-center gap-[5px] text-[11px] font-medium
                        transition-opacity hover:opacity-70"
                      style={{ color: '#D97706' }}
                    >
                      <Search className="w-[11px] h-[11px]" />
                      Alle Ergebnisse für &ldquo;
                      <span className="font-bold">{query.slice(0, 30)}</span>
                      &rdquo; anzeigen
                      <ChevronRight className="w-[11px] h-[11px] ml-[2px]" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}
    </>
  )
}
