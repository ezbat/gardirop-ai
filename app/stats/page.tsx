"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { BarChart3, PieChart, TrendingUp, Award, Sparkles, Heart } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import { useLanguage } from '@/lib/language-context'
import { 
  getAllClothes, 
  getAllSocialPosts,
  type ClothingItem,
  type SocialPost 
} from "@/lib/storage"

export default function StatsPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const { t } = useLanguage()

  const [loading, setLoading] = useState(true)
  const [clothes, setClothes] = useState<ClothingItem[]>([])
  const [posts, setPosts] = useState<SocialPost[]>([])

  useEffect(() => {
    if (userId) {
      loadData()
    }
  }, [userId])

  const loadData = async () => {
    if (!userId) return
    
    setLoading(true)
    try {
      const [clothesData, postsData] = await Promise.all([
        getAllClothes(userId),
        getAllSocialPosts()
      ])
      
      setClothes(clothesData)
      setPosts(postsData.filter(p => p.userId === userId))
    } catch (error) {
      console.error("Failed to load data:", error)
    }
    setLoading(false)
  }

  const colorStats = clothes.reduce((acc, item) => {
    acc[item.color] = (acc[item.color] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const topColors = Object.entries(colorStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const styleStats = clothes.reduce((acc, item) => {
    acc[item.style] = (acc[item.style] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const topStyles = Object.entries(styleStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const categoryStats = clothes.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0)
  const totalComments = posts.reduce((sum, p) => sum + p.comments.length, 0)
  const topPost = posts.sort((a, b) => b.likes - a.likes)[0]

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

      <section className="relative pt-8 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">
              <span className="text-foreground">{t('myStats')} </span>
            </h1>
            <p className="text-muted-foreground">{t('overview')}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <div className="p-6 rounded-2xl glass border border-primary/20 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl font-bold text-primary mb-1">{clothes.length}</div>
              <div className="text-sm text-muted-foreground">{t('totalOutfits')}</div>
            </div>

            <div className="p-6 rounded-2xl glass border border-primary/20 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl font-bold text-primary mb-1">{posts.length}</div>
              <div className="text-sm text-muted-foreground">{t('posts')}</div>
            </div>

            <div className="p-6 rounded-2xl glass border border-primary/20 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl font-bold text-primary mb-1">{totalLikes}</div>
              <div className="text-sm text-muted-foreground">{t('totalLikes')}</div>
            </div>

            <div className="p-6 rounded-2xl glass border border-primary/20 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                <Award className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl font-bold text-primary mb-1">{totalComments}</div>
              <div className="text-sm text-muted-foreground">{t('comments')}</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="p-6 rounded-2xl glass border border-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <PieChart className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">{t('filterByColor')}</h2>
              </div>

              {topColors.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t('noClothes')}</p>
              ) : (
                <div className="space-y-4">
                  {topColors.map(([color, count], index) => {
                    const percentage = (count / clothes.length) * 100
                    return (
                      <div key={color}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{color}</span>
                          <span className="text-sm text-muted-foreground">
                            {count} ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="h-3 bg-secondary/20 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1, delay: index * 0.1 }}
                            className="h-full bg-gradient-to-r from-primary to-primary/60"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid md:grid-cols-2 gap-6 mb-8"
          >
            <div className="p-6 rounded-2xl glass border border-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold">{t('filterByStyle')}</h2>
              </div>

              {topStyles.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t('noClothes')}</p>
              ) : (
                <div className="space-y-3">
                  {topStyles.map(([style, count]) => (
                    <div 
                      key={style}
                      className="flex items-center justify-between p-3 rounded-xl bg-secondary/10"
                    >
                      <span className="font-medium capitalize">{style}</span>
                      <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-bold">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 rounded-2xl glass border border-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold">{t('category')}</h2>
              </div>

              {Object.keys(categoryStats).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t('noClothes')}</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(categoryStats)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, count]) => (
                      <div 
                        key={category}
                        className="flex items-center justify-between p-3 rounded-xl bg-secondary/10"
                      >
                        <span className="font-medium capitalize">{category}</span>
                        <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-bold">
                          {count}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </motion.div>

          {topPost && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-6 rounded-2xl glass border border-border"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Award className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold">{t('popularOutfit')}</h2>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5">
                <div className="text-5xl">🏆</div>
                <div className="flex-1">
                  <p className="text-lg font-medium mb-2">{topPost.caption}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {topPost.likes} {t('likes')}
                    </span>
                    <span>•</span>
                    <span>{topPost.comments.length} {t('comments')}</span>
                    <span>•</span>
                    <span>{new Date(topPost.createdAt).toLocaleDateString("tr-TR")}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30"
          >
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold">{t('aiSuggestion')}</h2>
            </div>
            <div className="space-y-3">
              {clothes.length < 5 && (
                <div className="p-3 rounded-xl bg-white/50 dark:bg-black/20">
                  <p className="text-sm">💡 <strong>{t('tryAgain')}:</strong> {t('addClothing')}</p>
                </div>
              )}
              {topColors.length > 0 && topColors[0][1] > clothes.length * 0.5 && (
                <div className="p-3 rounded-xl bg-white/50 dark:bg-black/20">
                  <p className="text-sm">🎨 <strong>{t('filterByColor')}:</strong> {topColors[0][0]}</p>
                </div>
              )}
              {posts.length < 3 && (
                <div className="p-3 rounded-xl bg-white/50 dark:bg-black/20">
                  <p className="text-sm">📸 <strong>{t('share')}:</strong> {t('shareOutfit')}</p>
                </div>
              )}
              {clothes.length >= 10 && (
                <div className="p-3 rounded-xl bg-white/50 dark:bg-black/20">
                  <p className="text-sm">🎉 <strong>{t('success')}!</strong> {t('exclusiveOutfit')}</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}