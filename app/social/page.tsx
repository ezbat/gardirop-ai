"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Users, TrendingUp, Heart } from "lucide-react"
import Link from "next/link"
import FloatingParticles from "@/components/floating-particles"
import FeedPost from "@/components/feed-post"
import {
  getFollowingPosts,
  likePost,
  addCommentToPost,
  generateId,
  type SocialPost
} from "@/lib/storage"

export default function SocialPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      loadPosts()
    }
  }, [userId])

  const loadPosts = async () => {
    if (!userId) return

    setLoading(true)
    try {
      const followingPosts = await getFollowingPosts(userId)
      setPosts(followingPosts)
    } catch (error) {
      console.error("Failed to load posts:", error)
    }
    setLoading(false)
  }

  const handleLike = async (postId: string) => {
    if (!userId) return

    try {
      await likePost(postId, userId)
      setPosts(posts.map(p => {
        if (p.id === postId) {
          const isLiked = p.likedBy.includes(userId)
          return {
            ...p,
            likes: isLiked ? p.likes - 1 : p.likes + 1,
            likedBy: isLiked 
              ? p.likedBy.filter(id => id !== userId)
              : [...p.likedBy, userId]
          }
        }
        return p
      }))
    } catch (error) {
      console.error("Failed to like post:", error)
    }
  }

  const handleComment = async (postId: string, comment: string) => {
    if (!userId || !session?.user) return

    try {
      const newComment = {
        id: generateId(),
        userId,
        userName: session.user.name || "User",
        userAvatar: session.user.image || "",
        content: comment,
        createdAt: Date.now()
      }

      await addCommentToPost(postId, newComment)

      setPosts(posts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments: [...p.comments, newComment]
          }
        }
        return p
      }))
    } catch (error) {
      console.error("Failed to add comment:", error)
    }
  }

  const handleSave = (postId: string) => {
    console.log("Save post:", postId)
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

      <section className="relative py-6 px-4">
        <div className="container mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="font-serif text-3xl font-bold mb-2">Sosyal</h1>
            <p className="text-muted-foreground">Kombinleri keşfet ve paylaş</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Link href="/explore" className="glass border border-border rounded-xl p-4 hover:border-primary transition-colors">
              <TrendingUp className="w-6 h-6 text-primary mb-2" />
              <p className="font-semibold text-2xl">234</p>
              <p className="text-xs text-muted-foreground">Popüler</p>
            </Link>

            <Link href="/messages" className="glass border border-border rounded-xl p-4 hover:border-primary transition-colors">
              <Users className="w-6 h-6 text-primary mb-2" />
              <p className="font-semibold text-2xl">12</p>
              <p className="text-xs text-muted-foreground">Takip</p>
            </Link>

            <Link href="/favorites" className="glass border border-border rounded-xl p-4 hover:border-primary transition-colors">
              <Heart className="w-6 h-6 text-primary mb-2" />
              <p className="font-semibold text-2xl">45</p>
              <p className="text-xs text-muted-foreground">Beğeni</p>
            </Link>
          </div>

          {/* Feed */}
          {posts.length === 0 ? (
            <div className="text-center py-20 glass border border-border rounded-2xl">
              <div className="text-9xl mb-6">👥</div>
              <h3 className="text-2xl font-bold mb-3">Henüz kimseyi takip etmiyorsun</h3>
              <p className="text-muted-foreground mb-6">
                İnsanları takip et ve kombinlerini gör!
              </p>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                <Users className="w-5 h-5" />
                Keşfet
              </Link>
            </div>
          ) : (
            <div>
              {posts.map((post) => (
                userId && (
                  <FeedPost
                    key={post.id}
                    post={post}
                    currentUserId={userId}
                    onLike={handleLike}
                    onComment={handleComment}
                    onSave={handleSave}
                  />
                )
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}