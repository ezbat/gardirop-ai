"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Plus, Loader2, Trash2, Edit, Eye } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useLanguage } from "@/lib/language-context"

interface Outfit {
  id: string
  name: string
  description: string | null
  season: string
  occasion: string
  coverImageUrl: string | null
  isActive: boolean
  productsCount: number
  createdAt: string
}

export default function SellerOutfitsPage() {
  const { t } = useLanguage()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [loading, setLoading] = useState(true)
  const [sellerId, setSellerId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user?.id) {
      loadSellerAndOutfits()
    }
  }, [session])

  const loadSellerAndOutfits = async () => {
    try {
      // Get seller ID
      const { data: seller, error } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', session?.user?.id)
        .single()

      if (error || !seller) {
        router.push('/seller/apply')
        return
      }

      setSellerId(seller.id)

      // Load outfits
      const response = await fetch(`/api/seller/outfits/list?sellerId=${seller.id}`)
      const data = await response.json()

      if (response.ok) {
        setOutfits(data.outfits || [])
      }
    } catch (error) {
      console.error('Load outfits error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (outfitId: string, outfitName: string) => {
    if (!confirm(`"${outfitName}" ${t('deleteOutfitConfirm')}`)) {
      return
    }

    try {
      const response = await fetch('/api/seller/outfits/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outfitId })
      })

      if (response.ok) {
        setOutfits(prev => prev.filter(o => o.id !== outfitId))
        alert(t('outfitDeleted'))
      } else {
        const data = await response.json()
        alert(data.error || t('deleteFailed'))
      }
    } catch (error) {
      console.error('Delete outfit error:', error)
      alert(t('error'))
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-4xl font-bold mb-2">{t('myOutfitCollections')}</h1>
            <p className="text-muted-foreground">{t('createOutfitsFromProducts')}</p>
          </div>
          <Link
            href="/seller/outfits/create"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {t('newOutfitLabel')}
          </Link>
        </div>

        {/* Outfits Grid */}
        {outfits.length === 0 ? (
          <div className="text-center py-20 glass border border-border rounded-2xl">
            <div className="text-9xl mb-6">👗</div>
            <h3 className="text-2xl font-bold mb-3">{t('noOutfitsCreated')}</h3>
            <p className="text-muted-foreground mb-6">
              {t('createSpecialOutfits')}
            </p>
            <Link
              href="/seller/outfits/create"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 inline-block"
            >
              {t('createFirstOutfit')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {outfits.map((outfit, idx) => (
              <motion.div
                key={outfit.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass border border-border rounded-2xl overflow-hidden hover:border-primary transition-colors group"
              >
                {/* Cover Image */}
                <div className="relative aspect-video bg-muted">
                  {outfit.coverImageUrl ? (
                    <Image
                      src={outfit.coverImageUrl}
                      alt={outfit.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">
                      👕
                    </div>
                  )}

                  {!outfit.isActive && (
                    <div className="absolute top-2 left-2 px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
                      {t('inactive')}
                    </div>
                  )}

                  <div className="absolute top-2 right-2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                    {outfit.productsCount} {t('products')}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1 truncate">{outfit.name}</h3>
                  {outfit.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {outfit.description}
                    </p>
                  )}

                  <div className="flex gap-2 mb-4">
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                      {outfit.season}
                    </span>
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                      {outfit.occasion}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/outfits/${outfit.id}`}
                      className="flex-1 px-4 py-2 glass border border-border rounded-xl font-semibold text-sm hover:border-primary flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      {t('view')}
                    </Link>
                    <button
                      onClick={() => handleDelete(outfit.id, outfit.name)}
                      className="px-4 py-2 glass border border-border rounded-xl hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
                      title={t('delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-muted-foreground mt-3">
                    {new Date(outfit.createdAt).toLocaleDateString('tr-TR')}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
