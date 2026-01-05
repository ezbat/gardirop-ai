"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, MessageCircle, UserPlus, UserMinus, Grid3x3, Loader2 } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import { supabase } from "@/lib/supabase"

interface User {
  id: string
  name: string
  username: string
  email: string
  avatar_url: string | null
  bio: string | null
}

interface Post {
  id: string
  caption: string
  image_url: string | null
  created_at: string
  likes_count: number
  comments_count: number
}

export default function UserProfilePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  
  const currentUserId = session?.user?.id
  const targetUserId = params.userId as string

  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isFollowingUser, setIsFollowingUser] = useState(false)
  const [loading, setLoading] = useState(true)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)

  useEffect(() => {
    if (targetUserId) {
      loadUserData()
    }
  }, [targetUserId, currentUserId])

  const loadUserData = async () => {
    setLoading(true)
    try {
      // Get user info
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, username, email, avatar_url, bio')
        .eq('id', targetUserId)
        .single()

      if (userError || !userData) {
        console.error('User not found:', userError)
        router.push('/social')
        return
      }
      setUser(userData)

      // Get user posts with counts
 // Get user posts
const { data: postsData, error: postsError } = await supabase
  .from('posts')
  .select('id, caption, image_url, created_at')
  .eq('user_id', targetUserId)
  .order('created_at', { ascending: false })
     if (!postsError && postsData) {
  // Her post için like ve comment sayısını ayrı çek
  const formattedPosts = await Promise.all(
    postsData.map(async (post: any) => {
      // Likes count
      const { count: likesCount } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id)

      // Comments count
      const { count: commentsCount } = await supabase
        .from('post_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id)

   return {
  id: post.id,
  caption: post.caption,
  image_url: post.image_url,
  created_at: post.created_at,
  likes_count: likesCount || 0,
  comments_count: commentsCount || 0
}
    })
  )
  setPosts(formattedPosts)
}
      // Get followers count
      const { count: followersCountData } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetUserId)

      setFollowersCount(followersCountData || 0)

      // Get following count
      const { count: followingCountData } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetUserId)

      setFollowingCount(followingCountData || 0)

      // Check if current user is following
      if (currentUserId && currentUserId !== targetUserId) {
        const { data: followData } = await supabase
  .from('follows')
  .select('id')
  .eq('follower_id', currentUserId)
  .eq('following_id', targetUserId)
  .maybeSingle()

setIsFollowingUser(!!followData)
      }
    } catch (error) {
      console.error("Failed to load user:", error)
    }
    setLoading(false)
  }

  const handleFollow = async () => {
    if (!currentUserId) return
    
    try {
      if (isFollowingUser) {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', targetUserId)
        
        setIsFollowingUser(false)
        setFollowersCount(prev => prev - 1)
      } else {
        // Follow
        await supabase
          .from('follows')
          .insert({
            follower_id: currentUserId,
            following_id: targetUserId
          })
        
        setIsFollowingUser(true)
        setFollowersCount(prev => prev + 1)
      }
    } catch (error) {
      console.error("Failed to follow/unfollow:", error)
    }
  }

  const handleMessage = () => {
    router.push(`/messages?to=${targetUserId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Kullanıcı bulunamadı</p>
      </div>
    )
  }

  const isOwnProfile = currentUserId === targetUserId

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />

      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => router.back()}
            className="flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Geri
          </motion.button>

          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-8 border border-border mb-8"
          >
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-4 border-primary/20">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-6xl">👤</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2">{user.name}</h1>
                <p className="text-sm text-muted-foreground mb-2">@{user.username}</p>
                {user.bio && (
                  <p className="text-muted-foreground mb-4">{user.bio}</p>
                )}

                {/* Stats */}
                <div className="flex justify-center md:justify-start gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{posts.length}</div>
                    <div className="text-xs text-muted-foreground">Gönderi</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{followersCount}</div>
                    <div className="text-xs text-muted-foreground">Takipçi</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{followingCount}</div>
                    <div className="text-xs text-muted-foreground">Takip</div>
                  </div>
                </div>

                {/* Action Buttons */}
                {!isOwnProfile && (
                  <div className="flex gap-3 justify-center md:justify-start">
                    <button
                      onClick={handleFollow}
                      className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 ${
                        isFollowingUser 
                          ? "glass border border-border hover:border-primary" 
                          : "bg-primary text-primary-foreground hover:opacity-90"
                      }`}
                    >
                      {isFollowingUser ? (
                        <>
                          <UserMinus className="w-4 h-4" />
                          Takipten Çık
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          Takip Et
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleMessage}
                      className="px-6 py-3 rounded-xl font-semibold flex items-center gap-2 glass border border-border hover:border-primary"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Mesaj
                    </button>
                  </div>
                )}

                {isOwnProfile && (
                  <button
                    onClick={() => router.push("/profile")}
                    className="px-6 py-3 rounded-xl font-semibold glass border border-border hover:border-primary"
                  >
                    Profili Düzenle
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Posts Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Grid3x3 className="w-6 h-6" />
              Gönderiler
            </h2>

            {posts.length === 0 ? (
              <div className="text-center py-20 glass rounded-2xl">
                <Grid3x3 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Henüz gönderi yok</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {posts.map(post => (
                  <motion.button
                    key={post.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => router.push("/social")}
                    className="aspect-square rounded-xl overflow-hidden relative group"
                  >
                    {post.image_url ? (
                      <img src={post.image_url} alt="Post" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
                        <span className="text-6xl">👔</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-sm font-semibold">
                      <span>❤️ {post.likes_count}</span>
                      <span>💬 {post.comments_count}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  )
}