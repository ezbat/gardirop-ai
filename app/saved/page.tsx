"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Bookmark, Heart, MessageCircle, Loader2 } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import PostDetailModal from "@/components/post-detail-modal"
import { supabase } from "@/lib/supabase"

interface Post {
  id: string
  user_id: string
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

export default function SavedPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    if (!session) {
      router.push('/api/auth/signin')
      return
    }
    if (userId) {
      loadSavedPosts()
    }
  }, [userId, session, router])

  const loadSavedPosts = async () => {
    if (!userId) return

    setLoading(true)
    try {
      // Bookmarks'ları çek
      const { data: bookmarksData, error: bookmarksError } = await supabase
        .from('bookmarks')
        .select('post_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (bookmarksError) throw bookmarksError

      if (!bookmarksData || bookmarksData.length === 0) {
        setPosts([])
        setLoading(false)
        return
      }

      const postIds = bookmarksData.map(b => b.post_id)

      // Post'ları çek
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .in('id', postIds)

      if (postsError) throw postsError

      // User bilgilerini ekle
      const postsWithUsers = await Promise.all(
        (postsData || []).map(async (post) => {
          const { data: userData } = await supabase
            .from('users')
            .select('id, name, avatar_url')
            .eq('id', post.user_id)
            .single()

          const { data: likeData } = await supabase
            .from('likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', userId)
            .single()

          return {
            ...post,
            user: userData || { id: post.user_id, name: 'Unknown', avatar_url: null },
            liked_by_user: !!likeData,
            bookmarked_by_user: true // Zaten saved page'de olduğu için true
          }
        })
      )

      setPosts(postsWithUsers)
    } catch (error) {
      console.error('Load saved posts error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePostClick = (post: Post) => {
    setSelectedPost(post)
    setIsModalOpen(true)
  }

  const handleLikeToggle = (postId: string, liked: boolean) => {
    setPosts(prev =>
      prev.map(post =>
        post.id === postId
          ? {
              ...post,
              likes_count: liked ? post.likes_count + 1 : post.likes_count - 1,
              liked_by_user: liked
            }
          : post
      )
    )
  }

  const removeBookmark = async (postId: string) => {
    if (!userId) return

    try {
      const response = await fetch('/api/bookmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          postId,
          action: 'remove'
        })
      })

      if (!response.ok) throw new Error('Remove bookmark failed')

      // Post'u listeden kaldır
      setPosts(prev => prev.filter(post => post.id !== postId))
    } catch (error) {
      console.error('Remove bookmark error:', error)
      alert('Kaldırma başarısız!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />

      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="font-serif text-4xl font-bold mb-2 flex items-center gap-3">
              <Bookmark className="w-10 h-10 text-primary" />
              Kaydedilenler
            </h1>
            <p className="text-muted-foreground">
              Beğendiğin gönderileri burada bulabilirsin
            </p>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-20 glass border border-border rounded-2xl">
              <div className="text-9xl mb-6">🔖</div>
              <h3 className="text-2xl font-bold mb-3">Henüz kayıtlı gönderi yok</h3>
              <p className="text-muted-foreground mb-6">
                Beğendiğin gönderileri kaydet, daha sonra buradan erişebilirsin
              </p>
              <button
                onClick={() => router.push('/explore')}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Keşfet Sayfasına Git
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {posts.map((post, idx) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="glass border border-border rounded-xl overflow-hidden group cursor-pointer"
                  onClick={() => handlePostClick(post)}
                >
                  <div className="aspect-square bg-gradient-to-br from-primary/5 to-primary/10 relative">
                    <img
                      src={post.image_url}
                      alt={post.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                      <div className="flex items-center gap-2 text-white">
                        <Heart className="w-6 h-6" fill="white" />
                        <span className="font-bold">{post.likes_count}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white">
                        <MessageCircle className="w-6 h-6" fill="white" />
                        <span className="font-bold">{post.comments_count}</span>
                      </div>
                    </div>

                    {/* Remove Bookmark Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeBookmark(post.id)
                      }}
                      className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
                      title="Kayıtlılardan kaldır"
                    >
                      <Bookmark className="w-5 h-5" fill="white" />
                    </button>
                  </div>

                  <div className="p-3 border-t border-border">
                    <p className="text-sm font-semibold truncate">
                      {post.user?.name || 'Unknown'}
                    </p>
                    {post.caption && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {post.caption}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* POST DETAIL MODAL */}
      <PostDetailModal
        post={selectedPost}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLikeToggle={handleLikeToggle}
      />
    </div>
  )
}