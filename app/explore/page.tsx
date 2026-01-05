"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import PostDetailModal from "@/components/post-detail-modal"
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
}

export default function ExplorePage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    loadPosts()
  }, [userId])

  const loadPosts = async () => {
    setLoading(true)
    try {
      // 1. Tüm public postları çek
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (postsError) throw postsError

      // 2. Her post için user bilgisini çek
      const postsWithUsers = await Promise.all(
        (postsData || []).map(async (post) => {
          const { data: userData } = await supabase
            .from('users')
            .select('id, name, avatar_url')
            .eq('id', post.user_id)
            .single()

          // 3. Kullanıcı bu postu beğenmiş mi?
          let liked_by_user = false
          if (userId) {
            const { data: likeData } = await supabase
              .from('likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', userId)
              .single()

            liked_by_user = !!likeData
          }

          return {
            ...post,
            user: userData || { id: post.user_id, name: 'Unknown', avatar_url: null },
            liked_by_user
          }
        })
      )

      setPosts(postsWithUsers)
      console.log('✅ Posts loaded:', postsWithUsers.length)
    } catch (error) {
      console.error('Load posts error:', error)
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

  const toggleLike = async (postId: string, postUserId: string, currentlyLiked: boolean) => {
    if (!userId) {
      alert('Beğenmek için giriş yapın!')
      return
    }

    try {
      if (currentlyLiked) {
        // Unlike
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId)

        setPosts(prev =>
          prev.map(post =>
            post.id === postId
              ? { ...post, likes_count: post.likes_count - 1, liked_by_user: false }
              : post
          )
        )
      } else {
        // Like
        await supabase
          .from('likes')
          .insert({ post_id: postId, user_id: userId })

        setPosts(prev =>
          prev.map(post =>
            post.id === postId
              ? { ...post, likes_count: post.likes_count + 1, liked_by_user: true }
              : post
          )
        )

        // Bildirim oluştur (kendi postunu beğenmiyorsa)
        if (postUserId !== userId) {
          await createNotification(
            postUserId,
            userId,
            'like',
            'gönderini beğendi'
          )
        }
      }
    } catch (error) {
      console.error('Toggle like error:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />

      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-2xl">
          <h1 className="font-serif text-4xl font-bold mb-8 text-center">Keşfet</h1>

          {posts.length === 0 ? (
            <div className="text-center py-20 glass border border-border rounded-2xl">
              <div className="text-9xl mb-6">🌟</div>
              <h3 className="text-2xl font-bold mb-3">Henüz gönderi yok</h3>
              <p className="text-muted-foreground">İlk gönderiyi sen paylaş!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post, idx) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass border border-border rounded-2xl overflow-hidden"
                >
                  {/* POST HEADER */}
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-primary">
                      {post.user?.avatar_url ? (
                        <img
                          src={post.user.avatar_url}
                          alt={post.user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold">
                          {post.user?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">{post.user?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* POST IMAGE - CLICKABLE */}
                  <div
                    onClick={() => handlePostClick(post)}
                    className="aspect-square bg-gradient-to-br from-primary/5 to-primary/10 cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={post.image_url}
                      alt={post.caption}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* POST ACTIONS */}
                  <div className="p-4">
                    <div className="flex items-center gap-4 mb-3">
                      <button
                        onClick={() => toggleLike(post.id, post.user_id, post.liked_by_user || false)}
                        className="flex items-center gap-2 hover:text-red-500 transition-colors"
                      >
                        <Heart
                          className="w-6 h-6"
                          fill={post.liked_by_user ? "currentColor" : "none"}
                          color={post.liked_by_user ? "#ef4444" : "currentColor"}
                        />
                        <span className="font-semibold">{post.likes_count}</span>
                      </button>

                      <button
                        onClick={() => handlePostClick(post)}
                        className="flex items-center gap-2 hover:text-primary transition-colors"
                      >
                        <MessageCircle className="w-6 h-6" />
                        <span className="font-semibold">{post.comments_count}</span>
                      </button>

                      <button className="hover:text-primary transition-colors ml-auto">
                        <Share2 className="w-6 h-6" />
                      </button>

                      <button className="hover:text-primary transition-colors">
                        <Bookmark className="w-6 h-6" />
                      </button>
                    </div>

                    {/* POST CAPTION */}
                    {post.caption && (
                      <p className="text-sm">
                        <span className="font-bold mr-2">{post.user?.name}</span>
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