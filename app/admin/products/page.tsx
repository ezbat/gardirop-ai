"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Package, Check, X, Eye, Filter, Search, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"

interface Product {
  id: string
  title: string
  description: string
  price: number
  category: string
  subcategory?: string
  brand?: string
  images: string[]
  stock_quantity: number
  moderation_status: 'pending' | 'approved' | 'rejected'
  moderation_notes?: string
  created_at: string
  seller: {
    id: string
    shop_name: string
    email: string
  }
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 12

  useEffect(() => {
    fetchProducts()
  }, [filter])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const url = filter === 'all'
        ? '/api/admin/products'
        : `/api/admin/products?status=${filter}`

      const response = await fetch(url, {
        headers: {
          'x-user-id': 'm3000'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (productId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      setActionLoading(true)
      const response = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'm3000'
        },
        body: JSON.stringify({
          productId,
          action,
          notes
        })
      })

      if (response.ok) {
        await fetchProducts()
        setSelectedProduct(null)
      }
    } catch (error) {
      console.error('Action failed:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.seller.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filter, searchTerm])

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-500 bg-green-500/10 border-green-500/20'
      case 'pending': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
      case 'rejected': return 'text-red-500 bg-red-500/10 border-red-500/20'
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20'
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Package className="w-10 h-10 text-primary" />
            Urun Moderasyonu
          </h1>
          <p className="text-muted-foreground">
            Satici urunlerini onaylayın veya reddedin
          </p>
        </div>

        {/* Filters */}
        <div className="glass border border-border rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Status Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Tumu ({products.length})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  filter === 'pending'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Bekleyen
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  filter === 'approved'
                    ? 'bg-green-500 text-white'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Onaylanan
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  filter === 'rejected'
                    ? 'bg-red-500 text-white'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Reddedilen
              </button>
            </div>

            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Urun, magaza veya kategori ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"
            />
            <p className="text-muted-foreground mt-4">Yukleniyor...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 glass border border-border rounded-2xl">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Urun bulunamadi</p>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedProducts.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass border border-border rounded-2xl overflow-hidden hover:border-primary/50 transition-colors"
              >
                {/* Product Image */}
                <div className="relative h-48 bg-secondary">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-muted-foreground" />
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(product.moderation_status)}`}>
                    {product.moderation_status === 'pending' && 'Bekleyen'}
                    {product.moderation_status === 'approved' && 'Onaylandi'}
                    {product.moderation_status === 'rejected' && 'Reddedildi'}
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1 truncate">{product.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {product.seller.shop_name}
                  </p>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-primary">
                      ₺{product.price.toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Stok: {product.stock_quantity}
                    </span>
                  </div>

                  <div className="flex gap-2 mb-3">
                    <span className="px-2 py-1 bg-secondary rounded-lg text-xs">
                      {product.category}
                    </span>
                    {product.brand && (
                      <span className="px-2 py-1 bg-secondary rounded-lg text-xs">
                        {product.brand}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedProduct(product)}
                      className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Detay
                    </button>
                    {product.moderation_status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAction(product.id, 'approve')}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAction(product.id, 'reject', 'Uygunsuz icerik')}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 glass border border-border rounded-xl hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Önceki
              </button>

              <div className="flex gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-xl font-semibold transition-colors ${
                          currentPage === page
                            ? "bg-primary text-primary-foreground"
                            : "glass border border-border hover:border-primary"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="w-10 h-10 flex items-center justify-center">...</span>
                  }
                  return null
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 glass border border-border rounded-xl hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Sonraki
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        )}

        {/* Product Detail Modal */}
        {selectedProduct && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass border border-border rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold">Urun Detaylari</h2>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Product Images */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {selectedProduct.images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${selectedProduct.title} - ${index + 1}`}
                    className="w-full h-48 object-cover rounded-xl"
                  />
                ))}
              </div>

              {/* Product Details */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Urun Adi</label>
                  <p className="font-semibold">{selectedProduct.title}</p>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground">Aciklama</label>
                  <p className="text-sm">{selectedProduct.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Fiyat</label>
                    <p className="font-semibold text-primary">₺{selectedProduct.price.toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Stok</label>
                    <p className="font-semibold">{selectedProduct.stock_quantity}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Kategori</label>
                    <p className="font-semibold">{selectedProduct.category}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Marka</label>
                    <p className="font-semibold">{selectedProduct.brand || 'Belirtilmemis'}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground">Satici</label>
                  <p className="font-semibold">{selectedProduct.seller.shop_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedProduct.seller.email}</p>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground">Durum</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(selectedProduct.moderation_status)}`}>
                    {selectedProduct.moderation_status === 'pending' && 'Bekleyen'}
                    {selectedProduct.moderation_status === 'approved' && 'Onaylandi'}
                    {selectedProduct.moderation_status === 'rejected' && 'Reddedildi'}
                  </span>
                </div>

                {selectedProduct.moderation_notes && (
                  <div>
                    <label className="text-sm text-muted-foreground">Moderasyon Notu</label>
                    <p className="text-sm">{selectedProduct.moderation_notes}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {selectedProduct.moderation_status === 'pending' && (
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => handleAction(selectedProduct.id, 'approve')}
                    disabled={actionLoading}
                    className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Onayla
                  </button>
                  <button
                    onClick={() => handleAction(selectedProduct.id, 'reject', 'Uygunsuz icerik')}
                    disabled={actionLoading}
                    className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    Reddet
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
