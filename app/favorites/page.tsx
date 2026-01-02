"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Heart, Trash2 } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import { supabase } from "@/lib/supabase"

interface FavoriteItem {
  id: string
  name: string
  category: string
  brand: string | null
  color_hex: string
  color_palette: string[]
  image_url: string
  season: string[]
  occasions: string[]
  is_favorite: boolean
}

interface FavoriteOutfit {
  id: string
  name: string
  cloth_ids: string[]
  season: string
  occasion: string
  color_harmony_score: number
  is_favorite: boolean
  created_at: string
  clothes?: any[]
}

export default function FavoritesPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [favoriteClothes, setFavoriteClothes] = useState<FavoriteItem[]>([])
  const [favoriteOutfits, setFavoriteOutfits] = useState<FavoriteOutfit[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'clothes' | 'outfits'>('clothes')

  useEffect(() => {
    if (userId) {
      loadFavorites()
    }
  }, [userId])

  const loadFavorites = async () => {
    if (!userId) return

    setLoading(true)
    try {
      // 1. Favori kıyafetleri çek
      const { data: clothesData, error: clothesError } = await supabase
        .from('clothes')
        .select('*')
        .eq('user_id', userId)
        .eq('is_favorite', true)

      if (clothesError) throw clothesError
      setFavoriteClothes(clothesData || [])

      // 2. Favori outfitleri çek
      const { data: outfitsData, error: outfitsError } = await supabase
        .from('outfits')
        .select('*')
        .eq('user_id', userId)
        .eq('is_favorite', true)

      if (outfitsError) throw outfitsError

      // 3. Her outfit için kıyafetleri çek
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

      setFavoriteOutfits(outfitsWithClothes)
      console.log('✅ Favorites loaded')
    } catch (error) {
      console.error('Load favorites error:', error)
    } finally {
      setLoading(false)
    }
  }

  const removeFavoriteClothing = async (clothingId: string) => {
    try {
      const { error } = await supabase
        .from('clothes')
        .update({ is_favorite: false })
        .eq('id', clothingId)

      if (error) throw error

      setFavoriteClothes(prev => prev.filter(item => item.id !== clothingId))
    } catch (error) {
      console.error('Remove favorite error:', error)
    }
  }

  const removeFavoriteOutfit = async (outfitId: string) => {
    try {
      const { error } = await supabase
        .from('outfits')
        .update({ is_favorite: false })
        .eq('id', outfitId)

      if (error) throw error

      setFavoriteOutfits(prev => prev.filter(item => item.id !== outfitId))
    } catch (error) {
      console.error('Remove favorite error:', error)
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
          <div className="mb-8">
            <h1 className="font-serif text-4xl font-bold mb-2">Favorilerim</h1>
            <p className="text-muted-foreground">
              {favoriteClothes.length} kıyafet, {favoriteOutfits.length} kombin
            </p>
          </div>

          {/* TABS */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab('clothes')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'clothes'
                  ? "bg-primary text-primary-foreground"
                  : "glass border border-border hover:border-primary"
              }`}
            >
              Kıyafetler ({favoriteClothes.length})
            </button>
            <button
              onClick={() => setActiveTab('outfits')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'outfits'
                  ? "bg-primary text-primary-foreground"
                  : "glass border border-border hover:border-primary"
              }`}
            >
              Kombinler ({favoriteOutfits.length})
            </button>
          </div>

          {/* CLOTHES TAB */}
          {activeTab === 'clothes' && (
            <>
              {favoriteClothes.length === 0 ? (
                <div className="text-center py-20 glass border border-border rounded-2xl">
                  <div className="text-9xl mb-6">❤️</div>
                  <h3 className="text-2xl font-bold mb-3">Henüz favori kıyafet yok</h3>
                  <p className="text-muted-foreground">
                    Gardıroptan kıyafetleri favorilere ekle!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {favoriteClothes.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="glass border border-border rounded-2xl overflow-hidden hover:border-primary transition-colors group"
                    >
                      {/* IMAGE */}
                      <div className="relative aspect-square bg-gradient-to-br from-primary/5 to-primary/10 p-4">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-contain"
                        />

                        {/* ACTIONS */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => removeFavoriteClothing(item.id)}
                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          >
                            <Heart className="w-4 h-4" fill="currentColor" />
                          </button>
                        </div>
                      </div>

                      {/* INFO */}
                      <div className="p-3">
                        <p className="text-xs text-primary font-semibold mb-1">
                          {item.category}
                        </p>
                        <h3 className="font-bold text-sm mb-1 line-clamp-1">
                          {item.name}
                        </h3>

                        {/* COLOR PALETTE */}
                        <div className="flex items-center gap-1">
                          {item.color_palette.slice(0, 5).map((color, i) => (
                            <div
                              key={i}
                              className="w-5 h-5 rounded-full border-2 border-border"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* OUTFITS TAB */}
          {activeTab === 'outfits' && (
            <>
              {favoriteOutfits.length === 0 ? (
                <div className="text-center py-20 glass border border-border rounded-2xl">
                  <div className="text-9xl mb-6">💕</div>
                  <h3 className="text-2xl font-bold mb-3">Henüz favori kombin yok</h3>
                  <p className="text-muted-foreground">
                    Kombinler sayfasından favorilere ekle!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favoriteOutfits.map((outfit, idx) => (
                    <motion.div
                      key={outfit.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="glass border border-border rounded-2xl overflow-hidden hover:border-primary transition-colors group"
                    >
                      {/* CLOTHES PREVIEW */}
                      <div className="grid grid-cols-2 gap-2 p-4 bg-gradient-to-br from-primary/5 to-primary/10">
                        {outfit.clothes?.slice(0, 4).map((item) => (
                          <div
                            key={item.id}
                            className="aspect-square bg-white rounded-lg overflow-hidden"
                          >
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ))}
                      </div>

                      {/* INFO */}
                      <div className="p-4">
                        <h3 className="text-xl font-bold mb-2">{outfit.name}</h3>

                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-3 py-1 glass border border-border rounded-full text-xs font-semibold">
                            {outfit.season}
                          </span>
                          <span className="px-3 py-1 glass border border-border rounded-full text-xs font-semibold">
                            {outfit.occasion}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Uyum Skoru</p>
                            <p className="text-2xl font-bold text-primary">
                              {outfit.color_harmony_score}/100
                            </p>
                          </div>

                          <button
                            onClick={() => removeFavoriteOutfit(outfit.id)}
                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          >
                            <Heart className="w-4 h-4" fill="currentColor" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}