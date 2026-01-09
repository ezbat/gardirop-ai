"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, MessageCircle, Grid3x3, Bookmark, Menu, Settings, Bell, LogOut, Share2, Instagram, Shirt, X } from "lucide-react"
import Link from "next/link"
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

  useEffect(() => {
    if (userId) {
      loadUserProfile()
      loadUserPosts()
      loadSavedOutfits()
      loadStats()
    }
  }, [userId])

  const loadUserProfile = async () => {
    if (!userId) return
    try {
      const { data, error } = await supabase.from('users').select('id, name, email, avatar_url, username, bio, instagram, style').eq('id', userId).single()
      if (error) throw error
      setUserProfile(data)
    } catch (error) {
      console.error('Load profile error:', error)
    }
  }

  const loadUserPosts = async () => {
    if (!userId) return
    try {
      const { data: postsData, error } = await supabase.from('posts').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      if (error) throw error
      const postsWithStatus = await Promise.all((postsData || []).map(async (post) => {
        const { data: likeData } = await supabase.from('likes').select('id').eq('post_id', post.id).eq('user_id', userId).single()
        const { data: bookmarkData } = await supabase.from('bookmarks').select('id').eq('post_id', post.id).eq('user_id', userId).single()
        return { ...post, liked_by_user: !!likeData, bookmarked_by_user: !!bookmarkData }
      }))
      setUserPosts(postsWithStatus)
    } catch (error) {
      console.error('Load posts error:', error)
    }
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
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    if (!userId) return
    try {
      const { data: followersData } = await supabase.from('follows').select('id').eq('following_id', userId)
      const { data: followingData } = await supabase.from('follows').select('id').eq('follower_id', userId)
      const { data: postsData } = await supabase.from('posts').select('id, likes_count').eq('user_id', userId)
      const totalLikes = (postsData || []).reduce((sum, p) => sum + (p.likes_count || 0), 0)
      setStats({ posts: postsData?.length || 0, followers: followersData?.length || 0, following: followingData?.length || 0, totalLikes })
    } catch (error) {
      console.error('Load stats error:', error)
    }
  }

  const handlePostClick = (post: Post) => {
    setSelectedPost(post)
    setIsModalOpen(true)
  }

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
    } catch (error) {
      console.error('Delete post error:', error)
      alert('Silme başarısız!')
    }
  }

  const handleShare = async () => {
    const profileUrl = `${window.location.origin}/profile/${userId}`
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
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-4 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-bold text-xl">{userProfile?.username || userProfile?.name || 'Profil'}</h1>
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-secondary rounded-lg transition-colors"><Menu className="w-6 h-6" /></button>
          </div>
          <div className="mb-6">
            <div className="flex items-center gap-6 mb-4">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-primary ring-2 ring-primary/20">
                {userProfile?.avatar_url || session?.user?.image ? (<img src={userProfile?.avatar_url || session?.user?.image || ''} alt="Avatar" className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">{userProfile?.name?.[0]?.toUpperCase() || 'U'}</div>)}
              </div>
              <div className="flex-1 grid grid-cols-3 gap-4 text-center">
                <div><p className="text-xl font-bold">{stats.posts}</p><p className="text-xs text-muted-foreground">gönderi</p></div>
                <div><p className="text-xl font-bold">{stats.followers}</p><p className="text-xs text-muted-foreground">takipçi</p></div>
                <div><p className="text-xl font-bold">{stats.following}</p><p className="text-xs text-muted-foreground">takip</p></div>
              </div>
            </div>
            <div className="mb-4">
              <p className="font-bold">{userProfile?.name}</p>
              {userProfile?.bio && (<p className="text-sm mt-1">{userProfile.bio}</p>)}
              {userProfile?.style && (<div className="flex items-center gap-2 mt-2"><Shirt className="w-4 h-4 text-primary" /><span className="text-sm text-primary font-semibold">{userProfile.style}</span></div>)}
              {userProfile?.instagram && (<a href={`https://instagram.com/${userProfile.instagram}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mt-1"><Instagram className="w-4 h-4" />@{userProfile.instagram}</a>)}
            </div>
            <div className="flex gap-2">
              <Link href="/profile/edit" className="flex-1 px-4 py-2 glass border border-border rounded-lg font-semibold text-center text-sm hover:bg-secondary transition-colors">Profili düzenle</Link>
              <button onClick={handleShare} className="flex-1 px-4 py-2 glass border border-border rounded-lg font-semibold text-center text-sm hover:bg-secondary transition-colors">Profili paylaş</button>
            </div>
          </div>
          <div className="border-t border-border">
            <div className="flex">
              <button onClick={() => setActiveTab('posts')} className={`flex-1 py-3 flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'posts' ? 'border-primary' : 'border-transparent'}`}><Grid3x3 className="w-5 h-5" /></button>
              <button onClick={() => setActiveTab('saved')} className={`flex-1 py-3 flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'saved' ? 'border-primary' : 'border-transparent'}`}><Bookmark className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="mt-4">
            {activeTab === 'posts' && userPosts.length === 0 && (<div className="text-center py-20"><div className="text-6xl mb-4">📷</div><h3 className="text-xl font-bold mb-2">Henüz gönderi yok</h3><p className="text-sm text-muted-foreground">İlk gönderini paylaş!</p></div>)}
            {activeTab === 'posts' && userPosts.length > 0 && (<div className="grid grid-cols-3 gap-1">{userPosts.map((post) => (<div key={post.id} onClick={() => handlePostClick(post)} className="aspect-square bg-gradient-to-br from-primary/5 to-primary/10 cursor-pointer group relative"><img src={post.image_url} alt={post.caption} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4"><div className="flex items-center gap-1 text-white"><Heart className="w-5 h-5" fill="white" /><span className="font-bold text-sm">{post.likes_count}</span></div><div className="flex items-center gap-1 text-white"><MessageCircle className="w-5 h-5" fill="white" /><span className="font-bold text-sm">{post.comments_count}</span></div></div></div>))}</div>)}
            {activeTab === 'saved' && savedOutfits.length === 0 && (<div className="text-center py-20"><div className="text-6xl mb-4">💾</div><h3 className="text-xl font-bold mb-2">Henüz kayıtlı kombin yok</h3><p className="text-sm text-muted-foreground mb-4">AI kombin oluştur ve kaydet!</p><Link href="/" className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity">Kombin Oluştur</Link></div>)}
            {activeTab === 'saved' && savedOutfits.length > 0 && (<div className="grid grid-cols-2 gap-4">{savedOutfits.map((outfit) => (<div key={outfit.id} className="glass border border-border rounded-xl overflow-hidden"><div className="aspect-square bg-primary/5 p-2 flex flex-col gap-1">{outfit.clothes?.slice(0, 2).map((item) => (<div key={item.id} className="flex-1 bg-white rounded-lg p-1 flex items-center justify-center"><img src={item.image_url} alt={item.name} className="w-full h-full object-contain" /></div>))}</div><div className="p-3"><p className="font-bold text-sm truncate">{outfit.name}</p><div className="flex items-center gap-2 mt-2"><span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">{outfit.season}</span><span className="text-xs font-bold text-primary">{outfit.color_harmony_score}/100</span></div></div></div>))}</div>)}
          </div>
        </div>
      </section>
      <AnimatePresence>{showMenu && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowMenu(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}><motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md glass border-t border-border rounded-t-3xl p-6 space-y-2"><div className="w-12 h-1 bg-border rounded-full mx-auto mb-4" /><button onClick={() => { router.push('/saved'); setShowMenu(false) }} className="w-full px-4 py-3 glass border border-border rounded-xl hover:border-primary transition-colors flex items-center gap-3"><Bookmark className="w-5 h-5" /><span className="font-semibold">Kaydedilenler</span></button><button onClick={() => { router.push('/notifications'); setShowMenu(false) }} className="w-full px-4 py-3 glass border border-border rounded-xl hover:border-primary transition-colors flex items-center gap-3"><Bell className="w-5 h-5" /><span className="font-semibold">Bildirimler</span></button><button onClick={() => { router.push('/profile/edit'); setShowMenu(false) }} className="w-full px-4 py-3 glass border border-border rounded-xl hover:border-primary transition-colors flex items-center gap-3"><Settings className="w-5 h-5" /><span className="font-semibold">Profili Düzenle</span></button><button onClick={() => signOut()} className="w-full px-4 py-3 glass border border-red-500 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-colors flex items-center gap-3"><LogOut className="w-5 h-5" /><span className="font-semibold">Çıkış Yap</span></button><button onClick={() => setShowMenu(false)} className="w-full px-4 py-3 glass border border-border rounded-xl hover:border-primary transition-colors flex items-center justify-center gap-3"><X className="w-5 h-5" /><span className="font-semibold">İptal</span></button></motion.div></motion.div>)}</AnimatePresence>
      <PostDetailModal post={selectedPost} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onLikeToggle={handleLikeToggle} onDelete={deletePost} />
    </div>
  )
}