"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Package, Clock, CheckCircle, XCircle, Truck } from "lucide-react"
import Link from "next/link"
import FloatingParticles from "@/components/floating-particles"
import { supabase } from "@/lib/supabase"

interface Order {
  id: string
  user_id: string
  user_email: string
  user_name: string
  user_address: string
  user_phone: string
  items: any[]
  total_amount: number
  status: string
  payment_method: string
  created_at: string
}

export default function OrdersPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      loadOrders()
    }
  }, [userId])

  const loadOrders = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
      console.log('✅ Orders loaded:', data?.length || 0)
    } catch (error) {
      console.error('Load orders error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />
      case 'processing': return <Truck className="w-5 h-5 text-blue-500" />
      case 'shipped': return <Package className="w-5 h-5 text-purple-500" />
      case 'delivered': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'cancelled': return <XCircle className="w-5 h-5 text-red-500" />
      default: return <Clock className="w-5 h-5" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Beklemede'
      case 'processing': return 'Hazırlanıyor'
      case 'shipped': return 'Kargoda'
      case 'delivered': return 'Teslim Edildi'
      case 'cancelled': return 'İptal Edildi'
      default: return status
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-9xl mb-6">🔒</div>
          <h2 className="text-2xl font-bold mb-4">Giriş Yapmalısınız</h2>
          <Link href="/api/auth/signin" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 inline-block">Giriş Yap</Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }} className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-5xl">
          <h1 className="font-serif text-4xl font-bold mb-8">Siparişlerim</h1>

          {orders.length === 0 ? (
            <div className="text-center py-20 glass border border-border rounded-2xl">
              <div className="text-9xl mb-6">📦</div>
              <h3 className="text-2xl font-bold mb-3">Henüz sipariş yok</h3>
              <p className="text-muted-foreground mb-6">İlk siparişinizi verin!</p>
              <Link href="/store" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 inline-block">Mağazaya Git</Link>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order, idx) => (
                <motion.div key={order.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="glass border border-border rounded-2xl overflow-hidden">
                  
                  {/* ORDER HEADER */}
                  <div className="p-6 border-b border-border bg-primary/5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Sipariş No</p>
                        <p className="font-mono font-bold">{order.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Tarih</p>
                        <p className="font-semibold">{new Date(order.created_at).toLocaleDateString('tr-TR')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(order.status)}
                      <span className="font-semibold">{getStatusText(order.status)}</span>
                    </div>
                  </div>

                  {/* ORDER ITEMS */}
                  <div className="p-6">
                    <div className="space-y-3 mb-4">
                      {order.items.map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-primary/5 flex-shrink-0">
                            <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">{item.product_name}</p>
                            <p className="text-sm text-muted-foreground">Adet: {item.quantity}</p>
                          </div>
                          <p className="font-bold">€{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>

                    {/* ORDER TOTAL */}
                    <div className="border-t border-border pt-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Teslimat Adresi</p>
                        <p className="text-sm">{order.user_address}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Toplam</p>
                        <p className="text-2xl font-bold text-primary">€{order.total_amount.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}