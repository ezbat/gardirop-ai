"use client"

import { motion } from "framer-motion"
import { Trash2, Edit } from "lucide-react"
import type { ClothingItem } from "@/lib/storage"

interface ClothingCardProps {
  item: ClothingItem
  onDelete?: (id: string) => void
  onEdit?: (item: ClothingItem) => void
}

export default function ClothingCard({ item, onDelete, onEdit }: ClothingCardProps) {
  // Kategori emoji'leri
  const categoryEmoji: Record<string, string> = {
    "T-shirt": "👕",
    "Pants": "👖",
    "Dress": "👗",
    "Jacket": "🧥",
    "Shoes": "👞",
    "Hat": "🎩",
    "Bag": "👜",
    "Accessories": "💍",
    "Shorts": "🩳",
    "Skirt": "👘",
    "Sweater": "🧶",
    "Coat": "🧥",
  }

  // Stil renkleri
  const styleColors: Record<string, string> = {
    Casual: "from-blue-500/20 to-blue-600/20",
    Elegant: "from-purple-500/20 to-purple-600/20",
    Sporty: "from-green-500/20 to-green-600/20",
    Formal: "from-gray-700/20 to-gray-800/20",
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="relative group glass border border-border rounded-2xl overflow-hidden"
    >
      {/* Görsel Alanı */}
     <div className="aspect-square flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/20 relative">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-7xl">
            {categoryEmoji[item.category] || "👔"}
          </span>
        )}

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          {onEdit && (
            <button
              onClick={() => onEdit(item)}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <Edit className="w-5 h-5 text-white" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(item.id)}
              className="p-3 bg-red-500/80 hover:bg-red-500 rounded-full transition-colors"
            >
              <Trash2 className="w-5 h-5 text-white" />
            </button>
          )}
        </div>

        {/* Kategori Badge */}
        <div className="absolute top-2 left-2 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full">
          <span className="text-white text-xs font-semibold">{item.category}</span>
        </div>

        {/* Stil Badge */}
        <div className="absolute top-2 right-2 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full">
          <span className="text-white text-xs">{item.style}</span>
        </div>
      </div>

      {/* Bilgi Alanı */}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 truncate">{item.name}</h3>
        
        <div className="flex items-center gap-2 mb-2">
          {/* Renk */}
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full border border-border"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-muted-foreground capitalize">{item.color}</span>
          </div>
        </div>

        {/* Tarih */}
        <p className="text-xs text-muted-foreground">
          {new Date(item.createdAt).toLocaleDateString('tr-TR')}
        </p>
      </div>
    </motion.div>
  )
}