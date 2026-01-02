"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Heart, Bookmark, MessageCircle, Star } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import { useLanguage } from '@/lib/language-context'
import {
  type SocialPost,
  type Outfit,
  getAllSocialPosts,
  getFavoriteOutfits,
} from "@/lib/storage"

type TabType = "saved" | "liked" | "favorites" | "comments"

export default function ArchivePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id
  const { t } = useLanguage()

  const [activeTab, setActiveTab] = useState<TabType>("saved")
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [savedPosts, setSavedPosts] = useState<SocialPost[]>([])
  const [likedPosts, setLikedPosts] = useState<SocialPost[]>([])
  const [commentedPosts, setCommentedPosts] = useState<SocialPost[]>([])
  const [favoriteOutfits, setFavoriteOutfits] = useState<Outfit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      loadData()
    }
  }, [userId])

  const loadData = async () => {
    if (!userId) return
    
    setLoading(true)
    try {
      const [postsData, favOutfits] = await Promise.all([
        getAllSocialPosts(),
        getFavoriteOutfits(userId)
      ])
      
      setPosts(postsData)
      setFavoriteOutfits(favOutfits)

      const saved = localStorage.getItem(`saved-posts-${userId}`)
      if (saved) {
        const savedIds = JSON.parse(saved) as string[]
        setSavedPosts(postsData.filter(p => savedIds.includes(p.id)))
      }

      const liked = postsData.filter(p => p.likedBy.includes(userId))
      setLikedPosts(liked)

      const commented = postsData.filter(p => 
        p.comments.some(c => c.userId === userId)
      )
      setCommentedPosts(commented)

    } catch (error) {
      console.error("Failed to load data:", error)
    }
    setLoading(false)
  }

  const tabs = [
    { id: "saved" as TabType, label: t('bookmarked'), icon: Bookmark, count: savedPosts.length },
    { id: "liked" as TabType, label: t('liked'), icon: Heart, count: likedPosts.length },
    { id: "favorites" as TabType, label: t('favorites'), icon: Star, count: favoriteOutfits.length },
    { id: "comments" as TabType, label: t('myComments'), icon: MessageCircle, count: commentedPosts.length },
  ]

  const getCurrentPosts = () => {
    if (activeTab === "saved") return savedPosts
    if (activeTab === "liked") return likedPosts
    if (activeTab === "comments") return commentedPosts
    return []
  }

  const currentPosts = getCurrentPosts()

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
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">
              <span className="text-foreground">{t('myArchive')} </span>
            </h1>
            <p className="text-muted-foreground">{t('saved')}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="border-b border-border mb-8"
          >
            <div className="flex justify-around overflow-x-auto">
              {tabs.map(tab => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-col items-center gap-2 py-4 px-6 border-b-2 transition-all min-w-fit ${
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${isActive ? "fill-current" : ""}`} />
                    <span className="font-semibold text-sm">{tab.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">
                      {tab.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </motion.div>

          <div>
            {activeTab !== "favorites" ? (
              <div>
                {currentPosts.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-20"
                  >
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                      {activeTab === "saved" && <Bookmark className="w-12 h-12 text-primary" />}
                      {activeTab === "liked" && <Heart className="w-12 h-12 text-primary" />}
                      {activeTab === "comments" && <MessageCircle className="w-12 h-12 text-primary" />}
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      {activeTab === "saved" && t('noBookmarks')}
                      {activeTab === "liked" && t('noLikes')}
                      {activeTab === "comments" && t('myComments')}
                    </h3>
                    <p className="text-muted-foreground mb-6">{t('explore')}</p>
                    <button
                      onClick={() => router.push("/explore")}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
                    >
                      {t('explore')}
                    </button>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-3 gap-1">
                    {currentPosts.map((post, index) => (
                      <motion.button
                        key={post.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => router.push("/social")}
                        className="aspect-square bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg flex items-center justify-center text-6xl hover:opacity-80 transition-opacity relative group"
                      >
                        <span>👔</span>
                        
                        <div className="absolute top-2 right-2">
                          {activeTab === "saved" && <Bookmark className="w-5 h-5 fill-white text-white drop-shadow-lg" />}
                          {activeTab === "liked" && <Heart className="w-5 h-5 fill-red-500 text-red-500 drop-shadow-lg" />}
                          {activeTab === "comments" && <MessageCircle className="w-5 h-5 fill-blue-500 text-blue-500 drop-shadow-lg" />}
                        </div>

                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-sm">
                          <span className="flex items-center gap-1">
                            ❤️ {post.likes}
                          </span>
                          <span className="flex items-center gap-1">
                            💬 {post.comments.length}
                          </span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                {favoriteOutfits.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-20"
                  >
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                      <Star className="w-12 h-12 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{t('favorites')}</h3>
                    <p className="text-muted-foreground mb-6">{t('save')}</p>
                    <button
                      onClick={() => router.push("/")}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
                    >
                      {t('generateOutfit')}
                    </button>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-3 gap-1">
                    {favoriteOutfits.map((outfit, index) => (
                      <motion.button
                        key={outfit.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => router.push("/")}
                        className="aspect-square bg-gradient-to-br from-yellow-400/10 to-orange-400/10 rounded-lg flex items-center justify-center text-6xl hover:opacity-80 transition-opacity relative group"
                      >
                        <span>👔</span>
                        
                        <div className="absolute top-2 right-2">
                          <Star className="w-5 h-5 fill-yellow-500 text-yellow-500 drop-shadow-lg" />
                        </div>

                        {outfit.rating && (
                          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded-full text-white text-xs font-bold">
                            ⭐ {outfit.rating}
                          </div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}