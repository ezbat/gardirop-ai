"use client"

import { motion } from 'framer-motion'
import type { ClothingItem } from '@/lib/outfit-generator'

interface OutfitVisualizerProps {
  items: ClothingItem[]
}

export default function OutfitVisualizer({ items }: OutfitVisualizerProps) {
  // Kategorilere göre grupla
  const categorized = {
    outerwear: items.filter(i => ['Jacket', 'Coat'].includes(i.category)),
    top: items.filter(i => ['T-shirt', 'Shirt', 'Sweater'].includes(i.category)),
    dress: items.filter(i => i.category === 'Dress'),
    bottom: items.filter(i => ['Pants', 'Shorts', 'Skirt'].includes(i.category)),
    shoes: items.filter(i => i.category === 'Shoes'),
    accessories: items.filter(i => i.category === 'Accessories'),
  }

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Manken silueti (arka plan) */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <svg width="200" height="400" viewBox="0 0 200 400" fill="none">
          {/* Baş */}
          <circle cx="100" cy="40" r="25" stroke="currentColor" strokeWidth="2" />
          {/* Gövde */}
          <line x1="100" y1="65" x2="100" y2="200" stroke="currentColor" strokeWidth="2" />
          {/* Omuzlar */}
          <line x1="60" y1="80" x2="140" y2="80" stroke="currentColor" strokeWidth="2" />
          {/* Kollar */}
          <line x1="60" y1="80" x2="50" y2="160" stroke="currentColor" strokeWidth="2" />
          <line x1="140" y1="80" x2="150" y2="160" stroke="currentColor" strokeWidth="2" />
          {/* Bacaklar */}
          <line x1="85" y1="200" x2="80" y2="350" stroke="currentColor" strokeWidth="2" />
          <line x1="115" y1="200" x2="120" y2="350" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>

      {/* Katmanlı kıyafetler */}
      <div className="relative space-y-3 py-8">
        
        {/* Dış Giyim */}
        {categorized.outerwear.map((item, idx) => (
          <ClothingLayer key={item.id} item={item} layer="outerwear" index={idx} />
        ))}

        {/* Üst */}
        {categorized.top.map((item, idx) => (
          <ClothingLayer key={item.id} item={item} layer="top" index={idx} />
        ))}

        {/* Elbise */}
        {categorized.dress.map((item, idx) => (
          <ClothingLayer key={item.id} item={item} layer="dress" index={idx} />
        ))}

        {/* Alt */}
        {categorized.bottom.map((item, idx) => (
          <ClothingLayer key={item.id} item={item} layer="bottom" index={idx} />
        ))}

        {/* Ayakkabı */}
        {categorized.shoes.map((item, idx) => (
          <ClothingLayer key={item.id} item={item} layer="shoes" index={idx} />
        ))}

        {/* Aksesuar */}
        {categorized.accessories.map((item, idx) => (
          <ClothingLayer key={item.id} item={item} layer="accessories" index={idx} />
        ))}

      </div>
    </div>
  )
}

function ClothingLayer({ item, layer, index }: { item: ClothingItem; layer: string; index: number }) {
  const layerConfig = {
    outerwear: { icon: '🧥', label: 'Dış Giyim' },
    top: { icon: '👕', label: 'Üst' },
    dress: { icon: '👗', label: 'Elbise' },
    bottom: { icon: '👖', label: 'Alt' },
    shoes: { icon: '👟', label: 'Ayakkabı' },
    accessories: { icon: '👜', label: 'Aksesuar' },
  }

  const config = layerConfig[layer as keyof typeof layerConfig] || { icon: '👔', label: layer }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass border-2 border-border rounded-2xl p-4 hover:border-primary transition-all hover:scale-105"
      style={{ borderColor: item.color_hex + '40' }}
    >
      <div className="flex items-center gap-4">
        {/* Kategori ikonu */}
        <div 
          className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
          style={{ backgroundColor: item.color_hex + '20' }}
        >
          {config.icon}
        </div>

        {/* Kıyafet resmi */}
        <div 
          className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 border-2"
          style={{ 
            backgroundColor: item.color_hex + '10',
            borderColor: item.color_hex + '40'
          }}
        >
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Bilgiler */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ 
              backgroundColor: item.color_hex + '30',
              color: item.color_hex
            }}>
              {config.label}
            </span>
          </div>
          <p className="font-bold truncate">{item.name}</p>
          {item.brand && (
            <p className="text-xs text-muted-foreground truncate">{item.brand}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <div 
              className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: item.color_hex }}
            />
            <span className="text-xs text-muted-foreground uppercase">{item.color_hex}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}