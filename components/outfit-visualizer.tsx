"use client"

import { motion } from 'framer-motion'
import { Sparkles, Palette } from 'lucide-react'
import type { ClothingItem } from '@/lib/outfit-generator'
import type { ColorPalette } from '@/lib/sanzo-wada-colors'

interface OutfitVisualizerProps {
  items: ClothingItem[]
  colorPalette?: ColorPalette
  score?: number
}

export default function OutfitVisualizer({ items, colorPalette, score }: OutfitVisualizerProps) {
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
      {/* Kıyafetler Grid */}
      <div className="glass border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Kombininiz
          </h3>
          {score && (
            <div className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm font-bold">
              %{score} Uyumlu
            </div>
          )}
        </div>
        
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

      {/* Sanzo Wada Renk Paleti */}
      {colorPalette && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass border border-border rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-primary" />
            <h4 className="font-semibold">Sanzo Wada Renk Paleti</h4>
          </div>

          <div className="space-y-4">
            {/* Palet Bilgisi */}
            <div>
              <p className="font-bold text-lg mb-1">{colorPalette.name}</p>
              <p className="text-sm text-muted-foreground mb-2">{colorPalette.mood}</p>
              {colorPalette.season && (
                <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                  {colorPalette.season}
                </span>
              )}
            </div>

            {/* Renk Gösterimi */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Palet Renkleri:</p>
              <div className="flex gap-2">
                {colorPalette.colors.map((color, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <div
                      className="w-12 h-12 rounded-lg border-2 border-border shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-muted-foreground">{color}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Kıyafet Renkleri */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Kombinimizdeki Renkler:</p>
              <div className="flex gap-2 flex-wrap">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full border-2 border-border shadow-sm"
                      style={{ backgroundColor: item.color_hex }}
                    />
                    <span className="text-xs text-muted-foreground">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Sanzo Wada Açıklama */}
      <div className="glass border border-primary/30 rounded-2xl p-6 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Palette className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h4 className="font-bold mb-2">🎨 Sanzo Wada Renk Uyumu</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tüm kombinlerimiz, 1930'larda Japon sanatçı <span className="font-semibold text-foreground">Sanzo Wada</span>'nın 
              geliştirdiği meşhur <span className="font-semibold text-foreground">"A Dictionary of Color Combinations"</span> kitabındaki 
              harmonik renk paletlerine göre oluşturulmaktadır. Bu paletler, yüzyıllardır Japon tasarımında kullanılan 
              estetik mükemmellik ve renk uyumu prensiplerine dayanır.
            </p>
            <a 
              href="https://sanzo-wada.dmbk.io/" 
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-sm text-primary hover:underline font-semibold"
            >
              Sanzo Wada Renk Kombinasyonlarını Keşfedin →
            </a>
          </div>
        </div>
      </div>

      {/* Virtual Try-On Geçici Mesaj */}
      <div className="glass border border-border rounded-2xl p-6">
        <div className="text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-3 text-primary" />
          <h4 className="font-bold mb-2">Virtual Try-On Yakında!</h4>
          <p className="text-sm text-muted-foreground">
            AI ile model üzerinde görüntüleme özelliği çok yakında eklenecek.
          </p>
        </div>
      </div>
    </div>
  )
}