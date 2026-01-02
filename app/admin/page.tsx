"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Package, Users, DollarSign, TrendingUp, Eye, CheckCircle, XCircle, Clock } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import { supabase } from "@/lib/supabase"

interface Order {
  id: string
  user_email: string
  user_name: string
  total_amount: number
  status: string
  created_at: string
  items: any[]
}

interface User {
  id: string
  name: string
  email: string
  created_at: string
}

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'orders' | 'users'>('orders')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [ordersRes, usersRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('users').select('*').order('created_at', { ascending: false })
      ])

      if (ordersRes.data) setOrders(ordersRes.data)
      if (usersRes.data) setUsers(usersRes.data)
    } catch (error) {
      console.error('Load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error
      
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ))
      
      alert('Sipariş durumu güncellendi!')
    } catch (error) {
      console.error('Update error:', error)
      alert('Güncelleme başarısız!')
    }
  }

  const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0)
  const pendingOrders = orders.filter(o => o.status === 'pending').length
  const completedOrders = orders.filter(o => o.status === 'delivered').length

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
        <div className="container mx-auto max-w-7xl">
          <h1 className="font-serif text-4xl font-bold mb-8">Admin Panel</h1>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Toplam Sipariş</p>
                <Package className="w-5 h-5 text-primary" />
              </div>
              <p className="text-3xl font-bold">{orders.length}</p>
            </div>

            <div className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Bekleyen</p>
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-3xl font-bold">{pendingOrders}</p>
            </div>

            <div className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Tamamlanan</p>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold">{completedOrders}</p>
            </div>

            <div className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Toplam Gelir</p>
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold">€{totalRevenue.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <button onClick={() => setActiveTab('orders')} className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === 'orders' ? "bg-primary text-primary-foreground" : "glass border border-border"}`}>
              Siparişler ({orders.length})
            </button>
            <button onClick={() => setActiveTab('users')} className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === 'users' ? "bg-primary text-primary-foreground" : "glass border border-border"}`}>
              Kullanıcılar ({users.length})
            </button>
          </div>

          {activeTab === 'orders' && (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="glass border border-border rounded-2xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Sipariş No</p>
                      <p className="font-mono font-bold">{order.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-sm mt-2"><span className="text-muted-foreground">Müşteri:</span> {order.user_name}</p>
                      <p className="text-sm"><span className="text-muted-foreground">Email:</span> {order.user_email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">€{order.total_amount.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(order.created_at).toLocaleDateString('tr-TR')}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-semibold mb-2">Ürünler:</p>
                    <div className="space-y-2">
                      {order.items.map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <div className="w-12 h-12 rounded bg-primary/10">
                            <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover rounded" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">{item.product_name}</p>
                            <p className="text-muted-foreground">Adet: {item.quantity} × €{item.price}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select value={order.status} onChange={(e) => updateOrderStatus(order.id, e.target.value)} className="px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary">
                      <option value="pending">Beklemede</option>
                      <option value="processing">Hazırlanıyor</option>
                      <option value="shipped">Kargoda</option>
                      <option value="delivered">Teslim Edildi</option>
                      <option value="cancelled">İptal Edildi</option>
                    </select>
                    <button className="p-2 glass border border-border rounded-xl hover:border-primary"><Eye className="w-5 h-5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="glass border border-border rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4">İsim</th>
                    <th className="text-left p-4">Email</th>
                    <th className="text-left p-4">Kayıt Tarihi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border hover:bg-secondary/50">
                      <td className="p-4 font-semibold">{user.name}</td>
                      <td className="p-4 text-muted-foreground">{user.email}</td>
                      <td className="p-4 text-muted-foreground">{new Date(user.created_at).toLocaleDateString('tr-TR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}