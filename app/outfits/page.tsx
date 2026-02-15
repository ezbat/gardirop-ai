"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Sparkles, Search, Filter, Loader2, ShoppingCart, Store, ArrowRight } from "lucide-react"

interface OutfitItem {
  productId: string
  title: string
  price: number
  imageUrl: string
  category: string
  brand: string
  stockQuantity: number
}

interface Outfit {
  id: string
  name: string
  description: string | null
  coverImageUrl: string | null
  season: string
  occasion: string
  items: OutfitItem[]
  seller: {
    id: string
    shopName: string
  }
}

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSeason, setSelectedSeason] = useState<string>("all")
  const [selectedOccasion, setSelectedOccasion] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    loadOutfits()
  }, [selectedSeason, selectedOccasion])

  const loadOutfits = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (selectedSeason !== "all") {
        params.append("season", selectedSeason)
      }
      if (selectedOccasion !== "all") {
        params.append("occasion", selectedOccasion)
      }
      params.append("limit", "20")

      const response = await fetch(`/api/outfits/featured?${params}`)
      const data = await response.json()

      if (response.ok) {
        setOutfits(data.outfits || [])
      }
    } catch (error) {
      console.error("Load outfits error:", error)
    } finally {
      setLoading(false)
    }
  }

  const addAllToCart = (outfit: Outfit) => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]")

    outfit.items.forEach(item => {
      if (item.stockQuantity > 0) {
        const existingItem = cart.find((c: any) => c.productId === item.productId)
        if (existingItem) {
          existingItem.quantity += 1
        } else {
          cart.push({ productId: item.productId, quantity: 1 })
        }
      }
    })

    localStorage.setItem("cart", JSON.stringify(cart))
    alert(`✅ ${outfit.name} - Alle verfügbaren Artikel wurden in den Warenkorb gelegt!`)
  }

  const filteredOutfits = outfits.filter(outfit => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        outfit.name.toLowerCase().includes(query) ||
        outfit.description?.toLowerCase().includes(query) ||
        outfit.seller.shopName.toLowerCase().includes(query)
      )
    }
    return true
  })

  const totalPrice = (outfit: Outfit) => {
    return outfit.items.reduce((sum, item) => sum + item.price, 0)
  }

  const inStockCount = (outfit: Outfit) => {
    return outfit.items.filter(item => item.stockQuantity > 0).length
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="inline-block mb-4"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
            </motion.div>

            <h1 className="font-serif text-5xl font-bold mb-4">
              Kuratierte Outfit-Kollektionen
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Von unseren Händlern liebevoll zusammengestellte Looks für jeden Anlass
            </p>
          </div>

          {/* Search & Filters */}
          <div className="glass border border-border rounded-2xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Suche nach Outfits oder Shops..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Season Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                >
                  <option value="all">Alle Jahreszeiten</option>
                  <option value="Spring">Frühling</option>
                  <option value="Summer">Sommer</option>
                  <option value="Fall">Herbst</option>
                  <option value="Winter">Winter</option>
                  <option value="All Season">Ganzjährig</option>
                </select>
              </div>

              {/* Occasion Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <select
                  value={selectedOccasion}
                  onChange={(e) => setSelectedOccasion(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                >
                  <option value="all">Alle Anlässe</option>
                  <option value="Casual">Casual</option>
                  <option value="Business">Business</option>
                  <option value="Formal">Formal</option>
                  <option value="Sport">Sport</option>
                  <option value="Party">Party</option>
                  <option value="Wedding">Hochzeit</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <p className="text-muted-foreground mb-6">
            {filteredOutfits.length} {filteredOutfits.length === 1 ? "Outfit" : "Outfits"} gefunden
          </p>

          {/* Outfits Grid */}
          {filteredOutfits.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass border border-border rounded-2xl p-12 text-center"
            >
              <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Keine Outfits gefunden</h2>
              <p className="text-muted-foreground mb-6">
                Passen Sie Ihre Filter an oder durchsuchen Sie alle Produkte
              </p>
              <Link
                href="/store"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
              >
                Zum Shop
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {filteredOutfits.map((outfit, index) => (
                <motion.div
                  key={outfit.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass border border-border rounded-2xl overflow-hidden hover:border-primary transition-all hover:shadow-xl group"
                >
                  {/* Cover Image */}
                  <Link href={`/outfits/${outfit.id}`} className="block relative aspect-[16/9] bg-gradient-to-br from-purple-500/10 to-pink-500/10 overflow-hidden">
                    {outfit.coverImageUrl ? (
                      <img
                        src={outfit.coverImageUrl}
                        alt={outfit.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {/* Product Grid Preview */}
                        <div className="grid grid-cols-2 gap-2 p-4 w-full">
                          {outfit.items.slice(0, 4).map((item, idx) => (
                            <div key={idx} className="aspect-square bg-background rounded-lg overflow-hidden">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl">
                                  👕
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full backdrop-blur-sm">
                        {outfit.season}
                      </span>
                      <span className="px-3 py-1 bg-background/90 text-foreground text-xs font-semibold rounded-full backdrop-blur-sm">
                        {outfit.occasion}
                      </span>
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="p-6">
                    {/* Seller */}
                    <Link
                      href={`/seller/${outfit.seller.id}`}
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-2"
                    >
                      <Store className="w-4 h-4" />
                      {outfit.seller.shopName}
                    </Link>

                    {/* Title */}
                    <Link href={`/outfits/${outfit.id}`}>
                      <h3 className="text-2xl font-bold mb-2 hover:text-primary transition-colors">
                        {outfit.name}
                      </h3>
                    </Link>

                    {/* Description */}
                    {outfit.description && (
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                        {outfit.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 mb-4 text-sm">
                      <span className="flex items-center gap-1">
                        <span className="font-semibold">{outfit.items.length}</span>
                        <span className="text-muted-foreground">Teile</span>
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="flex items-center gap-1">
                        <span className="font-semibold">{inStockCount(outfit)}</span>
                        <span className="text-muted-foreground">verfügbar</span>
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-2xl font-bold text-primary">
                        €{totalPrice(outfit).toFixed(2)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link
                        href={`/outfits/${outfit.id}`}
                        className="flex-1 px-4 py-3 border border-border rounded-xl font-semibold hover:border-primary hover:text-primary transition-colors text-center"
                      >
                        Details ansehen
                      </Link>
                      <button
                        onClick={() => addAllToCart(outfit)}
                        disabled={inStockCount(outfit) === 0}
                        className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Alles kaufen
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
