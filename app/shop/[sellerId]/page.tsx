'use client'

/**
 * Legacy Seller Storefront — /shop/[sellerId]
 *
 * MIGRATION: If the seller has a shop_slug, redirects to /{slug}.
 * Falls back to the original inline storefront if no slug is set.
 *
 * This route is kept for backwards compatibility with old links.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useAuthModal } from '@/components/auth-modal'
import Link from 'next/link'
import Image from 'next/image'
import {
  Search, MapPin, ShieldCheck, Calendar, Package,
  MessageCircle, Share2, Loader2, ArrowLeft,
  ChevronDown, SlidersHorizontal, X, Heart, ShoppingBag,
  Store,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────────

interface SellerDTO {
  id: string
  shopName: string
  shopSlug: string | null
  shopDescription: string | null
  logoUrl: string | null
  bannerUrl: string | null
  city: string | null
  country: string | null
  isVerified: boolean
  memberSince: string
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

// ─── Sort Label ─────────────────────────────────────────────────────────────────
const SORT_LABELS: Record<SortMode, string> = {
  newest: 'Neueste',
  price_asc: 'Preis ↑',
  price_desc: 'Preis ↓',
}

// ─── Product Card (inline, tuned for shop context) ──────────────────────────────
function ShopProductCard({ product, index }: { product: ProductDTO; index: number }) {
  const [imgIdx, setImgIdx] = useState(0)
  const img0 = product.images?.[0] ?? null
  const img1 = product.images?.[1] ?? null
  const outOfStock = product.inventory === 0
  const lowStock = !outOfStock && product.inventory > 0 && product.inventory <= 5

  return (
    <Link href={`/products/${product.id}`} prefetch={false}>
      <div
        className="group relative flex flex-col bg-white border border-[#F0F0F0] overflow-hidden rounded-[12px] hover:shadow-[0_6px_32px_rgba(0,0,0,0.10)] transition-all duration-200"
        onMouseEnter={() => img1 && setImgIdx(1)}
        onMouseLeave={() => setImgIdx(0)}
      >
        {/* Image */}
        <div className="relative aspect-[3/4] bg-[#F5F5F5] overflow-hidden">
          {img0 ? (
            <>
              <Image
                src={img0}
                alt={product.title}
                fill
                sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
                className={`object-cover transition-all duration-300 group-hover:scale-[1.03] ${imgIdx === 0 ? 'opacity-100' : 'opacity-0'}`}
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
              <ShoppingBag className="w-10 h-10 text-[#D4D4D4]" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
            {outOfStock ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-500 text-white">Ausverkauft</span>
            ) : (
              <>
                {product.discountPercent != null && product.discountPercent > 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">
                    -{product.discountPercent}%
                  </span>
                )}
                {product.isNew && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white">Neu</span>
                )}
                {lowStock && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white">
                    Nur {product.inventory} übrig
                  </span>
                )}
              </>
            )}
          </div>

          {/* Hover CTA */}
          {!outOfStock && (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center pb-3 pt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 100%)' }}>
              <div className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold bg-[#1A1A1A] text-white">
                <ShoppingBag className="w-3 h-3" /> Ansehen
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-0.5 p-3">
          {product.brand && (
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#888888] truncate">
              {product.brand}
            </span>
          )}
          <p className="text-[13px] font-medium text-[#1A1A1A] line-clamp-2 leading-snug">
            {product.title}
          </p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className={`text-[14px] font-bold ${outOfStock ? 'text-[#999999]' : 'text-[#1A1A1A]'}`}>
              {fmtPrice(product.price, product.currency)}
            </span>
            {product.compareAtPrice != null && product.compareAtPrice > product.price && (
              <span className="text-[11px] line-through text-[#999999]">
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
    <div className="flex flex-col bg-white border border-[#F0F0F0] rounded-[12px] overflow-hidden animate-pulse">
      <div className="aspect-[3/4] bg-[#F0F0F0]" />
      <div className="p-3 space-y-2">
        <div className="h-2 bg-[#EBEBEB] rounded w-1/3" />
        <div className="h-3 bg-[#EBEBEB] rounded w-2/3" />
        <div className="h-4 bg-[#EBEBEB] rounded w-1/4 mt-1" />
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function SellerShopPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { requireAuth } = useAuthModal()
  const sellerId = (params.sellerId || params.id) as string

  // State
  const [seller, setSeller] = useState<SellerDTO | null>(null)
  const [products, setProducts] = useState<ProductDTO[]>([])
  const [categories, setCategories] = useState<CategoryDTO[]>([])
  const [totalProducts, setTotalProducts] = useState(0)
  const [productCount, setProductCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  // Filters
  const [sort, setSort] = useState<SortMode>('newest')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('')
  const [sortOpen, setSortOpen] = useState(false)
  const [messageSending, setMessageSending] = useState(false)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Fetch ─────────────────────────────────────────────────────────────────────
  const fetchShop = useCallback(async (opts: {
    sort: SortMode; search: string; category: string; offset?: number; append?: boolean
  }) => {
    const { sort: s, search: q, category: cat, offset = 0, append = false } = opts
    if (!append) setLoading(true)
    else setLoadingMore(true)

    try {
      const params = new URLSearchParams({ sort: s, limit: '48', offset: String(offset) })
      if (q) params.set('search', q)
      if (cat) params.set('category', cat)

      const res = await fetch(`/api/shop/${sellerId}?${params}`)
      const data = await res.json()

      if (!data.success) {
        if (res.status === 404) { setNotFound(true); setLoading(false); return }
        throw new Error(data.error)
      }

      // Redirect to slug-based URL if seller has a slug
      if (!append && data.seller?.shopSlug) {
        router.replace(`/${data.seller.shopSlug}`)
        return
      }

      setSeller(data.seller)
      setCategories(data.categories ?? [])
      setProductCount(data.stats?.productCount ?? 0)
      setHasMore(data.pagination?.hasMore ?? false)
      setTotalProducts(data.pagination?.total ?? 0)

      if (append) {
        setProducts(prev => [...prev, ...(data.products ?? [])])
      } else {
        setProducts(data.products ?? [])
      }
    } catch (err) {
      console.error('[shop page] fetch error:', err)
    }

    setLoading(false)
    setLoadingMore(false)
  }, [sellerId])

  useEffect(() => {
    if (sellerId) fetchShop({ sort, search, category: activeCategory })
  }, [sellerId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  const handleSearch = (val: string) => {
    setSearch(val)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      fetchShop({ sort, search: val, category: activeCategory })
    }, 400)
  }

  const handleSort = (s: SortMode) => {
    setSort(s); setSortOpen(false)
    fetchShop({ sort: s, search, category: activeCategory })
  }

  const handleCategory = (cat: string) => {
    const next = activeCategory === cat ? '' : cat
    setActiveCategory(next)
    fetchShop({ sort, search, category: next })
  }

  const handleLoadMore = () => {
    fetchShop({ sort, search, category: activeCategory, offset: products.length, append: true })
  }

  // ── Message CTA ───────────────────────────────────────────────────────────────
  const handleMessage = async () => {
    if (!requireAuth('Melde dich an, um eine Nachricht zu senden.')) return
    setMessageSending(true)
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId, productId: null }),
      })
      const data = await res.json()
      if (data.conversation) router.push(`/messages`)
    } catch (e) {
      console.error('[shop page] message error:', e)
    }
    setMessageSending(false)
  }

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: seller?.shopName ?? 'Shop', url: window.location.href })
    } else if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  // ── Not Found ─────────────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 bg-[#FAFAFA]">
        <div className="text-center max-w-md">
          <Store className="w-16 h-16 text-[#AAAAAA] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Shop nicht gefunden</h1>
          <p className="text-[#666] text-sm mb-6">
            Dieser Shop existiert nicht oder ist derzeit nicht verfügbar.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Zurück zum Marktplatz
          </Link>
        </div>
      </div>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading && !seller) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        {/* Hero skeleton */}
        <div className="w-full h-[280px] bg-[#E5E5E5] animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-16">
          <div className="flex items-end gap-5 mb-8">
            <div className="w-28 h-28 rounded-2xl bg-white shadow-lg animate-pulse" />
            <div className="space-y-2 pb-2">
              <div className="h-6 w-48 bg-[#EBEBEB] rounded animate-pulse" />
              <div className="h-4 w-32 bg-[#EBEBEB] rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    )
  }

  if (!seller) return null

  const memberDate = fmtDate(seller.memberSince)

  return (
    <div className="min-h-screen bg-[#FAFAFA]">

      {/* ── Hero Banner ──────────────────────────────────────────────────────── */}
      <div className="relative w-full h-[240px] sm:h-[300px] overflow-hidden bg-gradient-to-br from-[#1A1A1A] to-[#333]">
        {seller.bannerUrl ? (
          <Image
            src={seller.bannerUrl}
            alt={`${seller.shopName} Banner`}
            fill
            className="object-cover"
            priority
          />
        ) : (
          /* Elegant geometric fallback */
          <div className="absolute inset-0">
            <div className="absolute inset-0 opacity-[0.04]" style={{
              backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)',
              backgroundSize: '32px 32px',
            }} />
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        )}
        {/* Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

        {/* Back button */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white/90 hover:text-white bg-black/20 hover:bg-black/30 backdrop-blur-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Zurück
          </button>
        </div>

        {/* Share */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={handleShare}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-sm text-white/90 hover:text-white transition-all"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Profile Section ──────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6 -mt-14 sm:-mt-16 mb-6">
          {/* Logo */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white shadow-lg border-4 border-white overflow-hidden flex-shrink-0">
            {seller.logoUrl ? (
              <Image
                src={seller.logoUrl}
                alt={seller.shopName}
                width={112}
                height={112}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1A1A1A] to-[#444] flex items-center justify-center">
                <span className="text-3xl font-bold text-white">
                  {seller.shopName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Name + meta */}
          <div className="flex-1 pb-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] truncate">
                {seller.shopName}
              </h1>
              {seller.isVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-100">
                  <ShieldCheck className="w-3 h-3" /> Verifiziert
                </span>
              )}
            </div>

            {/* Location + member since */}
            <div className="flex items-center gap-4 mt-1.5 text-[13px] text-[#666666] flex-wrap">
              {(seller.city || seller.country) && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {[seller.city, seller.country].filter(Boolean).join(', ')}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Mitglied seit {memberDate}
              </span>
              <span className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5" />
                {productCount} {productCount === 1 ? 'Produkt' : 'Produkte'}
              </span>
            </div>

            {/* Description */}
            {seller.shopDescription && (
              <p className="mt-3 text-sm text-[#666] leading-relaxed line-clamp-3 max-w-2xl">
                {seller.shopDescription}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0 sm:pb-1">
            <button
              onClick={handleMessage}
              disabled={messageSending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#1A1A1A] text-white hover:bg-[#333] disabled:opacity-50 transition-all"
            >
              {messageSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MessageCircle className="w-4 h-4" />
              )}
              Nachricht senden
            </button>
          </div>
        </div>

        {/* ── Divider ──────────────────────────────────────────────────────────── */}
        <div className="h-px bg-[#EBEBEB] mb-6" />

        {/* ── Toolbar: Search + Filter + Sort ────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
          {/* Search */}
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
            <input
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Produkte durchsuchen…"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E5E5E5] bg-white text-sm text-[#1A1A1A] placeholder:text-[#888888] outline-none focus:border-[#999] transition-colors"
            />
            {search && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#666]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setSortOpen(o => !o)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#E5E5E5] bg-white text-sm text-[#333333] hover:border-[#CCC] transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {SORT_LABELS[sort]}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
            </button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white border border-[#E5E5E5] rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
                  {(Object.keys(SORT_LABELS) as SortMode[]).map(s => (
                    <button
                      key={s}
                      onClick={() => handleSort(s)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-[#F5F5F5] transition-colors ${sort === s ? 'font-semibold text-[#1A1A1A]' : 'text-[#666]'}`}
                    >
                      {SORT_LABELS[s]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Category Pills ─────────────────────────────────────────────────── */}
        {categories.length > 1 && (
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => handleCategory('')}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
                !activeCategory
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                  : 'bg-white text-[#666] border-[#E5E5E5] hover:border-[#CCC]'
              }`}
            >
              Alle ({productCount})
            </button>
            {categories.map(cat => (
              <button
                key={cat.name}
                onClick={() => handleCategory(cat.name)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
                  activeCategory === cat.name
                    ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                    : 'bg-white text-[#666] border-[#E5E5E5] hover:border-[#CCC]'
                }`}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>
        )}

        {/* ── Results count ──────────────────────────────────────────────────── */}
        {(search || activeCategory) && (
          <p className="text-xs text-[#777] mb-4">
            {totalProducts} {totalProducts === 1 ? 'Ergebnis' : 'Ergebnisse'}
            {search && <> für &ldquo;{search}&rdquo;</>}
            {activeCategory && <> in {activeCategory}</>}
          </p>
        )}

        {/* ── Product Grid ───────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center">
            <Package className="w-14 h-14 text-[#AAAAAA] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-1">
              {search || activeCategory ? 'Keine Produkte gefunden' : 'Noch keine Produkte'}
            </h3>
            <p className="text-sm text-[#666] max-w-sm mx-auto">
              {search || activeCategory
                ? 'Versuche andere Suchbegriffe oder Filter.'
                : 'Dieser Shop hat noch keine öffentlich sichtbaren Produkte.'}
            </p>
            {(search || activeCategory) && (
              <button
                onClick={() => { setSearch(''); setActiveCategory(''); fetchShop({ sort, search: '', category: '' }) }}
                className="mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-[#F0F0F0] text-[#333333] hover:bg-[#E5E5E5] transition-colors"
              >
                Filter zurücksetzen
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {products.map((p, i) => (
                <ShopProductCard key={p.id} product={p} index={i} />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center mt-8 mb-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold border border-[#E5E5E5] bg-white text-[#333333] hover:border-[#CCC] hover:bg-[#FAFAFA] disabled:opacity-50 transition-all"
                >
                  {loadingMore ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  {loadingMore ? 'Laden…' : 'Mehr anzeigen'}
                </button>
              </div>
            )}
          </>
        )}

        {/* Bottom spacer */}
        <div className="h-16" />
      </div>

      {/* Hide scrollbar on category pills */}
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  )
}
