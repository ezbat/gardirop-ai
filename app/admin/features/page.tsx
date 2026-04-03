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
      // Hier laden wir die Statistiken aller Funktionen
      const featureList: FeatureStats[] = [
        {
          name: "Gutscheine",
          icon: Gift,
          count: 0,
          description: "Rabattgutscheine und Aktionen",
          link: "/admin/coupons",
          color: "text-green-500"
        },
        {
          name: "Versandverfolgung",
          icon: Truck,
          count: 0,
          description: "Bestellungs-Versandverfolgungssystem",
          link: "/admin/shipping-tracking",
          color: "text-blue-500"
        },
        {
          name: "Rückgabeanträge",
          icon: ShoppingCart,
          count: 0,
          description: "Produkt-Rückgabe und Umtauschanfragen",
          link: "/admin/refunds",
          color: "text-red-500"
        },
        {
          name: "Flash Sale",
          icon: Zap,
          count: 0,
          description: "Schnellverkaufsaktionen",
          link: "/admin/flash-sales",
          color: "text-yellow-500"
        },
        {
          name: "Produktbewertungen",
          icon: Star,
          count: 0,
          description: "Kundenbewertungen und Rezensionen",
          link: "/admin/reviews",
          color: "text-orange-500"
        },
        {
          name: "Livestreams",
          icon: Video,
          count: 0,
          description: "Live-Shopping-Veranstaltungen",
          link: "/admin/live-streams",
          color: "text-purple-500"
        },
        {
          name: "Gruppenkäufe",
          icon: Users,
          count: 0,
          description: "Sammelbestellungsaktionen",
          link: "/admin/group-buys",
          color: "text-indigo-500"
        },
        {
          name: "Treueprogramm",
          icon: Award,
          count: 0,
          description: "Kunden-Punkte- und Belohnungssystem",
          link: "/admin/loyalty",
          color: "text-pink-500"
        },
        {
          name: "Benachrichtigungen",
          icon: Bell,
          count: 0,
          description: "Systembenachrichtigungen",
          link: "/admin/notifications",
          color: "text-cyan-500"
        },
        {
          name: "E-Mail-Kampagnen",
          icon: Mail,
          count: 0,
          description: "Marketing-E-Mails",
          link: "/admin/email-campaigns",
          color: "text-teal-500"
        },
        {
          name: "SMS-Kampagnen",
          icon: Phone,
          count: 0,
          description: "Massen-SMS-Versand",
          link: "/admin/sms-campaigns",
          color: "text-rose-500"
        },
        {
          name: "Betrugserkennung",
          icon: Shield,
          count: 0,
          description: "Sicherheit und Betrugserkennung",
          link: "/admin/fraud-detection",
          color: "text-red-600"
        },
        {
          name: "Analytics",
          icon: BarChart3,
          count: 0,
          description: "Plattform-Analysen und Berichte",
          link: "/admin/analytics",
          color: "text-blue-600"
        },
        {
          name: "Veranstaltungen",
          icon: Calendar,
          count: 0,
          description: "Shop-Veranstaltungen",
          link: "/admin/events",
          color: "text-violet-500"
        },
        {
          name: "Wunschliste",
          icon: Heart,
          count: 0,
          description: "Kunden-Wunschlisten",
          link: "/admin/wishlists",
          color: "text-red-400"
        },
        {
          name: "Mehrsprachigkeit",
          icon: Globe,
          count: 0,
          description: "Sprach- und Übersetzungsverwaltung",
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
            <h1 className="font-serif text-4xl font-bold mb-2">Plattform-Funktionen</h1>
            <p className="text-muted-foreground">Verwalten Sie alle Funktionen von hier</p>
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
                <p className="text-sm text-muted-foreground">Gesamtfunktionen</p>
              </div>
              <p className="text-3xl font-bold">{features.length}</p>
              <p className="text-xs text-muted-foreground mt-2">Aktive Systeme</p>
            </div>

            <div className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-8 h-8 text-blue-500" />
                <p className="text-sm text-muted-foreground">Datenbanktabellen</p>
              </div>
              <p className="text-3xl font-bold">150+</p>
              <p className="text-xs text-muted-foreground mt-2">Für alle Systeme</p>
            </div>

            <div className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-8 h-8 text-purple-500" />
                <p className="text-sm text-muted-foreground">Sicherheitsebenen</p>
              </div>
              <p className="text-3xl font-bold">5+</p>
              <p className="text-xs text-muted-foreground mt-2">Schutzsysteme</p>
            </div>
          </div>

          {/* Feature Categories */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Funktionskategorien</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass border border-border rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4">E-Commerce</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    Produktverwaltung und Varianten
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    Bestellverfolgung und -verwaltung
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    Zahlungs- und Versandintegration
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    Rückgabe- und Umtauschsystem
                  </li>
                </ul>
              </div>

              <div className="glass border border-border rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4">Marketing</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Gutschein- und Werbeaktionen
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    E-Mail- und SMS-Marketing
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Treueprogramm
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Affiliate-System
                  </li>
                </ul>
              </div>

              <div className="glass border border-border rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4">Social & Inhalte</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    Livestream (Live Shopping)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    Shop-Stories
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    Produktbewertungen
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    Community-Fragen & Antworten
                  </li>
                </ul>
              </div>

              <div className="glass border border-border rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4">Analysen & Berichte</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Verkaufsanalysen
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Kundensegmentierung
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Leistungskennzahlen
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Geplante Berichte
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
