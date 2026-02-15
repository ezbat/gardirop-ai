"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Heart, Trash2, ShoppingCart, Star, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

interface WishlistItem {
  id: string
  created_at: string
  products: {
    id: string
    title: string
    price: number
    images: string[]
    category: string
    brand: string
    average_rating: number
    review_count: number
    sellers: {
      id: string
      business_name: string
    }
  }
}

export default function WishlistPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    if (userId) {
      loadWishlist()
    }
  }, [userId])

  const loadWishlist = async () => {
    if (!userId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/wishlist?userId=${userId}`)
      const data = await response.json()

      if (response.ok) {
        setWishlist(data.wishlist || [])
      }
    } catch (error) {
      console.error('Load wishlist error:', error)
    } finally {
      setLoading(false)
    }
  }

  const removeFromWishlist = async (productId: string) => {
    if (!userId) return

    try {
      setRemovingId(productId)
      const response = await fetch(`/api/wishlist?userId=${userId}&productId=${productId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setWishlist(wishlist.filter(item => item.products.id !== productId))
      }
    } catch (error) {
      console.error('Remove from wishlist error:', error)
    } finally {
      setRemovingId(null)
    }
  }

  const addToCart = (productId: string) => {
    // Get existing cart
    const cart = JSON.parse(localStorage.getItem('cart') || '[]')

    // Check if already in cart
    const existingItem = cart.find((item: any) => item.productId === productId)

    if (existingItem) {
      existingItem.quantity += 1
    } else {
      cart.push({ productId, quantity: 1 })
    }

    localStorage.setItem('cart', JSON.stringify(cart))
    alert('✅ Sepete eklendi!')
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">İstek Listesi</h2>
          <p className="text-muted-foreground mb-4">İstek listenizi görmek için giriş yapın</p>
          <Link href="/auth/signin" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity inline-block">
            Giriş Yap
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Heart className="w-8 h-8 text-primary fill-primary" />
          <h1 className="text-4xl font-bold">İstek Listem</h1>
          <span className="text-muted-foreground">({wishlist.length})</span>
        </div>

        {/* Empty State */}
        {wishlist.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-20 h-20 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">İstek listeniz boş</h2>
            <p className="text-muted-foreground mb-6">Beğendiğiniz ürünleri istek listenize ekleyin</p>
            <Link href="/store" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity inline-block">
              Alışverişe Başla
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {wishlist.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="glass border border-border rounded-2xl overflow-hidden group"
                >
                  {/* Product Image */}
                  <Link href={`/store/${item.products.id}`} className="block relative aspect-square overflow-hidden">
                    <img
                      src={item.products.images[0]}
                      alt={item.products.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />

                    {/* Remove Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        removeFromWishlist(item.products.id)
                      }}
                      disabled={removingId === item.products.id}
                      className="absolute top-3 right-3 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                    >
                      {removingId === item.products.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </Link>

                  {/* Product Info */}
                  <div className="p-4 space-y-3">
                    {/* Brand & Category */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{item.products.brand || item.products.sellers.business_name}</span>
                      <span>{item.products.category}</span>
                    </div>

                    {/* Title */}
                    <Link href={`/store/${item.products.id}`}>
                      <h3 className="font-semibold line-clamp-2 hover:text-primary transition-colors">
                        {item.products.title}
                      </h3>
                    </Link>

                    {/* Rating */}
                    {item.products.review_count > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                          <span className="text-sm font-medium">{item.products.average_rating.toFixed(1)}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">({item.products.review_count})</span>
                      </div>
                    )}

                    {/* Price */}
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold text-primary">€{item.products.price}</p>
                    </div>

                    {/* Add to Cart Button */}
                    <button
                      onClick={() => addToCart(item.products.id)}
                      className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      Sepete Ekle
                    </button>

                    {/* Added Date */}
                    <p className="text-xs text-muted-foreground text-center">
                      Eklenme: {new Date(item.created_at).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
