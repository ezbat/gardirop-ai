"use client"

import { Heart, Trash2 } from "lucide-react"

interface ClothingItem {
  id: string
  name: string
  category: string
  imageUrl?: string
  emoji?: string
  isFavorite?: boolean
  colorHex?: string
}

interface ClothingCardProps {
  item: ClothingItem
  onToggleFavorite?: (id: string) => void
  onDelete?: (id: string) => void
}

export default function ClothingCard({ item, onToggleFavorite, onDelete }: ClothingCardProps) {
  return (
    <div className="glass border border-border rounded-2xl overflow-hidden hover:border-primary transition-colors group">
      <div className="aspect-square flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/20 relative">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-6xl">{item.emoji || "👕"}</span>
        )}
        
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onToggleFavorite && (
            <button onClick={() => onToggleFavorite(item.id)} className="p-2 glass rounded-lg hover:bg-red-500 hover:text-white">
              <Heart className="w-4 h-4" fill={item.isFavorite ? "currentColor" : "none"} />
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(item.id)} className="p-2 glass rounded-lg hover:bg-red-500 hover:text-white">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      <div className="p-3">
        <p className="text-xs text-primary font-semibold">{item.category}</p>
        <h3 className="font-bold truncate">{item.name}</h3>
      </div>
    </div>
  )
}