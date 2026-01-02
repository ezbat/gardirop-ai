"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Plus, Search, Heart, Trash2 } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import AddClothModal from "@/components/add-cloth-modal"  // UploadClothingModal yerine
import { supabase } from "@/lib/supabase"

interface Clothing {
  id: string
  user_id: string
  name: string
  category: string
  brand: string | null
  color_hex: string
  color_palette: string[]
  image_url: string
  season: string[]
  occasions: string[]
  is_favorite: boolean
  created_at: string
}

const CATEGORIES = ["All", "T-shirt", "Shirt", "Sweater", "Jacket", "Coat", "Pants", "Shorts", "Skirt", "Dress", "Shoes", "Accessories"]

export default function WardrobePage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [clothes, setClothes] = useState<Clothing[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [showUploadModal, setShowUploadModal] = useState(false)

  useEffect(() => {
    console.log('🔍 Wardrobe useEffect triggered')
    console.log('User ID:', userId)
    console.log('Session:', session)
    
    if (userId) {
      loadClothes()
    } else {
      setLoading(false)
    }
  }, [userId])

 const loadClothes = async () => {
  if (!userId) {
    console.warn('⚠️ No user ID, skipping load')
    return
  }

  console.log('==========================================')
  console.log('📥 LOADING CLOTHES')
  console.log('Current User ID:', userId)
  console.log('Current User Email:', session?.user?.email)
  console.log('==========================================')
  
  setLoading(true)

  try {
    // ÖNCE TÜM CLOTHES'U ÇEK (user_id filtresi OLMADAN)
    const { data: allData, error: allError } = await supabase
      .from('clothes')
      .select('*')

    console.log('📊 ALL CLOTHES (no filter):')
    console.log('  Total:', allData?.length || 0)
    console.log('  Data:', allData)
    console.log('  Error:', allError)

    // SONRA SADECE BU USER'IN CLOTHES'UNU ÇEK
    const { data, error } = await supabase
      .from('clothes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    console.log('📊 USER CLOTHES (filtered):')
    console.log('  User ID:', userId)
    console.log('  Total:', data?.length || 0)
    console.log('  Data:', data)
    console.log('  Error:', error)
    console.log('==========================================')

    if (error) {
      console.error('❌ Supabase error:', error)
      throw error
    }

    setClothes(data || [])
    console.log('✅ Clothes loaded:', data?.length || 0)
    
  } catch (error) {
    console.error('💥 Load clothes error:', error)
  } finally {
    setLoading(false)
  }
}


  const toggleFavorite = async (clothingId: string, currentFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from('clothes')
        .update({ is_favorite: !currentFavorite })
        .eq('id', clothingId)

      if (error) throw error

      setClothes(prev =>
        prev.map(item =>
          item.id === clothingId ? { ...item, is_favorite: !currentFavorite } : item
        )
      )
    } catch (error) {
      console.error('Toggle favorite error:', error)
    }
  }

  const deleteClothing = async (clothingId: string) => {
    if (!confirm('Bu kıyafeti silmek istediğinize emin misiniz?')) return

    try {
      const { error } = await supabase
        .from('clothes')
        .delete()
        .eq('id', clothingId)

      if (error) throw error

      setClothes(prev => prev.filter(item => item.id !== clothingId))
      console.log('✅ Clothing deleted:', clothingId)
    } catch (error) {
      console.error('Delete error:', error)
      alert('Silme başarısız!')
    }
  }

  const filteredClothes = clothes.filter(item => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.brand?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-9xl mb-6">🔒</div>
          <h2 className="text-2xl font-bold mb-4">Giriş Yapmalısınız</h2>
          <p className="text-muted-foreground">Gardırobunuzu görmek için lütfen giriş yapın</p>
        </div>
      </div>
    )
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
              <h1 className="font-serif text-4xl font-bold mb-2">Gardırop</h1>
              <p className="text-muted-foreground">{clothes.length} kıyafet</p>
            </div>

            <button
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Yeni Ekle
            </button>
          </div>

          {/* SEARCH & FILTERS */}
          <div className="mb-6 space-y-4">
            {/* SEARCH */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kıyafet veya marka ara..."
                className="w-full pl-12 pr-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary"
              />
            </div>

            {/* CATEGORIES */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "glass border border-border hover:border-primary"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* CLOTHES GRID */}
          {filteredClothes.length === 0 ? (
            <div className="text-center py-20 glass border border-border rounded-2xl">
              <div className="text-9xl mb-6">👔</div>
              <h3 className="text-2xl font-bold mb-3">
                {clothes.length === 0 ? "Henüz kıyafet yok" : "Sonuç bulunamadı"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {clothes.length === 0 ? "İlk kıyafetini ekle ve AI kombinler oluştursun!" : "Farklı filtreler dene"}
              </p>
              {clothes.length === 0 && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
                >
                  Kıyafet Ekle
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredClothes.map((item, idx) => (
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
                    <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleFavorite(item.id, item.is_favorite)}
                        className={`p-2 rounded-full ${
                          item.is_favorite
                            ? "bg-red-500 text-white"
                            : "glass border border-border hover:bg-red-500 hover:text-white"
                        } transition-colors`}
                      >
                        <Heart className="w-4 h-4" fill={item.is_favorite ? "currentColor" : "none"} />
                      </button>

                      <button
                        onClick={() => deleteClothing(item.id)}
                        className="p-2 glass border border-border rounded-full hover:bg-red-500 hover:text-white transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* INFO */}
                  <div className="p-3">
                    <p className="text-xs text-primary font-semibold mb-1">{item.category}</p>
                    <h3 className="font-bold text-sm mb-1 line-clamp-1">{item.name}</h3>
                    {item.brand && (
                      <p className="text-xs text-muted-foreground mb-2">{item.brand}</p>
                    )}

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
        </div>
      </section>

      {/* UPLOAD MODAL */}
     <AddClothModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={loadClothes}
      />
    </div>
  )
}