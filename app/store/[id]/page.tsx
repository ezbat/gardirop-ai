'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, ShoppingCart, Heart, Share2, Truck, ShieldCheck, Loader2, Plus, Minus, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import FloatingParticles from '@/components/floating-particles'

interface Product {
  id: string
  seller_id: string
  title: string
  description: string | null
  price: number
  original_price: number | null
  category: string
  brand: string | null
  color: string | null
  sizes: string[]
  stock_quantity: number
  images: string[]
  created_at: string
}

export default function ProductDetailPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])

  useEffect(() => {
    if (productId) {
      loadProduct()
    }
  }, [productId])

  const loadProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (error) throw error

      setProduct(data)
      if (data.sizes && data.sizes.length > 0) {
        setSelectedSize(data.sizes[0])
      }

      loadRelatedProducts(data.category, productId)
    } catch (error) {
      console.error('Load product error:', error)
      alert('Ürün bulunamadı!')
      router.push('/store')
    } finally {
      setLoading(false)
    }
  }

  const loadRelatedProducts = async (category: string, excludeId: string) => {
    try {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('category', category)
        .neq('id', excludeId)
        .limit(4)

      setRelatedProducts(data || [])
    } catch (error) {
      console.error('Load related products error:', error)
    }
  }

  const addToCart = () => {
    if (!product) return
    if (!selectedSize && product.sizes.length > 0) {
      alert('Lütfen beden seçin!')
      return
    }

    const cart = JSON.parse(localStorage.getItem('cart') || '[]')
    const existingIndex = cart.findIndex(
      (item: any) => item.product.id === product.id && item.selectedSize === selectedSize
    )

    if (existingIndex > -1) {
      cart[existingIndex].quantity += quantity
    } else {
      cart.push({
        id: Date.now().toString(),
        product: product,
        quantity: quantity,
        selectedSize: selectedSize
      })
    }

    localStorage.setItem('cart', JSON.stringify(cart))
    alert('✅ Ürün sepete eklendi!')
  }

  const shareProduct = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.title,
        text: product?.description || '',
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link kopyalandı!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Ürün bulunamadı</p>
      </div>
    )
  }

  const discountPercent = product.original_price && product.original_price > product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 mb-6 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Geri
          </button>

          {/* Product Details */}
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            {/* Left: Images */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="aspect-square glass border border-border rounded-2xl overflow-hidden">
                <img
                  src={product.images[selectedImage]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Thumbnail Images */}
              {product.images.length > 1 && (
                <div className="grid grid-cols-5 gap-3">
                  {product.images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`aspect-square glass border rounded-xl overflow-hidden transition-all ${
                        selectedImage === index ? 'border-primary ring-2 ring-primary' : 'border-border'
                      }`}
                    >
                      <img src={img} alt={`${product.title} ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Info */}
            <div className="space-y-6">
              {/* Brand & Category */}
              <div className="flex items-center gap-2">
                {product.brand && (
                  <span className="text-sm font-semibold text-primary uppercase">{product.brand}</span>
                )}
                <span className="text-sm text-muted-foreground">• {product.category}</span>
              </div>

              {/* Title */}
              <h1 className="font-serif text-4xl font-bold">{product.title}</h1>

              {/* Price */}
              <div className="flex items-center gap-3">
                <p className="text-4xl font-bold text-primary">€{product.price.toFixed(2)}</p>
                {product.original_price && product.original_price > product.price && (
                  <>
                    <p className="text-2xl text-muted-foreground line-through">
                      €{product.original_price.toFixed(2)}
                    </p>
                    <span className="px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full">
                      -{discountPercent}%
                    </span>
                  </>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <div>
                  <h3 className="font-bold mb-2">Açıklama</h3>
                  <p className="text-muted-foreground">{product.description}</p>
                </div>
              )}

              {/* Color */}
              {product.color && (
                <div>
                  <h3 className="font-bold mb-2">Renk</h3>
                  <p className="text-muted-foreground">{product.color}</p>
                </div>
              )}

              {/* Size Selection */}
              {product.sizes && product.sizes.length > 0 && (
                <div>
                  <h3 className="font-bold mb-3">Beden Seçin</h3>
                  <div className="flex gap-2 flex-wrap">
                    {product.sizes.map(size => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                          selectedSize === size
                            ? 'bg-primary text-primary-foreground'
                            : 'glass border border-border hover:border-primary'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <h3 className="font-bold mb-3">Miktar</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="p-3 glass border border-border rounded-xl hover:bg-primary/10 transition-colors disabled:opacity-50"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                    disabled={quantity >= product.stock_quantity}
                    className="p-3 glass border border-border rounded-xl hover:bg-primary/10 transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-muted-foreground ml-4">
                    Stok: {product.stock_quantity}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={addToCart}
                  disabled={product.stock_quantity === 0}
                  className="flex-1 px-6 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {product.stock_quantity > 0 ? 'Sepete Ekle' : 'Stokta Yok'}
                </button>
                <button
                  onClick={() => alert('Favorilere eklendi!')}
                  className="p-4 glass border border-border rounded-xl hover:bg-primary/10 transition-colors"
                >
                  <Heart className="w-6 h-6" />
                </button>
                <button
                  onClick={shareProduct}
                  className="p-4 glass border border-border rounded-xl hover:bg-primary/10 transition-colors"
                >
                  <Share2 className="w-6 h-6" />
                </button>
              </div>

              {/* Satıcıya Sor Butonu */}
              <button
                onClick={() => router.push(`/messages?to=${product.seller_id}`)}
                className="w-full px-6 py-3 glass border border-primary rounded-xl font-semibold hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Satıcıya Sor
              </button>

              {/* Features */}
              <div className="glass border border-border rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Truck className="w-6 h-6 text-primary" />
                  <div>
                    <p className="font-semibold">Ücretsiz Kargo</p>
                    <p className="text-sm text-muted-foreground">500€ ve üzeri alışverişlerde</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                  <div>
                    <p className="font-semibold">Güvenli Alışveriş</p>
                    <p className="text-sm text-muted-foreground">256-bit SSL şifreleme</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Benzer Ürünler</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedProducts.map(relatedProduct => (
                  <div
                    key={relatedProduct.id}
                    onClick={() => router.push(`/store/${relatedProduct.id}`)}
                    className="glass border border-border rounded-2xl overflow-hidden hover:border-primary transition-all cursor-pointer group"
                  >
                    <div className="aspect-square bg-primary/5">
                      <img
                        src={relatedProduct.images[0]}
                        alt={relatedProduct.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold mb-2 line-clamp-2">{relatedProduct.title}</h3>
                      <p className="text-2xl font-bold text-primary">€{relatedProduct.price.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
