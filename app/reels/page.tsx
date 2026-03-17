"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { usePageTransition } from '@/lib/page-transition-context'
import ReelCard from '@/components/reels/reel-card'
import ReelSkeleton from '@/components/reels/reel-skeleton'
import { Play, Loader2, ChevronUp, ChevronDown } from 'lucide-react'

type SortMode = 'recent' | 'trending'

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

export default function ReelsPage() {
  const { navigateTo } = usePageTransition()
  const [sortMode, setSortMode] = useState<SortMode>('recent')
  const [reels, setReels] = useState<Reel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [headerSolid, setHeaderSolid] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const reelRefs = useRef<(HTMLDivElement | null)[]>([])
  const PAGE_SIZE = 6

  // ── Desktop scroll arrows ─────────────────────────────
  const scrollToReel = (direction: 'up' | 'down') => {
    const next = direction === 'down'
      ? Math.min(activeIndex + 1, reels.length - 1)
      : Math.max(activeIndex - 1, 0)
    reelRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // ── Data loading ────────────────────────────────────────
  const loadReels = useCallback(async (cursor?: string) => {
    try {
      let query = supabase
        .from('posts')
        .select(`
          id, video_url, thumbnail_url, caption, user_id,
          likes_count, comments_count, view_count, created_at,
          user:users!user_id (id, name, username, avatar_url),
          product_tags:post_product_tags (
            id, product_id, position_x, position_y, timestamp_seconds,
            product:products!product_id (id, title, price, images)
          )
        `)
        .eq('is_video', true)

      if (sortMode === 'trending') {
        query = query.order('view_count', { ascending: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      if (cursor) query = query.lt('created_at', cursor)
      query = query.limit(PAGE_SIZE)

      const { data, error } = await query
      if (error) throw error
      return (data || []) as any as Reel[]
    } catch (e) {
      console.error('Error loading reels:', e)
      return []
    }
  }, [sortMode])

  // Initial load
  useEffect(() => {
    setIsLoading(true)
    setReels([])
    setHasMore(true)
    setActiveIndex(0)
    loadReels().then(data => {
      setReels(data)
      setHasMore(data.length >= PAGE_SIZE)
      setIsLoading(false)
    })
  }, [loadReels])

  // Infinite scroll sentinel
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || isLoading) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoadingMore && hasMore && reels.length > 0) {
          setIsLoadingMore(true)
          const lastReel = reels[reels.length - 1]
          loadReels(lastReel.created_at).then(data => {
            setReels(prev => [...prev, ...data])
            setHasMore(data.length >= PAGE_SIZE)
            setIsLoadingMore(false)
          })
        }
      },
      { root: scrollRef.current, rootMargin: '200px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [reels, hasMore, isLoading, isLoadingMore, loadReels])

  // ── Active reel detection via IntersectionObserver ──────
  useEffect(() => {
    if (reels.length === 0) return
    const container = scrollRef.current
    if (!container) return

    const observers: IntersectionObserver[] = []

    reelRefs.current.forEach((el, idx) => {
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            setActiveIndex(idx)
          }
        },
        { root: container, threshold: 0.55 }
      )
      obs.observe(el)
      observers.push(obs)
    })

    return () => observers.forEach(o => o.disconnect())
  }, [reels])

  // ── Header scroll detection ─────────────────────────────
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const onScroll = () => setHeaderSolid(container.scrollTop > 40)
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        background: 'radial-gradient(900px circle at 80% 20%, rgba(99,102,241,0.12), transparent 60%), var(--reels-bg)',
      }}
    >
      {/* ── Header — transparent → solid on scroll ─────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-[36px]"
        style={{
          height: headerSolid ? '64px' : '72px',
          background: headerSolid ? 'rgba(10,11,15,0.85)' : 'transparent',
          backdropFilter: headerSolid ? 'blur(14px)' : 'none',
          borderBottom: headerSolid ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent',
          transition: 'all 400ms ease',
        }}
      >
        <button onClick={() => navigateTo('/store')} className="flex-shrink-0">
          <span
            className="uppercase font-medium"
            style={{
              fontSize: '16px',
              letterSpacing: headerSolid ? '0.14em' : '0.12em',
              color: 'var(--text-primary)',
              transition: 'letter-spacing 400ms ease',
            }}
          >
            WEARO
          </span>
        </button>

        {/* Segmented control */}
        <div className="flex rounded-full p-[4px]" style={{ background: 'rgba(26,27,34,0.8)' }}>
          <button
            onClick={() => setSortMode('recent')}
            className="px-[20px] py-[8px] rounded-full text-[14px] font-medium"
            style={{
              background: sortMode === 'recent' ? 'var(--reels-accent)' : 'transparent',
              color: sortMode === 'recent' ? 'rgba(255,255,255,0.95)' : 'var(--text-faint)',
              transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            Recent
          </button>
          <button
            onClick={() => setSortMode('trending')}
            className="px-[20px] py-[8px] rounded-full text-[14px] font-medium"
            style={{
              background: sortMode === 'trending' ? 'var(--reels-accent)' : 'transparent',
              color: sortMode === 'trending' ? 'rgba(255,255,255,0.95)' : 'var(--text-faint)',
              transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            Top
          </button>
        </div>

        <div className="w-[80px]" />
      </nav>

      {/* ── Back to Store — floating text, bottom-left ─────── */}
      <button
        onClick={() => navigateTo('/store')}
        className="fixed bottom-[36px] left-[36px] z-40 hidden md:block text-[13px] font-medium"
        style={{
          color: 'var(--text-faint)',
          opacity: 0.5,
          transition: 'opacity 300ms',
          background: 'none',
          border: 'none',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
      >
        ← Back to Store
      </button>

      {/* ── Desktop scroll arrows — right side ────────────── */}
      {reels.length > 1 && (
        <div
          className="fixed right-[36px] top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-[12px]"
        >
          <button
            onClick={() => scrollToReel('up')}
            className="w-[36px] h-[36px] flex items-center justify-center rounded-full"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-faint)',
              opacity: activeIndex === 0 ? 0.15 : 0.4,
              transition: 'all 300ms',
              cursor: activeIndex === 0 ? 'default' : 'pointer',
            }}
            onMouseEnter={(e) => { if (activeIndex > 0) e.currentTarget.style.opacity = '0.8' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = activeIndex === 0 ? '0.15' : '0.4' }}
            disabled={activeIndex === 0}
          >
            <ChevronUp className="w-[16px] h-[16px]" />
          </button>
          <button
            onClick={() => scrollToReel('down')}
            className="w-[36px] h-[36px] flex items-center justify-center rounded-full"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-faint)',
              opacity: activeIndex >= reels.length - 1 ? 0.15 : 0.4,
              transition: 'all 300ms',
              cursor: activeIndex >= reels.length - 1 ? 'default' : 'pointer',
            }}
            onMouseEnter={(e) => { if (activeIndex < reels.length - 1) e.currentTarget.style.opacity = '0.8' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = activeIndex >= reels.length - 1 ? '0.15' : '0.4' }}
            disabled={activeIndex >= reels.length - 1}
          >
            <ChevronDown className="w-[16px] h-[16px]" />
          </button>
        </div>
      )}

      {/* ── Snap scroll container ──────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 flex flex-col items-center overflow-y-auto"
        style={{
          scrollSnapType: 'y proximity',
          scrollBehavior: 'smooth',
        }}
      >
        {isLoading ? (
          <>
            <div className="h-[96vh] flex items-center justify-center pt-[72px]" style={{ scrollSnapAlign: 'center' }}>
              <ReelSkeleton />
            </div>
            <div className="h-[96vh] flex items-center justify-center pt-[72px]" style={{ scrollSnapAlign: 'center' }}>
              <ReelSkeleton />
            </div>
          </>
        ) : reels.length === 0 ? (
          <div className="h-[96vh] flex items-center justify-center pt-[72px]">
            <div className="max-w-[400px] w-[92%] rounded-[22px] p-12 text-center"
              style={{ background: 'var(--reels-layer)', border: '1px solid var(--reels-border)' }}
            >
              <div className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center"
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
          </div>
        ) : (
          <>
            {reels.map((reel, i) => (
              <div
                key={reel.id}
                ref={(el) => { reelRefs.current[i] = el }}
                className="flex items-center justify-center w-full"
                style={{
                  height: '96vh',
                  scrollSnapAlign: 'center',
                  paddingTop: '72px',
                }}
              >
                <div
                  style={{
                    width: '92%',
                    maxWidth: '420px',
                    transform: activeIndex === i ? 'scale(1)' : 'scale(0.985)',
                    opacity: activeIndex === i ? 1 : 0.85,
                    transition: 'transform 500ms cubic-bezier(0.16, 1, 0.3, 1), opacity 400ms ease',
                    willChange: 'transform, opacity',
                  }}
                >
                  <ReelCard post={reel} isActive={activeIndex === i} />
                </div>
              </div>
            ))}

            {/* Infinite scroll sentinel */}
            {hasMore && <div ref={sentinelRef} className="h-[4px] w-full flex-shrink-0" />}

            {isLoadingMore && (
              <div className="h-[96vh] flex items-center justify-center pt-[72px]" style={{ scrollSnapAlign: 'center' }}>
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-faint)' }} />
              </div>
            )}

            {!hasMore && reels.length > 0 && (
              <div className="py-[48px] flex-shrink-0">
                <p className="text-[11px] text-center" style={{ color: 'rgba(255,255,255,0.12)' }}>
                  Das war&apos;s erst mal
                </p>
              </div>
            )}

            {/* Mobile bottom nav clearance */}
            <div className="h-[80px] flex-shrink-0 md:hidden" />
          </>
        )}
      </div>
    </div>
  )
}
