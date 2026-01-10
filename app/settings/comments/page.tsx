"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function CommentsSettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id
  const [commentSettings, setCommentSettings] = useState<'everyone' | 'followers' | 'no_one'>('everyone')
  const [blockedCommentsCount, setBlockedCommentsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) loadSettings()
  }, [userId])

  const loadSettings = async () => {
    if (!userId) return
    try {
      const { data, error } = await supabase.from('users').select('comment_settings').eq('id', userId).single()
      if (error) throw error
      setCommentSettings(data?.comment_settings || 'everyone')
    } catch (error) {
      console.error('Load settings error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSettingChange = (setting: 'everyone' | 'followers' | 'no_one') => {
    router.push(`/settings/comments/who-can-comment?setting=${setting}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const getSettingLabel = () => {
    if (commentSettings === 'everyone') return 'Herkes'
    if (commentSettings === 'followers') return 'Takipçiler'
    return 'Kimse'
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-secondary rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
        <h1 className="text-xl font-bold">Yorumlar</h1>
      </div>
      <div className="p-4 space-y-6">
        <div>
          <button onClick={() => handleSettingChange(commentSettings)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
            <div className="text-left">
              <p className="font-bold">Şu kişilerin yorumlarını engelle:</p>
              <p className="text-sm text-muted-foreground mt-1">Engellediğin kişilerin yeni yorumlarını sadece kendisi görebilir. Bu ayarlar reklamların için geçerli değildir.</p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm text-muted-foreground">{blockedCommentsCount} Kişi</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </button>
        </div>
        <div>
          <p className="text-sm font-bold mb-3 px-4">Kimler yorum yapabilir?</p>
          <div className="space-y-1">
            <button onClick={() => handleSettingChange('everyone')} className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
              <span>Gönderiler ve Reels videoları</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{getSettingLabel()}</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </button>
            <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
              <span>Hikayeler</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
        <div>
          <p className="text-sm font-bold mb-3 px-4">Yorum türleri</p>
          <div className="space-y-1">
            <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
              <div className="text-left">
                <p className="font-bold">İstenmeyen yorumları gizle</p>
                <p className="text-sm text-muted-foreground mt-1">Instagram, rahatsız edici veya spam olabilecek yorumları otomatik olarak yorumlarınızın alt kısmındaki gizli yorumlar bölümüne taşır.</p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <span className="text-sm text-muted-foreground">Çok</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground inline ml-2" />
              </div>
            </button>
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex-1">
                <p className="font-bold">GIF içerikli yorumlara izin ver</p>
                <p className="text-sm text-muted-foreground mt-1">İnsanlar senin gönderilerine ve Reels videolarına GIF içeren yorumlar yapabilecek.</p>
              </div>
              <button className="ml-4 w-12 h-6 rounded-full bg-primary">
                <div className="w-5 h-5 rounded-full bg-white translate-x-6 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}