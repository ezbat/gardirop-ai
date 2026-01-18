'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, CreditCard, Truck, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase' // ← BURADA DÜZELTTİM (eğer lib/supabase.ts ise)
import FloatingParticles from '@/components/floating-particles'// ← BURADA DÜZELTTİM

interface CartItem {
  id: string
  product: any
  quantity: number
  selectedSize?: string
}

export default function CheckoutPage() {
  const router = useRouter()
  
  const [user, setUser] = useState<any>(null)
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

  const [paymentMethod, setPaymentMethod] = useState('credit_card')

  useEffect(() => {
    checkAuth()
    loadCart()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)
    setLoading(false)
  }

  const loadCart = () => {
    const saved = localStorage.getItem('cart')
    if (saved) {
      setCartItems(JSON.parse(saved))
    }
  }

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  }

  const calculateShipping = () => {
    return calculateTotal() > 500 ? 0 : 29.99
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          items: cartItems.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            selectedSize: item.selectedSize,
            price: item.product.price
          })),
          shippingInfo,
          paymentMethod,
          totalAmount: calculateTotal() + calculateShipping(),
          shippingCost: calculateShipping()
        })
      })

      if (!response.ok) throw new Error('Failed to create order')

      const { order } = await response.json()
      localStorage.removeItem('cart')
      
      alert('🎉 Siparişiniz başarıyla oluşturuldu!')
      router.push(`/orders/${order.id}`)
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Sipariş oluşturulamadı!')
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
        <h2 className="text-2xl font-bold mb-4">Sepetiniz Boş</h2>
        <button onClick={() => router.push('/marketplace')} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl">
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
                      className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                    />
                    <input
                      type="tel"
                      placeholder="Telefon *"
                      value={shippingInfo.phone}
                      onChange={(e) => setShippingInfo({...shippingInfo, phone: e.target.value})}
                      required
                      className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                    />
                    <textarea
                      placeholder="Adres *"
                      value={shippingInfo.address}
                      onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})}
                      required
                      rows={3}
                      className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary resize-none"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="İl *"
                        value={shippingInfo.city}
                        onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}
                        required
                        className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                      />
                      <input
                        type="text"
                        placeholder="İlçe *"
                        value={shippingInfo.district}
                        onChange={(e) => setShippingInfo({...shippingInfo, district: e.target.value})}
                        required
                        className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Posta Kodu"
                      value={shippingInfo.postalCode}
                      onChange={(e) => setShippingInfo({...shippingInfo, postalCode: e.target.value})}
                      className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div className="glass border border-border rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold">Ödeme Yöntemi</h2>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-4 glass border border-border rounded-xl cursor-pointer hover:border-primary transition-colors">
                      <input
                        type="radio"
                        name="payment"
                        value="credit_card"
                        checked={paymentMethod === 'credit_card'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-4 h-4"
                      />
                      <CreditCard className="w-5 h-5" />
                      <span>Kredi/Banka Kartı</span>
                    </label>
                    <label className="flex items-center gap-3 p-4 glass border border-border rounded-xl cursor-pointer hover:border-primary transition-colors">
                      <input
                        type="radio"
                        name="payment"
                        value="cod"
                        checked={paymentMethod === 'cod'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-4 h-4"
                      />
                      <Truck className="w-5 h-5" />
                      <span>Kapıda Ödeme</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {submitting ? 'İşleniyor...' : 'Siparişi Tamamla'}
                </button>
              </form>
            </div>

            {/* Right: Order Summary */}
            <div className="glass border border-border rounded-2xl p-6 h-fit">
              <h2 className="text-xl font-bold mb-4">Sipariş Özeti</h2>
              <div className="space-y-3 mb-4">
                {cartItems.map(item => (
                  <div key={item.id} className="flex gap-3">
                    <img src={item.product.images[0]} alt={item.product.title} className="w-16 h-16 object-cover rounded-lg" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{item.product.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.selectedSize} × {item.quantity}
                      </p>
                      <p className="text-sm font-bold">₺{(item.product.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Ara Toplam</span>
                  <span>₺{calculateTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Kargo</span>
                  <span className={calculateShipping() === 0 ? 'text-green-500' : ''}>
                    {calculateShipping() === 0 ? 'ÜCRETSİZ' : `₺${calculateShipping().toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                  <span>Toplam</span>
                  <span>₺{(calculateTotal() + calculateShipping()).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}