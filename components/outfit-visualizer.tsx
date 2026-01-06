"use client"

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import type { ClothingItem } from '@/lib/outfit-generator'

interface OutfitVisualizerProps {
  items: ClothingItem[]
}

export default function OutfitVisualizer({ items }: OutfitVisualizerProps) {
  if (items.length === 0) {
    return (
      <div className="glass border border-border rounded-2xl p-8">
        <div className="text-center text-muted-foreground">
          <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Kombin oluşturun</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="glass border border-border rounded-2xl p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Kombininiz
        </h3>
        
        {/* Kıyafetleri Grid'de Göster */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="glass border border-border rounded-xl overflow-hidden"
            >
              <div className="aspect-square bg-gradient-to-br from-primary/5 to-transparent">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3 border-t border-border">
                <p className="font-semibold text-sm truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.category}</p>
                {item.brand && (
                  <p className="text-xs text-primary mt-1">{item.brand}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Virtual Try-On Geçici Mesaj */}
      <div className="glass border border-primary/50 rounded-2xl p-6 bg-primary/5">
        <div className="text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-3 text-primary" />
          <h4 className="font-bold mb-2">Virtual Try-On Yakında!</h4>
          <p className="text-sm text-muted-foreground">
            AI ile model üzerinde görüntüleme özelliği çok yakında eklenecek.
          </p>
        </div>
      </div>

      {/* Renk Uyumu Göstergesi */}
      <div className="glass border border-border rounded-2xl p-4">
        <h4 className="font-semibold mb-3">Renk Paleti</h4>
        <div className="flex gap-2 flex-wrap">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full border-2 border-border"
                style={{ backgroundColor: item.color_hex }}
              />
              <span className="text-xs text-muted-foreground">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}