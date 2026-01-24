"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Upload, Plus, X, Loader2, Check } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { useLanguage } from "@/lib/language-context"

interface Product {
  id: string
  title: string
  images: string[]
  price: number
  category: string
  stock_quantity: number
}

export default function CreateOutfitPage() {
  const { t } = useLanguage()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [sellerId, setSellerId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    season: 'All Season',
    occasion: 'Casual',
    styleTags: [] as string[]
  })

  // Products
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  // Cover image
  const [coverImage, setCoverImage] = useState<{ name: string; data: string } | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  const seasons = ['All Season', 'Spring', 'Summer', 'Fall', 'Winter']
  const occasions = ['Casual', 'Formal', 'Sport', 'Party', 'Work']

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user?.id) {
      loadSellerData()
    }
  }, [session])

  const loadSellerData = async () => {
    try {
      // Get seller ID
      const { data: seller, error } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', session?.user?.id)
        .single()

      if (error || !seller) {
        alert(t('error'))
        router.push('/seller/apply')
        return
      }

      setSellerId(seller.id)

      // Load seller's products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, title, images, price, category, stock_quantity')
        .eq('seller_id', seller.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (productsError) {
        console.error('Load products error:', productsError)
      } else {
        setAvailableProducts(products || [])
      }
    } catch (error) {
      console.error('Load seller data error:', error)
    } finally {
      setLoadingProducts(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert(t('error'))
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(t('error'))
      return
    }

    // Read file as base64
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setCoverImage({ name: file.name, data: base64 })
      setCoverPreview(base64)
    }
    reader.readAsDataURL(file)
  }

  const toggleProduct = (productId: string) => {
    setSelectedProductIds(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId)
      } else {
        return [...prev, productId]
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.name.trim()) {
      alert(t('allFieldsRequired'))
      return
    }

    if (selectedProductIds.length < 2) {
      alert(t('selectAtLeastTwo'))
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/seller/outfits/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerId,
          name: formData.name,
          description: formData.description,
          season: formData.season,
          occasion: formData.occasion,
          styleTags: formData.styleTags,
          coverImageData: coverImage?.data,
          coverImageName: coverImage?.name,
          productIds: selectedProductIds
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('error'))
      }

      alert(t('outfitCreated'))
      router.push('/seller/outfits')
    } catch (error: any) {
      console.error('Create outfit error:', error)
      alert(error.message || t('error'))
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loadingProducts) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    )
  }

  const selectedProducts = availableProducts.filter(p => selectedProductIds.includes(p.id))

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/seller/outfits" className="p-2 hover:bg-muted rounded-lg">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="font-serif text-3xl font-bold">{t('createOutfit')}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="glass border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold mb-4">{t('personalInfo')}</h2>

            <div>
              <label className="block text-sm font-semibold mb-2">{t('outfitName')} *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('outfitName')}
                className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">{t('outfitDescription')}</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('outfitDescription')}
                rows={3}
                className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">{t('season')}</label>
                <select
                  value={formData.season}
                  onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                  className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary"
                >
                  {seasons.map(season => (
                    <option key={season} value={season}>{season}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">{t('occasion')}</label>
                <select
                  value={formData.occasion}
                  onChange={(e) => setFormData({ ...formData, occasion: e.target.value })}
                  className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary"
                >
                  {occasions.map(occasion => (
                    <option key={occasion} value={occasion}>{occasion}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Cover Image */}
          <div className="glass border border-border rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">{t('coverImage')}</h2>
            <div className="space-y-4">
              {coverPreview ? (
                <div className="relative w-full h-64 rounded-xl overflow-hidden">
                  <Image src={coverPreview} alt="Cover" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => { setCoverImage(null); setCoverPreview(null) }}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="block w-full h-64 border-2 border-dashed border-border rounded-xl hover:border-primary cursor-pointer flex flex-col items-center justify-center gap-2">
                  <Upload className="w-12 h-12 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('coverImage')}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Product Selection */}
          <div className="glass border border-border rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">{t('selectProducts')} ({t('selectAtLeast2Products')}) *</h2>

            {selectedProducts.length > 0 && (
              <div className="mb-4 p-4 bg-primary/10 rounded-xl">
                <p className="text-sm font-semibold text-primary">{selectedProducts.length} {t('products')}</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {availableProducts.map(product => {
                const isSelected = selectedProductIds.includes(product.id)
                return (
                  <motion.div
                    key={product.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => toggleProduct(product.id)}
                    className={`relative glass border-2 rounded-xl overflow-hidden cursor-pointer transition-all ${
                      isSelected ? 'border-primary' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center z-10">
                        <Check className="w-4 h-4" />
                      </div>
                    )}

                    <div className="aspect-square bg-muted relative">
                      {product.images?.[0] ? (
                        <Image src={product.images[0]} alt={product.title} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                      )}
                    </div>

                    <div className="p-3">
                      <p className="font-semibold text-sm truncate">{product.title}</p>
                      <p className="text-xs text-muted-foreground">{product.category}</p>
                      <p className="text-sm font-bold text-primary mt-1">€{product.price}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {availableProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">{t('noProductsYet')}</p>
                <Link href="/seller/products/create" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold inline-block">
                  {t('addProduct')}
                </Link>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <Link
              href="/seller/outfits"
              className="px-6 py-3 glass border border-border rounded-xl font-semibold hover:border-primary flex-1 text-center"
            >
              {t('cancel')}
            </Link>
            <button
              type="submit"
              disabled={loading || selectedProductIds.length < 2}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('creatingOutfit')}
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  {t('createOutfitButton')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
