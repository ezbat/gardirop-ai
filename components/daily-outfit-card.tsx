"use client"

import { motion } from "framer-motion"
import { Heart, Share2, Calendar } from "lucide-react"

interface Outfit {
  id: string
  name?: string
  date?: string
  occasion?: string
  temperature?: number
  items?: any[]
  image_url?: string
  score?: number
}

interface DailyOutfitCardProps {
  outfit: Outfit
  onLike?: (id: string) => void
  onShare?: (id: string) => void
  isLiked?: boolean
}

export default function DailyOutfitCard({ outfit, onLike, onShare, isLiked }: DailyOutfitCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass border border-border rounded-2xl overflow-hidden hover:border-primary transition-colors"
    >
      <div className="aspect-[3/4] relative bg-gradient-to-br from-primary/10 to-primary/20">
        {outfit.image_url ? (
          <img src={outfit.image_url} alt={outfit.name || "Outfit"} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-9xl">👔</span>
          </div>
        )}

        <div className="absolute top-4 right-4 flex gap-2">
          {onLike && (
            <button onClick={() => onLike(outfit.id)} className="p-2 glass rounded-full hover:bg-red-500 hover:text-white transition-colors">
              <Heart className="w-5 h-5" fill={isLiked ? "currentColor" : "none"} />
            </button>
          )}
          {onShare && (
            <button onClick={() => onShare(outfit.id)} className="p-2 glass rounded-full hover:bg-primary hover:text-primary-foreground transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {outfit.temperature && (
          <div className="absolute bottom-4 left-4 px-3 py-1 glass rounded-full">
            <span className="text-sm font-semibold">{outfit.temperature}°C</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold">{outfit.name || "Daily Outfit"}</h3>
          {outfit.score && (
            <div className="px-2 py-1 bg-primary/10 rounded-lg">
              <span className="text-sm font-semibold text-primary">{outfit.score}/5 ⭐</span>
            </div>
          )}
        </div>

        {outfit.occasion && (
          <p className="text-sm text-muted-foreground mb-2">{outfit.occasion}</p>
        )}

        {outfit.date && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{new Date(outfit.date).toLocaleDateString('tr-TR')}</span>
          </div>
        )}

        {outfit.items && outfit.items.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">{outfit.items.length} parça</p>
            <div className="flex gap-2 overflow-x-auto">
              {outfit.items.slice(0, 4).map((item: any, idx: number) => (
                <div key={idx} className="w-12 h-12 rounded-lg bg-primary/5 flex-shrink-0">
                  {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-lg" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}