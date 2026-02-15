"use client"

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ShoppingCart, Heart, Share2, Star, Sparkles, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Product {
  id: string
  title: string
  description: string
  price: number
  images: string[]
  seller_id: string
  category: string
  stock: number
  stock_quantity?: number
  seller: {
    id: string
    name: string
    username: string
    avatar_url: string
  }
}

export default function ProductDetailPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [isLiked, setIsLiked] = useState(false)

  useEffect(() => {
    loadProduct()
  }, [productId])

  const loadProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (error) throw error

      // Mock seller data for now
      const productWithSeller = {
        ...data,
        seller: {
          id: data.seller_id,
          name: 'Premium Seller',
          username: 'seller',
          avatar_url: '/default-avatar.png'
        }
      }

      setProduct(productWithSeller)
    } catch (error) {
      console.error('Error loading product:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddToCart = async () => {
    setIsAddingToCart(true)
    // Add to cart logic
    setTimeout(() => {
      setIsAddingToCart(false)
      alert('Added to cart!')
    }, 500)
  }

  const handleBuyNow = async () => {
    if (!product) return

    // Express checkout - redirect to checkout with product
    router.push(`/checkout?product=${product.id}&quantity=${quantity}`)
  }

  const handleVisitShop = () => {
    if (!product?.seller_id) return
    router.push(`/seller/${product.seller_id}`)
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: product?.title,
        text: `Check out ${product?.title}`,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied!')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-950 dark:to-zinc-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-gray-700 dark:text-gray-300 font-medium">Loading product...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-950 dark:to-zinc-900">
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900 dark:text-white mb-4">Product not found</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {/* Header with back button */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center tap-highlight-none hover:scale-110 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center tap-highlight-none hover:scale-110 active:scale-95 transition-all"
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-900 dark:text-white'}`} />
            </button>
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center tap-highlight-none hover:scale-110 active:scale-95 transition-all"
            >
              <Share2 className="w-5 h-5 text-gray-900 dark:text-white" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Image Gallery */}
          <div className="space-y-4">
            {/* Premium Badge */}
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 rounded-full shadow-lg shadow-purple-500/30"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-white text-xs font-bold tracking-wide">PREMIUM SELECTION</span>
              <Sparkles className="w-4 h-4 text-white" />
            </motion.div>

            {/* Main Image */}
            <div className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-800 dark:to-zinc-900 shadow-2xl">
              <div className="absolute inset-0 rounded-3xl border-2 border-white/10 dark:border-white/5 z-10" />

              <AnimatePresence mode="wait">
                <motion.img
                  key={selectedImageIndex}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  src={product.images[selectedImageIndex] || '/placeholder-product.png'}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>

              {/* Navigation arrows */}
              {product.images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImageIndex((selectedImageIndex - 1 + product.images.length) % product.images.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 dark:bg-black/80 backdrop-blur-xl flex items-center justify-center tap-highlight-none hover:scale-110 active:scale-95 transition-all shadow-lg"
                  >
                    <ChevronLeft className="w-6 h-6 text-gray-900 dark:text-white" />
                  </button>
                  <button
                    onClick={() => setSelectedImageIndex((selectedImageIndex + 1) % product.images.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 dark:bg-black/80 backdrop-blur-xl flex items-center justify-center tap-highlight-none hover:scale-110 active:scale-95 transition-all shadow-lg"
                  >
                    <ChevronRight className="w-6 h-6 text-gray-900 dark:text-white" />
                  </button>
                </>
              )}

              {/* Star Rating */}
              <div className="absolute top-4 left-4 flex items-center gap-1 px-3 py-1.5 bg-white/95 dark:bg-black/80 backdrop-blur-xl rounded-full shadow-lg">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-bold text-gray-900 dark:text-white">4.9</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">(2.3K)</span>
              </div>

              {/* Quick Add Badge */}
              <div className="absolute bottom-4 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-2xl shadow-purple-500/50">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all ${
                      selectedImageIndex === idx
                        ? 'border-purple-500 shadow-lg shadow-purple-500/50 scale-105'
                        : 'border-gray-200 dark:border-zinc-700 opacity-60'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info */}
          <div className="space-y-6">
            {/* Title */}
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white leading-tight mb-2">
                {product.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {product.category}
              </p>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
                €{product.price}
              </span>
              <span className="text-xl text-gray-400 line-through">€{(product.price * 1.4).toFixed(2)}</span>
              <div className="px-3 py-1 bg-gradient-to-r from-red-500 to-pink-500 rounded-full">
                <span className="text-sm font-bold text-white">-30%</span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-zinc-700 to-transparent" />

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {product.description || 'Premium quality product with excellent craftsmanship and attention to detail.'}
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-1 p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-2xl border border-purple-100 dark:border-purple-900/30">
                <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Premium</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-2xl border border-green-100 dark:border-green-900/30">
                <ShoppingCart className="w-6 h-6 text-green-600 dark:text-green-400" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Fast Ship</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                <Star className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Verified</span>
              </div>
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600 dark:text-gray-400">Stock:</span>
              <span className={`font-semibold ${(product.stock_quantity || 0) > 10 ? 'text-green-600' : 'text-orange-600'}`}>
                {product.stock_quantity || 0} items available
              </span>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-800 rounded-3xl border border-gray-200 dark:border-zinc-700">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">QUANTITY</span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-11 h-11 rounded-full bg-white dark:bg-zinc-700 border-2 border-gray-200 dark:border-zinc-600 flex items-center justify-center tap-highlight-none shadow-lg hover:shadow-xl transition-all"
                >
                  <span className="text-xl font-bold text-gray-700 dark:text-gray-300">−</span>
                </button>
                <span className="text-2xl font-bold text-gray-900 dark:text-white min-w-[40px] text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock_quantity || 99, quantity + 1))}
                  className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center tap-highlight-none shadow-lg shadow-purple-500/50 hover:shadow-xl transition-all"
                >
                  <span className="text-xl font-bold text-white">+</span>
                </button>
              </div>
            </div>

            {/* Seller Info */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800">
              <img
                src={product.seller.avatar_url || '/default-avatar.png'}
                alt={product.seller.name}
                className="w-12 h-12 rounded-full border-2 border-purple-500"
              />
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white">{product.seller.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">@{product.seller.username}</p>
              </div>
              <button
                onClick={handleVisitShop}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-sm font-semibold tap-highlight-none active:scale-95 transition-transform"
              >
                Visit Shop
              </button>
            </div>

            {/* Action Buttons - Buy Now + Add to Cart */}
            <div className="flex gap-3">
              {/* Buy Now - Express Checkout */}
              <motion.button
                onClick={handleBuyNow}
                disabled={(product.stock_quantity || 0) === 0}
                whileTap={{ scale: 0.95 }}
                className="flex-1 h-16 rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white font-bold flex items-center justify-center gap-2 tap-highlight-none transition-all disabled:opacity-50 shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/70 relative overflow-hidden"
              >
                {/* Shimmer Effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />

                <ShoppingBag className="w-6 h-6 relative z-10" />
                <span className="text-lg relative z-10">
                  {(product.stock_quantity || 0) === 0 ? 'Out of Stock' : 'Buy Now'}
                </span>
              </motion.button>

              {/* Add to Cart */}
              <motion.button
                onClick={handleAddToCart}
                disabled={isAddingToCart || (product.stock_quantity || 0) === 0}
                whileTap={{ scale: 0.95 }}
                className="h-16 w-16 rounded-full bg-white dark:bg-zinc-900 border-2 border-gray-900 dark:border-white flex items-center justify-center tap-highlight-none transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
              >
                <ShoppingCart className={`w-6 h-6 ${isAddingToCart ? 'animate-bounce' : ''} text-gray-900 dark:text-white`} />
              </motion.button>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                  <span className="text-white text-[10px]">✓</span>
                </div>
                <span>Secure Payment</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-gray-400" />
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-[10px]">✓</span>
                </div>
                <span>Verified Seller</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-gray-400" />
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                  <span className="text-white text-[10px]">✓</span>
                </div>
                <span>Authentic</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
