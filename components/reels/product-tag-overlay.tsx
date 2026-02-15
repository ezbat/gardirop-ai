"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingCart, ExternalLink, Star, Sparkles, ShoppingBag } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ProductTagOverlayProps {
  product: {
    id: string
    title: string
    price: number
    images: string[]
  }
  onClose: () => void
}

export default function ProductTagOverlay({ product, onClose }: ProductTagOverlayProps) {
  const router = useRouter()
  const [quantity, setQuantity] = useState(1)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)

  const handleAddToCart = async () => {
    setIsAddingToCart(true)
    // Add to cart logic here
    setTimeout(() => {
      setIsAddingToCart(false)
      onClose()
      // Show success toast
    }, 500)
  }

  const handleBuyNow = () => {
    // Express checkout - redirect to checkout with product
    router.push(`/checkout?product=${product.id}&quantity=${quantity}`)
    onClose()
  }

  const handleViewDetails = () => {
    router.push(`/products/${product.id}`)
    onClose()
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50">
        {/* Premium Backdrop with Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        />

        {/* Luxury Bottom Sheet */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 35, stiffness: 400 }}
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-white via-white to-gray-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 rounded-t-[40px] safe-area-bottom overflow-hidden"
          style={{ maxHeight: '85vh' }}
        >
          {/* Elegant Handle Bar */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 rounded-full opacity-50" />

          {/* Luxury Border Top Glow */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />

          {/* Close Button - Elegant */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 z-10 w-10 h-10 rounded-full bg-white/10 dark:bg-black/20 backdrop-blur-xl border border-white/20 flex items-center justify-center tap-highlight-none group hover:scale-110 active:scale-95 transition-all shadow-lg"
          >
            <X className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:rotate-90 transition-transform duration-300" />
          </button>

          {/* Scrollable Content */}
          <div className="overflow-y-auto max-h-[85vh] px-6 pt-12 pb-8">
            {/* Premium Badge */}
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 rounded-full mb-4 shadow-lg shadow-purple-500/30"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-white text-xs font-bold tracking-wide">PREMIUM SELECTION</span>
              <Sparkles className="w-4 h-4 text-white" />
            </motion.div>

            {/* Product Image Gallery - Luxury Style */}
            <div className="relative mb-6">
              {/* Main Image with Elegant Frame */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-800 dark:to-zinc-900 shadow-2xl"
              >
                {/* Inner Glow Border */}
                <div className="absolute inset-0 rounded-3xl border-2 border-white/10 dark:border-white/5 z-10" />

                {/* Image */}
                <img
                  src={product.images[selectedImage] || '/placeholder-product.png'}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />

                {/* Gradient Overlay at Bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/40 to-transparent z-10" />

                {/* Floating Star Rating */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="absolute top-4 left-4 flex items-center gap-1 px-3 py-1.5 bg-white/95 dark:bg-black/80 backdrop-blur-xl rounded-full shadow-lg"
                >
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-bold text-gray-900 dark:text-white">4.9</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">(2.3K)</span>
                </motion.div>

                {/* Quick Add Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="absolute bottom-4 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-2xl shadow-purple-500/50"
                >
                  <ShoppingBag className="w-6 h-6 text-white" />
                </motion.div>
              </motion.div>

              {/* Image Thumbnails (if multiple images) */}
              {product.images && product.images.length > 1 && (
                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                  {product.images.map((img, idx) => (
                    <motion.button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      whileTap={{ scale: 0.95 }}
                      className={`flex-shrink-0 w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all ${
                        selectedImage === idx
                          ? 'border-purple-500 shadow-lg shadow-purple-500/50 scale-105'
                          : 'border-gray-200 dark:border-zinc-700 opacity-60'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info - Elegant Typography */}
            <div className="space-y-4 mb-6">
              {/* Title with Luxury Styling */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-gray-900 dark:text-white leading-tight tracking-tight"
              >
                {product.title}
              </motion.h2>

              {/* Price with Premium Badge */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-baseline gap-3"
              >
                <span className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
                  €{product.price}
                </span>
                <span className="text-lg text-gray-400 line-through">€{(product.price * 1.4).toFixed(2)}</span>
                <div className="px-3 py-1 bg-gradient-to-r from-red-500 to-pink-500 rounded-full">
                  <span className="text-xs font-bold text-white">-30%</span>
                </div>
              </motion.div>

              {/* Luxury Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-zinc-700 to-transparent" />

              {/* Features Grid */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-3 gap-3"
              >
                <div className="flex flex-col items-center gap-1 p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-2xl border border-purple-100 dark:border-purple-900/30">
                  <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Premium</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-2xl border border-green-100 dark:border-green-900/30">
                  <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Fast Ship</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-3 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                  <Star className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Verified</span>
                </div>
              </motion.div>
            </div>

            {/* Quantity Selector - Luxury Style */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-800 rounded-3xl border border-gray-200 dark:border-zinc-700"
            >
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">QUANTITY</span>
              <div className="flex items-center gap-4">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-11 h-11 rounded-full bg-white dark:bg-zinc-700 border-2 border-gray-200 dark:border-zinc-600 flex items-center justify-center tap-highlight-none shadow-lg hover:shadow-xl transition-all"
                >
                  <span className="text-xl font-bold text-gray-700 dark:text-gray-300">−</span>
                </motion.button>
                <span className="text-2xl font-bold text-gray-900 dark:text-white min-w-[40px] text-center">{quantity}</span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center tap-highlight-none shadow-lg shadow-purple-500/50 hover:shadow-xl transition-all"
                >
                  <span className="text-xl font-bold text-white">+</span>
                </motion.button>
              </div>
            </motion.div>

            {/* Action Buttons - Premium Style */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-3"
            >
              {/* Buy Now - Primary Action */}
              <motion.button
                onClick={handleBuyNow}
                whileTap={{ scale: 0.95 }}
                className="w-full h-16 rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white font-bold flex items-center justify-center gap-2 tap-highlight-none transition-all shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/70 relative overflow-hidden"
              >
                {/* Shimmer Effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{
                    x: ['-100%', '100%']
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />

                <ShoppingBag className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Buy Now</span>
              </motion.button>

              {/* Secondary Actions */}
              <div className="flex gap-3">
                {/* Add to Cart */}
                <motion.button
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 h-14 rounded-full bg-white dark:bg-zinc-900 border-2 border-gray-900 dark:border-white text-gray-900 dark:text-white font-semibold flex items-center justify-center gap-2 tap-highlight-none transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
                >
                  <ShoppingCart className={`w-5 h-5 ${isAddingToCart ? 'animate-bounce' : ''}`} />
                  <span>{isAddingToCart ? 'Adding...' : 'Add to Bag'}</span>
                </motion.button>

                {/* View Details */}
                <button
                  onClick={handleViewDetails}
                  className="h-14 px-6 rounded-full bg-white dark:bg-zinc-900 border-2 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white font-semibold flex items-center justify-center gap-2 tap-highlight-none active:scale-95 transition-all shadow-lg hover:shadow-xl"
                >
                  <ExternalLink className="w-5 h-5" />
                </button>
              </div>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex items-center justify-center gap-4 mt-6 text-xs text-gray-500 dark:text-gray-400"
            >
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                  <span className="text-white text-[10px]">✓</span>
                </div>
                <span>Secure</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-gray-400" />
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-[10px]">✓</span>
                </div>
                <span>Verified</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-gray-400" />
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                  <span className="text-white text-[10px]">✓</span>
                </div>
                <span>Authentic</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
