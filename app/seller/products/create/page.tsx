'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react' // ← YENİ EKLEME
import { ArrowLeft, Upload, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import FloatingParticles from '@/components/floating-particles'

const categories = [
  'Üst Giyim',
  'Alt Giyim', 
  'Elbise',
  'Dış Giyim',
  'Ayakkabı',
  'Çanta',
  'Aksesuar',
  'Spor Giyim',
  'İç Giyim'
]

const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

export default function SellerProductCreatePage() {
  const router = useRouter()
  const { data: session } = useSession() // ← YENİ EKLEME
  const userId = session?.user?.id // ← YENİ EKLEME
  
  const [seller, setSeller] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    originalPrice: '',
    category: 'Üst Giyim',
    brand: '',
    color: '',
    sizes: [] as string[],
    stockQuantity: '1'
  })

  useEffect(() => {
    if (userId) checkSellerAuth() // ← DEĞİŞTİRİLDİ
  }, [userId]) // ← DEĞİŞTİRİLDİ

  const checkSellerAuth = async () => {
    try {
      if (!userId) { // ← DEĞİŞTİRİLDİ
        router.push('/seller/login')
        return
      }

      const { data: sellerData } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', userId) // ← DEĞİŞTİRİLDİ
        .single()

      if (!sellerData) {
        router.push('/seller/register')
        return
      }

      setSeller(sellerData)
    } catch (error) {
      console.error('Auth check error:', error)
      router.push('/seller/login')
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (images.length + files.length > 5) {
      alert('Maksimum 5 resim yükleyebilirsiniz!')
      return
    }

    setImages([...images, ...files])
    
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
    setImagePreviews(imagePreviews.filter((_, i) => i !== index))
  }

  const toggleSize = (size: string) => {
    if (formData.sizes.includes(size)) {
      setFormData({ ...formData, sizes: formData.sizes.filter(s => s !== size) })
    } else {
      setFormData({ ...formData, sizes: [...formData.sizes, size] })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!seller || images.length === 0) {
      alert('En az 1 resim yüklemelisiniz!')
      return
    }

    setSubmitting(true)
    
    try {
      console.log('🚀 Starting product creation...')
      
      // Convert images to base64
      const imageBase64Array = await Promise.all(
        images.map((image) => {
          return new Promise<{ name: string; data: string }>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              resolve({
                name: image.name,
                data: reader.result as string
              })
            }
            reader.onerror = reject
            reader.readAsDataURL(image)
          })
        })
      )

      console.log('📸 Images converted to base64:', imageBase64Array.length)

      // Send to API
      const response = await fetch('/api/seller/products/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerId: seller.id,
          title: formData.title,
          description: formData.description,
          price: formData.price,
          originalPrice: formData.originalPrice,
          category: formData.category,
          brand: formData.brand,
          color: formData.color,
          sizes: formData.sizes,
          stockQuantity: formData.stockQuantity,
          images: imageBase64Array
        })
      })

      const result = await response.json()
      
      console.log('📦 API Response:', result)

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to create product')
      }

      alert('✅ Ürün başarıyla eklendi!')
      router.push('/seller/dashboard')
      
    } catch (error: any) {
      console.error('❌ Create product error:', error)
      alert('Ürün eklenemedi: ' + (error.message || 'Bilinmeyen hata'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-3xl">
          <button onClick={() => router.back()} className="flex items-center gap-2 mb-6 hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Geri
          </button>

          <h1 className="font-serif text-4xl font-bold mb-8">Yeni Ürün Ekle</h1>

          <form onSubmit={handleSubmit} className="glass border border-border rounded-2xl p-6 space-y-6">
            {/* Images */}
            <div>
              <label className="block text-sm font-semibold mb-2">Ürün Resimleri * (Max 5)</label>
              <div className="grid grid-cols-5 gap-3">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square">
                    <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                    <button type="button" onClick={() => removeImage(index)} className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full">
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
                {images.length < 5 && (
                  <label className="aspect-square border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors flex items-center justify-center">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold mb-2">Ürün Başlığı *</label>
              <input 
                type="text" 
                value={formData.title} 
                onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                placeholder="Örn: Siyah Deri Ceket" 
                required 
                maxLength={100} 
                className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary" 
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold mb-2">Açıklama</label>
              <textarea 
                value={formData.description} 
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                placeholder="Ürün detayları..." 
                rows={4} 
                maxLength={1000} 
                className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary resize-none" 
              />
            </div>

            {/* Price */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Fiyat * (₺)</label>
                <input 
                  type="number" 
                  value={formData.price} 
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })} 
                  placeholder="299.99" 
                  required 
                  min="0" 
                  step="0.01" 
                  className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Eski Fiyat (₺)</label>
                <input 
                  type="number" 
                  value={formData.originalPrice} 
                  onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })} 
                  placeholder="399.99" 
                  min="0" 
                  step="0.01" 
                  className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary" 
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold mb-2">Kategori *</label>
              <select 
                value={formData.category} 
                onChange={(e) => setFormData({ ...formData, category: e.target.value })} 
                className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            {/* Brand & Color */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Marka</label>
                <input 
                  type="text" 
                  value={formData.brand} 
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })} 
                  placeholder="Örn: Zara" 
                  className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Renk</label>
                <input 
                  type="text" 
                  value={formData.color} 
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })} 
                  placeholder="Örn: Siyah" 
                  className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary" 
                />
              </div>
            </div>

            {/* Sizes */}
            <div>
              <label className="block text-sm font-semibold mb-2">Bedenler</label>
              <div className="flex gap-2 flex-wrap">
                {sizeOptions.map(size => (
                  <button 
                    key={size} 
                    type="button" 
                    onClick={() => toggleSize(size)} 
                    className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
                      formData.sizes.includes(size) 
                        ? 'bg-primary text-primary-foreground' 
                        : 'glass border border-border'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Stock */}
            <div>
              <label className="block text-sm font-semibold mb-2">Stok Adedi *</label>
              <input 
                type="number" 
                value={formData.stockQuantity} 
                onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })} 
                placeholder="10" 
                required 
                min="0" 
                className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary" 
              />
            </div>

            {/* Submit */}
            <button 
              type="submit" 
              disabled={submitting} 
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {submitting ? 'Ekleniyor...' : 'Ürünü Ekle'}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}