"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import ReelItem from './reel-item'

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

export default function ReelsFeed() {
  const [reels, setReels] = useState<Reel[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Load initial reels
  useEffect(() => {
    loadReels()
  }, [])

  const loadReels = async () => {
    try {
      setIsLoading(true)

      const { data, error } = await supabase
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
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      setReels((data || []) as any)
      setHasMore((data?.length || 0) >= 10)
    } catch (error) {
      console.error('Error loading reels:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMoreReels = async () => {
    if (!hasMore || isLoading) return

    try {
      setIsLoading(true)

      const lastReel = reels[reels.length - 1]
      const { data, error } = await supabase
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
        .lt('created_at', lastReel.created_at)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      setReels(prev => [...prev, ...((data || []) as any)])
      setHasMore((data?.length || 0) >= 10)
    } catch (error) {
      console.error('Error loading more reels:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Intersection Observer for current reel detection
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0')
            setCurrentIndex(index)

            // Load more when near end
            if (index >= reels.length - 3) {
              loadMoreReels()
            }
          }
        })
      },
      {
        threshold: 0.5,
        rootMargin: '0px'
      }
    )

    return () => {
      observerRef.current?.disconnect()
    }
  }, [reels.length])

  // Attach observer to reel items
  useEffect(() => {
    if (!containerRef.current) return

    const reelElements = containerRef.current.querySelectorAll('.reel-item')
    reelElements.forEach((element) => {
      observerRef.current?.observe(element)
    })

    return () => {
      reelElements.forEach((element) => {
        observerRef.current?.unobserve(element)
      })
    }
  }, [reels])

  const handleLike = async (reelId: string) => {
    // Like logic here
    console.log('Like reel:', reelId)
  }

  const handleComment = (reelId: string) => {
    // Comment logic here
    console.log('Comment on reel:', reelId)
  }

  const handleShare = (reelId: string) => {
    // Share logic here
    console.log('Share reel:', reelId)
  }

  const handleBookmark = (reelId: string) => {
    // Bookmark logic here
    console.log('Bookmark reel:', reelId)
  }

  if (isLoading && reels.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    )
  }

  if (reels.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500 p-8">
        <div className="text-center text-white space-y-6">
          {/* Large emoji icon */}
          <div className="text-8xl mb-4 animate-bounce">🎬</div>

          {/* Title */}
          <h2 className="text-3xl font-bold">Start Creating!</h2>

          {/* Subtitle */}
          <p className="text-lg text-white/90 max-w-sm mx-auto">
            Be the first to share videos with products and start earning
          </p>

          {/* Coming soon badge */}
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full">
            <span className="text-sm font-semibold">Video Upload Coming Soon</span>
            <span className="text-2xl">🚀</span>
          </div>

          {/* Features preview */}
          <div className="mt-8 space-y-3 text-sm text-white/80">
            <div className="flex items-center justify-center gap-2">
              <span>📹</span>
              <span>Record or upload videos</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span>🏷️</span>
              <span>Tag products in your videos</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span>💰</span>
              <span>Earn from sales</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="snap-scroll-y hide-scrollbar h-screen overflow-y-scroll bg-black"
    >
      {reels.map((reel, index) => (
        <div
          key={reel.id}
          data-index={index}
          className="reel-item snap-item h-screen"
        >
          <ReelItem
            post={reel}
            isActive={index === currentIndex}
            onLike={() => handleLike(reel.id)}
            onComment={() => handleComment(reel.id)}
            onShare={() => handleShare(reel.id)}
            onBookmark={() => handleBookmark(reel.id)}
          />
        </div>
      ))}

      {/* Loading indicator */}
      {isLoading && reels.length > 0 && (
        <div className="h-screen flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-white/20 border-t-white animate-spin" />
        </div>
      )}
    </div>
  )
}
