"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { motion } from "framer-motion"
import { Heart, MessageCircle, Grid3x3, ChevronLeft, Share2, Instagram, Shirt, Loader2, MoreVertical } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import PostDetailModal from "@/components/post-detail-modal"
import { supabase } from "@/lib/supabase"

interface UserProfile {
  id: string
  name: string
  email: string
  avatar_url: string | null
  username: string | null
  bio: string | null
  instagram: string | null
  style: string | null
  is_private: boolean
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

interface Stats {
  posts: number
  followers: number
  following: number
}

export default function UserProfilePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const viewerId = session?.user?.id
  const profileUserId = params.userId as string
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userPosts, setUserPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [stats, setStats] = useState<Stats>({ posts: 0, followers: 0, following: 0 })
  const [isFollowing, setIsFollowing] = useState(false)
  const [hasRequestPending, setHasRequestPending] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (profileUserId && viewerId) {
      if (profileUserId === viewerId) {
        router.push('/profile')
        return
      }
      loadUserProfile()
      loadUserPosts()
      loadStats()
      checkFollowStatus()
      checkBlockStatus()
    }
  }, [profileUserId, viewerId])

  const loadUserProfile = async () => {
    if (!profileUserId) return
    try {
      const { data, error } = await supabase.from('users').select('id, name, email, avatar_url, username, bio, instagram, style, is_private').eq('id', profileUserId).single()
      if (error) throw error
      setUserProfile(data)
    } catch (error) {
      console.error('Load profile error:', error)
    }
  }

  const loadUserPosts = async () => {
    if (!profileUserId) return
    try {
      const { data: postsData, error } = await supabase.from('posts').select('*').eq('user_id', profileUserId).eq('is_archived', false).order('created_at', { ascending: false })
      if (error) throw error
      if (viewerId) {
        const postsWithStatus = await Promise.all((postsData || []).map(async (post) => {
          const { data: likeData } = await supabase.from('likes').select('id').eq('post_id', post.id).eq('user_id', viewerId).single()
          const { data: bookmarkData } = await supabase.from('bookmarks').select('id').eq('post_id', post.id).eq('user_id', viewerId).single()
          return { ...post, liked_by_user: !!likeData, bookmarked_by_user: !!bookmarkData }
        }))
        setUserPosts(postsWithStatus)
      } else {
        setUserPosts(postsData || [])
      }
    } catch (error) {
      console.error('Load posts error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    if (!profileUserId) return
    try {
      const { data: followersData } = await supabase.from('follows').select('id').eq('following_id', profileUserId)
      const { data: followingData } = await supabase.from('follows').select('id').eq('follower_id', profileUserId)
      const { data: postsData } = await supabase.from('posts').select('id').eq('user_id', profileUserId).eq('is_archived', false)
      setStats({ posts: postsData?.length || 0, followers: followersData?.length || 0, following: followingData?.length || 0 })
    } catch (error) {
      console.error('Load stats error:', error)
    }
  }

  const checkFollowStatus = async () => {
    if (!viewerId || !profileUserId) return
    try {
      const { data: followData } = await supabase.from('follows').select('id').eq('follower_id', viewerId).eq('following_id', profileUserId).single()
      setIsFollowing(!!followData)
      
      const { data: requestData } = await supabase.from('follow_requests').select('id').eq('requester_id', viewerId).eq('requested_id', profileUserId).eq('status', 'pending').single()
      setHasRequestPending(!!requestData)
    } catch (error) {
      console.error('Check follow status error:', error)
    }
  }

  const checkBlockStatus = async () => {
    if (!viewerId || !profileUserId) return
    try {
      const { data: blockedData } = await supabase.from('blocked_users').select('id').eq('blocker_id', profileUserId).eq('blocked_id', viewerId).single()
      setIsBlocked(!!blockedData)
    } catch (error) {
      console.error('Check block status error:', error)
    }
  }

  const handleFollowAction = async () => {
    if (!viewerId || !profileUserId || actionLoading) return
    setActionLoading(true)
    try {
      if (isFollowing) {
        // Unfollow - use /api/follow
        const response = await fetch('/api/follow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ followerId: viewerId, followingId: profileUserId, action: 'unfollow' }) })
        if (!response.ok) throw new Error('Unfollow failed')
        setIsFollowing(false)
        loadStats()
      } else if (hasRequestPending) {
        // Cancel request - use /api/follow-request
        const response = await fetch('/api/follow-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requesterId: viewerId, requestedId: profileUserId, action: 'cancel' }) })
        if (!response.ok) throw new Error('Cancel failed')
        setHasRequestPending(false)
      } else {
  // Send follow request or follow directly - use /api/follow-request
  console.log('🚀 Sending follow request:', { viewerId, profileUserId })
  const response = await fetch('/api/follow-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requesterId: viewerId, requestedId: profileUserId, action: 'send' }) })
  console.log('📥 Response status:', response.status)
  const data = await response.json()
  console.log('📦 Response data:', data)
  if (!response.ok) throw new Error(data.error || 'Follow failed')
        if (data.following) {
          setIsFollowing(true)
          loadStats()
          loadUserPosts()
        } else if (data.requestSent) {
          setHasRequestPending(true)
        }
      }
    } catch (error) {
      console.error('Follow action error:', error)
      alert('İşlem başarısız!')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePostClick = (post: Post) => {
    setSelectedPost(post)
    setIsModalOpen(true)
  }

  const handleLikeToggle = (postId: string, liked: boolean) => {
    setUserPosts(prev => prev.map(post => post.id === postId ? { ...post, likes_count: liked ? post.likes_count + 1 : post.likes_count - 1, liked_by_user: liked } : post))
  }

  const handleShare = async () => {
    const profileUrl = `${window.location.origin}/profile/${profileUserId}`
    if (navigator.share) {
      try {
        await navigator.share({ title: `${userProfile?.name}'in Profili`, text: `${userProfile?.name} - Gardırop AI`, url: profileUrl })
      } catch (error) {
        console.log('Share cancelled')
      }
    } else {
      navigator.clipboard.writeText(profileUrl)
      alert('Profil linki kopyalandı!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h3 className="text-xl font-bold mb-2">Profil Görüntülenemiyor</h3>
          <p className="text-sm text-muted-foreground">Bu kullanıcının profilini görüntüleyemezsiniz</p>
        </div>
      </div>
    )
  }

  const canViewPosts = !userProfile?.is_private || isFollowing
  const followButtonText = isFollowing ? 'Takip Ediliyor' : hasRequestPending ? 'İstek Gönderildi' : 'Takip Et'

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-4 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => router.back()} className="p-2 hover:bg-secondary rounded-lg transition-colors"><ChevronLeft className="w-6 h-6" /></button>
            <h1 className="font-bold text-xl">{userProfile?.username || userProfile?.name}</h1>
            <button className="p-2 hover:bg-secondary rounded-lg transition-colors"><MoreVertical className="w-6 h-6" /></button>
          </div>
          <div className="mb-6">
            <div className="flex items-center gap-6 mb-4">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-primary ring-2 ring-primary/20">
                {userProfile?.avatar_url ? (<img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">{userProfile?.name?.[0]?.toUpperCase() || 'U'}</div>)}
              </div>
              <div className="flex-1 grid grid-cols-3 gap-4 text-center">
                <div><p className="text-xl font-bold">{stats.posts}</p><p className="text-xs text-muted-foreground">gönderi</p></div>
                <button onClick={() => router.push(`/profile/followers?userId=${profileUserId}&tab=followers`)} className="hover:opacity-70 transition-opacity"><p className="text-xl font-bold">{stats.followers}</p><p className="text-xs text-muted-foreground">takipçi</p></button>
                <button onClick={() => router.push(`/profile/followers?userId=${profileUserId}&tab=following`)} className="hover:opacity-70 transition-opacity"><p className="text-xl font-bold">{stats.following}</p><p className="text-xs text-muted-foreground">takip</p></button>
              </div>
            </div>
            <div className="mb-4">
              <p className="font-bold">{userProfile?.name}</p>
              {userProfile?.bio && (<p className="text-sm mt-1">{userProfile.bio}</p>)}
              {userProfile?.style && (<div className="flex items-center gap-2 mt-2"><Shirt className="w-4 h-4 text-primary" /><span className="text-sm text-primary font-semibold">{userProfile.style}</span></div>)}
              {userProfile?.instagram && (<a href={`https://instagram.com/${userProfile.instagram}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mt-1"><Instagram className="w-4 h-4" />@{userProfile.instagram}</a>)}
            </div>
            <div className="flex gap-2">
              <button onClick={handleFollowAction} disabled={actionLoading} className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${isFollowing ? 'glass border border-border hover:bg-secondary' : 'bg-primary text-primary-foreground hover:opacity-90'} disabled:opacity-50`}>
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : followButtonText}
              </button>
              <button onClick={() => router.push(`/messages?userId=${profileUserId}`)} className="flex-1 px-4 py-2 glass border border-border rounded-lg font-semibold text-sm hover:bg-secondary transition-colors">Mesaj Gönder</button>
              <button onClick={handleShare} className="px-4 py-2 glass border border-border rounded-lg font-semibold text-sm hover:bg-secondary transition-colors"><Share2 className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="border-t border-border">
            <div className="flex">
              <button className="flex-1 py-3 flex items-center justify-center gap-2 border-b-2 border-primary"><Grid3x3 className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="mt-4">
            {!canViewPosts ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🔒</div>
                <h3 className="text-xl font-bold mb-2">Bu Hesap Gizli</h3>
                <p className="text-sm text-muted-foreground">Fotoğrafları veya videoları görmek için takip et</p>
              </div>
            ) : userPosts.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">📷</div>
                <h3 className="text-xl font-bold mb-2">Henüz gönderi yok</h3>
                <p className="text-sm text-muted-foreground">Gönderi paylaşıldığında burada görünür</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {userPosts.map((post) => (
                  <div key={post.id} onClick={() => handlePostClick(post)} className="aspect-square bg-gradient-to-br from-primary/5 to-primary/10 cursor-pointer group relative">
                    <img src={post.image_url} alt={post.caption} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <div className="flex items-center gap-1 text-white"><Heart className="w-5 h-5" fill="white" /><span className="font-bold text-sm">{post.likes_count}</span></div>
                      <div className="flex items-center gap-1 text-white"><MessageCircle className="w-5 h-5" fill="white" /><span className="font-bold text-sm">{post.comments_count}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      <PostDetailModal post={selectedPost} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onLikeToggle={handleLikeToggle} />
    </div>
  )
}