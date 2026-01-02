"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Edit2, Calendar, Heart, Trash2 } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import { supabase } from "@/lib/supabase"

interface SavedOutfit {
  id: string
  name: string
  description: string | null
  cloth_ids: string[]
  season: string
  occasion: string
  color_harmony_score: number
  is_favorite: boolean
  created_at: string
  clothes?: any[]
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts')
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      loadSavedOutfits()
    }
  }, [userId])

  const loadSavedOutfits = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data: outfitsData, error } = await supabase
        .from('outfits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const outfitsWithClothes = await Promise.all(
        (outfitsData || []).map(async (outfit) => {
          if (outfit.cloth_ids?.length > 0) {
            const { data: clothes } = await supabase
              .from('clothes')
              .select('*')
              .in('id', outfit.cloth_ids)
            return { ...outfit, clothes: clothes || [] }
          }
          return { ...outfit, clothes: [] }
        })
      )
      setSavedOutfits(outfitsWithClothes)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteOutfit = async (outfitId: string) => {
    if (!confirm('Silmek istediginize emin misiniz?')) return
    try {
      await supabase.from('outfits').delete().eq('id', outfitId)
      setSavedOutfits(prev => prev.filter(item => item.id !== outfitId))
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const toggleFavorite = async (outfitId: string, currentFavorite: boolean) => {
    try {
      await supabase.from('outfits').update({ is_favorite: !currentFavorite }).eq('id', outfitId)
      setSavedOutfits(prev => prev.map(item => item.id === outfitId ? { ...item, is_favorite: !currentFavorite } : item))
    } catch (error) {
      console.error('Error:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="glass border border-border rounded-2xl p-8 mb-6">
            <div className="flex items-start gap-6">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-primary">
                {session?.user?.image ? (
                  <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-5xl font-bold">{session?.user?.name?.[0]?.toUpperCase() || 'U'}</div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="font-serif text-3xl font-bold">{session?.user?.name || 'Kullanici'}</h1>
                  <button className="px-4 py-2 glass border border-border rounded-xl hover:border-primary transition-colors flex items-center gap-2"><Edit2 className="w-4 h-4" />Duzenle</button>
                </div>
                <p className="text-muted-foreground mb-4">{session?.user?.email}</p>
                <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">Gardirop AI</span></div>
              </div>
            </div>
          </div>
          <div className="flex gap-4 mb-6">
            <button onClick={() => setActiveTab('posts')} className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === 'posts' ? "bg-primary text-primary-foreground" : "glass border border-border hover:border-primary"}`}>Gonderiler</button>
            <button onClick={() => setActiveTab('saved')} className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === 'saved' ? "bg-primary text-primary-foreground" : "glass border border-border hover:border-primary"}`}>Kayitli ({savedOutfits.length})</button>
          </div>
          <div className="min-h-96">
            {activeTab === 'posts' && (
              <div className="text-center py-20 glass border border-border rounded-2xl"><div className="text-9xl mb-6">📱</div><h3 className="text-2xl font-bold mb-3">Henuz gonderi yok</h3><p className="text-muted-foreground">Ilk gonderini paylas!</p></div>
            )}
            {activeTab === 'saved' && savedOutfits.length === 0 && (
              <div className="text-center py-20 glass border border-border rounded-2xl"><div className="text-9xl mb-6">💾</div><h3 className="text-2xl font-bold mb-3">Henuz kayitli kombin yok</h3><p className="text-muted-foreground mb-6">Ana sayfadan AI kombin olustur ve Kaydet butonuna tikla!</p><a href="/" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity inline-block">Kombin Olustur</a></div>
            )}
            {activeTab === 'saved' && savedOutfits.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {savedOutfits.map((outfit) => (
                  <div key={outfit.id} className="glass border border-border rounded-2xl overflow-hidden hover:border-primary transition-colors">
                    <div className="flex flex-col gap-2 p-4 bg-primary/5">
                      {outfit.clothes?.slice(0, 4).map((item) => (
                        <div key={item.id} className="flex items-center gap-3 bg-white rounded-lg p-2">
                          <div className="w-14 h-14"><img src={item.image_url} alt={item.name} className="w-full h-full object-contain" /></div>
                          <div className="flex-1 min-w-0"><p className="text-xs text-primary font-semibold">{item.category}</p><p className="text-sm font-bold truncate">{item.name}</p></div>
                        </div>
                      ))}
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-bold mb-2">{outfit.name}</h3>
                      {outfit.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{outfit.description}</p>}
                      <div className="flex items-center gap-2 mb-3"><span className="px-2 py-1 glass border border-border rounded-full text-xs font-semibold">{outfit.season}</span><span className="px-2 py-1 glass border border-border rounded-full text-xs font-semibold">{outfit.occasion}</span></div>
                      <div className="flex items-center justify-between mb-3"><div><p className="text-xs text-muted-foreground">Uyum</p><p className="text-xl font-bold text-primary">{outfit.color_harmony_score}/100</p></div><div className="text-right"><p className="text-xs text-muted-foreground">Tarih</p><p className="text-sm font-semibold">{new Date(outfit.created_at).toLocaleDateString('tr-TR')}</p></div></div>
                      <div className="flex gap-2"><button onClick={() => toggleFavorite(outfit.id, outfit.is_favorite)} className="flex-1 p-2 glass border border-border rounded-xl hover:border-red-500 transition-colors"><Heart className="w-4 h-4 mx-auto" fill={outfit.is_favorite ? "currentColor" : "none"} /></button><button onClick={() => deleteOutfit(outfit.id)} className="flex-1 p-2 glass border border-border rounded-xl hover:bg-red-500 hover:text-white transition-colors"><Trash2 className="w-4 h-4 mx-auto" /></button></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}