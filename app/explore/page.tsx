"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Heart, MessageCircle, Share2, Bookmark, Search, Film,
  Image as ImageIcon, TrendingUp, Flame, Sparkles, Eye,
  ShoppingBag, SlidersHorizontal, X, Play, ChevronRight,
  Clock, Zap, Crown, Star, Users, ArrowRight
} from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import PostDetailModal from "@/components/post-detail-modal"
import ReelsFeed from "@/components/reels/reels-feed"
import { useLanguage } from "@/lib/language-context"

interface Post {
  id: string
  user_id: string
  outfit_id: string | null
  caption: string
  image_url: string
  video_url?: string
  is_video?: boolean
  likes_count: number
  comments_count: number
  view_count?: number
  created_at: string
  user?: {
    id: string
    name: string
    avatar_url: string | null
    username?: string
  }
  liked_by_user?: boolean
  bookmarked_by_user?: boolean
  product_tags?: Array<{
    id: string
    product_id: string
    product?: {
      id: string
      title: string
      price: number
      images: string[]
    }
  }>
}

interface TrendingTag {
  tag: string
  count: number
  icon: string
}

// ─── Animated Grid Item ──────────────────────────────────────
function GridItem({ post, index, onClick, onLike, onBookmark, userId }: {
  post: Post
  index: number
  onClick: () => void
  onLike: (postId: string, postUserId: string, liked: boolean) => void
  onBookmark: (postId: string, bookmarked: boolean) => void
  userId?: string
}) {
  const [isHovered, setIsHovered] = useState(false)
  const isLarge = index % 7 === 0 // Every 7th item is large (2x2)
  const isVideo = post.is_video || !!post.video_url
  const hasProducts = post.product_tags && post.product_tags.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className={`relative overflow-hidden rounded-lg cursor-pointer group ${
        isLarge ? 'col-span-2 row-span-2' : ''
      }`}
      style={{ aspectRatio: isLarge ? '1' : '3/4' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Image */}
      <img
        src={post.image_url || post.video_url}
        alt={post.caption}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
      />

      {/* Video indicator */}
      {isVideo && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <Play className="w-3 h-3 text-white fill-white" />
          {post.view_count && post.view_count > 0 && (
            <span className="text-white text-[10px] font-medium">
              {post.view_count >= 1000 ? `${(post.view_count / 1000).toFixed(1)}K` : post.view_count}
            </span>
          )}
        </div>
      )}

      {/* Product tag badge */}
      {hasProducts && (
        <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md"
          style={{ background: 'linear-gradient(135deg, rgba(147,51,234,0.8), rgba(236,72,153,0.8))', backdropFilter: 'blur(4px)' }}>
          <ShoppingBag className="w-3 h-3 text-white" />
          <span className="text-white text-[10px] font-bold">SHOP</span>
        </div>
      )}

      {/* Promoted badge */}
      {(post as any).is_promoted && !hasProducts && (
        <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span className="text-white/70 text-[9px] font-semibold">Gesponsert</span>
        </div>
      )}

      {/* Hover overlay */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center gap-6"
            style={{ background: 'rgba(0,0,0,0.4)' }}
          >
            <div className="flex items-center gap-1.5 text-white">
              <Heart className="w-5 h-5 fill-white" />
              <span className="font-bold text-sm">{post.likes_count}</span>
            </div>
            <div className="flex items-center gap-1.5 text-white">
              <MessageCircle className="w-5 h-5 fill-white" />
              <span className="font-bold text-sm">{post.comments_count}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom gradient with price (for product posts) */}
      {hasProducts && post.product_tags![0]?.product && (
        <div className="absolute bottom-0 left-0 right-0 p-2"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
          <div className="flex items-center justify-between">
            <span className="text-white text-xs font-medium truncate mr-2">
              {post.product_tags![0].product!.title}
            </span>
            <span className="text-white text-xs font-bold px-1.5 py-0.5 rounded"
              style={{ background: 'oklch(0.78 0.14 85)' }}>
              €{post.product_tags![0].product!.price}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ─── Mini Reel Preview ───────────────────────────────────────
function MiniReelCard({ post, onClick }: { post: Post; onClick: () => void }) {
  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="relative flex-shrink-0 w-32 rounded-xl overflow-hidden cursor-pointer"
      style={{ aspectRatio: '9/16' }}
    >
      <img
        src={post.image_url || post.video_url}
        alt={post.caption}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 20%, transparent 50%)' }} />
      <div className="absolute top-2 right-2">
        <Play className="w-4 h-4 text-white fill-white drop-shadow-lg" />
      </div>
      <div className="absolute bottom-2 left-2 right-2">
        <div className="flex items-center gap-1 text-white">
          <Eye className="w-3 h-3" />
          <span className="text-[10px] font-medium">
            {(post.view_count || 0) >= 1000 ? `${((post.view_count || 0) / 1000).toFixed(1)}K` : post.view_count || 0}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Page ───────────────────────────────────────────────
export default function ExplorePage() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const router = useRouter()
  const userId = session?.user?.id
  const [activeTab, setActiveTab] = useState<'posts' | 'reels'>('posts')
  const [posts, setPosts] = useState<Post[]>([])
  const [reelPosts, setReelPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Post[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string>('trending')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Trending hashtags (simulated - in production these come from analytics)
  const trendingTags: TrendingTag[] = useMemo(() => [
    { tag: 'StreetStyle', count: 2400, icon: '🔥' },
    { tag: 'SummerVibes', count: 1800, icon: '☀️' },
    { tag: 'MinimalFashion', count: 1500, icon: '✨' },
    { tag: 'VintageMode', count: 1200, icon: '🌿' },
    { tag: 'LuxuryFinds', count: 980, icon: '💎' },
    { tag: 'OOTD', count: 3200, icon: '👗' },
    { tag: 'Sneakers', count: 2100, icon: '👟' },
    { tag: 'Accessories', count: 1600, icon: '💍' },
  ], [])

  const filterCategories = useMemo(() => [
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    { id: 'new', label: 'Neu', icon: Zap },
    { id: 'following', label: 'Folge ich', icon: Users },
    { id: 'shop', label: 'Shop', icon: ShoppingBag },
  ], [])

  // Load posts
  useEffect(() => {
    if (activeTab === 'posts') {
      loadPosts()
      loadReelPreviews()
    }
  }, [userId, activeTab, activeFilter])

  const loadPosts = async () => {
    setLoading(true)
    try {
      // Use the new feed API — seller-only posts, engagement-ranked
      const filterParam = activeFilter === 'all' ? 'trending' : activeFilter
      const res = await fetch(`/api/feed?filter=${filterParam}&limit=30`)
      const data = await res.json()

      if (!data.success) throw new Error(data.error)

      // Map feed response to Post shape expected by GridItem
      const mapped = (data.posts || [])
        .filter((p: any) => !p.is_video)
        .map((p: any) => ({
          ...p,
          user: p.seller
            ? { id: p.user_id, name: p.seller.shop_name, avatar_url: p.seller.logo_url, username: p.seller.shop_name }
            : { id: p.user_id, name: 'Unknown', avatar_url: null },
          product_tags: (p.linked_products || []).map((pr: any) => ({
            id: pr.id,
            product_id: pr.id,
            product: { id: pr.id, title: pr.title, price: pr.price, images: pr.images || [] },
          })),
        }))

      setPosts(mapped)
      setHasMore(data.hasMore || false)
    } catch (error) {
      console.error('Load posts error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load reel preview thumbnails for horizontal scroll
  const loadReelPreviews = async () => {
    try {
      const res = await fetch('/api/feed?filter=trending&limit=10')
      const data = await res.json()
      if (data.success) {
        const videos = (data.posts || [])
          .filter((p: any) => p.is_video || p.video_url)
          .map((p: any) => ({
            ...p,
            user: p.seller
              ? { id: p.user_id, name: p.seller.shop_name, avatar_url: p.seller.logo_url }
              : { id: p.user_id, name: 'Unknown', avatar_url: null },
          }))
        setReelPosts(videos)
      }
    } catch (err) {
      console.error('Load reel previews error:', err)
    }
  }

  // Smart search with debounce
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    if (query.trim().length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // Use feed API — results are seller posts, enriched with seller info
        const res = await fetch(`/api/feed?filter=new&limit=30`)
        const data = await res.json()

        if (data.success) {
          const lowerQuery = query.toLowerCase()
          const filtered = (data.posts || [])
            .filter((p: any) => {
              const caption = (p.caption || '').toLowerCase()
              const tags = (p.hashtags || []).join(' ').toLowerCase()
              const sellerName = (p.seller?.shop_name || '').toLowerCase()
              return caption.includes(lowerQuery) || tags.includes(lowerQuery) || sellerName.includes(lowerQuery)
            })
            .map((p: any) => ({
              ...p,
              user: p.seller
                ? { id: p.user_id, name: p.seller.shop_name, avatar_url: p.seller.logo_url }
                : { id: p.user_id, name: 'Unknown', avatar_url: null },
              product_tags: (p.linked_product_ids || []).length > 0
                ? p.linked_product_ids.map((pid: string) => ({ id: pid, product_id: pid }))
                : [],
            }))
          setSearchResults(filtered)
        }
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setIsSearching(false)
      }
    }, 400)
  }, [])

  const handlePostClick = (post: Post) => {
    setSelectedPost(post)
    setIsModalOpen(true)
  }

  const handleLikeToggle = (postId: string, liked: boolean) => {
    setPosts(prev => prev.map(post => post.id === postId ? { ...post, likes_count: liked ? post.likes_count + 1 : post.likes_count - 1, liked_by_user: liked } : post))
  }

  const toggleLike = async (postId: string, postUserId: string, currentlyLiked: boolean) => {
    if (!userId) return
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setPosts(prev => prev.map(post => post.id === postId ? { ...post, likes_count: data.liked ? post.likes_count + 1 : post.likes_count - 1, liked_by_user: data.liked } : post))
      }
    } catch (error) {
      console.error('Toggle like error:', error)
    }
  }

  const toggleBookmark = async (postId: string, currentlyBookmarked: boolean) => {
    if (!userId) return
    try {
      const response = await fetch('/api/bookmark', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId, action: currentlyBookmarked ? 'remove' : 'add' }) })
      if (!response.ok) throw new Error('Bookmark failed')
      setPosts(prev => prev.map(post => post.id === postId ? { ...post, bookmarked_by_user: !currentlyBookmarked } : post))
    } catch (error) {
      console.error('Toggle bookmark error:', error)
    }
  }

  // Infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        // Load more posts
        setPage(prev => prev + 1)
      }
    }, { threshold: 0.5 })
    observerRef.current.observe(loadMoreRef.current)
    return () => observerRef.current?.disconnect()
  }, [hasMore, loading])

  // Display posts for grid (either search results or normal posts)
  const displayPosts = searchQuery.trim().length >= 2 ? searchResults : posts

  // ─── REELS TAB ─────────────────────────────────────────────
  if (activeTab === 'reels') {
    return (
      <div className="min-h-screen relative">
        {/* Compact tab bar */}
        <div className="sticky top-0 z-50" style={{ background: 'rgba(var(--background-rgb, 10,10,15), 0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="max-w-2xl mx-auto px-4">
            <div className="flex items-center justify-between py-2.5">
              <h1 className="font-bold text-lg" style={{ color: 'oklch(0.95 0 0)' }}>{t('exploreTitle')}</h1>
              <button
                onClick={() => { setShowSearch(!showSearch); setActiveTab('posts') }}
                className="p-2 rounded-xl transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <Search className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.6)' }} />
              </button>
            </div>
            <div className="flex -mb-px">
              <button onClick={() => setActiveTab('posts')} className="flex-1 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 border-transparent" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <ImageIcon className="w-3.5 h-3.5" />
                {t('postsTab')}
              </button>
              <button onClick={() => setActiveTab('reels')} className="flex-1 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5" style={{ borderColor: 'oklch(0.78 0.14 85)', color: 'oklch(0.78 0.14 85)' }}>
                <Film className="w-3.5 h-3.5" />
                {t('reelsTab')}
              </button>
            </div>
          </div>
        </div>

        {/* Full Reels Feed */}
        <div className="h-[calc(100vh-6rem)]">
          <ReelsFeed />
        </div>
      </div>
    )
  }

  // ─── POSTS (DISCOVER) TAB ──────────────────────────────────
  return (
    <div className="min-h-screen relative" style={{ background: 'var(--background)' }}>

      {/* ── Sticky Header ─────────────────────────────────── */}
      <div className="sticky top-0 z-50" style={{ background: 'rgba(var(--background-rgb, 10,10,15), 0.88)', backdropFilter: 'blur(24px) saturate(1.4)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-3xl mx-auto px-4">

          {/* Top row: title + search */}
          <div className="flex items-center justify-between py-3">
            <h1 className="font-bold text-xl" style={{ color: 'oklch(0.95 0 0)' }}>{t('exploreTitle')}</h1>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2.5 rounded-xl transition-all"
              style={{
                background: showSearch ? 'oklch(0.78 0.14 85 / 0.15)' : 'rgba(255,255,255,0.06)',
                border: showSearch ? '1px solid oklch(0.78 0.14 85 / 0.3)' : '1px solid transparent',
              }}
            >
              {showSearch ? <X className="w-4 h-4" style={{ color: 'oklch(0.78 0.14 85)' }} /> : <Search className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.6)' }} />}
            </button>
          </div>

          {/* Search bar (expandable) */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="pb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <input
                      type="text"
                      placeholder={t('discoverSearchPlaceholder') || "Suche nach Posts, Styles, Marken..."}
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'oklch(0.95 0 0)',
                      }}
                      autoFocus
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: 'oklch(0.78 0.14 85)' }} />
                    )}
                  </div>

                  {/* Smart search suggestions */}
                  {searchQuery.length > 0 && searchQuery.length < 2 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {['Streetwear', 'Vintage', 'Minimal', 'Boho', 'Luxury'].map(suggestion => (
                        <button
                          key={suggestion}
                          onClick={() => handleSearch(suggestion)}
                          className="px-3 py-1 rounded-full text-xs transition-colors"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tabs */}
          <div className="flex -mb-px">
            <button onClick={() => setActiveTab('posts')} className="flex-1 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5" style={{ borderColor: 'oklch(0.78 0.14 85)', color: 'oklch(0.78 0.14 85)' }}>
              <ImageIcon className="w-3.5 h-3.5" />
              {t('postsTab')}
            </button>
            <button onClick={() => setActiveTab('reels')} className="flex-1 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 border-transparent" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <Film className="w-3.5 h-3.5" />
              {t('reelsTab')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto">

        {/* ── Trending Hashtags ──────────────────────────── */}
        {!searchQuery && (
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4" style={{ color: 'oklch(0.78 0.14 85)' }} />
                <span className="text-sm font-semibold" style={{ color: 'oklch(0.9 0 0)' }}>
                  {t('discoverTrending') || "Trending"}
                </span>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              {trendingTags.map((tag, i) => (
                <motion.button
                  key={tag.tag}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleSearch(tag.tag)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.7)',
                  }}
                >
                  <span>{tag.icon}</span>
                  <span>#{tag.tag}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* ── Filter Pills ──────────────────────────────── */}
        {!searchQuery && (
          <div className="px-4 pb-3">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
              {filterCategories.map((filter) => {
                const Icon = filter.icon
                const isActive = activeFilter === filter.id
                return (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{
                      background: isActive ? 'oklch(0.78 0.14 85)' : 'rgba(255,255,255,0.05)',
                      color: isActive ? 'oklch(0.15 0 0)' : 'rgba(255,255,255,0.5)',
                      border: isActive ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <Icon className="w-3 h-3" />
                    {filter.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Reels Preview Strip ────────────────────────── */}
        {!searchQuery && reelPosts.length > 0 && (
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <Play className="w-4 h-4" style={{ color: 'oklch(0.78 0.14 85)' }} />
                <span className="text-sm font-semibold" style={{ color: 'oklch(0.9 0 0)' }}>
                  Reels
                </span>
              </div>
              <button
                onClick={() => setActiveTab('reels')}
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: 'oklch(0.78 0.14 85)' }}
              >
                {t('viewAll') || 'Alle ansehen'}
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-1">
              {reelPosts.map((reel) => (
                <MiniReelCard
                  key={reel.id}
                  post={reel}
                  onClick={() => setActiveTab('reels')}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── "For You" Section Label ────────────────────── */}
        {!searchQuery && activeFilter === 'forYou' && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'linear-gradient(135deg, oklch(0.78 0.14 85 / 0.1), oklch(0.65 0.18 50 / 0.05))', border: '1px solid oklch(0.78 0.14 85 / 0.15)' }}>
              <Crown className="w-4 h-4" style={{ color: 'oklch(0.78 0.14 85)' }} />
              <span className="text-xs font-medium" style={{ color: 'oklch(0.78 0.14 85)' }}>
                {t('discoverForYouDesc') || "Basierend auf deinem Geschmack ausgewählt"}
              </span>
            </div>
          </div>
        )}

        {/* ── Social Proof Bar ───────────────────────────── */}
        {!searchQuery && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-3 text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{t('discoverActiveNow') || "847 aktive Nutzer"}</span>
              </div>
              <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>{t('discoverNewToday') || "124 neue Posts heute"}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Main Grid ──────────────────────────────────── */}
        {loading && posts.length === 0 ? (
          <div className="px-4">
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className={`rounded-lg animate-pulse ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
                  style={{
                    aspectRatio: i === 0 ? '1' : '3/4',
                    background: 'rgba(255,255,255,0.05)',
                  }}
                />
              ))}
            </div>
          </div>
        ) : displayPosts.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <div className="text-6xl mb-4">
              {searchQuery ? '🔍' : '✨'}
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'oklch(0.9 0 0)' }}>
              {searchQuery ? (t('noSearchResults') || 'Keine Ergebnisse') : (t('noPostsYet') || 'Noch keine Posts')}
            </h3>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {searchQuery ? (t('tryDifferentSearch') || 'Versuche einen anderen Suchbegriff') : (t('shareFirstPost') || 'Sei der Erste!')}
            </p>
          </div>
        ) : (
          <div className="px-1">
            {/* Instagram-style 3-column grid */}
            <div className="grid grid-cols-3 gap-0.5">
              {displayPosts.map((post, idx) => (
                <GridItem
                  key={post.id}
                  post={post}
                  index={idx}
                  onClick={() => handlePostClick(post)}
                  onLike={toggleLike}
                  onBookmark={toggleBookmark}
                  userId={userId}
                />
              ))}
            </div>

            {/* Infinite scroll trigger */}
            <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
              {loading && (
                <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: 'oklch(0.78 0.14 85)' }} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Post Detail Modal ────────────────────────────── */}
      <PostDetailModal
        post={selectedPost}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLikeToggle={handleLikeToggle}
      />
    </div>
  )
}
