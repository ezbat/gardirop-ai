'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Package, Loader2, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import FloatingParticles from '@/components/floating-particles'

interface Order {
  id: string
  created_at: string
  status: string
  total_amount: number
  order_items: any[]
}

const statusColors: any = {
  pending: 'bg-yellow-500',
  processing: 'bg-blue-500',
  shipped: 'bg-purple-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500'
}

const statusLabels: any = {
  pending: 'Beklemede',
  processing: 'Hazırlanıyor',
  shipped: 'Kargoda',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal Edildi'
}

export default function OrdersPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const userId = session?.user?.id
  
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

 useEffect(() => {
  console.log('🔄 useEffect triggered, userId:', userId, 'session:', session?.user?.id)
  
  if (userId) {
    console.log('✅ userId exists, loading orders...')
    loadOrders()
  } else if (session === undefined) {
    console.log('⏳ Session loading...')
    // Session henüz yükleniyor, bekle
  } else if (session === null) {
    console.log('❌ No session, redirecting to login')
    router.push('/login')
  } else {
    console.log('⚠️ Session exists but no userId')
  }
}, [userId, session])


 const loadOrders = async () => {
  if (!userId) {
    console.log('❌ No userId, skipping load')
    return
  }

  try {
    console.log('🔍 Loading orders for user:', userId)

    // Önce siparişleri al
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    console.log('📊 Raw orders data:', ordersData)
    console.log('❌ Orders error:', ordersError)
    console.log('📦 Orders count:', ordersData?.length)

    if (ordersError) {
      console.error('❌ Orders error:', ordersError)
      throw ordersError
    }

    if (!ordersData || ordersData.length === 0) {
      console.log('⚠️ No orders found!')
      setOrders([])
      setLoading(false)
      return
    }

    console.log('✅ Found orders:', ordersData.length)

    // Her sipariş için order_items ve products'ı al
    const ordersWithItems = await Promise.all(
      ordersData.map(async (order) => {
        console.log('🔄 Processing order:', order.id)
        
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id)

        console.log('  📦 Items for order', order.id, ':', items?.length)

        if (itemsError) {
          console.error('❌ Order items error:', itemsError)
          return { ...order, order_items: [] }
        }

        // Her item için product bilgisini al
        const itemsWithProducts = await Promise.all(
          (items || []).map(async (item) => {
            const { data: product } = await supabase
              .from('products')
              .select('*')
              .eq('id', item.product_id)
              .single()

            console.log('    🛍️ Product loaded:', product?.title)
            return { ...item, product }
          })
        )

        return { ...order, order_items: itemsWithProducts }
      })
    )

    console.log('✅ Final orders with items:', ordersWithItems)
    setOrders(ordersWithItems)
  } catch (error) {
    console.error('❌ Load orders error:', error)
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

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="font-serif text-4xl font-bold mb-8">Siparişlerim</h1>

          {orders.length === 0 ? (
            <div className="glass border border-border rounded-2xl p-12 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-bold mb-2">Henüz sipariş yok</h2>
              <p className="text-muted-foreground mb-6">İlk siparişinizi vermek için alışverişe başlayın!</p>
              <button
                onClick={() => router.push('/store')}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Alışverişe Başla
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <div
                  key={order.id}
                  onClick={() => router.push(`/orders/${order.id}`)}
                  className="glass border border-border rounded-2xl p-6 hover:border-primary transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Sipariş #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>

                  {order.order_items && order.order_items.length > 0 && (
                    <>
                      <div className="flex gap-3 mb-4">
                        {order.order_items.slice(0, 3).map((item: any, idx: number) => (
                          item.product && (
                            <img
                              key={idx}
                              src={item.product.images?.[0] || '/placeholder.png'}
                              alt={item.product.title}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          )
                        ))}
                        {order.order_items.length > 3 && (
                          <div className="w-16 h-16 glass border border-border rounded-lg flex items-center justify-center">
                            <span className="text-sm font-semibold">+{order.order_items.length - 3}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                          {order.order_items.length} ürün
                        </p>
                        <p className="text-lg font-bold text-primary">₺{order.total_amount.toFixed(2)}</p>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
