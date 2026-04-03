'use client'

/**
 * StorefrontClient — Premium interactive storefront (client island)
 *
 * Renders the full seller storefront experience:
 *  - Hero with banner, logo, identity
 *  - Social links
 *  - Product grid with search, filter, sort
 *  - Trust block
 *  - Share/bio-link affordance
 *
 * Dark theme. Mobile-first. Bio-link ready.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Search, MapPin, ShieldCheck, Calendar, Package,
  Share2, Loader2, ChevronDown, SlidersHorizontal,
  X, ShoppingBag, Instagram, Globe, Copy, Check,
  ExternalLink, Users, ArrowUp,
} from 'lucide-react'
import type { StorefrontSettings } from '@/lib/storefront'
import { SellerContentBlock } from '@/components/storefront/SellerContentBlock'

// ─── Types ──────────────────────────────────────────────────────────────────────

interface SellerData {
  id: string
  shopName: string
  shopSlug: string
  shopDescription: string | null
  logoUrl: string | null
  bannerUrl: string | null
  city: string | null
  country: string | null
  isVerified: boolean
  memberSince: string
  followerCount: number
}

interface ProductDTO {
  id: string
  title: string
  price: number
  currency: string
  images: string[]
  compareAtPrice?: number
  discountPercent?: number
  inventory: number
  category: string | null
  brand: string | null
  isNew: boolean
  createdAt: string
}

interface CategoryDTO {
  name: string
  count: number
}

type SortMode = 'newest' | 'price_asc' | 'price_desc'

interface StorefrontClientProps {
  seller: SellerData
  settings: StorefrontSettings
  initialProductCount: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function fmtPrice(n: number, currency = 'EUR') {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency', currency,
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

function fmtFollowers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

const SORT_LABELS: Record<SortMode, string> = {
  newest: 'Neueste',
  price_asc: 'Preis ↑',
  price_desc: 'Preis ↓',
}

// ─── TikTok icon (Lucide doesn't have one) ─────────────────────────────────────

function TikTokIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.73a8.19 8.19 0 0 0 4.77 1.53V6.81a4.83 4.83 0 0 1-1.01-.12z" />
    </svg>
  )
}

// ─── YouTube icon ───────────────────────────────────────────────────────────────

function YouTubeIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.56 31.56 0 0 0 0 12a31.56 31.56 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.56 31.56 0 0 0 24 12a31.56 31.56 0 0 0-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
    </svg>
  )
}

// ─── Product Card (dark theme, storefront-tuned) ────────────────────────────────

function StorefrontProductCard({
  product,
  slug,
  accentColor,
  showBrand,
}: {
  product: ProductDTO
  slug: string
  accentColor: string
  showBrand: boolean
}) {
  const [imgIdx, setImgIdx] = useState(0)
  const img0 = product.images?.[0] ?? null
  const img1 = product.images?.[1] ?? null
  const outOfStock = product.inventory === 0
  const lowStock = !outOfStock && product.inventory > 0 && product.inventory <= 5

  return (
    <Link href={`/products/${product.id}?store=${slug}`} prefetch={false}>
      <div
        className="group relative flex flex-col overflow-hidden rounded-[14px] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_8px_40px_rgba(0,0,0,0.4)]"
        style={{ background: '#1A1A1E' }}
        onMouseEnter={() => img1 && setImgIdx(1)}
        onMouseLeave={() => setImgIdx(0)}
      >
        {/* Image */}
        <div className="relative aspect-[3/4] overflow-hidden" style={{ background: '#141416' }}>
          {img0 ? (
            <>
              <Image
                src={img0}
                alt={product.title}
                fill
                sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
                className={`object-cover transition-all duration-300 group-hover:scale-[1.04] ${imgIdx === 0 ? 'opacity-100' : 'opacity-0'}`}
              />
              {img1 && (
                <Image
                  src={img1}
                  alt={`${product.title} — 2`}
                  fill
                  sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
                  className={`object-cover transition-opacity duration-300 ${imgIdx === 1 ? 'opacity-100' : 'opacity-0'}`}
                />
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ShoppingBag className="w-10 h-10" style={{ color: '#333' }} />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 pointer-events-none">
            {outOfStock ? (
              <span className="px-2 py-0.5 rounded-[5px] text-[10px] font-bold" style={{ background: '#555', color: '#FFF' }}>
                Ausverkauft
              </span>
            ) : (
              <>
                {product.discountPercent != null && product.discountPercent > 0 && (
                  <span className="px-2 py-0.5 rounded-[5px] text-[10px] font-bold" style={{ background: '#DC2626', color: '#FFF' }}>
                    -{product.discountPercent}%
                  </span>
                )}
                {product.isNew && (
                  <span className="px-2 py-0.5 rounded-[5px] text-[10px] font-bold" style={{ background: accentColor, color: '#FFF' }}>
                    Neu
                  </span>
                )}
                {lowStock && (
                  <span className="px-2 py-0.5 rounded-[5px] text-[10px] font-bold" style={{ background: accentColor, color: '#FFF' }}>
                    Nur {product.inventory} übrig
                  </span>
                )}
              </>
            )}
          </div>

          {/* Hover CTA */}
          {!outOfStock && (
            <div
              className="absolute inset-x-0 bottom-0 flex items-center justify-center pb-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)' }}
            >
              <div
                className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[11px] font-bold"
                style={{ background: accentColor, color: '#FFF' }}
              >
                <ShoppingBag className="w-3 h-3" /> Ansehen
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-0.5 p-3">
          {showBrand && product.brand && (
            <span className="text-[9px] font-semibold uppercase tracking-wider truncate" style={{ color: '#777' }}>
              {product.brand}
            </span>
          )}
          <p className="text-[13px] font-medium line-clamp-2 leading-snug" style={{ color: '#F0F0F0' }}>
            {product.title}
          </p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-[14px] font-bold" style={{ color: outOfStock ? '#666' : '#F0F0F0' }}>
              {fmtPrice(product.price, product.currency)}
            </span>
            {product.compareAtPrice != null && product.compareAtPrice > product.price && (
              <span className="text-[11px] line-through" style={{ color: '#666' }}>
                {fmtPrice(product.compareAtPrice, product.currency)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

// ─── Skeleton Card ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex flex-col rounded-[14px] overflow-hidden animate-pulse" style={{ background: '#1A1A1E' }}>
      <div className="aspect-[3/4]" style={{ background: '#222' }} />
      <div className="p-3 space-y-2">
        <div className="h-2 rounded w-1/3" style={{ background: '#333' }} />
        <div className="h-3 rounded w-2/3" style={{ background: '#333' }} />
        <div className="h-4 rounded w-1/4 mt-1" style={{ background: '#333' }} />
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function StorefrontClient({
  seller,
  settings,
  initialProductCount,
}: StorefrontClientProps) {
  const accent = settings.accentColor

  // State
  const [products, setProducts] = useState<ProductDTO[]>([])
  const [categories, setCategories] = useState<CategoryDTO[]>([])
  const [totalProducts, setTotalProducts] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  // Filters
  const [sort, setSort] = useState<SortMode>('newest')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('')
  const [sortOpen, setSortOpen] = useState(false)

  // Share
  const [copied, setCopied] = useState(false)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const productsRef = useRef<HTMLDivElement>(null)

  // ── Fetch ─────────────────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async (opts: {
    sort: SortMode; search: string; category: string; offset?: number; append?: boolean
  }) => {
    const { sort: s, search: q, category: cat, offset = 0, append = false } = opts
    if (!append) setLoading(true)
    else setLoadingMore(true)

    try {
      const params = new URLSearchParams({ sort: s, limit: '48', offset: String(offset) })
      if (q) params.set('search', q)
      if (cat) params.set('category', cat)

      const res = await fetch(`/api/shop/by-slug/${seller.shopSlug}?${params}`)
      const data = await res.json()

      if (!data.success) throw new Error(data.error)

      setCategories(data.categories ?? [])
      setHasMore(data.pagination?.hasMore ?? false)
      setTotalProducts(data.pagination?.total ?? 0)

      if (append) {
        setProducts(prev => [...prev, ...(data.products ?? [])])
      } else {
        setProducts(data.products ?? [])
      }
    } catch (err) {
      console.error('[storefront] fetch error:', err)
    }

    setLoading(false)
    setLoadingMore(false)
  }, [seller.shopSlug])

  useEffect(() => {
    fetchProducts({ sort, search, category: activeCategory })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  const handleSearch = (val: string) => {
    setSearch(val)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      fetchProducts({ sort, search: val, category: activeCategory })
    }, 400)
  }

  const handleSort = (s: SortMode) => {
    setSort(s); setSortOpen(false)
    fetchProducts({ sort: s, search, category: activeCategory })
  }

  const handleCategory = (cat: string) => {
    const next = activeCategory === cat ? '' : cat
    setActiveCategory(next)
    fetchProducts({ sort, search, category: next })
  }

  const handleLoadMore = () => {
    fetchProducts({ sort, search, category: activeCategory, offset: products.length, append: true })
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/${seller.shopSlug}`
    if (navigator.share) {
      try {
        await navigator.share({ title: seller.shopName, text: seller.shopDescription ?? undefined, url })
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const scrollToProducts = () => {
    productsRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const memberDate = fmtDate(seller.memberSince)
  const hasSocials = settings.socialInstagram || settings.socialTiktok || settings.socialYoutube || settings.socialWebsite

  return (
    <>
      {/* ━━━━━━━━━━━━━━━ HERO ━━━━━━━━━━━━━━━ */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: '340px' }}>
        {/* Banner */}
        {seller.bannerUrl ? (
          <Image
            src={seller.bannerUrl}
            alt={`${seller.shopName} Banner`}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1A1A1E 0%, #0E0E10 50%, #1A1A1E 100%)' }}>
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)',
              backgroundSize: '32px 32px',
            }} />
          </div>
        )}

        {/* Dark overlay for readability */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(14,14,16,0.3) 0%, rgba(14,14,16,0.85) 100%)' }} />

        {/* Share button (top-right) */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-[12px] font-semibold transition-all"
            style={{
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(12px)',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            {copied ? 'Kopiert!' : 'Teilen'}
          </button>
        </div>

        {/* WEARO branding (top-left) */}
        <div className="absolute top-4 left-4 z-10">
          <Link
            href="/"
            className="text-[13px] font-bold tracking-[0.15em] transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            WEARO
          </Link>
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-8 flex flex-col items-center text-center">
          {/* Logo */}
          <div
            className="w-[88px] h-[88px] sm:w-[100px] sm:h-[100px] rounded-full overflow-hidden mb-4 flex-shrink-0"
            style={{ border: `3px solid ${accent}`, boxShadow: `0 0 30px ${accent}33` }}
          >
            {seller.logoUrl ? (
              <Image
                src={seller.logoUrl}
                alt={seller.shopName}
                width={100}
                height={100}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accent}88)` }}
              >
                <span className="text-3xl font-bold text-white">
                  {seller.shopName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Name + verified */}
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#F5F5F5' }}>
              {seller.shopName}
            </h1>
            {seller.isVerified && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}
              >
                <ShieldCheck className="w-3 h-3" /> Verifiziert
              </span>
            )}
          </div>

          {/* Headline override */}
          {settings.headline && (
            <p className="text-[15px] font-medium mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {settings.headline}
            </p>
          )}

          {/* Description */}
          {seller.shopDescription && (
            <p className="text-[13px] leading-relaxed max-w-lg mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {seller.shopDescription}
            </p>
          )}

          {/* Meta strip */}
          <div className="flex items-center gap-4 flex-wrap justify-center mb-4 text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {(seller.city || seller.country) && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {[seller.city, seller.country].filter(Boolean).join(', ')}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Seit {memberDate}
            </span>
            <span className="flex items-center gap-1">
              <Package className="w-3.5 h-3.5" />
              {initialProductCount} {initialProductCount === 1 ? 'Produkt' : 'Produkte'}
            </span>
            {seller.followerCount > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {fmtFollowers(seller.followerCount)} Follower
              </span>
            )}
          </div>

          {/* Social links */}
          {hasSocials && (
            <div className="flex items-center gap-3 mb-4">
              {settings.socialInstagram && (
                <a
                  href={settings.socialInstagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-9 h-9 rounded-full transition-all hover:scale-110"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                  aria-label="Instagram"
                >
                  <Instagram className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.7)' }} />
                </a>
              )}
              {settings.socialTiktok && (
                <a
                  href={settings.socialTiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-9 h-9 rounded-full transition-all hover:scale-110"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                  aria-label="TikTok"
                >
                  <TikTokIcon className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.7)' } as React.CSSProperties} />
                </a>
              )}
              {settings.socialYoutube && (
                <a
                  href={settings.socialYoutube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-9 h-9 rounded-full transition-all hover:scale-110"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                  aria-label="YouTube"
                >
                  <YouTubeIcon className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.7)' } as React.CSSProperties} />
                </a>
              )}
              {settings.socialWebsite && (
                <a
                  href={settings.socialWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-9 h-9 rounded-full transition-all hover:scale-110"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                  aria-label="Website"
                >
                  <Globe className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.7)' }} />
                </a>
              )}
            </div>
          )}

          {/* CTA to browse products */}
          <button
            onClick={scrollToProducts}
            className="flex items-center gap-2 px-6 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all hover:scale-[1.03]"
            style={{ background: accent, color: '#FFF' }}
          >
            <ShoppingBag className="w-4 h-4" />
            Produkte entdecken
          </button>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━ PRODUCTS SECTION ━━━━━━━━━━━━━━━ */}
      <div ref={productsRef} className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-16">

        {/* ── Toolbar ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#555' }} />
            <input
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Produkte durchsuchen…"
              className="w-full pl-10 pr-4 py-2.5 rounded-[10px] text-sm outline-none transition-colors"
              style={{
                background: '#1A1A1E',
                border: '1px solid #2A2A2E',
                color: '#E0E0E0',
              }}
            />
            {search && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: '#666' }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setSortOpen(o => !o)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-sm transition-colors"
              style={{ background: '#1A1A1E', border: '1px solid #2A2A2E', color: '#CCC' }}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {SORT_LABELS[sort]}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
            </button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                <div
                  className="absolute right-0 top-full mt-1 rounded-[10px] shadow-lg z-20 py-1 min-w-[140px]"
                  style={{ background: '#1E1E22', border: '1px solid #2A2A2E' }}
                >
                  {(Object.keys(SORT_LABELS) as SortMode[]).map(s => (
                    <button
                      key={s}
                      onClick={() => handleSort(s)}
                      className="w-full text-left px-4 py-2 text-sm transition-colors"
                      style={{
                        color: sort === s ? '#F0F0F0' : '#888',
                        fontWeight: sort === s ? 600 : 400,
                        background: 'transparent',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#252528' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      {SORT_LABELS[s]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Category Pills ─────────────────────────────────── */}
        {categories.length > 1 && (
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => handleCategory('')}
              className="flex-shrink-0 px-4 py-2.5 rounded-full text-[12px] font-semibold transition-all"
              style={{
                background: !activeCategory ? accent : '#1A1A1E',
                color: !activeCategory ? '#FFF' : '#888',
                border: `1px solid ${!activeCategory ? accent : '#2A2A2E'}`,
              }}
            >
              Alle ({initialProductCount})
            </button>
            {categories.map(cat => (
              <button
                key={cat.name}
                onClick={() => handleCategory(cat.name)}
                className="flex-shrink-0 px-4 py-2.5 rounded-full text-[12px] font-semibold transition-all"
                style={{
                  background: activeCategory === cat.name ? accent : '#1A1A1E',
                  color: activeCategory === cat.name ? '#FFF' : '#888',
                  border: `1px solid ${activeCategory === cat.name ? accent : '#2A2A2E'}`,
                }}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>
        )}

        {/* ── Results count ──────────────────────────────────── */}
        {(search || activeCategory) && (
          <p className="text-xs mb-4" style={{ color: '#666' }}>
            {totalProducts} {totalProducts === 1 ? 'Ergebnis' : 'Ergebnisse'}
            {search && <> für &ldquo;{search}&rdquo;</>}
            {activeCategory && <> in {activeCategory}</>}
          </p>
        )}

        {/* ── Product Grid ───────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center">
            <Package className="w-14 h-14 mx-auto mb-4" style={{ color: '#444' }} />
            <h3 className="text-lg font-semibold mb-1" style={{ color: '#E0E0E0' }}>
              {search || activeCategory ? 'Keine Produkte gefunden' : 'Noch keine Produkte'}
            </h3>
            <p className="text-sm max-w-sm mx-auto" style={{ color: '#777' }}>
              {search || activeCategory
                ? 'Versuche andere Suchbegriffe oder Filter.'
                : 'Dieser Store hat noch keine öffentlich sichtbaren Produkte.'}
            </p>
            {(search || activeCategory) && (
              <button
                onClick={() => { setSearch(''); setActiveCategory(''); fetchProducts({ sort, search: '', category: '' }) }}
                className="mt-4 px-4 py-2 rounded-[10px] text-sm font-medium transition-colors"
                style={{ background: '#1A1A1E', color: '#CCC' }}
              >
                Filter zurücksetzen
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {products.map((p) => (
                <StorefrontProductCard
                  key={p.id}
                  product={p}
                  slug={seller.shopSlug}
                  accentColor={accent}
                  showBrand={settings.showBrand}
                />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-6 py-3 rounded-[10px] text-sm font-semibold transition-all disabled:opacity-50"
                  style={{ background: '#1A1A1E', border: '1px solid #2A2A2E', color: '#CCC' }}
                >
                  {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loadingMore ? 'Laden…' : 'Mehr anzeigen'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━ SELLER CONTENT ━━━━━━━━━━━━━━━ */}
      <SellerContentBlock
        sellerId={seller.id}
        sellerSlug={seller.shopSlug}
        accentColor={accent}
      />

      {/* ━━━━━━━━━━━━━━━ TRUST BLOCK ━━━━━━━━━━━━━━━ */}
      <section className="py-10" style={{ background: '#131316' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-5 mb-6">
            {[
              { icon: ShieldCheck, label: 'SSL-verschlüsselt' },
              { icon: ShoppingBag, label: 'Sicherer Checkout' },
              { icon: Package, label: 'Schneller Versand' },
            ].map(b => {
              const Icon = b.icon
              return (
                <div key={b.label} className="flex items-center gap-1.5">
                  <Icon className="w-4 h-4" style={{ color: accent }} />
                  <span className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {b.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Powered by */}
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Powered by{' '}
            <Link href="/" className="font-semibold transition-colors" style={{ color: 'rgba(255,255,255,0.45)' }}>
              WEARO
            </Link>
          </p>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━ BIO-LINK FOOTER ━━━━━━━━━━━━━━━ */}
      <footer className="py-6" style={{ background: '#0A0A0C' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            © {new Date().getFullYear()} {seller.shopName}
          </p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="text-[11px] transition-colors" style={{ color: 'rgba(255,255,255,0.25)' }}>
              AGB
            </Link>
            <Link href="/privacy" className="text-[11px] transition-colors" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Datenschutz
            </Link>
            <button
              onClick={handleShare}
              className="flex items-center gap-1 text-[11px] transition-colors"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Kopiert' : 'Store-Link kopieren'}
            </button>
          </div>
        </div>
      </footer>

      {/* Scrollbar hide utility */}
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </>
  )
}
