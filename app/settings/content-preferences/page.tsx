"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"

export default function ContentPreferencesPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-secondary rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
        <h1 className="text-xl font-bold">İçerik tercihleri</h1>
      </div>
      <div className="p-4 space-y-1">
        <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
          <span>Hassas içerikler</span>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
        <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
          <span>Siyasi içerikler</span>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
        <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
          <span>İlgilendiklerin</span>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
        <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
          <span>İlgilenmediklerin</span>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
        <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
          <span>Belirli sözcükler ve söz grupları</span>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex-1">
            <p className="font-semibold">Önerilen gönderileri akıştan geçici gizle</p>
            <p className="text-sm text-muted-foreground mt-1">Önerilen gönderileri akışta 30 gün boyunca gizle.</p>
          </div>
          <button className="ml-4 w-12 h-6 rounded-full bg-border">
            <div className="w-5 h-5 rounded-full bg-white translate-x-1 transition-transform" />
          </button>
        </div>
        <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
          <span>Önerilen içerikleri sıfırla</span>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}