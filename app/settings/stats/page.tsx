"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ChevronLeft, TrendingUp, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function StatsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id
  const [stats, setStats] = useState({ views: 0, interactions: 0, newFollowers: 0, posts: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) loadStats()
  }, [userId])

  const loadStats = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const { data: postsData } = await supabase.from('posts').select('id, likes_count, comments_count').eq('user_id', userId).gte('created_at', thirtyDaysAgo.toISOString())
      const totalPosts = postsData?.length || 0
      const totalInteractions = (postsData || []).reduce((sum, p) => sum + (p.likes_count || 0) + (p.comments_count || 0), 0)
      const { data: followersData } = await supabase.from('follows').select('id').eq('following_id', userId).gte('created_at', thirtyDaysAgo.toISOString())
      const newFollowers = followersData?.length || 0
      setStats({ views: totalInteractions * 5, interactions: totalInteractions, newFollowers, posts: totalPosts })
    } catch (error) {
      console.error('Load stats error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)
  const endDate = new Date()

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 hover:bg-secondary rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
        <h1 className="text-xl font-bold">İstatistikler</h1>
        <div className="w-10" />
      </div>
      <div className="p-4">
        <p className="text-sm text-muted-foreground mb-4 text-right">{startDate.getDate()} {startDate.toLocaleDateString('tr-TR', { month: 'short' })} - {endDate.getDate()} {endDate.toLocaleDateString('tr-TR', { month: 'short' })}</p>
        <div className="space-y-3">
          <button className="w-full px-4 py-4 glass border border-border rounded-xl hover:border-primary transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">Görüntülemeler</span>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-bold">{stats.views}</span>
              </div>
            </div>
          </button>
          <button className="w-full px-4 py-4 glass border border-border rounded-xl hover:border-primary transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">Etkileşimler</span>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-bold">{stats.interactions}</span>
              </div>
            </div>
          </button>
          <button className="w-full px-4 py-4 glass border border-border rounded-xl hover:border-primary transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">Yeni takipçiler</span>
              <span className="text-2xl font-bold">{stats.newFollowers}</span>
            </div>
          </button>
          <button className="w-full px-4 py-4 glass border border-border rounded-xl hover:border-primary transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">Paylaştığın içerikler</span>
              <span className="text-2xl font-bold">{stats.posts}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}