"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import ReelCard from './reel-card'
import ReelSkeleton from './reel-skeleton'
import { Play, Loader2 } from 'lucide-react'

interface Reel {
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
  product_tags?: any[]
}

interface ReelsFeedProps {
  sortBy?: 'recent' | 'trending'
  limit?: number
  /** "single" = one column, 120px gap (reels page). "grid" = 1col mobile / 2col desktop (homepage). Default: "grid" */
  layout?: 'single' | 'grid'
}

export default function ReelsFeed({ sortBy = 'recent', limit, layout = 'grid' }: ReelsFeedProps) {
  const [reels, setReels] = useState<Reel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const PAGE_SIZE = limit || 6

  const loadReels = useCallback(async (cursor?: string) => {
    try {
      let query = supabase
        .from('posts')
        .select(`
          id,
          video_url,
          thumbnail_url,
          caption,
          user_id,
          likes_count,
          comments_count,
          view_count,
          created_at,
          user:users!user_id (
            id,
            name,
            username,
            avatar_url
          ),
          product_tags:post_product_tags (
            id,
            product_id,
            position_x,
            position_y,
            timestamp_seconds,
            product:products!product_id (
              id,
              title,
              price,
              images
            )
          )
        `)
        .eq('is_video', true)

      if (sortBy === 'trending') {
        query = query.order('view_count', { ascending: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      if (cursor) {
        query = query.lt('created_at', cursor)
      }

      query = query.limit(PAGE_SIZE)

      const { data, error } = await query
      if (error) throw error

      return (data || []) as any as Reel[]
    } catch (error) {
      console.error('Error loading reels:', error)
      return []
    }
  }, [sortBy, PAGE_SIZE])

  // Initial load
  useEffect(() => {
    setIsLoading(true)
    setReels([])
    setHasMore(true)
    loadReels().then(data => {
      setReels(data)
      setHasMore(!limit && data.length >= PAGE_SIZE)
      setIsLoading(false)
    })
  }, [loadReels, limit, PAGE_SIZE])

  // Infinite scroll (disabled when limit is set)
  useEffect(() => {
    if (limit || !sentinelRef.current || !hasMore || isLoading) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoadingMore && hasMore) {
          setIsLoadingMore(true)
          const lastReel = reels[reels.length - 1]
          if (lastReel) {
            loadReels(lastReel.created_at).then(data => {
              setReels(prev => [...prev, ...data])
              setHasMore(data.length >= PAGE_SIZE)
              setIsLoadingMore(false)
            })
          }
        }
      },
      { rootMargin: '300px' }
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [reels, hasMore, isLoading, isLoadingMore, loadReels, limit, PAGE_SIZE])

  // ── Loading state ─────────────────────────────────────
  if (isLoading) {
    if (layout === 'single') {
      return (
        <div className="flex flex-col items-center">
          <ReelSkeleton />
          <div className="h-[120px]" />
          <ReelSkeleton />
        </div>
      )
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 place-items-center">
        <ReelSkeleton />
        <ReelSkeleton />
      </div>
    )
  }

  // ── Empty state ───────────────────────────────────────
  if (reels.length === 0) {
    return (
      <div className="max-w-[400px] mx-auto rounded-[20px] p-12 text-center"
        style={{
          background: 'var(--reels-layer)',
          border: '1px solid var(--reels-border)',
        }}
      >
        <div
          className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center"
          style={{ background: 'var(--reels-accent-soft)' }}
        >
          <Play className="w-6 h-6 ml-0.5" style={{ color: 'var(--text-faint)' }} />
        </div>
        <h3 className="text-[15px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          Noch keine Videos
        </h3>
        <p className="text-[13px]" style={{ color: 'var(--text-faint)' }}>
          Sei der Erste, der ein Video teilt
        </p>
      </div>
    )
  }

  // ── Single column layout (reels page) ─────────────────
  if (layout === 'single') {
    return (
      <div className="flex flex-col items-center">
        {reels.map((reel, i) => (
          <motion.div
            key={reel.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full"
          >
            <ReelCard post={reel} />
            {/* 120px breathing room between cards */}
            {i < reels.length - 1 && <div className="h-[120px]" />}
          </motion.div>
        ))}

        {isLoadingMore && (
          <>
            <div className="h-[120px]" />
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-white/15" />
            </div>
          </>
        )}

        {hasMore && !limit && <div ref={sentinelRef} className="h-1" />}

        {!hasMore && reels.length > 0 && (
          <>
            <div className="h-[60px]" />
            <p className="text-[11px] text-white/15 text-center pb-4">Das war&apos;s erst mal</p>
          </>
        )}
      </div>
    )
  }

  // ── Grid layout (homepage) ────────────────────────────
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 place-items-center">
        {reels.map((reel, i) => (
          <motion.div
            key={reel.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="w-full"
          >
            <ReelCard post={reel} />
          </motion.div>
        ))}
      </div>

      {isLoadingMore && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-white/20" />
        </div>
      )}

      {hasMore && !limit && <div ref={sentinelRef} className="h-1" />}
    </div>
  )
}
