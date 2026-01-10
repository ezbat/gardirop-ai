"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Heart, MessageCircle, Repeat, Tag, Smile, Star, Trash, Archive, Grid3x3, Video, Bookmark, Eye, EyeOff } from "lucide-react"

export default function ActivityPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-secondary rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
        <h1 className="text-xl font-bold">Hareketlerin</h1>
      </div>
      <div className="p-4 space-y-6">
        <div className="space-y-1">
          <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5" />
              <span>Beğenmeler</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5" />
              <span>Yorumlar</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <Repeat className="w-5 h-5" />
              <span>Yeniden Paylaşımlar</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <Tag className="w-5 h-5" />
              <span>Etiketler</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <Smile className="w-5 h-5" />
              <span>Çıkartma yanıtları</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5" />
              <span>Değerlendirmeler</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-semibold mb-3 px-4">Kaldırılan ve arşivlenen içerikler</p>
          <div className="space-y-1">
            <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                <Trash className="w-5 h-5" />
                <span>Yakınlarda silinenler</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <button onClick={() => router.push('/settings/archive')} className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                <Archive className="w-5 h-5" />
                <span>Arşivlenenler</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-semibold mb-3 px-4">Paylaştığın içerikler</p>
          <div className="space-y-1">
            <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                <Grid3x3 className="w-5 h-5" />
                <span>Gönderiler</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                <Video className="w-5 h-5" />
                <span>Reels</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                <Bookmark className="w-5 h-5" />
                <span>Öne Çıkanlar</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-semibold mb-3 px-4">Önerilen içerikler</p>
          <div className="space-y-1">
            <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                <EyeOff className="w-5 h-5" />
                <span>İlgilenmediklerin</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5" />
                <span>İlgilendiklerin</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}