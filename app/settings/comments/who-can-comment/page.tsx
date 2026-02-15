"use client"

import { useState, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, Check, Loader2 } from "lucide-react"

function WhoCanCommentContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = session?.user?.id
  const currentSetting = searchParams.get('setting') || 'everyone'
  const [selected, setSelected] = useState<'everyone' | 'followers' | 'no_one'>(currentSetting as any)
  const [updating, setUpdating] = useState(false)

  const handleSave = async () => {
    if (!userId || updating) return
    setUpdating(true)
    try {
      const response = await fetch('/api/comment-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, setting: selected }) })
      if (!response.ok) throw new Error('Failed')
      router.back()
    } catch (error) {
      console.error('Update error:', error)
      alert('Güncelleme başarısız!')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 hover:bg-secondary rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
        <h1 className="text-xl font-bold flex-1 text-center">Gönderiler ve Reels videoları</h1>
        <button onClick={handleSave} disabled={updating} className="px-4 py-2 text-primary font-semibold disabled:opacity-50">
          {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Bitti'}
        </button>
      </div>
      <div className="p-4">
        <p className="text-sm text-muted-foreground mb-4">Instagram, rahatsız edici veya spam olabilecek yorumları otomatik olarak yorumlarınızın alt kısmındaki gizli yorumlar bölümüne taşır.</p>
        <div className="space-y-1">
          <button onClick={() => setSelected('everyone')} className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
            <span className="font-semibold">Herkes</span>
            {selected === 'everyone' && <Check className="w-5 h-5 text-primary" />}
          </button>
          <button onClick={() => setSelected('followers')} className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
            <div className="text-left">
              <p className="font-semibold">Takip ettiklerin</p>
              <p className="text-sm text-muted-foreground">Sadece takip ettiğin kişiler yorum yapabilir</p>
            </div>
            {selected === 'followers' && <Check className="w-5 h-5 text-primary" />}
          </button>
          <button onClick={() => setSelected('no_one')} className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
            <div className="text-left">
              <p className="font-semibold">Kimse</p>
              <p className="text-sm text-muted-foreground">Yorumlar kapatılır</p>
            </div>
            {selected === 'no_one' && <Check className="w-5 h-5 text-primary" />}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WhoCanCommentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <WhoCanCommentContent />
    </Suspense>
  )
}
