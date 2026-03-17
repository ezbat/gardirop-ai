"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MessageCircle, Share2, Bookmark, Volume2, VolumeX, ShoppingCart, ShoppingBag, Eye } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useReelVisibility } from '@/hooks/use-reel-visibility'
import ProductTagOverlay from './product-tag-overlay'
import Price from '@/components/price'

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

interface ReelCardProps {
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
  /** Whether this reel is the currently centered/active one */
  isActive?: boolean
}

export default function ReelCard({ post, isActive = true }: ReelCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const router = useRouter()
  const { data: session } = useSession()

  const [isMuted, setIsMuted] = useState(true)
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [localLikesCount, setLocalLikesCount] = useState(post.likes_count)
  const [localViewCount, setLocalViewCount] = useState(post.view_count)
  const [progress, setProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [showProductSheet, setShowProductSheet] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductTag | null>(null)
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false)
  const [addedToCart, setAddedToCart] = useState<string | null>(null)

  const lastTapRef = useRef(0)
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── View recording ──────────────────────────────────────
  const recordView = useCallback(async (postId: string) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.user?.id) headers['x-user-id'] = session.user.id
      const res = await fetch('/api/reels/view', {
        method: 'POST',
        headers,
        body: JSON.stringify({ postId }),
      })
      const data = await res.json()
      if (data.view_count) setLocalViewCount(data.view_count)
    } catch {}
  }, [session?.user?.id])

  // ── Visibility: autoplay at 65%, pause at 40% ──────────
  const containerRef = useReelVisibility({
    postId: post.id,
    threshold: 0.65,
    onVisible: recordView,
    onEnter: () => {
      const v = videoRef.current
      if (v) {
        v.play().catch(() => {})
        setIsPlaying(true)
      }
    },
    onLeave: () => {
      videoRef.current?.pause()
      setIsPlaying(false)
    },
  })

  // ── Video progress ──────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onTime = () => { if (video.duration) setProgress((video.currentTime / video.duration) * 100) }
    const onReady = () => setVideoReady(true)
    video.addEventListener('timeupdate', onTime)
    video.addEventListener('loadeddata', onReady)
    return () => {
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('loadeddata', onReady)
    }
  }, [])

  // ── Double tap to like / single tap pause ──────────────
  const handleTap = () => {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current)
      if (!isLiked) {
        setIsLiked(true)
        setLocalLikesCount(prev => prev + 1)
        setShowDoubleTapHeart(true)
        setTimeout(() => setShowDoubleTapHeart(false), 800)
        supabase.from('posts').update({ likes_count: localLikesCount + 1 }).eq('id', post.id)
      } else {
        setShowDoubleTapHeart(true)
        setTimeout(() => setShowDoubleTapHeart(false), 800)
      }
    } else {
      tapTimeoutRef.current = setTimeout(() => {
        if (videoRef.current) {
          if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true) }
          else { videoRef.current.pause(); setIsPlaying(false) }
        }
      }, 300)
    }
    lastTapRef.current = now
  }

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (videoRef.current) { videoRef.current.muted = !isMuted; setIsMuted(!isMuted) }
  }

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isLiked) {
      setIsLiked(true)
      setLocalLikesCount(prev => prev + 1)
      await supabase.from('posts').update({ likes_count: localLikesCount + 1 }).eq('id', post.id)
    } else {
      setIsLiked(false)
      setLocalLikesCount(prev => prev - 1)
      await supabase.from('posts').update({ likes_count: Math.max(0, localLikesCount - 1) }).eq('id', post.id)
    }
  }

  const handleAddToCart = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation()
    setAddedToCart(productId)
    setTimeout(() => setAddedToCart(null), 2000)
  }

  const firstProduct = post.product_tags?.[0]

  const fmt = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toString()
  }

  return (
    <div ref={containerRef} className="w-full">
      {/* ── Immersive Reel Card ────────────────────────────── */}
      <div
        className="relative aspect-[9/16] rounded-[22px] overflow-hidden cursor-pointer"
        style={{
          background: 'var(--reels-layer)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: isActive
            ? '0 30px 80px -25px rgba(0,0,0,0.75)'
            : '0 20px 60px -20px rgba(0,0,0,0.5)',
          transition: 'box-shadow 600ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={handleTap}
      >
        {/* ── Progress bar — top edge ──────────────────────── */}
        <div className="absolute top-0 left-0 right-0 z-20 h-[3px]" style={{ background: 'rgba(255,255,255,0.10)' }}>
          <div
            className="h-full"
            style={{
              width: `${progress}%`,
              background: 'var(--reels-accent)',
              transition: 'width 200ms linear',
            }}
          />
        </div>

        {/* Video — smooth fade-in */}
        <video
          ref={videoRef}
          src={post.video_url}
          poster={post.thumbnail_url}
          loop
          playsInline
          muted={isMuted}
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: videoReady ? 1 : 0,
            transition: 'opacity 400ms ease',
          }}
        />

        {/* Poster fallback while loading */}
        {!videoReady && post.thumbnail_url && (
          <img
            src={post.thumbnail_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* ── Cinematic overlay — precise math ─────────────── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.18) 45%, rgba(0,0,0,0.32) 100%)',
          }}
        />

        {/* Double tap heart */}
        <AnimatePresence>
          {showDoubleTapHeart && (
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 1.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
            >
              <Heart className="w-20 h-20 fill-red-500" style={{ color: 'rgba(255,255,255,0.9)', filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.4))' }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Top: user info ─────────────────────────────── */}
        <div className="absolute top-[20px] inset-x-0 z-10 px-[20px]">
          <div className="flex items-center gap-[10px]">
            <div
              className="cursor-pointer flex-shrink-0"
              onClick={(e) => { e.stopPropagation(); router.push(`/profile/${post.user_id}`) }}
            >
              <img
                src={post.user.avatar_url || '/default-avatar.png'}
                alt={post.user.name}
                className="w-8 h-8 rounded-full object-cover"
                style={{ border: '2px solid rgba(255,255,255,0.18)' }}
              />
            </div>
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); router.push(`/profile/${post.user_id}`) }}
            >
              <p
                className="font-medium text-[14px] truncate leading-tight uppercase"
                style={{ color: 'rgba(255,255,255,0.75)', letterSpacing: '0.05em' }}
              >
                {post.user.username}
              </p>
            </div>
            <button
              onClick={toggleMute}
              className="w-[32px] h-[32px] rounded-full flex items-center justify-center active:scale-90"
              style={{
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.12)',
                transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {isMuted
                ? <VolumeX className="w-[14px] h-[14px]" style={{ color: 'var(--text-faint)' }} />
                : <Volume2 className="w-[14px] h-[14px]" style={{ color: 'var(--text-primary)' }} />
              }
            </button>
          </div>
        </div>

        {/* ── Right: action rail — 42px, 18px gap ────────── */}
        <div className="absolute right-[18px] bottom-[96px] flex flex-col gap-[18px] z-10">
          {/* Like */}
          <motion.button whileTap={{ scale: 0.88 }} onClick={toggleLike} className="flex flex-col items-center gap-[4px]">
            <div
              className="w-[42px] h-[42px] rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: isLiked ? '0 0 22px rgba(99,102,241,0.35)' : 'none',
                transition: 'box-shadow 350ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <Heart className="w-[20px] h-[20px]" style={{
                color: isLiked ? 'var(--reels-accent)' : 'var(--text-primary)',
                fill: isLiked ? 'var(--reels-accent)' : 'none',
                transition: 'all 200ms',
              }} />
            </div>
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>{fmt(localLikesCount)}</span>
          </motion.button>

          {/* Comment */}
          <motion.button whileTap={{ scale: 0.88 }} onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-[4px]">
            <div
              className="w-[42px] h-[42px] rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <MessageCircle className="w-[20px] h-[20px]" style={{ color: 'var(--text-primary)' }} />
            </div>
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>{fmt(post.comments_count)}</span>
          </motion.button>

          {/* Share */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={(e) => {
              e.stopPropagation()
              navigator.share?.({ title: post.caption, url: `${window.location.origin}/reels/${post.id}` })
            }}
            className="flex flex-col items-center gap-[4px]"
          >
            <div
              className="w-[42px] h-[42px] rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <Share2 className="w-[20px] h-[20px]" style={{ color: 'var(--text-primary)' }} />
            </div>
          </motion.button>

          {/* Bookmark */}
          <motion.button whileTap={{ scale: 0.88 }} onClick={(e) => { e.stopPropagation(); setIsBookmarked(!isBookmarked) }} className="flex flex-col items-center gap-[4px]">
            <div
              className="w-[42px] h-[42px] rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <Bookmark className="w-[20px] h-[20px]" style={{
                color: 'var(--text-primary)',
                fill: isBookmarked ? 'var(--text-primary)' : 'none',
                transition: 'all 200ms',
              }} />
            </div>
          </motion.button>

          {/* Shop */}
          {post.product_tags && post.product_tags.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={(e) => { e.stopPropagation(); setSelectedProduct(post.product_tags![0]); setShowProductSheet(true) }}
            >
              <div
                className="w-[42px] h-[42px] rounded-full flex items-center justify-center"
                style={{
                  background: 'var(--reels-accent)',
                  boxShadow: '0 4px 16px -4px rgba(99,102,241,0.35)',
                }}
              >
                <ShoppingBag className="w-[20px] h-[20px]" style={{ color: 'rgba(255,255,255,0.92)' }} />
              </div>
            </motion.button>
          )}
        </div>

        {/* ── Bottom: caption + product card ──────────────── */}
        <div className="absolute bottom-0 inset-x-0 z-10 p-[20px]">
          {/* View count */}
          <div className="flex items-center gap-[6px] mb-[8px]">
            <Eye className="w-[14px] h-[14px]" style={{ color: 'var(--text-faint)' }} />
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-faint)' }}>{fmt(localViewCount)}</span>
          </div>

          {/* Caption — sans-serif, 16px, -0.01em */}
          <p
            className="line-clamp-2 mb-[16px] pr-[60px]"
            style={{
              fontSize: '16px',
              lineHeight: 1.4,
              letterSpacing: '-0.01em',
              color: 'var(--text-secondary)',
            }}
          >
            {post.caption}
          </p>

          {/* Product card */}
          {firstProduct && (
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => { e.stopPropagation(); setSelectedProduct(firstProduct); setShowProductSheet(true) }}
              className="p-[16px] rounded-[16px] cursor-pointer active:scale-[0.98]"
              style={{
                background: 'rgba(0,0,0,0.40)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.08)',
                transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <div className="flex items-center gap-[12px]">
                {firstProduct.product.images?.[0] && (
                  <img
                    src={firstProduct.product.images[0]}
                    alt=""
                    className="w-[44px] h-[44px] rounded-[10px] object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {firstProduct.product.title}
                  </p>
                  <div className="flex items-center gap-[8px] mt-[4px]">
                    <Price amount={firstProduct.product.price} className="text-[14px] font-semibold" />
                    {firstProduct.product.original_price && firstProduct.product.original_price > firstProduct.product.price && (
                      <Price amount={firstProduct.product.original_price} className="text-[11px] line-through" />
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => handleAddToCart(e, firstProduct.product_id)}
                  className="flex-shrink-0 w-[36px] h-[36px] rounded-full flex items-center justify-center active:scale-90"
                  style={{
                    background: addedToCart === firstProduct.product_id
                      ? 'rgba(34,197,94,0.8)'
                      : 'rgba(255,255,255,0.10)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  {addedToCart === firstProduct.product_id
                    ? <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>✓</span>
                    : <ShoppingCart className="w-[16px] h-[16px]" style={{ color: 'var(--text-primary)' }} />
                  }
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Product bottom sheet */}
      {showProductSheet && selectedProduct && (
        <ProductTagOverlay
          product={selectedProduct.product}
          onClose={() => setShowProductSheet(false)}
        />
      )}
    </div>
  )
}
