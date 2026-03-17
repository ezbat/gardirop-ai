"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Heart, Search, Loader2, ChevronRight, ChevronLeft, Play, Star,
  Shirt, Watch, Footprints, Gem, Glasses, Briefcase, Dumbbell, Sparkles,
  Truck, RotateCcw, Shield, Zap, Clock, Eye, TrendingUp,
  ShoppingCart, CheckCircle, Headphones, CreditCard,
  Monitor, Home as HomeIcon, Palette,
  Gamepad2, Car, BookOpen,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useLanguage } from "@/lib/language-context"
import { usePageTransition } from "@/lib/page-transition-context"
import Price from "@/components/price"

// ── Types
interface Product {
  id: string; seller_id: string; title: string; description: string | null
  price: number; original_price: number | null; category: string
  brand: string | null; color: string | null; sizes: string[]
  stock_quantity: number; images: string[]; created_at: string
  seller?: { id: string; shop_name: string; logo_url: string | null; is_verified: boolean }
}

// ── 8 Category Index
const categoryCards = [
  { title: 'Technik', count: 3482, icon: Monitor, subcats: ['Smartphones', 'Laptops', 'Audio', 'Kameras'] },
  { title: 'Haus & Küche', count: 2841, icon: HomeIcon, subcats: ['Küche', 'Möbel', 'Deko', 'Garten'] },
  { title: 'Mode', count: 4216, icon: Shirt, subcats: ['Damen', 'Herren', 'Schuhe', 'Accessoires'] },
  { title: 'Beauty', count: 1892, icon: Palette, subcats: ['Hautpflege', 'Makeup', 'Haare', 'Düfte'] },
  { title: 'Sport', count: 1567, icon: Dumbbell, subcats: ['Fitness', 'Outdoor', 'Laufen', 'Yoga'] },
  { title: 'Spielzeug', count: 943, icon: Gamepad2, subcats: ['Kinder', 'Brettspiele', 'LEGO', 'Outdoor'] },
  { title: 'Auto', count: 1124, icon: Car, subcats: ['Zubehör', 'Elektronik', 'Pflege', 'Werkzeug'] },
  { title: 'Büro', count: 876, icon: BookOpen, subcats: ['Schreibwaren', 'Drucker', 'Möbel', 'Taschen'] },
]

const getSellerTier = (seller?: Product['seller']) => {
  if (!seller) return null
  if (seller.is_verified) return { label: 'WEARO Verified', color: '#D97706' }
  return null
}

// Deterministic pseudo-random from product ID (stable across re-renders)
const stableRandom = (id: string, seed: number = 0): number => {
  let hash = seed
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

// ── Store Page — Deal-Driven White Commerce
function StorePageInner() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const { navigateTo } = usePageTransition()
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = session?.user?.id

  const urlCat = searchParams.get('cat') || 'all'
  const urlQuery = searchParams.get('q') || ''

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [mobileSearchValue, setMobileSearchValue] = useState('')
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([])
  const [shopProducts, setShopProducts] = useState<Product[]>([])
  const [loadingTrending, setLoadingTrending] = useState(true)
  const [loadingShop, setLoadingShop] = useState(false)
  const [favorites, setFavorites] = useState<Record<string, boolean>>({})
  const [trendingReels, setTrendingReels] = useState<Array<{
    id: string; thumbnail_url: string; caption: string; view_count: number;
    user: { name: string; avatar_url: string } | null
  }>>([])
  const [shopHasMore, setShopHasMore] = useState(true)
  const [shopLoadingMore, setShopLoadingMore] = useState(false)
  const [shopOffset, setShopOffset] = useState(0)
  const shopSentinelRef = useRef<HTMLDivElement>(null)
  const SHOP_SIZE = 20

  const [heroSlide, setHeroSlide] = useState(0)
  const heroSlides = [
    { title: 'WINTER SALE', sub: 'Bis zu 70% auf ausgewählte Artikel', cta: 'Jetzt sparen', color: '#DC2626', bg: 'linear-gradient(135deg, #FFF7ED 0%, #FEF3C7 50%, #FFFBEB 100%)' },
    { title: 'FLASH DEALS', sub: 'Blitzangebote — nur heute verfügbar', cta: 'Deals ansehen', color: '#D97706', bg: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FFFBEB 100%)' },
    { title: 'TOP HÄNDLER', sub: 'Verifizierte Seller mit Premium-Service', cta: 'Entdecken', color: '#D97706', bg: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 50%, #F0FDF4 100%)' },
    { title: 'GRATIS VERSAND', sub: 'Auf Bestellungen ab 50€ — nur heute', cta: 'Jetzt shoppen', color: '#D97706', bg: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 50%, #F0F9FF 100%)' },
  ]

  const [countdown, setCountdown] = useState({ h: 6, m: 42, s: 18 })
  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(prev => {
        let { h, m, s } = prev; s--
        if (s < 0) { s = 59; m-- }
        if (m < 0) { m = 59; h-- }
        if (h < 0) { h = 23; m = 59; s = 59 }
        return { h, m, s }
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { const s = sessionStorage.getItem('store-scroll'); if (s) requestAnimationFrame(() => window.scrollTo(0, parseInt(s, 10))) }, [])
  useEffect(() => {
    let ticking = false
    const fn = () => { if (!ticking) { requestAnimationFrame(() => { sessionStorage.setItem('store-scroll', window.scrollY.toString()); ticking = false }); ticking = true } }
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  useEffect(() => { const t = setInterval(() => setHeroSlide(p => (p + 1) % heroSlides.length), 5000); return () => clearInterval(t) }, [])
  useEffect(() => { loadTrendingProducts(); loadTrendingReels() }, [])

  const loadTrendingReels = async () => {
    try { const { data } = await supabase.from('posts').select('id, thumbnail_url, caption, view_count, user:users!user_id(name, avatar_url)').eq('is_video', true).order('view_count', { ascending: false }).limit(6); setTrendingReels((data as any) || []) } catch {}
  }

  useEffect(() => {
    loadShopProducts(0, urlCat === 'all' ? undefined : urlCat)
    if (urlCat !== 'all') { const el = document.getElementById('shop-section'); if (el) el.scrollIntoView({ behavior: 'smooth' }) }
  }, [urlCat])

  useEffect(() => { if (userId && (trendingProducts.length > 0 || shopProducts.length > 0)) checkFavorites([...trendingProducts, ...shopProducts]) }, [userId, trendingProducts.length, shopProducts.length])

  const loadTrendingProducts = async () => {
    setLoadingTrending(true)
    try { const { data } = await supabase.from('products').select('*, seller:sellers(id, shop_name, logo_url, is_verified)').eq('moderation_status', 'approved').order('created_at', { ascending: false }).limit(16); setTrendingProducts(data || []) } catch {}
    finally { setLoadingTrending(false) }
  }

  const loadShopProducts = async (offset = 0, category?: string) => {
    if (offset === 0) setLoadingShop(true); else setShopLoadingMore(true)
    try {
      let q = supabase.from('products').select('*, seller:sellers(id, shop_name, logo_url, is_verified)').eq('moderation_status', 'approved').order('created_at', { ascending: false }).range(offset, offset + SHOP_SIZE - 1)
      if (category) q = q.eq('category', category)
      const { data } = await q
      if (offset === 0) setShopProducts(data || []); else setShopProducts(prev => [...prev, ...(data || [])])
      setShopHasMore((data?.length || 0) >= SHOP_SIZE); setShopOffset(offset)
    } catch {}
    finally { setLoadingShop(false); setShopLoadingMore(false) }
  }

  useEffect(() => {
    if (!shopSentinelRef.current || !shopHasMore || loadingShop) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting && !shopLoadingMore && shopHasMore) loadShopProducts(shopOffset + SHOP_SIZE, urlCat === 'all' ? undefined : urlCat) }, { rootMargin: '200px' })
    obs.observe(shopSentinelRef.current); return () => obs.disconnect()
  }, [shopOffset, shopHasMore, loadingShop, shopLoadingMore, urlCat])

  const checkFavorites = async (products: Product[]) => { if (!userId) return; try { const ids = products.map(p => p.id).join(','); const res = await fetch(`/api/favorites/check?productIds=${ids}`, { headers: { 'x-user-id': userId } }); const d = await res.json(); setFavorites(prev => ({ ...prev, ...(d.favorites || {}) })) } catch {} }

  const toggleFavorite = async (productId: string) => {
    if (!userId) return; const isFav = favorites[productId]
    try { if (isFav) { await fetch(`/api/favorites/products?productId=${productId}`, { method: 'DELETE', headers: { 'x-user-id': userId } }); setFavorites(prev => { const n = { ...prev }; delete n[productId]; return n }) } else { await fetch('/api/favorites/products', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': userId }, body: JSON.stringify({ productId }) }); setFavorites(prev => ({ ...prev, [productId]: true })) } } catch {}
  }

  const filterBySearch = (products: Product[]) => { if (!urlQuery) return products; const q = urlQuery.toLowerCase(); return products.filter(p => p.title.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q)) }
  const handleMobileSearch = (e: React.FormEvent) => { e.preventDefault(); const q = mobileSearchValue.trim(); if (q) router.push(`/store?q=${encodeURIComponent(q)}`); setMobileSearchOpen(false) }

  const dealProducts = trendingProducts.filter(p => p.original_price && p.original_price > p.price)
  const displayedTrending = filterBySearch(trendingProducts)
  const displayedShop = filterBySearch(shopProducts)
  const pad = (n: number) => n.toString().padStart(2, '0')

  // ── Product Card (WHITE, deal-driven) ────────────────────
  const ProductCard = ({ product }: { product: Product }) => {
    const hasDiscount = product.original_price && product.original_price > product.price
    const discount = hasDiscount ? Math.round(((product.original_price! - product.price) / product.original_price!) * 100) : 0
    const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 10
    const tier = getSellerTier(product.seller)

    return (
      <div className="group cursor-pointer rounded-[6px] overflow-hidden"
        style={{ background: '#FFFFFF', border: '1px solid #E5E5E5', transition: 'box-shadow 200ms' }}
        onClick={() => router.push(`/products/${product.id}`)}
        onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}>
        <div className="relative" style={{ aspectRatio: '1', background: '#F8F8F8' }}>
          <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
          {hasDiscount && (
            <div className="absolute top-0 left-0 px-[8px] py-[4px] text-[12px] font-bold"
              style={{ background: '#DC2626', color: '#FFFFFF' }}>
              -{discount}%
            </div>
          )}
          <button onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id) }}
            className="absolute top-[6px] right-[6px] w-[30px] h-[30px] flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100"
            style={{ transition: 'opacity 200ms', background: 'rgba(255,255,255,0.9)', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
            <Heart className="w-[14px] h-[14px]" style={{ color: favorites[product.id] ? '#DC2626' : '#999', fill: favorites[product.id] ? '#DC2626' : 'none' }} />
          </button>
          {/* Quick Add hover */}
          <button onClick={(e) => { e.stopPropagation(); router.push(`/products/${product.id}`) }}
            className="absolute bottom-[6px] right-[6px] w-[32px] h-[32px] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"
            style={{ background: '#D97706', transition: 'opacity 200ms', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
            <ShoppingCart className="w-[14px] h-[14px]" style={{ color: '#FFFFFF' }} />
          </button>
        </div>
        <div className="p-[10px]">
          <h3 className="text-[12px] line-clamp-2 leading-[1.4]" style={{ color: '#1A1A1A' }}>{product.title}</h3>
          {/* 5 stars */}
          <div className="flex items-center gap-[1px] mt-[4px]">
            {[1,2,3,4,5].map(s => <Star key={s} className="w-[11px] h-[11px]" style={{ fill: s <= 4 ? '#F59E0B' : '#E5E5E5', color: s <= 4 ? '#F59E0B' : '#E5E5E5' }} />)}
            <span className="text-[11px] ml-[4px]" style={{ color: '#666' }}>({stableRandom(product.id, 1) % 500 + 10})</span>
          </div>
          {/* Price */}
          <div className="flex items-baseline gap-[5px] mt-[4px]">
            <span className="text-[16px] font-bold" style={{ color: hasDiscount ? '#DC2626' : '#1A1A1A' }}>
              <Price amount={product.price} className="text-[16px]" />
            </span>
            {hasDiscount && (
              <span className="text-[11px]" style={{ color: '#999', textDecoration: 'line-through' }}>
                <Price amount={product.original_price!} className="text-[11px]" />
              </span>
            )}
          </div>
          {/* Seller + tier */}
          {product.seller && (
            <div className="flex items-center gap-[4px] mt-[4px] flex-wrap">
              <span className="text-[10px]" style={{ color: '#888' }}>Verkauft von: {product.seller.shop_name}</span>
              {tier && (
                <span className="text-[9px] font-bold px-[4px] py-[1px] rounded-[2px]" style={{ background: '#FEF3C7', color: '#92400E' }}>
                  ✔ {tier.label}
                </span>
              )}
            </div>
          )}
          {/* Delivery */}
          <div className="flex items-center gap-[3px] mt-[3px]">
            <Truck className="w-[10px] h-[10px]" style={{ color: '#22C55E' }} />
            <span className="text-[10px] font-medium" style={{ color: '#22C55E' }}>Lieferung Mo.–Mi.</span>
          </div>
          {/* Scarcity */}
          {isLowStock && (
            <p className="text-[10px] font-bold mt-[3px]" style={{ color: '#DC2626' }}>
              Nur noch {product.stock_quantity} Stück!
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div id="store-top" className="min-h-screen pb-[80px]" style={{ background: '#F5F5F5' }}>

      {/* Mobile search */}
      <div className="md:hidden px-[10px] pt-[8px]">
        <button onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          className="w-full flex items-center gap-[8px] rounded-[8px] px-[12px] py-[10px]"
          style={{ background: '#FFFFFF', border: '1px solid #DDD' }}>
          <Search className="w-[15px] h-[15px]" style={{ color: '#999' }} />
          <span className="text-[13px]" style={{ color: '#999' }}>Was suchst du?</span>
        </button>
      </div>
      {mobileSearchOpen && (
        <div className="md:hidden px-[10px] py-[6px]" style={{ background: '#F5F5F5' }}>
          <form onSubmit={handleMobileSearch} className="flex items-center gap-[8px]">
            <input type="text" value={mobileSearchValue} onChange={(e) => setMobileSearchValue(e.target.value)}
              placeholder="Produkte suchen..." autoFocus className="flex-1 bg-transparent outline-none text-[16px]" style={{ color: '#1A1A1A' }} />
          </form>
        </div>
      )}

      {/* ═══ HERO — CAMPAIGN CAROUSEL (COMMERCIAL) ═════════ */}
      <section className="relative" style={{ background: heroSlides[heroSlide].bg, transition: 'background 500ms' }}>
        <div className="max-w-7xl mx-auto px-[12px] md:px-[48px] py-[24px] md:py-[36px]">
          <div className="grid md:grid-cols-2 gap-[16px] items-center">
            <div>
              <h1 className="text-[28px] md:text-[42px] font-black leading-[1.05]" style={{ color: '#1A1A1A' }}>
                {heroSlides[heroSlide].title}
              </h1>
              <p className="mt-[6px] text-[14px] md:text-[16px]" style={{ color: '#555' }}>
                {heroSlides[heroSlide].sub}
              </p>
              <button onClick={() => document.getElementById('deals-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="mt-[14px] px-[28px] py-[12px] rounded-[6px] text-[14px] font-bold"
                style={{ background: heroSlides[heroSlide].color, color: '#FFFFFF', transition: 'opacity 150ms' }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}>
                {heroSlides[heroSlide].cta} →
              </button>
            </div>
            <div className="hidden md:block">
              <div className="aspect-[16/9] rounded-[10px] overflow-hidden" style={{ background: '#E5E5E5' }}>
                {trendingProducts[heroSlide]?.images[0] && (
                  <img src={trendingProducts[heroSlide].images[0]} alt="" className="w-full h-full object-cover" />
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-[6px] pb-[10px]">
          {heroSlides.map((_, i) => (
            <button key={i} onClick={() => setHeroSlide(i)} className="rounded-full"
              style={{ width: heroSlide === i ? '20px' : '6px', height: '6px', background: heroSlide === i ? '#D97706' : 'rgba(0,0,0,0.15)', transition: 'all 250ms' }} />
          ))}
        </div>
      </section>

      {/* ═══ BLITZANGEBOTE — CORE MONEY MAKER ════════════════ */}
      {dealProducts.length > 0 && (
        <section id="deals-section" className="px-[10px] md:px-[48px] pt-[16px] md:pt-[24px]">
          <div className="max-w-7xl mx-auto rounded-[8px] p-[14px] md:p-[20px]" style={{ background: '#FFFFFF', border: '1px solid #E5E5E5' }}>
            <div className="flex items-center justify-between mb-[12px]">
              <div className="flex items-center gap-[8px]">
                <Zap className="w-[18px] h-[18px]" style={{ color: '#D97706' }} />
                <h2 className="text-[17px] md:text-[19px] font-black" style={{ color: '#1A1A1A' }}>Blitzangebote</h2>
                <span className="text-[10px] font-bold px-[6px] py-[2px] rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}>Endet bald</span>
              </div>
              <div className="flex items-center gap-[4px] text-[13px] font-mono font-bold" style={{ color: '#DC2626' }}>
                <Clock className="w-[13px] h-[13px]" />
                {pad(countdown.h)}:{pad(countdown.m)}:{pad(countdown.s)}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[8px]">
              {dealProducts.slice(0, 8).map((product) => {
                const discount = Math.round(((product.original_price! - product.price) / product.original_price!) * 100)
                const claimed = (stableRandom(product.id, 2) % 40) + 50
                const remaining = product.stock_quantity > 0 ? Math.min(product.stock_quantity, 15) : (stableRandom(product.id, 3) % 12) + 2
                const tier = getSellerTier(product.seller)
                const reviewCount = (stableRandom(product.id, 4) % 200) + 20
                return (
                  <div key={product.id} className="rounded-[6px] overflow-hidden cursor-pointer group"
                    style={{ background: '#FFFFFF', border: '1px solid #EFEFEF', transition: 'box-shadow 200ms' }}
                    onClick={() => router.push(`/products/${product.id}`)}
                    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)')}
                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}>
                    <div className="relative" style={{ aspectRatio: '1', background: '#F8F8F8' }}>
                      <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                      <div className="absolute top-0 left-0 px-[6px] py-[3px] text-[11px] font-bold" style={{ background: '#DC2626', color: '#FFF' }}>-{discount}%</div>
                      <button onClick={(e) => { e.stopPropagation(); router.push(`/products/${product.id}`) }}
                        className="absolute bottom-[6px] right-[6px] w-[30px] h-[30px] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"
                        style={{ background: '#D97706', transition: 'opacity 150ms' }}>
                        <ShoppingCart className="w-[13px] h-[13px]" style={{ color: '#FFF' }} />
                      </button>
                    </div>
                    <div className="p-[8px]">
                      <p className="text-[11px] line-clamp-1" style={{ color: '#1A1A1A' }}>{product.title}</p>
                      {/* Stars + reviews */}
                      <div className="flex items-center gap-[1px] mt-[3px]">
                        {[1,2,3,4,5].map(s => <Star key={s} className="w-[10px] h-[10px]" style={{ fill: s <= 4 ? '#F59E0B' : '#E5E5E5', color: s <= 4 ? '#F59E0B' : '#E5E5E5' }} />)}
                        <span className="text-[9px] ml-[3px]" style={{ color: '#888' }}>({reviewCount})</span>
                      </div>
                      {/* Seller */}
                      {tier && <span className="text-[8px] font-bold px-[3px] py-[1px] rounded-[2px] inline-block mt-[3px]" style={{ background: '#FEF3C7', color: '#92400E' }}>✔ {tier.label}</span>}
                      {/* Price */}
                      <div className="flex items-baseline gap-[4px] mt-[3px]">
                        <span className="text-[16px] font-black" style={{ color: '#DC2626' }}><Price amount={product.price} className="text-[16px]" /></span>
                        <span className="text-[10px]" style={{ color: '#999', textDecoration: 'line-through' }}><Price amount={product.original_price!} className="text-[10px]" /></span>
                      </div>
                      {/* Delivery */}
                      <div className="flex items-center gap-[2px] mt-[3px]">
                        <Truck className="w-[9px] h-[9px]" style={{ color: '#22C55E' }} />
                        <span className="text-[9px]" style={{ color: '#22C55E' }}>Mo.–Mi.</span>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-[6px]">
                        <div className="h-[5px] rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
                          <div className="h-full rounded-full" style={{ width: `${claimed}%`, background: claimed > 70 ? '#DC2626' : '#D97706' }} />
                        </div>
                        <div className="flex items-center justify-between mt-[2px]">
                          <span className="text-[9px] font-bold" style={{ color: claimed > 70 ? '#DC2626' : '#D97706' }}>{claimed}% beansprucht</span>
                          <span className="text-[9px] font-bold" style={{ color: '#DC2626' }}>Noch {remaining} Stück</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══ 8 CATEGORY INDEX ═══════════════════════════════ */}
      <section className="px-[10px] md:px-[48px] pt-[16px] md:pt-[24px]">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-[8px]">
          {categoryCards.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.title} className="rounded-[8px] p-[12px]"
                style={{ background: '#FFFFFF', border: '1px solid #E5E5E5', transition: 'box-shadow 200ms' }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}>
                <div className="flex items-center justify-between mb-[8px]">
                  <h3 className="text-[13px] font-bold" style={{ color: '#1A1A1A' }}>{card.title}</h3>
                  <span className="text-[9px]" style={{ color: '#999' }}>{card.count.toLocaleString('de-DE')} Artikel</span>
                </div>
                <div className="grid grid-cols-2 gap-[6px]">
                  {card.subcats.map((sub) => (
                    <div key={sub} className="flex flex-col items-center gap-[2px]">
                      <div className="w-full rounded-[4px] flex items-center justify-center" style={{ aspectRatio: '1', background: '#F5F5F5', maxWidth: '70px', maxHeight: '70px' }}>
                        <Icon className="w-[20px] h-[20px]" style={{ color: '#999' }} />
                      </div>
                      <span className="text-[9px]" style={{ color: '#666' }}>{sub}</span>
                    </div>
                  ))}
                </div>
                <button className="mt-[8px] text-[11px] font-bold" style={{ color: '#D97706' }}>Mehr anzeigen →</button>
              </div>
            )
          })}
        </div>
      </section>

      {/* ═══ 3x BESTSELLER BLOCKS ═══════════════════════════ */}
      {displayedTrending.length > 0 && ['Bestseller', 'Trending in Mode', 'Beliebt in Sport'].map((title, idx) => (
        <section key={title} className="px-[10px] md:px-[48px] pt-[16px] md:pt-[24px]">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-[6px] mb-[12px]">
              {idx === 0 && <TrendingUp className="w-[16px] h-[16px]" style={{ color: '#D97706' }} />}
              {idx === 1 && <Shirt className="w-[16px] h-[16px]" style={{ color: '#D97706' }} />}
              {idx === 2 && <Dumbbell className="w-[16px] h-[16px]" style={{ color: '#D97706' }} />}
              <h2 className="text-[17px] font-black" style={{ color: '#1A1A1A' }}>{title}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[8px]">
              {displayedTrending.slice(idx * 4, idx * 4 + (idx === 0 ? 8 : 4)).map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      ))}

      {/* ═══ REELS — TINY HORIZONTAL STRIP ══════════════════ */}
      {trendingReels.length > 0 && (
        <section className="px-[10px] md:px-[48px] pt-[16px] md:pt-[24px]">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-[8px]">
              <h3 className="text-[13px] font-semibold" style={{ color: '#999' }}>Trending Videos</h3>
              <button onClick={() => navigateTo('/reels')} className="text-[11px]" style={{ color: '#999' }}>Alle →</button>
            </div>
            <div className="flex gap-[8px] overflow-x-auto hide-scrollbar pb-[4px]">
              {trendingReels.map((reel) => (
                <button key={reel.id} onClick={() => navigateTo('/reels')} className="flex-shrink-0 relative overflow-hidden rounded-[6px] group"
                  style={{ width: '100px', height: '160px', background: '#E5E5E5' }}>
                  {reel.thumbnail_url && <img src={reel.thumbnail_url} alt="" className="w-full h-full object-cover" />}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100" style={{ background: 'rgba(0,0,0,0.2)', transition: 'opacity 150ms' }}>
                    <Play className="w-[16px] h-[16px]" style={{ color: '#FFF', fill: '#FFF' }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ TRUST STRIP ═══════════════════════════════════ */}
      <section className="mt-[16px] md:mt-[24px]" style={{ background: '#FFFFFF', borderTop: '1px solid #E5E5E5', borderBottom: '1px solid #E5E5E5' }}>
        <div className="max-w-7xl mx-auto px-[10px] md:px-[48px] py-[20px] md:py-[28px]">
          <div className="flex flex-wrap items-center justify-center gap-x-[16px] gap-y-[6px] mb-[16px]">
            {[
              { icon: Shield, text: 'Käuferschutz' },
              { icon: RotateCcw, text: 'Sichere Rückerstattung' },
              { icon: CheckCircle, text: 'Verifizierte Händler' },
              { icon: Truck, text: '30 Tage Rückgabe' },
              { icon: Headphones, text: '24/7 Support' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-[4px]">
                <item.icon className="w-[13px] h-[13px]" style={{ color: '#D97706' }} />
                <span className="text-[11px] font-semibold" style={{ color: '#555' }}>{item.text}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px] text-center">
            {[
              { num: '12 Mio', label: 'Kunden' },
              { num: '4.7', label: 'Bewertung' },
              { num: '30 Tage', label: 'Rückgabe' },
              { num: '100%', label: 'Sicher' },
            ].map((m) => (
              <div key={m.label}>
                <p className="text-[22px] md:text-[26px] font-black" style={{ color: '#1A1A1A' }}>{m.num}</p>
                <p className="text-[10px]" style={{ color: '#999' }}>{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRODUCT FEED — DENSE INFINITE ══════════════════ */}
      <section id="shop-section" className="px-[10px] md:px-[48px] pt-[16px] md:pt-[24px]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-[12px]">
            <h2 className="text-[17px] font-black" style={{ color: '#1A1A1A' }}>
              {urlQuery ? `Ergebnisse für "${urlQuery}"` : urlCat !== 'all' ? urlCat : 'Entdecke mehr Angebote'}
            </h2>
            {displayedShop.length > 0 && <span className="text-[11px]" style={{ color: '#999' }}>{displayedShop.length}+ Produkte</span>}
          </div>
          {loadingShop ? (
            <div className="flex justify-center py-[40px]"><Loader2 className="w-5 h-5 animate-spin" style={{ color: '#999' }} /></div>
          ) : displayedShop.length === 0 ? (
            <div className="text-center py-[40px]"><p className="text-[13px]" style={{ color: '#999' }}>Keine Produkte gefunden</p></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[8px]">{displayedShop.map(p => <ProductCard key={p.id} product={p} />)}</div>
          )}
          {shopHasMore && <div ref={shopSentinelRef} className="h-[4px] mt-[16px]" />}
          {shopLoadingMore && <div className="flex justify-center py-[24px]"><Loader2 className="w-5 h-5 animate-spin" style={{ color: '#999' }} /></div>}
        </div>
      </section>

      <div className="pt-[20px] text-center">
        <button onClick={() => document.getElementById('store-top')?.scrollIntoView({ behavior: 'smooth' })}
          className="text-[10px] font-semibold uppercase" style={{ color: '#CCC', letterSpacing: '0.08em' }}>Nach oben</button>
      </div>
      <div className="h-[80px]" />
    </div>
  )
}

export default function StorePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F5F5' }}><Loader2 className="w-5 h-5 animate-spin" style={{ color: '#999' }} /></div>}>
      <StorePageInner />
    </Suspense>
  )
}
