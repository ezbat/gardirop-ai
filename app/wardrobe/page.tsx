"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Plus, Search, Heart, Trash2 } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import AddClothModal from "@/components/add-cloth-modal"
import { supabase } from "@/lib/supabase"
import { useLanguage } from "@/lib/language-context"

interface Clothing {
  id: string
  name: string
  category: string
  brand: string | null
  color_hex: string
  image_url: string
  is_favorite: boolean
  season: string[]
  occasions: string[]
}

export default function WardrobePage() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const userId = session?.user?.id

  const [clothes, setClothes] = useState<Clothing[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")

  const categories = ["All", "T-shirt", "Shirt", "Pants", "Dress", "Shoes", "Jacket", "Accessories"]

  useEffect(() => {
    if (userId) {
      loadClothes()
    }
  }, [userId])

  const loadClothes = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('clothes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setClothes(data || [])
    } catch (error) {
      console.error('Load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteCloth = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return
    try {
      const { error } = await supabase.from('clothes').delete().eq('id', id)
      if (error) throw error
      setClothes(prev => prev.filter(item => item.id !== id))
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  const toggleFavorite = async (id: string, currentFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from('clothes')
        .update({ is_favorite: !currentFavorite })
        .eq('id', id)

      if (error) throw error
      setClothes(prev => prev.map(item => item.id === id ? { ...item, is_favorite: !currentFavorite } : item))
    } catch (error) {
      console.error('Toggle favorite error:', error)
    }
  }

  const filteredClothes = clothes.filter(item => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.brand?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t('mustLogin')}</h2>
          <a href="/api/auth/signin" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold inline-block">{t('login')}</a>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }} className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center justify-between mb-8">
            <h1 className="font-serif text-4xl font-bold">{t('myWardrobeTitle')}</h1>
            <button onClick={() => setShowAddModal(true)} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 flex items-center gap-2">
              <Plus className="w-5 h-5" />{t('addCloth')}
            </button>
          </div>

          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('searchPlaceholder')} className="w-full pl-12 pr-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap ${selectedCategory === cat ? "bg-primary text-primary-foreground" : "glass border border-border"}`}>{cat}</button>
              ))}
            </div>
          </div>

          {filteredClothes.length === 0 ? (
            <div className="text-center py-20 glass border border-border rounded-2xl">
              <div className="text-9xl mb-6">👕</div>
              <h3 className="text-2xl font-bold mb-3">{t('noClothesInWardrobe')}</h3>
              <p className="text-muted-foreground mb-6">{t('addFirstCloth')}</p>
              <button onClick={() => setShowAddModal(true)} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold inline-block">{t('addCloth')}</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredClothes.map((item, idx) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="glass border border-border rounded-2xl overflow-hidden hover:border-primary transition-colors group">
                  <div className="relative aspect-square bg-primary/5">
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button onClick={() => toggleFavorite(item.id, item.is_favorite)} className="p-2 glass rounded-lg hover:bg-red-500 hover:text-white">
                        <Heart className="w-4 h-4" fill={item.is_favorite ? "currentColor" : "none"} />
                      </button>
                      <button onClick={() => deleteCloth(item.id)} className="p-2 glass rounded-lg hover:bg-red-500 hover:text-white">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-primary font-semibold">{item.category}</p>
                    <h3 className="font-bold truncate">{item.name}</h3>
                    {item.brand && <p className="text-xs text-muted-foreground truncate">{item.brand}</p>}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <AddClothModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); loadClothes(); }} />
    </div>
  )
}