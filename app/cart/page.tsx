'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag, Loader2 } from 'lucide-react'
import FloatingParticles from '@/components/floating-particles'

interface CartItem {
  id: string
  product: {
    id: string
    title: string
    price: number
    images: string[]
    stock_quantity: number
  }
  quantity: number
  selectedSize?: string
}

export default function CartPage() {
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCart()
  }, [])

  const loadCart = () => {
    try {
      const saved = localStorage.getItem('cart')
      if (saved) {
        setCartItems(JSON.parse(saved))
      }
    } catch (error) {
      console.error('Load cart error:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = (itemId: string, newQuantity: number) => {
    const updated = cartItems.map(item => {
      if (item.id === itemId) {
        // Check stock limit
        const maxQuantity = item.product.stock_quantity
        return { ...item, quantity: Math.min(Math.max(1, newQuantity), maxQuantity) }
      }
      return item
    })
    setCartItems(updated)
    localStorage.setItem('cart', JSON.stringify(updated))
  }

  const removeItem = (itemId: string) => {
    const updated = cartItems.filter(item => item.id !== itemId)
    setCartItems(updated)
    localStorage.setItem('cart', JSON.stringify(updated))
  }

  const clearCart = () => {
    if (confirm('Sepeti tamamen boşaltmak istediğinizden emin misiniz?')) {
      setCartItems([])
      localStorage.removeItem('cart')
    }
  }

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  }

  const calculateShipping = () => {
    const subtotal = calculateSubtotal()
    return subtotal > 500 ? 0 : 29.99
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateShipping()
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
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Geri
            </button>
            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="text-sm text-red-500 hover:text-red-600 transition-colors"
              >
                Sepeti Temizle
              </button>
            )}
          </div>

          <h1 className="font-serif text-4xl font-bold mb-8">Sepetim</h1>

          {/* Empty Cart */}
          {cartItems.length === 0 ? (
            <div className="glass border border-border rounded-2xl p-20 text-center">
              <ShoppingBag className="w-20 h-20 mx-auto mb-6 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">Sepetiniz Boş</h2>
              <p className="text-muted-foreground mb-6">
                Hemen alışverişe başlayın ve favori ürünlerinizi sepete ekleyin!
              </p>
              <button
                onClick={() => router.push('/store')}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Alışverişe Başla
              </button>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left: Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {cartItems.map(item => (
                  <div key={item.id} className="glass border border-border rounded-2xl p-6">
                    <div className="flex gap-6">
                      {/* Image */}
                      <div
                        className="w-32 h-32 glass border border-border rounded-xl overflow-hidden cursor-pointer"
                        onClick={() => router.push(`/store/${item.product.id}`)}
                      >
                        <img
                          src={item.product.images[0]}
                          alt={item.product.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <h3
                          className="font-bold text-lg mb-2 cursor-pointer hover:text-primary transition-colors"
                          onClick={() => router.push(`/store/${item.product.id}`)}
                        >
                          {item.product.title}
                        </h3>

                        {item.selectedSize && (
                          <p className="text-sm text-muted-foreground mb-2">
                            Beden: {item.selectedSize}
                          </p>
                        )}

                        <p className="text-2xl font-bold text-primary mb-4">
                          ₺{item.product.price.toFixed(2)}
                        </p>

                        <div className="flex items-center gap-4">
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="p-2 glass border border-border rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-50"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-12 text-center font-bold">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={item.quantity >= item.product.stock_quantity}
                              className="p-2 glass border border-border rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-50"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Stock Warning */}
                        {item.quantity >= item.product.stock_quantity && (
                          <p className="text-sm text-orange-500 mt-2">
                            ⚠️ Maksimum stok adedine ulaştınız
                          </p>
                        )}
                      </div>

                      {/* Item Total */}
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground mb-1">Toplam</p>
                        <p className="text-2xl font-bold">
                          ₺{(item.product.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right: Order Summary */}
              <div className="lg:col-span-1">
                <div className="glass border border-border rounded-2xl p-6 sticky top-8">
                  <h2 className="text-2xl font-bold mb-6">Sipariş Özeti</h2>

                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Ara Toplam</span>
                      <span className="font-semibold">₺{calculateSubtotal().toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Kargo</span>
                      <span className={`font-semibold ${calculateShipping() === 0 ? 'text-green-500' : ''}`}>
                        {calculateShipping() === 0 ? 'ÜCRETSİZ' : `₺${calculateShipping().toFixed(2)}`}
                      </span>
                    </div>

                    {calculateSubtotal() < 500 && calculateSubtotal() > 0 && (
                      <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                        <p className="text-xs text-primary font-semibold">
                          🎉 ₺{(500 - calculateSubtotal()).toFixed(2)} daha alışveriş yapın, kargo ücretsiz!
                        </p>
                      </div>
                    )}

                    <div className="border-t border-border pt-4">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Toplam</span>
                        <span className="text-primary">₺{calculateTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push('/checkout')}
                    className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
                  >
                    Ödemeye Geç
                  </button>

                  <button
                    onClick={() => router.push('/store')}
                    className="w-full px-6 py-3 mt-3 glass border border-border rounded-xl font-semibold hover:border-primary transition-colors"
                  >
                    Alışverişe Devam Et
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}