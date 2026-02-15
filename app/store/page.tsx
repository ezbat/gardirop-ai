"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ShoppingCart, Heart, Search, ShoppingBag, Loader2, ChevronLeft, ChevronRight, Store as StoreIcon, SlidersHorizontal, X, Headset } from "lucide-react"
import Link from "next/link"
import VerifiedBadge from "@/components/verified-badge"
import { supabase } from "@/lib/supabase"
import { useLanguage } from "@/lib/language-context"
import Price from "@/components/price"

interface Product {
  id: string
  seller_id: string
  title: string
  description: string | null
  price: number
  original_price: number | null
  category: string
  brand: string | null
  color: string | null
  sizes: string[]
  stock_quantity: number
  images: string[]
  created_at: string
  seller?: {
    id: string
    shop_name: string
    logo_url: string | null
    is_verified: boolean
  }
}

export default function StorePage() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const router = useRouter()
  const userId = session?.user?.id

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState("Alle")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [favorites, setFavorites] = useState<Record<string, boolean>>({})
  const [showFilters, setShowFilters] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const ITEMS_PER_PAGE = 20

  const categories = [
    "Alle",
    "Oberbekleidung",
    "Unterbekleidung",
    "Kleid",
    "Außenbekleidung",
    "Schuhe",
    "Tasche",
    "Accessoires",
    "Sportbekleidung",
    "Unterwäsche"
  ]

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    if (userId && products.length > 0) {
      checkFavorites()
    }
  }, [userId, products])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:sellers(id, shop_name, logo_url, is_verified)
        `)
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkFavorites = async () => {
    try {
      const productIds = products.map(p => p.id).join(',')
      const response = await fetch(`/api/favorites/check?productIds=${productIds}`, {
        headers: { 'x-user-id': userId! }
      })
      const data = await response.json()
      setFavorites(data.favorites || {})
    } catch (error) {
      console.error('Error checking favorites:', error)
    }
  }

  const toggleFavorite = async (productId: string) => {
    if (!userId) {
      alert(t('pleaseLogin'))
      return
    }
    const isFavorited = favorites[productId]
    try {
      if (isFavorited) {
        const response = await fetch(`/api/favorites/products?productId=${productId}`, {
          method: 'DELETE',
          headers: { 'x-user-id': userId }
        })
        if (response.ok) {
          setFavorites(prev => { const n = { ...prev }; delete n[productId]; return n })
        }
      } else {
        const response = await fetch('/api/favorites/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
          body: JSON.stringify({ productId })
        })
        if (response.ok) {
          setFavorites(prev => ({ ...prev, [productId]: true }))
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const addToCart = (product: Product) => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]')
    const existingIndex = cart.findIndex((item: any) => item.product.id === product.id)
    if (existingIndex > -1) {
      cart[existingIndex].quantity += 1
    } else {
      cart.push({ id: Date.now().toString(), product, quantity: 1, selectedSize: product.sizes[0] || 'M' })
    }
    localStorage.setItem('cart', JSON.stringify(cart))
    alert(t('addedToCart'))
  }

  const openSupportChat = () => {
    window.dispatchEvent(new CustomEvent('open-support-chat'))
  }

  const filteredProducts = products.filter(p => {
    const catMatch = selectedCategory === "Alle" || p.category === selectedCategory
    const searchMatch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       p.brand?.toLowerCase().includes(searchQuery.toLowerCase())
    return catMatch && searchMatch
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory, searchQuery])

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const activeFilterCount = (selectedCategory !== "Alle" ? 1 : 0) + (searchQuery ? 1 : 0)

  const renderProductCard = (product: Product, isOffset: boolean) => (
    <motion.div
      key={product.id}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl overflow-hidden group"
      style={{
        background: 'oklch(1 0 0 / 0.05)',
        border: '1px solid oklch(1 0 0 / 0.08)',
        marginTop: isOffset ? '14px' : '0',
      }}
    >
      {/* Image */}
      <div
        className="cursor-pointer relative overflow-hidden"
        style={{
          background: 'oklch(0.15 0.03 280)',
          aspectRatio: '3/3.5',
        }}
        onClick={() => router.push(`/store/${product.id}`)}
      >
        <img
          src={product.images[0]}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Discount Badge */}
        {product.original_price && product.original_price > product.price && (
          <div
            className="absolute top-2 right-2 px-2 py-0.5 text-white text-xs font-bold rounded-full"
            style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
          >
            -{Math.round(((product.original_price - product.price) / product.original_price) * 100)}%
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id) }}
          className="absolute top-2 left-2 p-1.5 rounded-full transition-all"
          style={{
            background: favorites[product.id] ? 'oklch(0.55 0.22 25 / 0.3)' : 'oklch(0 0 0 / 0.4)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Heart
            className="w-4 h-4"
            style={{
              color: favorites[product.id] ? '#ef4444' : 'white',
              fill: favorites[product.id] ? '#ef4444' : 'none',
            }}
          />
        </button>
      </div>

      {/* Info */}
      <div className="p-2">
        {/* Price first - like TEMU */}
        <div className="flex items-baseline gap-1 mb-0.5">
          <Price amount={product.price} className="text-sm font-bold text-primary" />
          {product.original_price && product.original_price > product.price && (
            <Price amount={product.original_price} className="text-[9px] text-muted-foreground line-through" />
          )}
        </div>

        {/* Title */}
        <h3
          className="font-medium text-[11px] mb-1 line-clamp-2 cursor-pointer leading-snug"
          style={{ color: 'oklch(0.85 0.02 85)' }}
          onClick={() => router.push(`/store/${product.id}`)}
        >
          {product.title}
        </h3>

        {/* Seller + Cart in one row */}
        <div className="flex items-center justify-between">
          {product.seller ? (
            <Link
              href={`/seller/${product.seller.id}`}
              className="flex items-center gap-1 min-w-0 flex-1"
            >
              <span className="text-[9px] truncate" style={{ color: 'oklch(0.50 0.03 280)' }}>
                {product.seller.shop_name}
              </span>
            </Link>
          ) : <span />}
          <button
            onClick={() => addToCart(product)}
            disabled={product.stock_quantity === 0}
            className="p-1.5 rounded-lg flex-shrink-0 disabled:opacity-30"
            style={{
              background: product.stock_quantity > 0
                ? 'linear-gradient(135deg, oklch(0.78 0.14 85), oklch(0.65 0.18 50))'
                : 'oklch(1 0 0 / 0.06)',
            }}
          >
            <ShoppingCart className="w-3 h-3" style={{ color: product.stock_quantity > 0 ? 'white' : 'oklch(0.50 0.03 280)' }} />
          </button>
        </div>
      </div>
    </motion.div>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 70% 40% at 50% 0%, oklch(0.25 0.08 280 / 0.4), transparent),
            radial-gradient(ellipse 50% 40% at 90% 70%, oklch(0.20 0.06 330 / 0.3), transparent),
            linear-gradient(to bottom, oklch(0.12 0.03 280), oklch(0.10 0.02 300))
          `,
        }}
      />

      <section className="relative py-4 px-3">
        <div className="container mx-auto max-w-7xl">
          {/* Header - sticky */}
          <div
            className="sticky top-0 z-30 -mx-3 px-3 pt-2 pb-3"
            style={{
              background: 'oklch(0.12 0.03 280 / 0.9)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h1 className="font-serif text-2xl md:text-4xl font-bold" style={{
                background: 'linear-gradient(135deg, oklch(0.85 0.12 85), oklch(0.78 0.14 85))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {t('storeTitle')}
              </h1>
              <div className="flex items-center gap-2">
                {/* Customer Service Button */}
                <button
                  onClick={openSupportChat}
                  className="p-2.5 rounded-xl transition-all hover:scale-105"
                  style={{
                    background: 'oklch(1 0 0 / 0.08)',
                    border: '1px solid oklch(1 0 0 / 0.1)',
                  }}
                >
                  <Headset className="w-5 h-5" style={{ color: 'oklch(0.78 0.14 85)' }} />
                </button>
                {/* Cart Button */}
                <Link
                  href="/cart"
                  className="p-2.5 rounded-xl transition-all hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, oklch(0.78 0.14 85), oklch(0.65 0.18 50))',
                    boxShadow: '0 4px 15px oklch(0.78 0.14 85 / 0.3)',
                  }}
                >
                  <ShoppingBag className="w-5 h-5 text-white" />
                </Link>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex gap-2">
              <div
                className="flex-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all"
                style={{
                  background: searchFocused ? 'oklch(1 0 0 / 0.1)' : 'oklch(1 0 0 / 0.06)',
                  border: searchFocused ? '1px solid oklch(0.78 0.14 85 / 0.4)' : '1px solid oklch(1 0 0 / 0.08)',
                }}
              >
                <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'oklch(0.55 0.03 280)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder={t('searchProductBrandCategory')}
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: 'oklch(0.90 0.02 85)' }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="p-0.5">
                    <X className="w-3.5 h-3.5" style={{ color: 'oklch(0.55 0.03 280)' }} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="relative p-2.5 rounded-xl transition-all"
                style={{
                  background: showFilters ? 'oklch(0.78 0.14 85 / 0.2)' : 'oklch(1 0 0 / 0.06)',
                  border: showFilters ? '1px solid oklch(0.78 0.14 85 / 0.4)' : '1px solid oklch(1 0 0 / 0.08)',
                }}
              >
                <SlidersHorizontal className="w-4 h-4" style={{ color: showFilters ? 'oklch(0.78 0.14 85)' : 'oklch(0.65 0.03 280)' }} />
                {activeFilterCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                    style={{ background: 'oklch(0.78 0.14 85)' }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Filter Dropdown */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mb-4"
              >
                <div
                  className="rounded-2xl p-3"
                  style={{
                    background: 'oklch(1 0 0 / 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid oklch(1 0 0 / 0.08)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold" style={{ color: 'oklch(0.78 0.14 85)' }}>Kategorie</p>
                    {selectedCategory !== "Alle" && (
                      <button
                        onClick={() => setSelectedCategory("Alle")}
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: 'oklch(0.78 0.14 85 / 0.15)', color: 'oklch(0.78 0.14 85)' }}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => { setSelectedCategory(cat); if (cat !== "Alle") setShowFilters(false) }}
                        className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                        style={{
                          background: selectedCategory === cat
                            ? 'linear-gradient(135deg, oklch(0.78 0.14 85), oklch(0.65 0.18 50))'
                            : 'oklch(1 0 0 / 0.06)',
                          color: selectedCategory === cat ? 'white' : 'oklch(0.70 0.03 280)',
                          border: selectedCategory === cat ? 'none' : '1px solid oklch(1 0 0 / 0.1)',
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active filters pills */}
          {(selectedCategory !== "Alle" || searchQuery) && !showFilters && (
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {selectedCategory !== "Alle" && (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                  style={{ background: 'oklch(0.78 0.14 85 / 0.15)', color: 'oklch(0.78 0.14 85)' }}
                >
                  {selectedCategory}
                  <button onClick={() => setSelectedCategory("Alle")}><X className="w-3 h-3" /></button>
                </span>
              )}
              {searchQuery && (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                  style={{ background: 'oklch(0.78 0.14 85 / 0.15)', color: 'oklch(0.78 0.14 85)' }}
                >
                  &quot;{searchQuery}&quot;
                  <button onClick={() => setSearchQuery("")}><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}

          {/* Products Count */}
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px]" style={{ color: 'oklch(0.50 0.03 280)' }}>
              {filteredProducts.length} {t('productsFound')}
            </p>
            {totalPages > 1 && (
              <p className="text-[11px]" style={{ color: 'oklch(0.50 0.03 280)' }}>
                {currentPage} / {totalPages}
              </p>
            )}
          </div>

          {/* Products - Masonry Waterfall Layout */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 rounded-2xl" style={{ background: 'oklch(1 0 0 / 0.04)', border: '1px solid oklch(1 0 0 / 0.08)' }}>
              <div className="text-7xl mb-4">🔍</div>
              <h3 className="text-xl font-bold mb-2" style={{ color: 'oklch(0.90 0.02 85)' }}>{t('noProductsFound')}</h3>
              <p className="text-sm" style={{ color: 'oklch(0.55 0.03 280)' }}>{t('tryDifferentFilters')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4 md:gap-4 max-w-3xl mx-auto lg:max-w-6xl">
              {paginatedProducts.map((product, idx) => renderProductCard(product, idx % 2 === 1))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl transition-all disabled:opacity-30"
                style={{ background: 'oklch(1 0 0 / 0.06)', border: '1px solid oklch(1 0 0 / 0.08)' }}
              >
                <ChevronLeft className="w-5 h-5" style={{ color: 'oklch(0.70 0.03 280)' }} />
              </button>

              <div className="flex gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className="w-9 h-9 rounded-xl text-sm font-semibold transition-all"
                        style={{
                          background: currentPage === page
                            ? 'linear-gradient(135deg, oklch(0.78 0.14 85), oklch(0.65 0.18 50))'
                            : 'oklch(1 0 0 / 0.06)',
                          color: currentPage === page ? 'white' : 'oklch(0.65 0.03 280)',
                          border: currentPage === page ? 'none' : '1px solid oklch(1 0 0 / 0.08)',
                        }}
                      >
                        {page}
                      </button>
                    )
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="w-9 h-9 flex items-center justify-center text-sm" style={{ color: 'oklch(0.50 0.03 280)' }}>...</span>
                  }
                  return null
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl transition-all disabled:opacity-30"
                style={{ background: 'oklch(1 0 0 / 0.06)', border: '1px solid oklch(1 0 0 / 0.08)' }}
              >
                <ChevronRight className="w-5 h-5" style={{ color: 'oklch(0.70 0.03 280)' }} />
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
