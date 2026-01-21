'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, MapPin, CreditCard, Truck, Loader2, Package } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import FloatingParticles from '@/components/floating-particles'

interface CartItem {
  id: string
  product: any
  quantity: number
  selectedSize?: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const userId = session?.user?.id
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    district: '',
    postalCode: ''
  })

 const paymentMethod = 'credit_card'

  useEffect(() => {
    checkAuth()
    loadCart()
  }, [])

  const checkAuth = async () => {
    if (!userId) {
      alert('Lütfen önce giriş yapın!')
      router.push('/login')
      return
    }
    setLoading(false)
  }

  const loadCart = () => {
    const saved = localStorage.getItem('cart')
    if (saved) {
      const items = JSON.parse(saved)
      if (items.length === 0) {
        alert('Sepetiniz boş!')
        router.push('/cart')
      }
      setCartItems(items)
    } else {
      alert('Sepetiniz boş!')
      router.push('/cart')
    }
  }

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  }

  const calculateShipping = () => {
    return calculateSubtotal() > 500 ? 0 : 29.99
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateShipping()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setSubmitting(true)
    try {
      console.log('🚀 Creating order...')

      // Create order
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          items: cartItems.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            selectedSize: item.selectedSize,
            price: item.product.price
          })),
          shippingInfo,
          paymentMethod,
          totalAmount: calculateTotal(),
          shippingCost: calculateShipping()
        })
      })

      const result = await response.json()
      console.log('📦 Order result:', result)

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create order')
      }

      // Clear cart
      localStorage.removeItem('cart')
      
      alert('🎉 Siparişiniz başarıyla oluşturuldu!')
      router.push(`/orders/${result.order.id}`)
    } catch (error: any) {
      console.error('Checkout error:', error)
      alert('❌ Sipariş oluşturulamadı: ' + (error.message || 'Bilinmeyen hata'))
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

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Package className="w-20 h-20 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-4">Sepetiniz Boş</h2>
        <button onClick={() => router.push('/store')} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl">
          Alışverişe Devam Et
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <button onClick={() => router.back()} className="flex items-center gap-2 mb-6 hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Geri
          </button>

          <h1 className="font-serif text-4xl font-bold mb-8">Ödeme</h1>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: Form */}
            <div className="lg:col-span-2 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Shipping Info */}
                <div className="glass border border-border rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <MapPin className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold">Teslimat Bilgileri</h2>
                  </div>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Ad Soyad *"
                      value={shippingInfo.fullName}
                      onChange={(e) => setShippingInfo({...shippingInfo, fullName: e.target.value})}
                      required
                      className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary"
                    />
                    <input
                      type="tel"
                      placeholder="Telefon *"
                      value={shippingInfo.phone}
                      onChange={(e) => setShippingInfo({...shippingInfo, phone: e.target.value})}
                      required
                      className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary"
                    />
                    <textarea
                      placeholder="Adres *"
                      value={shippingInfo.address}
                      onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})}
                      required
                      rows={3}
                      className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary resize-none"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="İl *"
                        value={shippingInfo.city}
                        onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}
                        required
                        className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary"
                      />
                      <input
                        type="text"
                        placeholder="İlçe *"
                        value={shippingInfo.district}
                        onChange={(e) => setShippingInfo({...shippingInfo, district: e.target.value})}
                        required
                        className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Posta Kodu"
                      value={shippingInfo.postalCode}
                      onChange={(e) => setShippingInfo({...shippingInfo, postalCode: e.target.value})}
                      className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Payment Method */}
               {/* Payment Method */}
<div className="glass border border-border rounded-2xl p-6">
  <div className="flex items-center gap-3 mb-4">
    <CreditCard className="w-5 h-5 text-primary" />
    <h2 className="text-xl font-bold">Ödeme Yöntemi</h2>
  </div>
  <div className="p-4 glass border border-primary rounded-xl">
    <div className="flex items-center gap-3">
      <CreditCard className="w-6 h-6 text-primary" />
      <div>
        <p className="font-semibold">Kredi/Banka Kartı</p>
        <p className="text-sm text-muted-foreground">Güvenli ödeme ile alışverişinizi tamamlayın</p>
      </div>
    </div>
  </div>
</div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {submitting ? 'İşleniyor...' : 'Siparişi Tamamla'}
                </button>
              </form>
            </div>

            {/* Right: Order Summary */}
            <div className="glass border border-border rounded-2xl p-6 h-fit sticky top-8">
              <h2 className="text-xl font-bold mb-4">Sipariş Özeti</h2>
              <div className="space-y-3 mb-4">
                {cartItems.map(item => (
                  <div key={item.id} className="flex gap-3 pb-3 border-b border-border last:border-0">
                    <img src={item.product.images[0]} alt={item.product.title} className="w-16 h-16 object-cover rounded-lg" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm line-clamp-1">{item.product.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.selectedSize} × {item.quantity}
                      </p>
                      <p className="text-sm font-bold text-primary">₺{(item.product.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Ara Toplam</span>
                  <span>₺{calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Kargo</span>
                  <span className={calculateShipping() === 0 ? 'text-green-500 font-semibold' : ''}>
                    {calculateShipping() === 0 ? 'ÜCRETSİZ' : `₺${calculateShipping().toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                  <span>Toplam</span>
                  <span className="text-primary">₺{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}