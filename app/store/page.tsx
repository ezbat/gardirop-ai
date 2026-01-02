"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { ShoppingCart, Heart, Star, ExternalLink, Search, ShoppingBag } from "lucide-react"
import Link from "next/link"
import FloatingParticles from "@/components/floating-particles"
import { supabase } from "@/lib/supabase"
import { addToCart } from "@/lib/cart"

interface Product {
  id: string
  store_name: string
  product_name: string
  description: string | null
  price: number
  category: string
  image_url: string
  product_url: string
  rating: number
  is_featured: boolean
}

export default function StorePage() {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [addingToCart, setAddingToCart] = useState<string | null>(null)

  const categories = ["All", "T-shirt", "Shirt", "Pants", "Dress", "Shoes", "Accessories", "Sweater", "Jacket"]

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('store_products').select('*').order('is_featured', { ascending: false })
      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = async (productId: string) => {
    if (!userId) {
      alert('Sepete eklemek için lütfen giriş yapın!')
      return
    }
    setAddingToCart(productId)
    const success = await addToCart(userId, productId, 1)
    alert(success ? '✅ Ürün sepete eklendi!' : '❌ Sepete eklenemedi.')
    setAddingToCart(null)
  }

  const filteredProducts = products.filter(p => {
    const catMatch = selectedCategory === "All" || p.category === selectedCategory
    const searchMatch = p.product_name.toLowerCase().includes(searchQuery.toLowerCase())
    return catMatch && searchMatch
  })

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
            <div>
              <h1 className="font-serif text-5xl font-bold mb-2">Mağaza</h1>
              <p className="text-xl text-muted-foreground">Trigema koleksiyonu</p>
            </div>
            {session && (
              <Link href="/cart" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />Sepetim
              </Link>
            )}
          </div>
          <div className="mb-8 space-y-4">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Ara..." className="w-full pl-12 pr-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
              {categories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap ${selectedCategory === cat ? "bg-primary text-primary-foreground" : "glass border border-border"}`}>{cat}</button>
              ))}
            </div>
          </div>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 glass border border-border rounded-2xl">
              <div className="text-9xl mb-6">🛍️</div>
              <h3 className="text-2xl font-bold mb-3">Sonuç bulunamadı</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((prod) => (
                <div key={prod.id} className="glass border border-border rounded-2xl overflow-hidden hover:border-primary group">
                  <div className="relative aspect-square bg-primary/5">
                    <img src={prod.image_url} alt={prod.product_name} className="w-full h-full object-cover" />
                    {prod.is_featured && <div className="absolute top-4 left-4 px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-bold">ÖNE ÇIKAN</div>}
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-primary font-semibold">{prod.store_name}</p>
                    <h3 className="font-bold text-lg mb-2 line-clamp-2">{prod.product_name}</h3>
                    {prod.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{prod.description}</p>}
                    <div className="flex items-center gap-1 mb-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-4 h-4" fill={i < prod.rating ? "currentColor" : "none"} color={i < prod.rating ? "#FFD700" : "currentColor"} />
                      ))}
                      <span className="text-sm text-muted-foreground ml-1">({prod.rating})</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold">€{prod.price}</p>
                      <div className="flex gap-2">
                        <button className="p-2 glass border border-border rounded-lg hover:border-red-500"><Heart className="w-5 h-5" /></button>
                        <button onClick={() => handleAddToCart(prod.id)} disabled={addingToCart === prod.id} className="p-2 glass border border-border rounded-lg hover:bg-primary hover:text-primary-foreground">
                          {addingToCart === prod.id ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}