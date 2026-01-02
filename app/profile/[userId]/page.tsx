"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, MessageCircle, UserPlus, UserMinus, Grid3x3 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import FloatingParticles from "@/components/floating-particles"
import { useLanguage } from '@/lib/language-context'
import {
  type User,
  type SocialPost,
  type Story,
  getUser,
  getAllSocialPosts,
  getUserStories,
  followUser,
  unfollowUser,
  isFollowing,
} from "@/lib/storage"
import LuxuryButton from "@/components/luxury-button"

export default function UserProfilePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const { t } = useLanguage()
  
  const currentUserId = session?.user?.id
  const targetUserId = params.userId as string

  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [isFollowingUser, setIsFollowingUser] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (targetUserId) {
      loadUserData()
    }
  }, [targetUserId, currentUserId])

  const loadUserData = async () => {
    setLoading(true)
    try {
      const userData = await getUser(targetUserId)
      if (!userData) {
        router.push("/stories")
        return
      }
      setUser(userData)

      const allPosts = await getAllSocialPosts()
      setPosts(allPosts.filter(p => p.userId === targetUserId))

      const userStories = await getUserStories(targetUserId)
      setStories(userStories)

      if (currentUserId) {
        const following = await isFollowing(currentUserId, targetUserId)
        setIsFollowingUser(following)
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
        await unfollowUser(currentUserId, targetUserId)
      } else {
        await followUser(currentUserId, targetUserId)
      }
      setIsFollowingUser(!isFollowingUser)
      await loadUserData()
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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent"
        />
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
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-primary/20">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-4xl">
                    {user.name[0]}
                  </AvatarFallback>
                </Avatar>
                {stories.length > 0 && (
                  <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
                    {stories.length} 📸
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2">{user.name}</h1>
                <p className="text-sm text-muted-foreground mb-4">{user.email}</p>

                {/* Stats */}
                <div className="flex justify-center md:justify-start gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{posts.length}</div>
                    <div className="text-xs text-muted-foreground">{t('posts')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{user.followers.length}</div>
                    <div className="text-xs text-muted-foreground">{t('followers')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{user.following.length}</div>
                    <div className="text-xs text-muted-foreground">{t('following')}</div>
                  </div>
                </div>

                {/* Action Buttons */}
                {!isOwnProfile && (
                  <div className="flex gap-3 justify-center md:justify-start">
                    <LuxuryButton
                      onClick={handleFollow}
                      variant={isFollowingUser ? "outline" : "default"}
                      className="gap-2"
                    >
                      {isFollowingUser ? (
                        <>
                          <UserMinus className="w-4 h-4" />
                          Takiptesin
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          Takip Et
                        </>
                      )}
                    </LuxuryButton>

                    <LuxuryButton
                      onClick={handleMessage}
                      variant="outline"
                      className="gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Mesaj Gönder
                    </LuxuryButton>
                  </div>
                )}

                {isOwnProfile && (
                  <LuxuryButton
                    onClick={() => router.push("/profile")}
                    variant="outline"
                  >
                    Profilimi Düzenle
                  </LuxuryButton>
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
              Kombinler
            </h2>

            {posts.length === 0 ? (
              <div className="text-center py-20 glass rounded-2xl">
                <Grid3x3 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Henüz paylaşım yok</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {posts.map(post => (
                  <button
                    key={post.id}
                    onClick={() => router.push("/social")}
                    className="aspect-square bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl flex items-center justify-center text-6xl hover:opacity-80 transition-opacity relative group"
                  >
                    <span>👔</span>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-4 text-white">
                      <span className="text-sm">❤️ {post.likes}</span>
                      <span className="text-sm">💬 {post.comments.length}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  )
}