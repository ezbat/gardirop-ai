"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Store, Package, DollarSign, TrendingUp, Plus, Loader2, ShoppingBag, MessageCircle, Shirt, AlertTriangle } from "lucide-react"
import Link from "next/link"
import FloatingParticles from "@/components/floating-particles"
import { useLanguage } from "@/lib/language-context"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function SellerDashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { t } = useLanguage()
  const userId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [seller, setSeller] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)

  useEffect(() => {
    if (userId) checkSellerStatus()
  }, [userId])

  const checkSellerStatus = async () => {
    try {
      const response = await fetch('/api/seller/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      const data = await response.json()
      
      if (!data.isSeller) {
        router.push('/seller/apply')
        return
      }

      setSeller(data.seller)
      loadAnalytics()
    } catch (error) {
      console.error('Check status error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/seller/analytics', {
        headers: {
          'x-user-id': userId!
        }
      })
      const data = await response.json()

      if (response.ok && data.analytics) {
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Load analytics error:', error)
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
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-serif text-4xl font-bold mb-2">{seller?.shop_name}</h1>
              <p className="text-muted-foreground">{t('shopManagement')}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/messages" className="px-6 py-3 border border-border rounded-xl font-semibold hover:bg-primary/5 transition-colors flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                {t('messages')}
              </Link>
              <Link href="/seller/orders" className="px-6 py-3 border border-border rounded-xl font-semibold hover:bg-primary/5 transition-colors flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                {t('orders')}
              </Link>
              <Link href="/seller/outfits" className="px-6 py-3 border border-border rounded-xl font-semibold hover:bg-primary/5 transition-colors flex items-center gap-2">
                <Shirt className="w-5 h-5" />
                {t('outfitsLabel')}
              </Link>
              <Link href="/seller/products/create" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
                <Plus className="w-5 h-5" />
                {t('addProduct')}
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-8 h-8 text-primary" />
                <p className="text-sm text-muted-foreground">{t('totalProducts')}</p>
              </div>
              <p className="text-3xl font-bold">{analytics?.summary?.totalProducts || 0}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {analytics?.summary?.activeProducts || 0} {t('active')} • {analytics?.summary?.pendingProducts || 0} {t('pending')}
              </p>
            </div>

            <div className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Shirt className="w-8 h-8 text-green-500" />
                <p className="text-sm text-muted-foreground">{t('outfitsLabel')}</p>
              </div>
              <p className="text-3xl font-bold">{analytics?.summary?.totalOutfits || 0}</p>
              <p className="text-xs text-muted-foreground mt-2">{t('outfitCollections')}</p>
            </div>

            <div className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-8 h-8 text-blue-500" />
                <p className="text-sm text-muted-foreground">{t('totalSales')}</p>
              </div>
              <p className="text-3xl font-bold">{analytics?.summary?.totalSales || 0}</p>
              <p className="text-xs text-muted-foreground mt-2">{t('soldItems')}</p>
            </div>

            <div className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-8 h-8 text-yellow-500" />
                <p className="text-sm text-muted-foreground">{t('revenue')}</p>
              </div>
              <p className="text-3xl font-bold">€{analytics?.summary?.totalRevenue || 0}</p>
              <p className="text-xs text-muted-foreground mt-2">{t('totalRevenue')}</p>
            </div>
          </div>

          {/* Charts */}
          {analytics?.dailyStats && (
            <div className="glass border border-border rounded-2xl p-6 mb-8">
              <h2 className="text-2xl font-bold mb-6">{t('last7DaysStats')}</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#eab308" strokeWidth={2} name={t('revenueLabel')} />
                  <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} name={t('salesCount')} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Products & Low Stock */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Top Products */}
            <div className="glass border border-border rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary" />
                {t('topSellingProducts')}
              </h2>
              {analytics?.topProducts && analytics.topProducts.length > 0 ? (
                <div className="space-y-3">
                  {analytics.topProducts.map((product: any, index: number) => (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-primary">#{index + 1}</span>
                        <div>
                          <p className="font-semibold">{product.title}</p>
                          <p className="text-sm text-muted-foreground">{product.quantity} {t('itemsSold')}</p>
                        </div>
                      </div>
                      <p className="font-bold text-green-500">€{product.revenue.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">{t('noSalesYet')}</p>
              )}
            </div>

            {/* Low Stock */}
            <div className="glass border border-border rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
                {t('lowStockProducts')}
              </h2>
              {analytics?.lowStockProducts && analytics.lowStockProducts.length > 0 ? (
                <div className="space-y-3">
                  {analytics.lowStockProducts.map((product: any) => (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                      <div>
                        <p className="font-semibold">{product.title}</p>
                        <p className="text-sm text-muted-foreground">€{product.price}</p>
                      </div>
                      <span className="px-3 py-1 bg-orange-500/20 text-orange-500 rounded-full text-sm font-bold">
                        {product.stock_quantity} {t('stockRemaining')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">{t('sufficientStock')}</p>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/seller/products" className="glass border border-border rounded-2xl p-6 hover:border-primary transition-colors">
              <Package className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">{t('myProducts')}</h3>
              <p className="text-muted-foreground">{t('manageProducts')}</p>
            </Link>

            <Link href="/seller/orders" className="glass border border-border rounded-2xl p-6 hover:border-primary transition-colors">
              <ShoppingBag className="w-12 h-12 text-blue-500 mb-4" />
              <h3 className="text-xl font-bold mb-2">{t('orders')}</h3>
              <p className="text-muted-foreground">{t('trackOrders')}</p>
            </Link>

            <Link href="/seller/outfits" className="glass border border-border rounded-2xl p-6 hover:border-primary transition-colors">
              <Shirt className="w-12 h-12 text-green-500 mb-4" />
              <h3 className="text-xl font-bold mb-2">{t('outfitsLabel')}</h3>
              <p className="text-muted-foreground">{t('createOutfitCollections')}</p>
            </Link>
          </div>

          {/* Recent Orders */}
          {analytics?.recentOrders && analytics.recentOrders.length > 0 && (
            <div className="glass border border-border rounded-2xl p-6 mt-8">
              <h2 className="text-2xl font-bold mb-4">{t('recentOrders')}</h2>
              <div className="space-y-3">
                {analytics.recentOrders.slice(0, 5).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
                    <div className="flex items-center gap-4">
                      {item.product?.images?.[0] && (
                        <img
                          src={item.product.images[0]}
                          alt={item.product.title}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                      <div>
                        <p className="font-semibold">{item.product?.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.order?.user?.full_name || item.order?.user?.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">€{(item.price * item.quantity).toFixed(2)}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        item.order?.payment_status === 'paid'
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-yellow-500/20 text-yellow-500'
                      }`}>
                        {item.order?.payment_status === 'paid' ? t('paid') : t('waiting')}
                      </span>
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
