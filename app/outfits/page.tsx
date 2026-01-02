"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Plus, Trash2, Heart, Share2, Calendar, Sparkles } from "lucide-react"
import Link from "next/link"
import FloatingParticles from "@/components/floating-particles"
import { supabase } from "@/lib/supabase"

interface Outfit {
  id: string
  user_id: string
  name: string
  description: string | null
  cloth_ids: string[]
  season: string
  occasion: string
  color_harmony_score: number
  style_score: number
  is_favorite: boolean
  is_public: boolean
  created_at: string
  clothes?: any[]
}

export default function OutfitsPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      loadOutfits()
    }
  }, [userId])

  const loadOutfits = async () => {
    if (!userId) return

    setLoading(true)
    try {
      console.log('📥 Loading outfits for user:', userId)

      // 1. Outfitleri çek
      const { data: outfitsData, error: outfitsError } = await supabase
        .from('outfits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (outfitsError) throw outfitsError

      console.log('📊 Outfits found:', outfitsData?.length || 0)

      // 2. Her outfit için kıyafetleri çek
      const outfitsWithClothes = await Promise.all(
        (outfitsData || []).map(async (outfit) => {
          if (outfit.cloth_ids && outfit.cloth_ids.length > 0) {
            const { data: clothes } = await supabase
              .from('clothes')
              .select('*')
              .in('id', outfit.cloth_ids)

            return { ...outfit, clothes: clothes || [] }
          }
          return { ...outfit, clothes: [] }
        })
      )

      setOutfits(outfitsWithClothes)
      console.log('✅ Outfits loaded with clothes')
    } catch (error) {
      console.error('💥 Load outfits error:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteOutfit = async (outfitId: string) => {
    if (!confirm('Bu kombini silmek istediğinize emin misiniz?')) return

    try {
      const { error } = await supabase
        .from('outfits')
        .delete()
        .eq('id', outfitId)

      if (error) throw error

      setOutfits(prev => prev.filter(item => item.id !== outfitId))
      console.log('✅ Outfit deleted:', outfitId)
    } catch (error) {
      console.error('Delete error:', error)
      alert('Silme başarısız!')
    }
  }

  const toggleFavorite = async (outfitId: string, currentFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from('outfits')
        .update({ is_favorite: !currentFavorite })
        .eq('id', outfitId)

      if (error) throw error

      setOutfits(prev =>
        prev.map(item =>
          item.id === outfitId ? { ...item, is_favorite: !currentFavorite } : item
        )
      )
    } catch (error) {
      console.error('Toggle favorite error:', error)
    }
  }

  const togglePublic = async (outfitId: string, currentPublic: boolean) => {
    try {
      const { error } = await supabase
        .from('outfits')
        .update({ is_public: !currentPublic })
        .eq('id', outfitId)

      if (error) throw error

      setOutfits(prev =>
        prev.map(item =>
          item.id === outfitId ? { ...item, is_public: !currentPublic } : item
        )
      )

      alert(currentPublic ? 'Kombin gizlendi' : 'Kombin herkese açık!')
    } catch (error) {
      console.error('Toggle public error:', error)
    }
  }

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
        <div className="container mx-auto max-w-6xl">
          {/* HEADER */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-serif text-4xl font-bold mb-2">Kombinlerim</h1>
              <p className="text-muted-foreground">{outfits.length} kayitli kombin</p>
            </div>

            <Link
              href="/"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Yeni Kombin Olustur
            </Link>
          </div>

          {/* OUTFITS GRID */}
          {outfits.length === 0 ? (
            <div className="text-center py-20 glass border border-border rounded-2xl">
              <div className="text-9xl mb-6">👔</div>
              <h3 className="text-2xl font-bold mb-3">Henuz kayitli kombin yok</h3>
              <p className="text-muted-foreground mb-6">
                Ana sayfadan AI kombin olustur ve kaydet!
              </p>
              <Link
                href="/"
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity inline-block"
              >
                Kombin Olustur
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {outfits.map((outfit, idx) => (
                <motion.div
                  key={outfit.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass border border-border rounded-2xl overflow-hidden hover:border-primary transition-colors"
                >
                  {/* CLOTHES PREVIEW - UST USTE */}
                  <div className="flex flex-col gap-2 p-4 bg-gradient-to-br from-primary/5 to-primary/10">
                    {outfit.clothes?.slice(0, 4).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 bg-white rounded-lg p-2"
                      >
                        <div className="w-14 h-14 flex-shrink-0">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-primary font-semibold">{item.category}</p>
                          <p className="text-sm font-bold truncate">{item.name}</p>
                        </div>
                      </div>
                    ))}
                    {outfit.clothes && outfit.clothes.length > 4 && (
                      <div className="bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg p-3 text-center">
                        <span className="text-base font-bold">
                          +{outfit.clothes.length - 4} parca daha
                        </span>
                      </div>
                    )}
                  </div>

                  {/* INFO */}
                  <div className="p-4">
                    <h3 className="text-xl font-bold mb-2 line-clamp-2">{outfit.name}</h3>
                    
                    {outfit.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {outfit.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-3 py-1 glass border border-border rounded-full text-xs font-semibold">
                        {outfit.season}
                      </span>
                      <span className="px-3 py-1 glass border border-border rounded-full text-xs font-semibold">
                        {outfit.occasion}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Uyum Skoru</p>
                        <p className="text-2xl font-bold text-primary flex items-center gap-1">
                          <Sparkles className="w-5 h-5" />
                          {outfit.color_harmony_score}/100
                        </p>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Tarih</p>
                        <p className="text-sm font-semibold flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(outfit.created_at).toLocaleDateString('tr-TR', {
                            day: '2-digit',
                            month: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleFavorite(outfit.id, outfit.is_favorite)}
                        className={`flex-1 p-2 rounded-xl font-semibold text-sm transition-all ${
                          outfit.is_favorite
                            ? "bg-red-500 text-white"
                            : "glass border border-border hover:border-red-500"
                        }`}
                        title={outfit.is_favorite ? "Favorilerden cikar" : "Favorilere ekle"}
                      >
                        <Heart
                          className="w-4 h-4 mx-auto"
                          fill={outfit.is_favorite ? "currentColor" : "none"}
                        />
                      </button>

                      <button
                        onClick={() => togglePublic(outfit.id, outfit.is_public)}
                        className={`flex-1 p-2 rounded-xl font-semibold text-sm transition-all ${
                          outfit.is_public
                            ? "bg-green-500 text-white"
                            : "glass border border-border hover:border-green-500"
                        }`}
                        title={outfit.is_public ? "Herkese acik" : "Gizli"}
                      >
                        <Share2 className="w-4 h-4 mx-auto" />
                      </button>

                      <button
                        onClick={() => deleteOutfit(outfit.id)}
                        className="flex-1 p-2 glass border border-border rounded-xl hover:bg-red-500 hover:text-white transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}