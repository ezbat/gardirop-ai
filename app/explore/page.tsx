"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Heart, MessageCircle, Share2, Bookmark, Plus } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import PostDetailModal from "@/components/post-detail-modal"
import PollCard from "@/components/poll-card"
import PollCreateModal from "@/components/poll-create-modal"
import { supabase } from "@/lib/supabase"
import { createNotification } from "@/lib/notifications"

interface Post {
  id: string
  user_id: string
  outfit_id: string | null
  caption: string
  image_url: string
  likes_count: number
  comments_count: number
  created_at: string
  user?: {
    id: string
    name: string
    avatar_url: string | null
  }
  liked_by_user?: boolean
  bookmarked_by_user?: boolean
}

export default function ExplorePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id
  const [activeTab, setActiveTab] = useState<'posts' | 'polls'>('posts')
  const [posts, setPosts] = useState<Post[]>([])
  const [polls, setPolls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    if (activeTab === 'posts') {
      loadPosts()
    } else {
      if (userId) loadPolls()
    }
  }, [userId, activeTab])

  const loadPosts = async () => {
    setLoading(true)
    try {
      const { data: postsData, error: postsError } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(50)
      if (postsError) throw postsError
      const postsWithUsers = await Promise.all((postsData || []).map(async (post) => {
        const { data: userData } = await supabase.from('users').select('id, name, avatar_url').eq('id', post.user_id).single()
        let liked_by_user = false
        let bookmarked_by_user = false
        if (userId) {
          const { data: likeData } = await supabase.from('likes').select('id').eq('post_id', post.id).eq('user_id', userId).single()
          liked_by_user = !!likeData
          const { data: bookmarkData } = await supabase.from('bookmarks').select('id').eq('post_id', post.id).eq('user_id', userId).single()
          bookmarked_by_user = !!bookmarkData
        }
        return { ...post, user: userData || { id: post.user_id, name: 'Unknown', avatar_url: null }, liked_by_user, bookmarked_by_user }
      }))
      setPosts(postsWithUsers)
    } catch (error) {
      console.error('Load posts error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPolls = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const response = await fetch('/api/polls/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      const data = await response.json()
      setPolls(data.polls || [])
    } catch (error) {
      console.error('Load polls error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePostClick = (post: Post) => {
    setSelectedPost(post)
    setIsModalOpen(true)
  }

  const handleLikeToggle = (postId: string, liked: boolean) => {
    setPosts(prev => prev.map(post => post.id === postId ? { ...post, likes_count: liked ? post.likes_count + 1 : post.likes_count - 1, liked_by_user: liked } : post))
  }

  const toggleLike = async (postId: string, postUserId: string, currentlyLiked: boolean) => {
    if (!userId) { alert('Beğenmek için giriş yapın!'); return }
    try {
      if (currentlyLiked) {
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId)
        setPosts(prev => prev.map(post => post.id === postId ? { ...post, likes_count: post.likes_count - 1, liked_by_user: false } : post))
      } else {
        await supabase.from('likes').insert({ post_id: postId, user_id: userId })
        setPosts(prev => prev.map(post => post.id === postId ? { ...post, likes_count: post.likes_count + 1, liked_by_user: true } : post))
        if (postUserId !== userId) await createNotification(postUserId, userId, 'like', 'gönderini beğendi')
      }
    } catch (error) {
      console.error('Toggle like error:', error)
    }
  }

  const toggleBookmark = async (postId: string, currentlyBookmarked: boolean) => {
    if (!userId) { alert('Kaydetmek için giriş yapın!'); return }
    try {
      const response = await fetch('/api/bookmark', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, postId, action: currentlyBookmarked ? 'remove' : 'add' }) })
      if (!response.ok) throw new Error('Bookmark failed')
      setPosts(prev => prev.map(post => post.id === postId ? { ...post, bookmarked_by_user: !currentlyBookmarked } : post))
    } catch (error) {
      console.error('Toggle bookmark error:', error)
      alert('Kaydetme başarısız!')
    }
  }

  const handleVote = async (pollId: string, optionId: string) => {
    try {
      const response = await fetch('/api/polls/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId, optionId, userId })
      })
      if (!response.ok) throw new Error('Vote failed')
      loadPolls()
    } catch (error) {
      console.error('Vote error:', error)
      alert('Oy verilemedi!')
    }
  }

  const handleComment = async (pollId: string, comment: string) => {
    try {
      const response = await fetch('/api/polls/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId, userId, comment })
      })
      if (!response.ok) throw new Error('Comment failed')
      loadPolls()
    } catch (error) {
      console.error('Comment error:', error)
      alert('Yorum eklenemedi!')
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
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="font-serif text-4xl font-bold mb-6 text-center">Keşfet</h1>
            <div className="flex border-b border-border">
              <button onClick={() => setActiveTab('posts')} className={`flex-1 py-3 font-semibold border-b-2 transition-colors ${activeTab === 'posts' ? 'border-primary text-primary' : 'border-transparent'}`}>
                Gönderiler
              </button>
              <button onClick={() => setActiveTab('polls')} className={`flex-1 py-3 font-semibold border-b-2 transition-colors ${activeTab === 'polls' ? 'border-primary text-primary' : 'border-transparent'}`}>
                Anketler
              </button>
            </div>
          </div>

          {activeTab === 'posts' && (
            <>
              {posts.length === 0 ? (
                <div className="text-center py-20 glass border border-border rounded-2xl">
                  <div className="text-9xl mb-6">🌟</div>
                  <h3 className="text-2xl font-bold mb-3">Henüz gönderi yok</h3>
                  <p className="text-muted-foreground">İlk gönderiyi sen paylaş!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {posts.map((post, idx) => (
                    <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="glass border border-border rounded-2xl overflow-hidden">
                      <div className="p-4 flex items-center gap-3">
                        <Link href={post.user_id === userId ? '/profile' : `/profile/${post.user_id}`} className="w-10 h-10 rounded-full overflow-hidden bg-primary hover:opacity-80 transition-opacity">
                          {post.user?.avatar_url ? (<img src={post.user.avatar_url} alt={post.user.name} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-white font-bold">{post.user?.name?.[0]?.toUpperCase() || 'U'}</div>)}
                        </Link>
                        <div className="flex-1">
                          <Link href={post.user_id === userId ? '/profile' : `/profile/${post.user_id}`} className="font-bold hover:underline">{post.user?.name || 'Unknown'}</Link>
                          <p className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</p>
                        </div>
                      </div>
                      <div onClick={() => handlePostClick(post)} className="aspect-square bg-gradient-to-br from-primary/5 to-primary/10 cursor-pointer hover:opacity-90 transition-opacity">
                        <img src={post.image_url} alt={post.caption} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-4 mb-3">
                          <button onClick={() => toggleLike(post.id, post.user_id, post.liked_by_user || false)} className="flex items-center gap-2 hover:text-red-500 transition-colors">
                            <Heart className="w-6 h-6" fill={post.liked_by_user ? "currentColor" : "none"} color={post.liked_by_user ? "#ef4444" : "currentColor"} />
                            <span className="font-semibold">{post.likes_count}</span>
                          </button>
                          <button onClick={() => handlePostClick(post)} className="flex items-center gap-2 hover:text-primary transition-colors">
                            <MessageCircle className="w-6 h-6" />
                            <span className="font-semibold">{post.comments_count}</span>
                          </button>
                          <button className="hover:text-primary transition-colors ml-auto"><Share2 className="w-6 h-6" /></button>
                          <button onClick={() => toggleBookmark(post.id, post.bookmarked_by_user || false)} className="hover:text-primary transition-colors">
                            <Bookmark className="w-6 h-6" fill={post.bookmarked_by_user ? "currentColor" : "none"} />
                          </button>
                        </div>
                        {post.caption && (
                          <p className="text-sm">
                            <Link href={post.user_id === userId ? '/profile' : `/profile/${post.user_id}`} className="font-bold mr-2 hover:underline">{post.user?.name}</Link>
                            {post.caption}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'polls' && (
            <>
              <button onClick={() => setShowCreateModal(true)} className="w-full mb-6 py-4 glass border-2 border-dashed border-border rounded-2xl hover:border-primary transition-colors flex items-center justify-center gap-2 font-semibold text-primary">
                <Plus className="w-5 h-5" />
                Anket Oluştur
              </button>

              {polls.length === 0 ? (
                <div className="text-center py-20 glass border border-border rounded-2xl">
                  <div className="text-9xl mb-6">🗳️</div>
                  <h3 className="text-2xl font-bold mb-3">Henüz anket yok</h3>
                  <p className="text-muted-foreground mb-6">İlk anketi sen oluştur!</p>
                  <button onClick={() => setShowCreateModal(true)} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity">
                    Anket Oluştur
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {polls.map((poll) => (
                    <PollCard key={poll.id} poll={poll} currentUserId={userId || ''} onVote={handleVote} onComment={handleComment} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <PostDetailModal post={selectedPost} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onLikeToggle={handleLikeToggle} />
      
      {userId && (
        <PollCreateModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} userId={userId} onSuccess={loadPolls} />
      )}
    </div>
  )
}