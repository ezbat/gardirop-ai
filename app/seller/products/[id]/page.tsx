"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { Package, Loader2, Save, ArrowLeft, Upload, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import FloatingParticles from '@/components/floating-particles'
import Link from 'next/link'

export default function EditProductPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string
  const userId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    original_price: '',
    category: '',
    brand: '',
    color: '',
    sizes: [] as string[],
    stock_quantity: '',
    images: [] as string[]
  })

  useEffect(() => {
    if (userId && productId) {
      loadProduct()
    }
  }, [userId, productId])

  const loadProduct = async () => {
    try {
      const { data: seller } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (!seller) {
        alert('Satıcı bulunamadı!')
        router.push('/seller/dashboard')
        return
      }

      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('seller_id', seller.id)
        .single()

      if (error || !product) {
        alert('Ürün bulunamadı!')
        router.push('/seller/products')
        return
      }

      setFormData({
        title: product.title || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        original_price: product.original_price?.toString() || '',
        category: product.category || '',
        brand: product.brand || '',
        color: product.color || '',
        sizes: product.sizes || [],
        stock_quantity: product.stock_quantity?.toString() || '',
        images: product.images || []
      })
    } catch (error) {
      console.error('Load product error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setSaving(true)
    try {
      const { data: seller } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (!seller) {
        alert('Satıcı bulunamadı!')
        return
      }

      const { error } = await supabase
        .from('products')
        .update({
          title: formData.title,
          description: formData.description,
          price: parseFloat(formData.price),
          original_price: formData.original_price ? parseFloat(formData.original_price) : null,
          category: formData.category,
          brand: formData.brand || null,
          color: formData.color || null,
          sizes: formData.sizes,
          stock_quantity: parseInt(formData.stock_quantity),
          images: formData.images,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId)
        .eq('seller_id', seller.id)

      if (error) throw error

      alert('✅ Ürün başarıyla güncellendi!')
      router.push('/seller/products')
    } catch (error) {
      console.error('Update product error:', error)
      alert('❌ Ürün güncellenirken hata oluştu!')
    } finally {
      setSaving(false)
    }
  }

  const addSize = (size: string) => {
    if (size && !formData.sizes.includes(size)) {
      setFormData({ ...formData, sizes: [...formData.sizes, size] })
    }
  }

  const removeSize = (size: string) => {
    setFormData({ ...formData, sizes: formData.sizes.filter(s => s !== size) })
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
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/seller/products"
              className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="font-serif text-3xl font-bold">Produkt bearbeiten</h1>
              <p className="text-muted-foreground">Aktualisieren Sie Ihre Produktinformationen</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="glass border border-border rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4">Grundinformationen</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Produktname *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Beschreibung</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Preis (€) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                      className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Originalpreis (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.original_price}
                      onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                      className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Kategorie *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                  >
                    <option value="">Wählen Sie eine Kategorie</option>
                    <option value="Oberteile">Oberteile</option>
                    <option value="Hosen">Hosen</option>
                    <option value="Kleider">Kleider</option>
                    <option value="Schuhe">Schuhe</option>
                    <option value="Accessoires">Accessoires</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Marke</label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Farbe</label>
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Lagerbestand *</label>
                  <input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    required
                    className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Sizes */}
            <div className="glass border border-border rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4">Größen</h2>

              <div className="flex gap-2 flex-wrap mb-4">
                {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => addSize(size)}
                    className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
                      formData.sizes.includes(size)
                        ? 'bg-primary text-primary-foreground'
                        : 'glass border border-border hover:border-primary'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>

              {formData.sizes.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {formData.sizes.map(size => (
                    <span
                      key={size}
                      className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-semibold flex items-center gap-2"
                    >
                      {size}
                      <button
                        type="button"
                        onClick={() => removeSize(size)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Wird gespeichert...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Änderungen speichern
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
