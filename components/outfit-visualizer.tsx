"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Sparkles } from 'lucide-react'
import type { ClothingItem } from '@/lib/outfit-generator'

interface OutfitVisualizerProps {
  items: ClothingItem[]
}

export default function OutfitVisualizer({ items }: OutfitVisualizerProps) {
  const [tryOnImage, setTryOnImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    generateTryOn()
  }, [items])

const generateTryOn = async () => {
  if (items.length === 0) return

  setLoading(true)
  setError(false)

  try {
    // PLACEHOLDER URL'LERİ FİLTRELE!
    const clothingUrls = items
      .map(item => item.image_url)
      .filter(url => !url.includes('placeholder') && !url.includes('via.placeholder'))

    console.log('🔍 Filtered URLs:', clothingUrls)

    if (clothingUrls.length === 0) {
      console.error('❌ Gerçek kıyafet URL\'i yok!')
      setError(true)
      return
    }

    const response = await fetch('/api/virtual-tryon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clothingUrls })
    })

    if (!response.ok) throw new Error('Try-on failed')

    const data = await response.json()
    setTryOnImage(data.imageUrl)
  } catch (err) {
    console.error('Try-on error:', err)
    setError(true)
  } finally {
    setLoading(false)
  }
}

  if (loading) {
    return (
      <div className="glass border border-border rounded-2xl p-12 flex flex-col items-center justify-center min-h-[500px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="w-16 h-16 text-primary mb-4" />
        </motion.div>
        <p className="text-lg font-semibold mb-2">AI Model Oluşturuluyor...</p>
        <p className="text-sm text-muted-foreground">Bu 10-20 saniye sürebilir</p>
      </div>
    )
  }

  if (error || !tryOnImage) {
    return (
      <div className="glass border border-border rounded-2xl p-8">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Model oluşturulamadı</p>
          <button
            onClick={generateTryOn}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass border border-border rounded-2xl overflow-hidden"
    >
      <div className="relative aspect-[3/4] bg-gradient-to-br from-primary/5 to-transparent">
        <img
          src={tryOnImage}
          alt="Virtual Try-On"
          className="w-full h-full object-cover"
        />
        
        {/* AI Badge */}
        <div className="absolute top-4 right-4 px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-bold flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          AI GENERATED
        </div>
      </div>

      <div className="p-4 text-center">
        <button
          onClick={generateTryOn}
          className="text-sm text-primary hover:underline"
        >
          Yeniden Oluştur
        </button>
      </div>
    </motion.div>
  )
}