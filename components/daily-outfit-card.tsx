"use client"

import { motion } from "framer-motion"
import { Heart, Share2, ShoppingBag, Info } from "lucide-react"
import { useState } from "react"
import type { Outfit, ClothingItem } from "@/lib/storage"
import { toggleFavorite } from "@/lib/storage"
import { getColorHarmonyScore } from "@/lib/color-theory"

interface DailyOutfitCardProps {
  outfit: Outfit
  clothes: ClothingItem[]
}

export default function DailyOutfitCard({ outfit, clothes }: DailyOutfitCardProps) {
  const [isFavorite, setIsFavorite] = useState(outfit.isFavorite)

  const outfitItems = clothes.filter(item => outfit.items.includes(item.id))

  const handleFavorite = async () => {
    await toggleFavorite(outfit.id)
    setIsFavorite(!isFavorite)
  }

  const getColorHarmony = () => {
    const colors = outfitItems.map(item => item.color)
    if (colors.length < 2) return { text: "Tek renk", score: 0, color: "text-muted-foreground" }
    
    let totalScore = 0
    let count = 0
    
    for (let i = 0; i < colors.length - 1; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        totalScore += getColorHarmonyScore(colors[i], colors[j])
        count++
      }
    }
    
    const avgScore = Math.round(totalScore / count)
    
    if (avgScore >= 80) return { text: "Mukemmel Uyum", score: avgScore, color: "text-green-500" }
    if (avgScore >= 60) return { text: "Iyi Uyum", score: avgScore, color: "text-blue-500" }
    if (avgScore >= 40) return { text: "Orta Uyum", score: avgScore, color: "text-yellow-500" }
    return { text: "Zayif Uyum", score: avgScore, color: "text-orange-500" }
  }

  const harmony = getColorHarmony()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass border border-border rounded-2xl overflow-hidden"
    >
      <div className="relative aspect-square bg-gradient-to-br from-primary/5 to-primary/10 p-8">
        <div className="grid grid-cols-2 gap-4 h-full">
          {outfitItems.slice(0, 4).map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="relative glass border border-border rounded-xl p-4 flex items-center justify-center"
              style={{ backgroundColor: `${item.color}15` }}
            >
              {item.imageUrl ? (
                <img 
                  src={item.imageUrl} 
                  alt={item.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center">
                  <div className="text-4xl mb-2">
                    {item.category === "T-shirt" && "👕"}
                    {item.category === "Shirt" && "👔"}
                    {item.category === "Pants" && "👖"}
                    {item.category === "Skirt" && "🩱"}
                    {item.category === "Dress" && "👗"}
                    {item.category === "Jacket" && "🧥"}
                    {item.category === "Sweater" && "🧶"}
                    {item.category === "Shoes" && "👟"}
                    {item.category === "Accessories" && "💍"}
                  </div>
                  <p className="text-xs font-medium">{item.name}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <button
          onClick={handleFavorite}
          className="absolute top-4 right-4 p-3 glass border border-border rounded-full hover:border-primary transition-colors"
        >
          <Heart 
            className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`}
          />
        </button>
      </div>

      <div className="p-6">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Renk Uyumu</p>
            <p className={`text-sm font-semibold ${harmony.color}`}>
              {harmony.score}/100
            </p>
          </div>
          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${harmony.score}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              className={`h-full ${
                harmony.score >= 80 ? 'bg-green-500' :
                harmony.score >= 60 ? 'bg-blue-500' :
                harmony.score >= 40 ? 'bg-yellow-500' :
                'bg-orange-500'
              }`}
            />
          </div>
          <p className={`text-xs mt-1 font-medium ${harmony.color}`}>{harmony.text}</p>
        </div>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">Renk Paleti</p>
          <div className="flex gap-2">
            {outfitItems.map(item => (
              <div
                key={item.id}
                className="w-8 h-8 rounded-full border-2 border-border"
                style={{ backgroundColor: item.color }}
                title={item.name}
              />
            ))}
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">Kombin Parcalari</p>
          <div className="space-y-1">
            {outfitItems.map(item => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span>{item.name}</span>
                <span className="text-muted-foreground capitalize">{item.category}</span>
              </div>
            ))}
          </div>
        </div>

        {outfit.weather && (
          <div className="mb-4 p-3 glass border border-border rounded-xl">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">
                {outfit.weather === "hot" && "☀️ Sicak havalara uygun"}
                {outfit.weather === "warm" && "🌤️ Ilik havalara uygun"}
                {outfit.weather === "cool" && "☁️ Serin havalara uygun"}
                {outfit.weather === "cold" && "❄️ Soguk havalara uygun"}
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity">
            <Share2 className="w-4 h-4" />
            <span>Paylas</span>
          </button>
          
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 glass border border-border rounded-xl hover:border-primary transition-colors">
            <ShoppingBag className="w-4 h-4" />
            <span>Eksikler</span>
          </button>
        </div>
      </div>
    </motion.div>
  )
}