'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Package, Loader2, Plus, Edit, Trash2, Eye, Search, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import FloatingParticles from '@/components/floating-particles'
import Link from 'next/link'
import Image from 'next/image'

interface Product {
  id: string
  title: string
  description: string
  price: number
  stock: number
  images: string[]
  category: string
  status: string
  moderation_status?: string
  created_at: string
}

export default function SellerProductsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id

  const [seller, setSeller] = useState<any>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (userId) {
      checkSellerAndLoadProducts()
    }
  }, [userId])

  useEffect(() => {
    filterProducts()
  }, [searchQuery, statusFilter, products])

  const checkSellerAndLoadProducts = async () => {
    try {
      const { data: sellerData, error: sellerError } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (sellerError || !sellerData) {
        alert('Satıcı profili bulunamadı!')
        router.push('/seller-application')
        return
      }

      setSeller(sellerData)
      await loadProducts(sellerData.id)
    } catch (error) {
      console.error('Check seller error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProducts = async (sellerId: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Load products error:', error)
    }
  }

  const filterProducts = () => {
    let filtered = products

    if (statusFilter !== 'all') {
      filtered = filtered.filter(product =>
        (product.moderation_status || product.status) === statusFilter
      )
    }

    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredProducts(filtered)
  }

  const deleteProduct = async (productId: string) => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) throw error

      setProducts(products.filter(p => p.id !== productId))
      alert('✅ Ürün silindi!')
    } catch (error) {
      console.error('Delete product error:', error)
      alert('Ürün silinemedi!')
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
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-serif text-4xl font-bold mb-2">Ürünlerim</h1>
              <p className="text-muted-foreground">Toplam {products.length} ürün</p>
            </div>
            <Link
              href="/seller/products/create"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Yeni Ürün
            </Link>
          </div>

          {/* Filters */}
          <div className="glass border border-border rounded-2xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Ürün ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex-1 px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="active">Aktif</option>
                  <option value="approved">Onaylı</option>
                  <option value="pending">Beklemede</option>
                  <option value="rejected">Reddedildi</option>
                </select>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Henüz ürün yok</h3>
              <p className="text-muted-foreground mb-6">İlk ürününüzü ekleyerek başlayın</p>
              <Link
                href="/seller/products/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                <Plus className="w-5 h-5" />
                Ürün Ekle
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map(product => (
                <div key={product.id} className="glass border border-border rounded-2xl overflow-hidden hover:border-primary transition-colors">
                  {/* Product Image */}
                  <div className="relative h-64 bg-muted">
                    {product.images && product.images[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      {(() => {
                        const status = product.moderation_status || product.status || 'active'
                        return (
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            status === 'approved' || status === 'active' ? 'bg-green-500 text-white' :
                            status === 'pending' ? 'bg-yellow-500 text-white' :
                            'bg-red-500 text-white'
                          }`}>
                            {status === 'approved' || status === 'active' ? 'Aktif' :
                             status === 'pending' ? 'Beklemede' :
                             'Reddedildi'}
                          </span>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-1">{product.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{product.description}</p>

                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold">€{product.price}</span>
                      <span className="text-sm text-muted-foreground">
                        Stok: {product.stock}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/store/${product.id}`}
                        className="flex-1 px-4 py-2 border border-border rounded-xl hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Görüntüle
                      </Link>
                      <Link
                        href={`/seller/products/${product.id}`}
                        className="px-4 py-2 border border-border rounded-xl hover:bg-primary/5 transition-colors inline-flex items-center justify-center"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="px-4 py-2 border border-red-500 text-red-500 rounded-xl hover:bg-red-500/5 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
