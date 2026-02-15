"use client"

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MessageCircle, Share2, Bookmark, Volume2, VolumeX, ShoppingBag, ShoppingCart, X, Eye, Users, Flame, Star, ChevronUp } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ProductTagOverlay from './product-tag-overlay'

interface ProductTag {
  id: string
  product_id: string
  position_x: number
  position_y: number
  timestamp_seconds: number
  product: {
    id: string
    title: string
    price: number
    original_price?: number
    images: string[]
  }
}

interface ReelItemProps {
  post: {
    id: string
    video_url: string
    thumbnail_url: string
    caption: string
    user_id: string
    likes_count: number
    comments_count: number
    view_count: number
    created_at: string
    user: {
      id: string
      name: string
      username: string
      avatar_url: string
    }
    product_tags?: ProductTag[]
  }
  isActive: boolean
  onLike: () => void
  onComment: () => void
  onShare: () => void
  onBookmark: () => void
}

export default function ReelItem({
  post,
  isActive,
  onLike,
  onComment,
  onShare,
  onBookmark
}: ReelItemProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const router = useRouter()
  const [isMuted, setIsMuted] = useState(true)
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [showProductSheet, setShowProductSheet] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductTag | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBuffering, setIsBuffering] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [progress, setProgress] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [localLikesCount, setLocalLikesCount] = useState(post.likes_count)
  const [showComments, setShowComments] = useState(false)
  const [showShareSheet, setShowShareSheet] = useState(false)
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false)
  const [showMiniProductBar, setShowMiniProductBar] = useState(true)
  const [addedToCart, setAddedToCart] = useState<string | null>(null)
  const { data: session } = useSession()
  const lastTapRef = useRef(0)
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Simulated FOMO data
  const viewersNow = Math.floor(Math.random() * 80) + 20
  const hasDiscount = post.product_tags?.some(t => t.product.original_price && t.product.original_price > t.product.price)

  // Auto-play/pause based on visibility
  useEffect(() => {
    if (!videoRef.current) return
    if (isActive) {
      videoRef.current.play().catch(() => {})
      trackView()
    } else {
      videoRef.current.pause()
    }
  }, [isActive])

  // Keyboard shortcuts
  useEffect(() => {
    if (!isActive) return
    const handleKeyPress = (e: KeyboardEvent) => {
      const video = videoRef.current
      if (!video) return
      if (['Space', 'KeyM', 'KeyL'].includes(e.code)) e.preventDefault()
      switch (e.code) {
        case 'Space':
          video.paused ? video.play() : video.pause()
          break
        case 'KeyM':
          toggleMute()
          break
        case 'KeyL':
          if (!isLiked) handleDoubleTap()
          break
        case 'ArrowLeft':
          video.currentTime = Math.max(0, video.currentTime - 5)
          break
        case 'ArrowRight':
          video.currentTime = Math.min(video.duration, video.currentTime + 5)
          break
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isActive, isLiked])

  const trackView = async () => {
    setTimeout(async () => {
      if (isActive && videoRef.current && videoRef.current.currentTime >= 3) {
        await supabase.from('posts').update({ view_count: post.view_count + 1 }).eq('id', post.id)
      }
    }, 3000)
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      if (video.duration) setProgress((video.currentTime / video.duration) * 100)
    }
    const handleLoadedMetadata = () => setVideoDuration(video.duration)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [])

  // Double tap to like with visual feedback
  const handleDoubleTap = async () => {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      // Double tap detected
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current)
      if (!isLiked) {
        setIsLiked(true)
        setLocalLikesCount(prev => prev + 1)
        setShowDoubleTapHeart(true)
        setTimeout(() => setShowDoubleTapHeart(false), 1000)
        await supabase.from('posts').update({ likes_count: localLikesCount + 1 }).eq('id', post.id)
        onLike()
      } else {
        setShowDoubleTapHeart(true)
        setTimeout(() => setShowDoubleTapHeart(false), 1000)
      }
    } else {
      // Single tap - toggle play/pause
      tapTimeoutRef.current = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause()
        }
      }, 300)
    }
    lastTapRef.current = now
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const toggleLike = async () => {
    if (!isLiked) {
      setIsLiked(true)
      setLocalLikesCount(prev => prev + 1)
      await supabase.from('posts').update({ likes_count: localLikesCount + 1 }).eq('id', post.id)
      onLike()
    } else {
      setIsLiked(false)
      setLocalLikesCount(prev => prev - 1)
      await supabase.from('posts').update({ likes_count: Math.max(0, localLikesCount - 1) }).eq('id', post.id)
    }
  }

  // Add to cart from reel
  const handleAddToCart = async (productId: string) => {
    if (!session?.user?.id) return
    setAddedToCart(productId)
    setTimeout(() => setAddedToCart(null), 2000)
    // In production: call cart API
  }

  // Get visible product tags
  const visibleTags = post.product_tags?.filter(tag => {
    const timeDiff = Math.abs(currentTime - tag.timestamp_seconds)
    return timeDiff <= 5
  }) || []

  // First product for mini bar
  const firstProduct = post.product_tags?.[0]

  return (
    <div className="video-container relative bg-black" onClick={handleDoubleTap}>
      {/* Video player */}
      <video
        ref={videoRef}
        src={post.video_url}
        poster={post.thumbnail_url}
        loop
        playsInline
        muted={isMuted}
        preload="metadata"
        className="absolute inset-0 w-full h-full object-cover"
        onLoadedData={() => { setIsLoading(false); setHasError(false) }}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onPlaying={() => { setIsBuffering(false); setIsLoading(false) }}
        onError={() => { setHasError(true); setIsLoading(false) }}
      />

      {/* Loading spinner */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-14 h-14 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.15)', borderTopColor: 'white' }} />
        </div>
      )}

      {/* Buffering */}
      {isBuffering && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'white' }} />
        </div>
      )}

      {/* Error */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="text-center px-8">
            <div className="text-5xl mb-3">⚠️</div>
            <p className="text-white font-semibold mb-3">Video konnte nicht geladen werden</p>
            <button
              onClick={(e) => { e.stopPropagation(); setHasError(false); setIsLoading(true); videoRef.current?.load() }}
              className="px-5 py-2 rounded-full text-white text-sm font-medium"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      )}

      {/* Double tap heart animation */}
      <AnimatePresence>
        {showDoubleTapHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1.3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
          >
            <Heart className="w-28 h-28 text-white fill-red-500 drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Overlay ──────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)' }}>
        <div className="p-4 safe-area-top">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative" onClick={(e) => { e.stopPropagation(); router.push(`/profile/${post.user_id}`) }}>
              <img
                src={post.user.avatar_url || '/default-avatar.png'}
                alt={post.user.name}
                className="w-10 h-10 rounded-full object-cover"
                style={{ border: '2px solid rgba(255,255,255,0.8)' }}
              />
              {post.product_tags && post.product_tags.length > 0 && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-black"
                  style={{ background: 'linear-gradient(135deg, #9333ea, #ec4899)' }}>
                  <ShoppingBag className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0" onClick={(e) => { e.stopPropagation(); router.push(`/profile/${post.user_id}`) }}>
              <div className="flex items-center gap-2">
                <p className="text-white font-semibold text-sm truncate">{post.user.name}</p>
                {post.product_tags && post.product_tags.length > 0 && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold text-white rounded-full"
                    style={{ background: 'linear-gradient(135deg, #9333ea, #ec4899)' }}>
                    SELLER
                  </span>
                )}
              </div>
              <p className="text-white/60 text-xs truncate">@{post.user.username}</p>
            </div>

            <button
              onClick={(e) => e.stopPropagation()}
              className="px-3.5 py-1.5 rounded-full text-white text-xs font-semibold transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
            >
              Folgen
            </button>
          </div>

          {/* Progress bar */}
          {isActive && !isLoading && (
            <div className="mt-2.5">
              <div className="h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: 'white' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── FOMO / Social Proof Badge ────────────────────── */}
      {isActive && post.product_tags && post.product_tags.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
          className="absolute top-24 left-4 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
        >
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3 text-white/70" />
            <span className="text-white text-[10px] font-medium">{viewersNow} schauen gerade zu</span>
          </div>
        </motion.div>
      )}

      {/* ── Product Tags (Floating) ──────────────────────── */}
      <AnimatePresence>
        {visibleTags.map((tag, index) => (
          <motion.button
            key={tag.id}
            initial={{ scale: 0, opacity: 0, x: -20 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            exit={{ scale: 0.8, opacity: 0, x: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: index * 0.1 }}
            onClick={(e) => { e.stopPropagation(); setSelectedProduct(tag); setShowProductSheet(true) }}
            className="absolute left-4 z-20"
            style={{ bottom: `${200 + (index * 70)}px` }}
          >
            {/* Glow */}
            <motion.div
              className="absolute inset-0 rounded-full blur-lg"
              style={{ background: 'linear-gradient(135deg, #9333ea, #ec4899)', opacity: 0.4 }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <div className="relative flex items-center gap-2 px-3 py-2 bg-white rounded-full shadow-2xl">
              {tag.product.images?.[0] && (
                <img src={tag.product.images[0]} alt="" className="w-7 h-7 rounded-full object-cover ring-1 ring-purple-300" />
              )}
              <span className="text-gray-900 text-xs font-semibold max-w-[100px] truncate">{tag.product.title}</span>
              <span className="px-2 py-0.5 rounded-full text-white text-[10px] font-bold"
                style={{ background: 'linear-gradient(135deg, #9333ea, #ec4899)' }}>
                €{tag.product.price}
              </span>
            </div>
          </motion.button>
        ))}
      </AnimatePresence>

      {/* ── Bottom Overlay: Caption + Mini Product Bar ──── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 safe-area-bottom" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 40%, transparent 100%)' }}>
        <div className="p-4 pb-6">

          {/* Social proof badges */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {post.view_count > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <Eye className="w-3 h-3 text-white/70" />
                <span className="text-white text-[10px] font-medium">
                  {post.view_count >= 1000 ? `${(post.view_count / 1000).toFixed(1)}K` : post.view_count}
                </span>
              </div>
            )}
            {post.product_tags && post.product_tags.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(147,51,234,0.2)', border: '1px solid rgba(147,51,234,0.3)' }}>
                <ShoppingBag className="w-3 h-3 text-purple-300" />
                <span className="text-purple-200 text-[10px] font-semibold">
                  {[...new Set(post.product_tags.map(t => t.product_id))].length} Produkt{[...new Set(post.product_tags.map(t => t.product_id))].length > 1 ? 'e' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Caption */}
          <p className="text-white text-sm leading-relaxed line-clamp-2 mb-3">
            {post.caption}
          </p>

          {/* ── Mini Product Card (Swipeable) ──────────── */}
          {firstProduct && showMiniProductBar && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.5 }}
              onClick={(e) => { e.stopPropagation(); setSelectedProduct(firstProduct); setShowProductSheet(true) }}
              className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer active:scale-[0.98] transition-transform"
              style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {/* Product image */}
              {firstProduct.product.images?.[0] && (
                <img src={firstProduct.product.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
              )}

              {/* Product info */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold truncate">{firstProduct.product.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-white font-bold text-sm">€{firstProduct.product.price}</span>
                  {firstProduct.product.original_price && firstProduct.product.original_price > firstProduct.product.price && (
                    <>
                      <span className="text-white/40 text-xs line-through">€{firstProduct.product.original_price}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: '#ef4444' }}>
                        -{Math.round((1 - firstProduct.product.price / firstProduct.product.original_price) * 100)}%
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Add to cart button */}
              <button
                onClick={(e) => { e.stopPropagation(); handleAddToCart(firstProduct.product_id) }}
                className="flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-95"
                style={{
                  background: addedToCart === firstProduct.product_id ? '#22c55e' : 'oklch(0.78 0.14 85)',
                  color: 'oklch(0.15 0 0)',
                }}
              >
                {addedToCart === firstProduct.product_id ? (
                  <span>✓</span>
                ) : (
                  <ShoppingCart className="w-4 h-4" />
                )}
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Right Action Buttons ──────────────────────────── */}
      <div className="absolute right-3 bottom-44 flex flex-col gap-5 z-20 safe-area-right">
        {/* Like */}
        <button onClick={(e) => { e.stopPropagation(); toggleLike() }} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
            <Heart className={`w-5.5 h-5.5 transition-all ${isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-white'}`} />
          </div>
          <span className="text-white text-[10px] font-semibold">{localLikesCount}</span>
        </button>

        {/* Comment */}
        <button onClick={(e) => { e.stopPropagation(); setShowComments(true); onComment() }} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
            <MessageCircle className="w-5.5 h-5.5 text-white" />
          </div>
          <span className="text-white text-[10px] font-semibold">{post.comments_count}</span>
        </button>

        {/* Share */}
        <button onClick={(e) => { e.stopPropagation(); setShowShareSheet(true); onShare() }} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
            <Share2 className="w-5.5 h-5.5 text-white" />
          </div>
        </button>

        {/* Bookmark */}
        <button onClick={(e) => { e.stopPropagation(); setIsBookmarked(!isBookmarked); onBookmark() }} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
            <Bookmark className={`w-5.5 h-5.5 transition-all ${isBookmarked ? 'fill-white text-white' : 'text-white'}`} />
          </div>
        </button>

        {/* Cart (for product videos) */}
        {post.product_tags && post.product_tags.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowProductSheet(true); setSelectedProduct(post.product_tags![0]) }}
            className="flex flex-col items-center gap-1"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #9333ea, #ec4899)' }}
            >
              <ShoppingCart className="w-5 h-5 text-white" />
            </motion.div>
            <span className="text-[9px] font-bold text-purple-300">SHOP</span>
          </button>
        )}

        {/* Mute/Unmute */}
        <button onClick={(e) => { e.stopPropagation(); toggleMute() }} className="flex flex-col items-center gap-1">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
            {isMuted ? <VolumeX className="w-4 h-4 text-white/60" /> : <Volume2 className="w-4 h-4 text-white" />}
          </div>
        </button>
      </div>

      {/* ── Product Bottom Sheet ──────────────────────────── */}
      {showProductSheet && selectedProduct && (
        <ProductTagOverlay
          product={selectedProduct.product}
          onClose={() => setShowProductSheet(false)}
        />
      )}

      {/* ── Comments Sheet ────────────────────────────────── */}
      <AnimatePresence>
        {showComments && (
          <div className="fixed inset-0 z-50" onClick={(e) => e.stopPropagation()}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowComments(false)}
              className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl p-6 safe-area-bottom"
              style={{ background: 'var(--background)', maxHeight: '70vh' }}
            >
              <div className="w-12 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.15)' }} />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Kommentare</h3>
                <button onClick={() => setShowComments(false)} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="text-center py-12">
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Kommentare kommen bald!</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Share Sheet ───────────────────────────────────── */}
      <AnimatePresence>
        {showShareSheet && (
          <div className="fixed inset-0 z-50" onClick={(e) => e.stopPropagation()}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareSheet(false)}
              className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl p-6 safe-area-bottom"
              style={{ background: 'var(--background)' }}
            >
              <div className="w-12 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.15)' }} />
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Teilen</h3>
                <button onClick={() => setShowShareSheet(false)} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <button
                  onClick={() => { navigator.share?.({ title: post.caption, url: window.location.href }); setShowShareSheet(false) }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #9333ea, #ec4899)' }}>
                    <Share2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs">Teilen</span>
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.href); setShowShareSheet(false) }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#3b82f6' }}>
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </div>
                  <span className="text-xs">Link kopieren</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
