"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function PrivacySettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id
  const [isPrivate, setIsPrivate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (userId) loadSettings()
  }, [userId])

  const loadSettings = async () => {
    if (!userId) return
    try {
      const { data, error } = await supabase.from('users').select('is_private').eq('id', userId).single()
      if (error) throw error
      setIsPrivate(data?.is_private || false)
    } catch (error) {
      console.error('Load settings error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (value: boolean) => {
    if (!userId || updating) return
    setUpdating(true)
    try {
      const response = await fetch('/api/privacy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, isPrivate: value }) })
      if (!response.ok) throw new Error('Failed to update')
      setIsPrivate(value)
    } catch (error) {
      console.error('Update error:', error)
      alert('Güncelleme başarısız!')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-secondary rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
        <h1 className="text-xl font-bold">Hesap gizliliği</h1>
      </div>
      <div className="p-4 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 glass border border-border rounded-xl">
            <div className="flex-1">
              <p className="font-bold mb-1">Gizli Hesap</p>
              <p className="text-sm text-muted-foreground">Hesabın herkese açık olduğunda, profilini ve gönderilerini Instagram hesabı olan veya olmayan herkes görebilir.</p>
              <p className="text-sm text-muted-foreground mt-2">Hesabın gizli olduğunda, konu etiketi ve konum sayfalarındaki fotoğrafların veya videoların dahil olmak üzere paylaştığın şeyleri ve takipçilerini ve takip listelerini sadece onayladığın takipçilerin görebilir.</p>
            </div>
            <button onClick={() => handleToggle(!isPrivate)} disabled={updating} className={`ml-4 w-12 h-6 rounded-full transition-colors ${isPrivate ? 'bg-primary' : 'bg-border'}`}>
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isPrivate ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="p-4 glass border border-border rounded-xl">
            <p className="font-bold mb-2">Profil resmini genişletmeye izin ver</p>
            <p className="text-sm text-muted-foreground mb-3">İnsanların sen olduğunu anlamalarına yardımcı olmak için profil resminin daha büyük bir versiyonunu görmelerine izin ver.</p>
            <button className="w-full px-4 py-2 glass border border-border rounded-lg font-semibold hover:bg-secondary transition-colors">Herkese açık</button>
          </div>
          <div className="p-4 glass border border-border rounded-xl">
            <p className="font-bold mb-2">Herkese açık fotoğraf ve videoların arama motoru sonuçlarında görünmesine izin ver</p>
            <p className="text-sm text-muted-foreground mb-3">Açıkken, Google gibi arama motorları herkese açık fotoğraflarını ve videolarını Instagram arama sonuçlarında gösterebilir.</p>
            <button className="w-full px-4 py-2 glass border border-border rounded-lg font-semibold hover:bg-secondary transition-colors">Herkese açık</button>
          </div>
        </div>
      </div>
    </div>
  )
}