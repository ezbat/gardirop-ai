"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronDown, MoreHorizontal, Clock, Calendar, MapPin, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function ArchivePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id
  const [archivedPosts, setArchivedPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) loadArchivedPosts()
  }, [userId])

  const loadArchivedPosts = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data, error } = await supabase.from('posts').select('*').eq('user_id', userId).eq('is_archived', true).order('created_at', { ascending: false })
      if (error) throw error
      setArchivedPosts(data || [])
    } catch (error) {
      console.error('Load archived posts error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 hover:bg-secondary rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
        <button className="flex items-center gap-2 px-3 py-2 hover:bg-secondary rounded-lg">
          <span className="font-bold">Hikaye arşivi</span>
          <ChevronDown className="w-5 h-5" />
        </button>
        <button className="p-2 hover:bg-secondary rounded-lg"><MoreHorizontal className="w-6 h-6" /></button>
      </div>
      <div className="flex border-b border-border">
        <button className="flex-1 py-3 flex items-center justify-center gap-2 border-b-2 border-primary">
          <Clock className="w-5 h-5" />
        </button>
        <button className="flex-1 py-3 flex items-center justify-center gap-2 border-b-2 border-transparent">
          <Calendar className="w-5 h-5" />
        </button>
        <button className="flex-1 py-3 flex items-center justify-center gap-2 border-b-2 border-transparent">
          <MapPin className="w-5 h-5" />
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : archivedPosts.length === 0 ? (
        <div className="text-center py-20 px-4">
          <div className="w-32 h-32 rounded-full border-4 border-foreground mx-auto mb-6 flex items-center justify-center">
            <Clock className="w-16 h-16" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Hikayene Ekle</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">Hikayeler 24 saat sonra arşivine kaydedilir. Herkese açık olarak paylaştığın hikayeleri Meta'da yapay zekanı geliştirmek için kullanılacaktır. Daha fazla bilgi al</p>
          <button className="text-primary font-semibold">Arşiv ayarlarını yönet</button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 p-1">
          {archivedPosts.map((post) => (
            <div key={post.id} className="aspect-square bg-gradient-to-br from-primary/5 to-primary/10">
              <img src={post.image_url} alt={post.caption} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}