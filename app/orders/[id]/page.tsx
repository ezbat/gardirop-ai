'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Package, Truck, CheckCircle, Clock, Loader2, MapPin, CreditCard, MessageCircle, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import FloatingParticles from '@/components/floating-particles'

interface Order {
  id: string
  created_at: string
  status: string
  total_amount: number
  shipping_cost: number
  shipping_info: any
  payment_method: string
  order_items: any[]
}

const statusSteps = [
  { key: 'pending', label: 'Sipariş Alındı', icon: Clock },
  { key: 'processing', label: 'Hazırlanıyor', icon: Package },
  { key: 'shipped', label: 'Kargoda', icon: Truck },
  { key: 'delivered', label: 'Teslim Edildi', icon: CheckCircle }
]

const statusIndex: any = {
  pending: 0,
  processing: 1,
  shipped: 2,
  delivered: 3,
  cancelled: -1
}

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orderId) {
      loadOrder()
    }
  }, [orderId])

  const loadOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product:products (
              id,
              title,
              images,
              seller_id
            )
          )
        `)
        .eq('id', orderId)
        .single()

      if (error) throw error

      console.log('📦 Order loaded:', data)
      setOrder(data)
    } catch (error) {
      console.error('Load order error:', error)
      alert('Sipariş bulunamadı!')
      router.push('/orders')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Sipariş bulunamadı</p>
      </div>
    )
  }

  const currentStep = statusIndex[order.status]
  const isCancelled = order.status === 'cancelled'

  // Benzersiz satıcıları al
  const uniqueSellers = Array.from(new Set(order.order_items.map(item => item.product.seller_id)))

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <button onClick={() => router.back()} className="flex items-center gap-2 mb-6 hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Geri
          </button>

          <h1 className="font-serif text-4xl font-bold mb-2">Sipariş Detayı</h1>
          <p className="text-muted-foreground mb-8">Sipariş #{order.id.slice(0, 8).toUpperCase()}</p>

          {/* Order Status Timeline */}
          {!isCancelled ? (
            <div className="glass border border-border rounded-2xl p-6 mb-6">
              <h2 className="text-xl font-bold mb-6">Sipariş Durumu</h2>
              <div className="relative">
                {/* Progress Line */}
                <div className="absolute top-6 left-0 right-0 h-1 bg-border">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${(currentStep / (statusSteps.length - 1)) * 100}%` }}
                  />
                </div>

                {/* Steps */}
                <div className="relative flex justify-between">
                  {statusSteps.map((step, index) => {
                    const Icon = step.icon
                    const isCompleted = index <= currentStep
                    const isActive = index === currentStep

                    return (
                      <div key={step.key} className="flex flex-col items-center gap-2">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                            isCompleted
                              ? 'bg-primary text-primary-foreground'
                              : 'glass border-2 border-border'
                          } ${isActive ? 'scale-110 shadow-lg' : ''}`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <p className={`text-xs font-semibold text-center max-w-[80px] ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {step.label}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass border border-red-500 rounded-2xl p-6 mb-6 bg-red-500/10">
              <p className="text-center text-red-500 font-bold text-lg">❌ Sipariş İptal Edildi</p>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Shipping Info */}
            <div className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Teslimat Bilgileri</h2>
              </div>
              <div className="space-y-2 text-sm">
                <p><strong>Ad Soyad:</strong> {order.shipping_info.fullName}</p>
                <p><strong>Telefon:</strong> {order.shipping_info.phone}</p>
                <p><strong>Adres:</strong> {order.shipping_info.address}</p>
                <p><strong>Şehir:</strong> {order.shipping_info.city}, {order.shipping_info.district}</p>
                {order.shipping_info.postalCode && (
                  <p><strong>Posta Kodu:</strong> {order.shipping_info.postalCode}</p>
                )}
              </div>
            </div>

            {/* Payment Info */}
            <div className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Ödeme Bilgileri</h2>
              </div>
              <div className="space-y-2 text-sm">
                <p><strong>Ödeme Yöntemi:</strong> {order.payment_method === 'credit_card' ? 'Kredi/Banka Kartı' : 'Kapıda Ödeme'}</p>
                <p><strong>Sipariş Tarihi:</strong> {new Date(order.created_at).toLocaleDateString('tr-TR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="glass border border-border rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Sipariş Özeti</h2>
            <div className="space-y-4 mb-4">
              {order.order_items.map((item: any) => (
                <div key={item.id} className="flex gap-4 pb-4 border-b border-border last:border-0">
                  <img
                    src={item.product.images[0]}
                    alt={item.product.title}
                    className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => router.push(`/store/${item.product.id}`)}
                  />
                  <div className="flex-1">
                    <h3 
                      className="font-semibold mb-1 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => router.push(`/store/${item.product.id}`)}
                    >
                      {item.product.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Beden: {item.selected_size || 'Yok'} | Adet: {item.quantity}
                    </p>
                    <p className="font-bold text-primary">€{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Ara Toplam</span>
                <span>€{(order.total_amount - order.shipping_cost).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Kargo</span>
                <span className={order.shipping_cost === 0 ? 'text-green-500 font-semibold' : ''}>
                  {order.shipping_cost === 0 ? 'ÜCRETSİZ' : `€${order.shipping_cost.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                <span>Toplam</span>
                <span className="text-primary">€{order.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {/* Satıcıyla İletişim */}
            <div className="glass border border-border rounded-xl p-4">
              <p className="font-semibold mb-3">Satıcılarla İletişim</p>
              <div className="space-y-2">
                {uniqueSellers.map(sellerId => {
                  const sellerProducts = order.order_items.filter(item => item.product.seller_id === sellerId)
                  return (
                    <button
                      key={sellerId}
                      onClick={() => router.push(`/messages?to=${sellerId}`)}
                      className="w-full px-4 py-3 glass border border-border rounded-xl hover:border-primary transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <MessageCircle className="w-5 h-5 text-primary" />
                        <div className="text-left">
                          <p className="font-semibold text-sm">Satıcıyla İletişim</p>
                          <p className="text-xs text-muted-foreground">
                            {sellerProducts.length} ürün
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </button>
                  )
                })}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/store')}
                className="flex-1 px-6 py-3 glass border border-border rounded-xl font-semibold hover:border-primary transition-colors"
              >
                Alışverişe Devam Et
              </button>
              <button
                onClick={() => router.push('/orders')}
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Tüm Siparişler
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
