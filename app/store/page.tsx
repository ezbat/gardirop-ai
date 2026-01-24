"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ShoppingCart, Heart, Search, ShoppingBag, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import FloatingParticles from "@/components/floating-particles"
import { supabase } from "@/lib/supabase"
import { useLanguage } from "@/lib/language-context"

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
}

export default function StorePage() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const router = useRouter()
  const userId = session?.user?.id

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [favorites, setFavorites] = useState<Record<string, boolean>>({})
  const ITEMS_PER_PAGE = 12

  const categories = [
    "All",
    "Üst Giyim",
    "Alt Giyim",
    "Elbise",
    "Dış Giyim",
    "Ayakkabı",
    "Çanta",
    "Aksesuar",
    "Spor Giyim",
    "İç Giyim"
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
        .select('*')
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('📦 Loaded products:', data?.length)
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
        headers: {
          'x-user-id': userId!
        }
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
        // Remove from favorites
        const response = await fetch(`/api/favorites/products?productId=${productId}`, {
          method: 'DELETE',
          headers: {
            'x-user-id': userId
          }
        })

        if (response.ok) {
          setFavorites(prev => {
            const newFavs = { ...prev }
            delete newFavs[productId]
            return newFavs
          })
          alert('❌ Favorilerden kaldırıldı')
        }
      } else {
        // Add to favorites
        const response = await fetch('/api/favorites/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId
          },
          body: JSON.stringify({ productId })
        })

        if (response.ok) {
          setFavorites(prev => ({
            ...prev,
            [productId]: true
          }))
          alert(t('addedToFavorites'))
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const addToCart = (product: Product) => {
    // Get existing cart
    const cart = JSON.parse(localStorage.getItem('cart') || '[]')
    
    // Check if product already in cart
    const existingIndex = cart.findIndex((item: any) => item.product.id === product.id)
    
    if (existingIndex > -1) {
      cart[existingIndex].quantity += 1
    } else {
      cart.push({
        id: Date.now().toString(),
        product: product,
        quantity: 1,
        selectedSize: product.sizes[0] || 'M'
      })
    }
    
    localStorage.setItem('cart', JSON.stringify(cart))
    alert(t('addedToCart'))
  }

  const filteredProducts = products.filter(p => {
    const catMatch = selectedCategory === "All" || p.category === selectedCategory
    const searchMatch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       p.brand?.toLowerCase().includes(searchQuery.toLowerCase())
    return catMatch && searchMatch
  })

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory, searchQuery])

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-serif text-5xl font-bold mb-2">{t('storeTitle')}</h1>
              <p className="text-xl text-muted-foreground">{t('discoverAllProducts')}</p>
            </div>
            <Link
              href="/cart"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 flex items-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              {t('myCart')}
            </Link>
          </div>

          {/* Filters */}
          <div className="mb-8 space-y-4">
            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchProductBrandCategory')}
                className="w-full pl-12 pr-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary"
              />
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "glass border border-border hover:border-primary"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Products Count & Pagination Info */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredProducts.length} {t('productsFound')}
            </p>
            {totalPages > 1 && (
              <p className="text-sm text-muted-foreground">
                {t('page')} {currentPage} / {totalPages}
              </p>
            )}
          </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 glass border border-border rounded-2xl">
              <div className="text-9xl mb-6">🛍️</div>
              <h3 className="text-2xl font-bold mb-3">{t('noProductsFound')}</h3>
              <p className="text-muted-foreground">{t('tryDifferentFilters')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedProducts.map((product) => (
                <div
                  key={product.id}
                  className="glass border border-border rounded-2xl overflow-hidden hover:border-primary transition-all hover:shadow-lg group"
                >
                  {/* Image */}
                  <div
                    className="aspect-square bg-primary/5 cursor-pointer relative overflow-hidden"
                    onClick={() => router.push(`/store/${product.id}`)}
                  >
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Discount Badge */}
                    {product.original_price && product.original_price > product.price && (
                      <div className="absolute top-3 right-3 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                        -{Math.round(((product.original_price - product.price) / product.original_price) * 100)}%
                      </div>
                    )}

                    {/* Favorite Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(product.id)
                      }}
                      className={`absolute top-3 left-3 p-2 glass rounded-full hover:bg-primary/20 transition-colors ${
                        favorites[product.id] ? 'bg-red-500/20' : ''
                      }`}
                    >
                      <Heart
                        className={`w-5 h-5 ${favorites[product.id] ? 'fill-red-500 text-red-500' : ''}`}
                      />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    {/* Brand & Category */}
                    <div className="flex items-center gap-2 mb-2">
                      {product.brand && (
                        <span className="text-xs text-primary font-semibold uppercase">
                          {product.brand}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">• {product.category}</span>
                    </div>

                    {/* Title */}
                    <h3
                      className="font-bold text-lg mb-2 line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => router.push(`/store/${product.id}`)}
                    >
                      {product.title}
                    </h3>

                    {/* Description */}
                    {product.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {product.description}
                      </p>
                    )}

                    {/* Color */}
                    {product.color && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {t('colorLabel')}: {product.color}
                      </p>
                    )}

                    {/* Sizes */}
                    {product.sizes && product.sizes.length > 0 && (
                      <div className="flex gap-1 mb-3">
                        {product.sizes.slice(0, 5).map(size => (
                          <span key={size} className="text-xs px-2 py-1 glass border border-border rounded">
                            {size}
                          </span>
                        ))}
                        {product.sizes.length > 5 && (
                          <span className="text-xs px-2 py-1 text-muted-foreground">
                            +{product.sizes.length - 5}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Price */}
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-2xl font-bold text-primary">€{product.price.toFixed(2)}</p>
                      {product.original_price && product.original_price > product.price && (
                        <p className="text-sm text-muted-foreground line-through">
                          €{product.original_price.toFixed(2)}
                        </p>
                      )}
                    </div>

                    {/* Stock & Actions */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-muted-foreground">
                        {t('stock')}: {product.stock_quantity}
                      </span>
                    </div>

                    {/* Add to Cart Button */}
                    <button
                      onClick={() => addToCart(product)}
                      disabled={product.stock_quantity === 0}
                      className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      {product.stock_quantity > 0 ? t('addToCart') : t('outOfStock')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 glass border border-border rounded-xl hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                {t('previous')}
              </button>

              <div className="flex gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  // Show first page, last page, current page, and pages around current
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-xl font-semibold transition-colors ${
                          currentPage === page
                            ? "bg-primary text-primary-foreground"
                            : "glass border border-border hover:border-primary"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="w-10 h-10 flex items-center justify-center">...</span>
                  }
                  return null
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 glass border border-border rounded-xl hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {t('next')}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}