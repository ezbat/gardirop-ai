'use client'

/**
 * /categories — Category Discovery Page
 *
 * Premium grid of all product categories with real product counts.
 * Data from GET /api/categories.
 */

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { Grid3X3, Search, Package, ChevronRight, Sparkles } from 'lucide-react'

// ─── Design tokens (dark storefront) ─────────────────────────────────────────

const BG   = 'var(--lux-bg, #0E0E10)'
const L1   = 'var(--lux-layer-1, #141416)'
const L2   = 'var(--lux-layer-2, #1B1B1E)'
const T1   = 'rgba(255,255,255,0.92)'
const T2   = 'rgba(255,255,255,0.60)'
const T3   = 'rgba(255,255,255,0.35)'
const BDR  = 'rgba(255,255,255,0.08)'
const ACC  = '#D97706'

// ─── Category icons (mapped by common names) ─────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  mode: '👗', fashion: '👗', kleidung: '👗', bekleidung: '👗',
  schuhe: '👟', shoes: '👟',
  taschen: '👜', bags: '👜',
  schmuck: '💍', jewelry: '💍', accessoires: '💎', accessories: '💎',
  beauty: '💄', kosmetik: '💄', pflege: '🧴',
  technik: '📱', elektronik: '📱', tech: '📱',
  sport: '⚽', fitness: '🏋️',
  haus: '🏠', home: '🏠', küche: '🍳', wohnen: '🛋️',
  spielzeug: '🧸', kinder: '👶',
  auto: '🚗', büro: '📎', garten: '🌱', haustier: '🐾',
  bücher: '📚', musik: '🎵', kunst: '🎨',
}

function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase()
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon
  }
  return '📦'
}

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

function translateCategoryName(name: string): string {
  return TR_TO_DE[name] || name
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Category {
  slug: string
  name: string
  productCount: number
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(j => {
        if (j.success) setCategories(j.categories)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return categories
    const q = search.trim().toLowerCase()
    return categories.filter(c => c.name.toLowerCase().includes(q))
  }, [categories, search])

  const totalProducts = useMemo(
    () => categories.reduce((sum, c) => sum + c.productCount, 0),
    [categories],
  )

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: BG }}>
        <div className="max-w-6xl mx-auto px-4 py-10">
          {/* Hero skeleton */}
          <div className="mb-10">
            <div className="h-8 w-64 rounded-lg animate-pulse mb-3" style={{ background: L2 }} />
            <div className="h-4 w-96 rounded animate-pulse" style={{ background: L2 }} />
          </div>
          {/* Grid skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl animate-pulse"
                style={{ background: L1, height: 160, border: `1px solid ${BDR}` }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!loading && categories.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="text-center max-w-sm">
          <Package size={48} style={{ color: T3 }} className="mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2" style={{ color: T1 }}>
            Noch keine Kategorien
          </p>
          <p className="text-sm" style={{ color: T2 }}>
            Sobald Produkte genehmigt werden, erscheinen hier die Kategorien.
          </p>
          <Link
            href="/"
            className="inline-block mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: ACC, color: '#fff' }}
          >
            Zur Startseite
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles size={22} style={{ color: ACC }} />
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: T1 }}>
              Alle Kategorien
            </h1>
          </div>
          <p className="text-sm" style={{ color: T2 }}>
            {categories.length} Kategorien &middot; {totalProducts.toLocaleString('de-DE')} Produkte
          </p>
        </div>

        {/* ── Search ───────────────────────────────────────────────────────── */}
        {categories.length > 6 && (
          <div className="relative mb-8 max-w-md">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: T3 }}
            />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Kategorie suchen..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
              style={{
                background: L1,
                border: `1px solid ${BDR}`,
                color: T1,
              }}
            />
          </div>
        )}

        {/* ── Grid ─────────────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: T2 }}>
              Keine Kategorien gefunden für &ldquo;{search}&rdquo;
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((cat, idx) => (
              <motion.div
                key={cat.slug}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(idx * 0.05, 0.4) }}
              >
              <Link
                href={`/category/${cat.slug}`}
                className="group relative block rounded-2xl p-5 sm:p-6 transition-all duration-200
                  hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: L1,
                  border: `1px solid ${BDR}`,
                }}
              >
                {/* Icon */}
                <span className="text-3xl sm:text-4xl block mb-3">
                  {getCategoryIcon(cat.name)}
                </span>

                {/* Name */}
                <p
                  className="font-semibold text-sm sm:text-[15px] mb-1 truncate"
                  style={{ color: T1 }}
                >
                  {translateCategoryName(cat.name)}
                </p>

                {/* Count */}
                <p className="text-xs" style={{ color: T2 }}>
                  {cat.productCount} {cat.productCount === 1 ? 'Produkt' : 'Produkte'}
                </p>

                {/* Arrow */}
                <ChevronRight
                  size={16}
                  className="absolute top-5 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: ACC }}
                />

                {/* Hover glow */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{
                    background: `linear-gradient(135deg, ${ACC}08, transparent)`,
                    border: `1px solid ${ACC}20`,
                    borderRadius: 'inherit',
                  }}
                />
              </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
