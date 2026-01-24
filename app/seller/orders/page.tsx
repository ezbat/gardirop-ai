'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Package, Loader2, Filter, Search, Eye, ChevronDown, Truck, CheckCircle, Clock, XCircle, ArrowLeft, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import FloatingParticles from '@/components/floating-particles'

interface OrderItem {
  id: string
  product_id: string
  quantity: number
  selected_size: string
  price: number
  product: {
    id: string
    title: string
    images: string[]
  }
}

interface Order {
  id: string
  user_id: string
  created_at: string
  status: string
  total_amount: number
  shipping_info: {
    fullName: string
    phone: string
    address: string
    city: string
    district: string
  }
  order_items: OrderItem[]
}

const statusConfig: any = {
  pending: { label: 'Beklemede', color: 'bg-yellow-500', icon: Clock },
  processing: { label: 'Hazırlanıyor', color: 'bg-blue-500', icon: Package },
  shipped: { label: 'Kargoda', color: 'bg-purple-500', icon: Truck },
  delivered: { label: 'Teslim Edildi', color: 'bg-green-500', icon: CheckCircle },
  cancelled: { label: 'İptal Edildi', color: 'bg-red-500', icon: XCircle }
}

export default function SellerOrdersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id

  const [seller, setSeller] = useState<any>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  useEffect(() => {
    if (userId) {
      checkSellerAndLoadOrders()
    }
  }, [userId])

  useEffect(() => {
    filterOrders()
  }, [orders, statusFilter, searchQuery])

  const checkSellerAndLoadOrders = async () => {
    try {
      const { data: sellerData, error: sellerError } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (sellerError || !sellerData) {
        alert('Satıcı profili bulunamadı!')
        router.push('/seller/dashboard')
        return
      }

      setSeller(sellerData)
      await loadOrders(sellerData.id)
    } catch (error) {
      console.error('Check seller error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadOrders = async (sellerId: string) => {
    try {
      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select(`
          *,
          order:orders (*),
          product:products!inner (
            id,
            title,
            images,
            seller_id
          )
        `)
        .eq('product.seller_id', sellerId)

      if (error) throw error

      const ordersMap = new Map()
      orderItems?.forEach((item: any) => {
        if (!ordersMap.has(item.order.id)) {
          ordersMap.set(item.order.id, {
            ...item.order,
            order_items: []
          })
        }
        ordersMap.get(item.order.id).order_items.push(item)
      })

      const ordersArray = Array.from(ordersMap.values())
      ordersArray.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setOrders(ordersArray)
    } catch (error) {
      console.error('Load orders error:', error)
    }
  }

  const filterOrders = () => {
    let filtered = orders

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    if (searchQuery) {
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.shipping_info.fullName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredOrders(filtered)
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error

      setOrders(orders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      ))

      alert('✅ Sipariş durumu güncellendi!')
    } catch (error) {
      console.error('Update status error:', error)
      alert('Durum güncellenemedi!')
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
        <div className="container mx-auto max-w-6xl">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 mb-6 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Geri
          </button>

          <h1 className="font-serif text-4xl font-bold mb-8">Siparişler</h1>

          {/* Filters */}
          <div className="glass border border-border rounded-2xl p-4 mb-6">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Sipariş No veya Müşteri Adı..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                >
                  <option value="all">Tüm Siparişler</option>
                  <option value="pending">Beklemede</option>
                  <option value="processing">Hazırlanıyor</option>
                  <option value="shipped">Kargoda</option>
                  <option value="delivered">Teslim Edildi</option>
                  <option value="cancelled">İptal Edildi</option>
                </select>
              </div>
            </div>
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="glass border border-border rounded-2xl p-12 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-bold mb-2">Sipariş bulunamadı</h2>
              <p className="text-muted-foreground">Henüz sipariş yok veya filtrelerinize uygun sipariş bulunamadı.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map(order => {
                const StatusIcon = statusConfig[order.status].icon
                return (
                  <div key={order.id} className="glass border border-border rounded-2xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="font-bold mb-1">Sipariş #{order.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-sm text-muted-foreground mb-1">
                          Müşteri: {order.shipping_info.fullName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusIcon className="w-5 h-5" />
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${statusConfig[order.status].color}`}>
                          {statusConfig[order.status].label}
                        </span>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-3 mb-4">
                      {order.order_items.map((item: any) => (
                        <div key={item.id} className="flex gap-3">
                          <img
                            src={item.product.images[0]}
                            alt={item.product.title}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{item.product.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Beden: {item.selected_size} | Adet: {item.quantity}
                            </p>
                            <p className="text-sm font-bold text-primary">€{(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Shipping Info Toggle */}
                    <button
                      onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                      className="w-full px-4 py-2 glass border border-border rounded-xl hover:border-primary transition-colors flex items-center justify-between mb-4"
                    >
                      <span className="text-sm font-semibold">Teslimat Bilgileri</span>
                      <ChevronDown className={`w-5 h-5 transition-transform ${expandedOrder === order.id ? 'rotate-180' : ''}`} />
                    </button>

                    {expandedOrder === order.id && (
                      <div className="glass border border-border rounded-xl p-4 mb-4 space-y-2 text-sm">
                        <p><strong>Ad Soyad:</strong> {order.shipping_info.fullName}</p>
                        <p><strong>Telefon:</strong> {order.shipping_info.phone}</p>
                        <p><strong>Adres:</strong> {order.shipping_info.address}</p>
                        <p><strong>Şehir:</strong> {order.shipping_info.city}, {order.shipping_info.district}</p>
                      </div>
                    )}

                    {/* Total */}
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-border">
                      <span className="font-semibold">Toplam Tutar</span>
                      <span className="text-2xl font-bold text-primary">€{order.total_amount.toFixed(2)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-border">
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className="flex-1 px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary text-sm"
                        disabled={order.status === 'delivered' || order.status === 'cancelled'}
                      >
                        <option value="pending">Beklemede</option>
                        <option value="processing">Hazırlanıyor</option>
                        <option value="shipped">Kargoda</option>
                        <option value="delivered">Teslim Edildi</option>
                        <option value="cancelled">İptal Et</option>
                      </select>
                      
                      <button
                        onClick={() => router.push(`/messages?to=${order.user_id}`)}
                        className="px-4 py-2 glass border border-primary rounded-xl font-semibold hover:bg-primary/10 transition-colors text-sm flex items-center gap-2"
                        title="Müşteriyle İletişim"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Müşteri
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
