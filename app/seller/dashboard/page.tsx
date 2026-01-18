"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Store, Package, DollarSign, TrendingUp, Plus, Loader2 } from "lucide-react"
import Link from "next/link"
import FloatingParticles from "@/components/floating-particles"

export default function SellerDashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [seller, setSeller] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalSales: 0,
    totalRevenue: 0
  })

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
      loadProducts(data.seller.id)
    } catch (error) {
      console.error('Check status error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProducts = async (sellerId: string) => {
    // TODO: Load products API
    setProducts([])
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
              <p className="text-muted-foreground">Mağaza Yönetimi</p>
            </div>
            <Link href="/seller/products/create" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Ürün Ekle
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-8 h-8 text-primary" />
                <p className="text-sm text-muted-foreground">Toplam Ürün</p>
              </div>
              <p className="text-3xl font-bold">{stats.totalProducts}</p>
            </div>

            <div className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Store className="w-8 h-8 text-green-500" />
                <p className="text-sm text-muted-foreground">Aktif Ürün</p>
              </div>
              <p className="text-3xl font-bold">{stats.activeProducts}</p>
            </div>

            <div className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-8 h-8 text-blue-500" />
                <p className="text-sm text-muted-foreground">Toplam Satış</p>
              </div>
              <p className="text-3xl font-bold">{stats.totalSales}</p>
            </div>

            <div className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-8 h-8 text-yellow-500" />
                <p className="text-sm text-muted-foreground">Gelir</p>
              </div>
              <p className="text-3xl font-bold">{stats.totalRevenue}₺</p>
            </div>
          </div>

          {/* Products List */}
          <div className="glass border border-border rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-4">Ürünlerim</h2>
            
            {products.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Henüz ürün yok</h3>
                <p className="text-muted-foreground mb-6">İlk ürününü ekle ve satışa başla!</p>
                <Link href="/seller/products/create" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Ürün Ekle
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {products.map((product) => (
                  <div key={product.id} className="glass border border-border rounded-xl overflow-hidden hover:border-primary transition-colors">
                    <div className="aspect-square bg-primary/5">
                      <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold mb-2">{product.title}</h3>
                      <p className="text-2xl font-bold text-primary mb-2">{product.price}₺</p>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Stok: {product.stock_quantity}</span>
                        <span>Satış: {product.sales_count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}