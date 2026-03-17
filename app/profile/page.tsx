"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AnimatePresence } from "framer-motion"
import {
  Heart, MessageCircle, Grid3x3, Bookmark, Menu, Settings, Bell, LogOut,
  Share2, Instagram, Shirt, X, ChevronRight, BarChart3, Lock, Users, Ban,
  MessageSquare, Activity, Clock, Archive, Star, Image, UserPlus, TrendingUp,
  Store, Package, Languages, Check, Globe,
} from "lucide-react"
import Link from "next/link"
import PostDetailModal from "@/components/post-detail-modal"
import { supabase } from "@/lib/supabase"
import { useLanguage } from "@/lib/language-context"
import CurrencySelector from "@/components/currency-selector"

interface UserProfile {
  id: string
  name: string
  email: string
  avatar_url: string | null
  username: string | null
  bio: string | null
  instagram: string | null
  style: string | null
}

interface Post {
  id: string
  user_id: string
  caption: string
  image_url: string
  likes_count: number
  comments_count: number
  created_at: string
  liked_by_user?: boolean
  bookmarked_by_user?: boolean
}

interface SavedOutfit {
  id: string
  name: string
  description: string | null
  cloth_ids: string[]
  season: string
  occasion: string
  color_harmony_score: number
  is_favorite: boolean
  created_at: string
  clothes?: any[]
}

interface Stats {
  posts: number
  followers: number
  following: number
  totalLikes: number
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { language, setLanguage, t } = useLanguage()
  const userId = session?.user?.id
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts')
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([])
  const [userPosts, setUserPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [stats, setStats] = useState<Stats>({ posts: 0, followers: 0, following: 0, totalLikes: 0 })
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [isSeller, setIsSeller] = useState(false)

  useEffect(() => {
    if (userId) {
      loadUserProfile()
      loadUserPosts()
      loadSavedOutfits()
      loadStats()
      loadPendingRequests()
      checkSellerStatus()
    }
  }, [userId])

  const checkSellerStatus = async () => {
    if (!userId) return
    try {
      const response = await fetch('/api/seller/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) })
      const data = await response.json()
      setIsSeller(data.isSeller)
    } catch { setIsSeller(false) }
  }

  const loadUserProfile = async () => {
    if (!userId) return
    try {
      const { data, error } = await supabase.from('users').select('id, name, email, avatar_url, username, bio, instagram, style').eq('id', userId).single()
      if (error) throw error
      setUserProfile(data)
    } catch (error) { console.error('Load profile error:', error) }
  }

  const loadUserPosts = async () => {
    if (!userId) return
    try {
      const { data: postsData, error } = await supabase.from('posts').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      if (error) throw error
      const postsWithStatus = await Promise.all((postsData || []).map(async (post) => {
        const { data: likeData } = await supabase.from('likes').select('id').eq('post_id', post.id).eq('user_id', userId).maybeSingle()
        const { data: bookmarkData } = await supabase.from('bookmarks').select('id').eq('post_id', post.id).eq('user_id', userId).maybeSingle()
        return { ...post, liked_by_user: !!likeData, bookmarked_by_user: !!bookmarkData }
      }))
      setUserPosts(postsWithStatus)
    } catch (error) { console.error('Load posts error:', error) }
  }

  const loadSavedOutfits = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data: outfitsData, error } = await supabase.from('outfits').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      if (error) throw error
      const outfitsWithClothes = await Promise.all((outfitsData || []).map(async (outfit) => {
        if (outfit.cloth_ids?.length > 0) {
          const { data: clothes } = await supabase.from('clothes').select('*').in('id', outfit.cloth_ids)
          return { ...outfit, clothes: clothes || [] }
        }
        return { ...outfit, clothes: [] }
      }))
      setSavedOutfits(outfitsWithClothes)
    } catch (error) { console.error('Error:', error) }
    finally { setLoading(false) }
  }

  const loadStats = async () => {
    if (!userId) return
    try {
      const { data: followersData } = await supabase.from('follows').select('id').eq('following_id', userId)
      const { data: followingData } = await supabase.from('follows').select('id').eq('follower_id', userId)
      const { data: postsData } = await supabase.from('posts').select('id, likes_count').eq('user_id', userId)
      const totalLikes = (postsData || []).reduce((sum, p) => sum + (p.likes_count || 0), 0)
      setStats({ posts: postsData?.length || 0, followers: followersData?.length || 0, following: followingData?.length || 0, totalLikes })
    } catch (error) { console.error('Load stats error:', error) }
  }

  const loadPendingRequests = async () => {
    if (!userId) return
    try {
      const { data, error } = await supabase.from('follow_requests').select('id').eq('requested_id', userId).eq('status', 'pending')
      if (error) throw error
      setPendingRequestsCount(data?.length || 0)
    } catch (error) { console.error('Load pending requests error:', error) }
  }

  const handlePostClick = (post: Post) => { setSelectedPost(post); setIsModalOpen(true) }
  const handleLikeToggle = (postId: string, liked: boolean) => {
    setUserPosts(prev => prev.map(post => post.id === postId ? { ...post, likes_count: liked ? post.likes_count + 1 : post.likes_count - 1, liked_by_user: liked } : post))
    loadStats()
  }

  const deletePost = async (postId: string) => {
    if (!confirm('Gönderiyi silmek istediğinize emin misiniz?')) return
    try {
      await supabase.from('posts').delete().eq('id', postId)
      setUserPosts(prev => prev.filter(p => p.id !== postId))
      setIsModalOpen(false)
      loadStats()
    } catch (error) { console.error('Delete post error:', error); alert('Silme başarısız!') }
  }

  const handleShare = async () => {
    const profileUrl = `${window.location.origin}/profile/${userId}`
    if (navigator.share) {
      try { await navigator.share({ title: `${userProfile?.name}'in Profili`, url: profileUrl }) }
      catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(profileUrl)
      alert('Profil linki kopyalandı!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--lux-bg)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  // ── Settings menu item component ───────────────────────
  const MenuItem = ({ icon: Icon, label, href, badge, extra }: {
    icon: any; label: string; href: string; badge?: number; extra?: string
  }) => (
    <button
      onClick={() => { router.push(href); setShowMenu(false) }}
      className="w-full px-[16px] py-[14px] flex items-center justify-between rounded-[12px]"
      style={{ transition: 'background 200ms' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#1F1F23')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div className="flex items-center gap-[12px]">
        <Icon className="w-[20px] h-[20px]" style={{ color: 'var(--text-faint)' }} />
        <span className="text-[14px]" style={{ color: 'var(--text-primary)' }}>{label}</span>
      </div>
      <div className="flex items-center gap-[8px]">
        {badge !== undefined && badge > 0 && (
          <span className="w-[20px] h-[20px] rounded-full text-[11px] font-bold flex items-center justify-center" style={{ background: '#ef4444', color: 'white' }}>{badge}</span>
        )}
        {extra && <span className="text-[13px]" style={{ color: 'var(--text-faint)' }}>{extra}</span>}
        <ChevronRight className="w-[16px] h-[16px]" style={{ color: 'var(--text-faint)' }} />
      </div>
    </button>
  )

  return (
    <div className="min-h-screen pb-[100px]" style={{ background: 'var(--lux-bg)' }}>
      <div className="max-w-5xl mx-auto px-[16px] md:px-[48px] pt-[24px] md:pt-[48px]">

        {/* ── Desktop: 2 columns — Left sidebar + Right content ── */}
        <div className="md:grid md:grid-cols-[280px_1fr] md:gap-[48px]">

          {/* ═══ LEFT COLUMN — Profile Info ═══════════════════ */}
          <div className="md:sticky md:top-[120px] md:self-start">
            {/* Header row */}
            <div className="flex items-center justify-between mb-[24px]">
              <h1 className="text-[20px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {userProfile?.username || userProfile?.name || 'Profil'}
              </h1>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-[8px] rounded-[10px]"
                style={{ transition: 'background 200ms' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--lux-layer-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Menu className="w-[20px] h-[20px]" style={{ color: 'var(--text-faint)' }} />
              </button>
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center md:items-start mb-[24px]">
              <div
                className="w-[80px] h-[80px] rounded-full overflow-hidden mb-[16px]"
                style={{ background: 'var(--accent-primary)', border: '2px solid rgba(99,102,241,0.3)' }}
              >
                {userProfile?.avatar_url || session?.user?.image ? (
                  <img src={userProfile?.avatar_url || session?.user?.image || ''} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                    {userProfile?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <p className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>{userProfile?.name}</p>
              {userProfile?.bio && <p className="text-[14px] mt-[4px]" style={{ color: 'var(--text-secondary)' }}>{userProfile.bio}</p>}
              {userProfile?.style && (
                <div className="flex items-center gap-[6px] mt-[8px]">
                  <Shirt className="w-[14px] h-[14px]" style={{ color: 'var(--accent-primary)' }} />
                  <span className="text-[13px] font-medium" style={{ color: 'var(--accent-primary)' }}>{userProfile.style}</span>
                </div>
              )}
              {userProfile?.instagram && (
                <a href={`https://instagram.com/${userProfile.instagram}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-[6px] mt-[6px] text-[13px]" style={{ color: 'var(--text-faint)', transition: 'color 200ms' }}>
                  <Instagram className="w-[14px] h-[14px]" />@{userProfile.instagram}
                </a>
              )}
            </div>

            {/* Stats row */}
            <div
              className="grid grid-cols-3 gap-[12px] text-center p-[16px] rounded-[16px] mb-[20px]"
              style={{ background: 'var(--lux-layer-1)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div>
                <p className="text-[18px] font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.posts}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>Beiträge</p>
              </div>
              <button onClick={() => router.push('/profile/followers?tab=followers')} style={{ transition: 'opacity 200ms' }} onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')} onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}>
                <p className="text-[18px] font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.followers}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>Follower</p>
              </button>
              <button onClick={() => router.push('/profile/followers?tab=following')} style={{ transition: 'opacity 200ms' }} onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')} onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}>
                <p className="text-[18px] font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.following}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>Folge ich</p>
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex gap-[8px] mb-[12px]">
              <Link
                href="/profile/edit"
                className="flex-1 py-[10px] text-center text-[13px] font-medium rounded-[10px]"
                style={{ background: '#1F1F23', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.08)', transition: 'background 200ms' }}
              >
                Profil bearbeiten
              </Link>
              <button
                onClick={handleShare}
                className="flex-1 py-[10px] text-center text-[13px] font-medium rounded-[10px]"
                style={{ background: '#1F1F23', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.08)', transition: 'background 200ms' }}
              >
                Teilen
              </button>
            </div>
            <button
              onClick={() => router.push('/orders')}
              className="w-full py-[10px] flex items-center justify-center gap-[8px] rounded-[10px] text-[13px] font-medium"
              style={{
                background: 'var(--accent-soft)',
                color: 'var(--accent-primary)',
                border: '1px solid rgba(99,102,241,0.15)',
                transition: 'background 200ms',
              }}
            >
              <Package className="w-[16px] h-[16px]" />
              Meine Bestellungen
            </button>
          </div>

          {/* ═══ RIGHT COLUMN — Content Grid ══════════════════ */}
          <div>
            {/* Tabs */}
            <div className="flex mb-[24px]" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => setActiveTab('posts')}
                className="flex-1 py-[12px] flex items-center justify-center gap-[8px]"
                style={{
                  color: activeTab === 'posts' ? 'var(--text-primary)' : 'var(--text-faint)',
                  borderBottom: activeTab === 'posts' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  transition: 'all 200ms',
                }}
              >
                <Grid3x3 className="w-[18px] h-[18px]" />
              </button>
              <button
                onClick={() => setActiveTab('saved')}
                className="flex-1 py-[12px] flex items-center justify-center gap-[8px]"
                style={{
                  color: activeTab === 'saved' ? 'var(--text-primary)' : 'var(--text-faint)',
                  borderBottom: activeTab === 'saved' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  transition: 'all 200ms',
                }}
              >
                <Bookmark className="w-[18px] h-[18px]" />
              </button>
            </div>

            {/* Posts grid */}
            {activeTab === 'posts' && userPosts.length === 0 && (
              <div className="text-center py-[80px]">
                <p className="text-[48px] mb-[16px]">📷</p>
                <h3 className="text-[18px] font-semibold mb-[8px]" style={{ color: 'var(--text-primary)' }}>Noch keine Beiträge</h3>
                <p className="text-[14px]" style={{ color: 'var(--text-faint)' }}>Teile deinen ersten Look!</p>
              </div>
            )}
            {activeTab === 'posts' && userPosts.length > 0 && (
              <div className="grid grid-cols-3 gap-[4px]">
                {userPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => handlePostClick(post)}
                    className="aspect-square cursor-pointer group relative overflow-hidden"
                    style={{ background: 'var(--lux-layer-1)' }}
                  >
                    <img src={post.image_url} alt={post.caption} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-[16px]" style={{ background: 'rgba(0,0,0,0.5)', transition: 'opacity 200ms' }}>
                      <div className="flex items-center gap-[4px]">
                        <Heart className="w-[16px] h-[16px]" style={{ color: 'white', fill: 'white' }} />
                        <span className="text-[13px] font-semibold" style={{ color: 'white' }}>{post.likes_count}</span>
                      </div>
                      <div className="flex items-center gap-[4px]">
                        <MessageCircle className="w-[16px] h-[16px]" style={{ color: 'white', fill: 'white' }} />
                        <span className="text-[13px] font-semibold" style={{ color: 'white' }}>{post.comments_count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Saved outfits */}
            {activeTab === 'saved' && savedOutfits.length === 0 && (
              <div className="text-center py-[80px]">
                <p className="text-[48px] mb-[16px]">💾</p>
                <h3 className="text-[18px] font-semibold mb-[8px]" style={{ color: 'var(--text-primary)' }}>Keine gespeicherten Outfits</h3>
                <p className="text-[14px] mb-[16px]" style={{ color: 'var(--text-faint)' }}>Erstelle ein Outfit mit AI!</p>
                <Link
                  href="/"
                  className="inline-block px-[24px] py-[10px] rounded-[10px] text-[14px] font-medium"
                  style={{ background: 'var(--accent-primary)', color: 'white' }}
                >
                  Outfit erstellen
                </Link>
              </div>
            )}
            {activeTab === 'saved' && savedOutfits.length > 0 && (
              <div className="grid grid-cols-2 gap-[16px]">
                {savedOutfits.map((outfit) => (
                  <div
                    key={outfit.id}
                    className="rounded-[16px] overflow-hidden"
                    style={{ background: 'var(--lux-layer-1)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="aspect-square p-[8px] flex flex-col gap-[4px]" style={{ background: 'var(--lux-layer-2)' }}>
                      {outfit.clothes?.slice(0, 2).map((item) => (
                        <div key={item.id} className="flex-1 rounded-[8px] p-[4px] flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" />
                        </div>
                      ))}
                    </div>
                    <div className="p-[12px]">
                      <p className="text-[14px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{outfit.name}</p>
                      <div className="flex items-center gap-[8px] mt-[8px]">
                        <span className="text-[11px] px-[8px] py-[3px] rounded-full" style={{ background: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>{outfit.season}</span>
                        <span className="text-[11px] font-medium" style={{ color: 'var(--accent-primary)' }}>{outfit.color_harmony_score}/100</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ SETTINGS DRAWER ════════════════════════════════ */}
      <AnimatePresence>
        {showMenu && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto"
            style={{ background: 'var(--lux-bg)' }}
          >
            <div className="min-h-screen">
              {/* Header */}
              <div
                className="sticky top-0 z-10 px-[16px] py-[12px] flex items-center gap-[12px]"
                style={{
                  background: 'rgba(14,14,16,0.95)',
                  backdropFilter: 'blur(12px)',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <button
                  onClick={() => setShowMenu(false)}
                  className="p-[8px] rounded-[10px]"
                  style={{ transition: 'background 200ms' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--lux-layer-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <X className="w-[20px] h-[20px]" style={{ color: 'var(--text-primary)' }} />
                </button>
                <h2 className="text-[18px] font-semibold" style={{ color: 'var(--text-primary)' }}>Einstellungen</h2>
              </div>

              <div className="px-[16px] py-[16px] space-y-[32px] pb-[100px]">

                {/* Section: Activity */}
                <div>
                  <p className="text-[11px] font-semibold uppercase mb-[8px] px-[16px]" style={{ color: 'var(--text-faint)', letterSpacing: '0.08em' }}>Aktivitäten</p>
                  <div className="rounded-[16px] overflow-hidden" style={{ background: 'var(--lux-layer-1)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <MenuItem icon={Bookmark} label="Gespeichert" href="/saved" />
                    <MenuItem icon={Archive} label="Archiv" href="/settings/archive" />
                    <MenuItem icon={Activity} label="Aktivitäten" href="/settings/activity" />
                    <MenuItem icon={UserPlus} label="Follower-Anfragen" href="/follow-requests" badge={pendingRequestsCount} />
                    <MenuItem icon={Bell} label="Benachrichtigungen" href="/notifications" />
                    <MenuItem icon={Clock} label="Zeitmanagement" href="/settings/time-management" />
                  </div>
                </div>

                {/* Section: Pro */}
                <div>
                  <p className="text-[11px] font-semibold uppercase mb-[8px] px-[16px]" style={{ color: 'var(--text-faint)', letterSpacing: '0.08em' }}>Professionell</p>
                  <div className="rounded-[16px] overflow-hidden" style={{ background: 'var(--lux-layer-1)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <MenuItem icon={BarChart3} label="Statistiken" href="/settings/stats" />
                    <MenuItem icon={TrendingUp} label="Nutzungsstatistiken" href="/wear-tracking" />
                    <MenuItem icon={Store} label={isSeller ? 'Mein Shop' : 'Verkäufer werden'} href={isSeller ? '/seller/dashboard' : '/seller-application'} />
                    <MenuItem icon={Settings} label="Profil bearbeiten" href="/profile/edit" />
                  </div>
                </div>

                {/* Section: Privacy */}
                <div>
                  <p className="text-[11px] font-semibold uppercase mb-[8px] px-[16px]" style={{ color: 'var(--text-faint)', letterSpacing: '0.08em' }}>Datenschutz</p>
                  <div className="rounded-[16px] overflow-hidden" style={{ background: 'var(--lux-layer-1)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <MenuItem icon={Lock} label="Konto-Privatsphäre" href="/settings/privacy" extra="Öffentlich" />
                    <MenuItem icon={Users} label="Enge Freunde" href="/settings/close-friends" extra="0" />
                    <MenuItem icon={Ban} label="Blockiert" href="/settings/blocked-users" extra="0" />
                  </div>
                </div>

                {/* Section: Language */}
                <div>
                  <p className="text-[11px] font-semibold uppercase mb-[8px] px-[16px]" style={{ color: 'var(--text-faint)', letterSpacing: '0.08em' }}>Sprache</p>
                  <div className="rounded-[16px] overflow-hidden" style={{ background: 'var(--lux-layer-1)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {[
                      { code: 'tr' as const, flag: '🇹🇷', name: 'Türkçe' },
                      { code: 'en' as const, flag: '🇬🇧', name: 'English' },
                      { code: 'de' as const, flag: '🇩🇪', name: 'Deutsch' },
                    ].map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className="w-full px-[16px] py-[14px] flex items-center justify-between"
                        style={{ transition: 'background 200ms' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#1F1F23')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div className="flex items-center gap-[12px]">
                          <span className="text-[20px]">{lang.flag}</span>
                          <span className="text-[14px]" style={{ color: 'var(--text-primary)' }}>{lang.name}</span>
                        </div>
                        {language === lang.code && <Check className="w-[18px] h-[18px]" style={{ color: 'var(--accent-primary)' }} />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section: Currency */}
                <div>
                  <p className="text-[11px] font-semibold uppercase mb-[8px] px-[16px]" style={{ color: 'var(--text-faint)', letterSpacing: '0.08em' }}>Währung</p>
                  <div className="rounded-[16px] p-[16px]" style={{ background: 'var(--lux-layer-1)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <CurrencySelector />
                  </div>
                </div>

                {/* Section: Interactions */}
                <div>
                  <p className="text-[11px] font-semibold uppercase mb-[8px] px-[16px]" style={{ color: 'var(--text-faint)', letterSpacing: '0.08em' }}>Interaktionen</p>
                  <div className="rounded-[16px] overflow-hidden" style={{ background: 'var(--lux-layer-1)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <MenuItem icon={MessageSquare} label="Nachrichten" href="/messages" />
                    <MenuItem icon={MessageCircle} label="Kommentare" href="/settings/comments" />
                    <MenuItem icon={Star} label="Favoriten" href="/settings/favorites" extra="0" />
                    <MenuItem icon={Image} label="Inhaltseinstellungen" href="/settings/content-preferences" />
                  </div>
                </div>

                {/* Section: Legal */}
                <div>
                  <p className="text-[11px] font-semibold uppercase mb-[8px] px-[16px]" style={{ color: 'var(--text-faint)', letterSpacing: '0.08em' }}>Rechtliches</p>
                  <div className="rounded-[16px] overflow-hidden" style={{ background: 'var(--lux-layer-1)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <MenuItem icon={Lock} label="Datenschutz (DSGVO)" href="/legal/privacy" />
                    <MenuItem icon={MessageCircle} label="AGB" href="/legal/agb" />
                    <MenuItem icon={Settings} label="Impressum" href="/legal/impressum" />
                    <MenuItem icon={Archive} label="Widerrufsrecht" href="/legal/widerrufsrecht" />
                  </div>
                </div>

                {/* Logout */}
                <div className="pt-[8px]">
                  <button
                    onClick={() => signOut()}
                    className="w-full px-[16px] py-[14px] flex items-center gap-[12px] rounded-[16px]"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', transition: 'background 200ms' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                  >
                    <LogOut className="w-[20px] h-[20px]" style={{ color: '#ef4444' }} />
                    <span className="text-[14px] font-semibold" style={{ color: '#ef4444' }}>Abmelden</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <PostDetailModal post={selectedPost} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onLikeToggle={handleLikeToggle} onDelete={deletePost} />
    </div>
  )
}
