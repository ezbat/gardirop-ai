"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import {
  Package, ShoppingCart, Users, TrendingUp, MessageCircle,
  Gift, Truck, Star, Award, Calendar, Zap, Shield,
  Heart, Video, BarChart3, Bell, Mail, Phone, Globe,
  Loader2
} from "lucide-react"
import FloatingParticles from "@/components/floating-particles"

interface FeatureStats {
  name: string
  icon: any
  count: number
  description: string
  link: string
  color: string
}

export default function AdminFeaturesPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const [loading, setLoading] = useState(true)
  const [features, setFeatures] = useState<FeatureStats[]>([])

  useEffect(() => {
    if (userId) {
      loadFeatures()
    }
  }, [userId])

  const loadFeatures = async () => {
    try {
      // Burada tüm özelliklerin istatistiklerini yükleyeceğiz
      const featureList: FeatureStats[] = [
        {
          name: "Kuponlar",
          icon: Gift,
          count: 0,
          description: "İndirim kuponları ve kampanyalar",
          link: "/admin/coupons",
          color: "text-green-500"
        },
        {
          name: "Kargo Takip",
          icon: Truck,
          count: 0,
          description: "Sipariş kargo takip sistemi",
          link: "/admin/shipping-tracking",
          color: "text-blue-500"
        },
        {
          name: "İade Talepleri",
          icon: ShoppingCart,
          count: 0,
          description: "Ürün iade ve değişim talepleri",
          link: "/admin/refunds",
          color: "text-red-500"
        },
        {
          name: "Flash Sale",
          icon: Zap,
          count: 0,
          description: "Hızlı satış kampanyaları",
          link: "/admin/flash-sales",
          color: "text-yellow-500"
        },
        {
          name: "Ürün İncelemeleri",
          icon: Star,
          count: 0,
          description: "Müşteri yorumları ve puanları",
          link: "/admin/reviews",
          color: "text-orange-500"
        },
        {
          name: "Canlı Yayınlar",
          icon: Video,
          count: 0,
          description: "Live shopping etkinlikleri",
          link: "/admin/live-streams",
          color: "text-purple-500"
        },
        {
          name: "Grup Alımları",
          icon: Users,
          count: 0,
          description: "Toplu satın alma kampanyaları",
          link: "/admin/group-buys",
          color: "text-indigo-500"
        },
        {
          name: "Sadakat Programı",
          icon: Award,
          count: 0,
          description: "Müşteri puan ve ödül sistemi",
          link: "/admin/loyalty",
          color: "text-pink-500"
        },
        {
          name: "Bildirimler",
          icon: Bell,
          count: 0,
          description: "Sistem bildirimleri",
          link: "/admin/notifications",
          color: "text-cyan-500"
        },
        {
          name: "E-posta Kampanyaları",
          icon: Mail,
          count: 0,
          description: "Pazarlama e-postaları",
          link: "/admin/email-campaigns",
          color: "text-teal-500"
        },
        {
          name: "SMS Kampanyaları",
          icon: Phone,
          count: 0,
          description: "Toplu SMS gönderimi",
          link: "/admin/sms-campaigns",
          color: "text-rose-500"
        },
        {
          name: "Dolandırıcılık",
          icon: Shield,
          count: 0,
          description: "Güvenlik ve dolandırıcılık tespiti",
          link: "/admin/fraud-detection",
          color: "text-red-600"
        },
        {
          name: "Analytics",
          icon: BarChart3,
          count: 0,
          description: "Platform analitiği ve raporlar",
          link: "/admin/analytics",
          color: "text-blue-600"
        },
        {
          name: "Etkinlikler",
          icon: Calendar,
          count: 0,
          description: "Mağaza etkinlikleri",
          link: "/admin/events",
          color: "text-violet-500"
        },
        {
          name: "Wishlist",
          icon: Heart,
          count: 0,
          description: "Müşteri istek listeleri",
          link: "/admin/wishlists",
          color: "text-red-400"
        },
        {
          name: "Çoklu Dil",
          icon: Globe,
          count: 0,
          description: "Dil ve çeviri yönetimi",
          link: "/admin/translations",
          color: "text-emerald-500"
        }
      ]

      setFeatures(featureList)
    } catch (error) {
      console.error("Load features error:", error)
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
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-8">
            <Package className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="font-serif text-4xl font-bold mb-2">Platform Özellikleri</h1>
            <p className="text-muted-foreground">Tüm özellikleri buradan yönetin</p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <Link
                  key={feature.name}
                  href={feature.link}
                  className="glass border border-border rounded-2xl p-6 hover:border-primary transition-colors group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center ${feature.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-bold text-muted-foreground">
                      {feature.count}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                    {feature.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </Link>
              )
            })}
          </div>

          {/* Quick Stats */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-8 h-8 text-green-500" />
                <p className="text-sm text-muted-foreground">Toplam Özellik</p>
              </div>
              <p className="text-3xl font-bold">{features.length}</p>
              <p className="text-xs text-muted-foreground mt-2">Aktif sistemler</p>
            </div>

            <div className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-8 h-8 text-blue-500" />
                <p className="text-sm text-muted-foreground">Veritabanı Tabloları</p>
              </div>
              <p className="text-3xl font-bold">150+</p>
              <p className="text-xs text-muted-foreground mt-2">Tüm sistemler için</p>
            </div>

            <div className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-8 h-8 text-purple-500" />
                <p className="text-sm text-muted-foreground">Güvenlik Katmanları</p>
              </div>
              <p className="text-3xl font-bold">5+</p>
              <p className="text-xs text-muted-foreground mt-2">Koruma sistemleri</p>
            </div>
          </div>

          {/* Feature Categories */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Özellik Kategorileri</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass border border-border rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4">E-Ticaret</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    Ürün yönetimi ve varyantlar
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    Sipariş takibi ve yönetimi
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    Ödeme ve kargo entegrasyonu
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    İade ve değişim sistemi
                  </li>
                </ul>
              </div>

              <div className="glass border border-border rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4">Pazarlama</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Kupon ve promosyon kampanyaları
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    E-posta ve SMS pazarlama
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Sadakat programı
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Affiliate sistemi
                  </li>
                </ul>
              </div>

              <div className="glass border border-border rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4">Sosyal & İçerik</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    Canlı yayın (Live Shopping)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    Mağaza stories
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    Ürün incelemeleri
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    Topluluk soru-cevap
                  </li>
                </ul>
              </div>

              <div className="glass border border-border rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4">Analitik & Raporlama</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Satış analitiği
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Müşteri segmentasyonu
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Performans metrikleri
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Zamanlanmış raporlar
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
