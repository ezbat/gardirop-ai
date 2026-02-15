"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion"
import {
  Sparkles, TrendingUp, Users, Shield, ArrowRight, Star, Heart, Zap,
  Award, ShoppingBag, Eye, Clock, Lock, Truck, RotateCcw, Headphones,
  CreditCard, Shirt, Footprints, Watch, Briefcase, Dumbbell, ChevronRight,
  Quote, Package, CheckCircle, Flame
} from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useLanguage } from "@/lib/language-context"

// ---------- types ----------
interface FeaturedOutfit {
  id: string
  name: string
  coverImageUrl: string | null
  items: { imageUrl: string }[]
}

interface Product {
  id: string
  title: string
  price: number
  images: string[]
  brand: string | null
  category: string | null
}

// ---------- helper: countdown ----------
function useCountdown(target: Date) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, target.getTime() - Date.now())
      setTimeLeft({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])
  return timeLeft
}

// ---------- static flash deal target (always 18 h in the future on first render) ----------
const FLASH_DEAL_END = new Date(Date.now() + 18 * 60 * 60 * 1000)

// ---------- inline gold particle layer ----------
function GoldParticles({ count = 20 }: { count?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [particles] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: 3 + Math.random() * 5,
      delay: Math.random() * 3,
      opacity: 0.15 + Math.random() * 0.25,
    }))
  )

  return (
    <div ref={ref} className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -5 }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: `oklch(0.78 0.14 85 / ${p.opacity})`,
          }}
          animate={{ y: [0, -40, 0], opacity: [0.2, 0.9, 0.2] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  )
}

// ========================  COMPONENT  ========================
export default function HomePage() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const { scrollY } = useScroll()
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0])
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.85])

  const [featuredOutfits, setFeaturedOutfits] = useState<FeaturedOutfit[]>([])
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  // fetch featured outfits
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/outfits/featured?limit=6")
        const data = await res.json()
        if (res.ok) setFeaturedOutfits(data.outfits || [])
      } catch (e) {
        console.error("Load outfits error:", e)
      }
    })()
  }, [])

  // fetch trending products from supabase
  useEffect(() => {
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, title, price, images, brand, category")
          .eq("moderation_status", "approved")
          .order("created_at", { ascending: false })
          .limit(8)
        if (!error && data) setTrendingProducts(data as Product[])
      } catch (e) {
        console.error("Load products error:", e)
      } finally {
        setLoadingProducts(false)
      }
    })()
  }, [])

  const countdown = useCountdown(FLASH_DEAL_END)

  // ==================  categories  ==================
  const categories = [
    { label: "Oberbekleidung", icon: Shirt, slug: "upper_clothing", gradient: "linear-gradient(135deg, oklch(0.65 0.18 50), oklch(0.78 0.14 85))" },
    { label: "Kleid", icon: Sparkles, slug: "dress", gradient: "linear-gradient(135deg, oklch(0.55 0.22 350), oklch(0.70 0.15 330))" },
    { label: "Schuhe", icon: Footprints, slug: "shoes", gradient: "linear-gradient(135deg, oklch(0.50 0.18 260), oklch(0.65 0.14 280))" },
    { label: "Taschen", icon: Briefcase, slug: "bags", gradient: "linear-gradient(135deg, oklch(0.55 0.15 150), oklch(0.70 0.12 170))" },
    { label: "Accessoires", icon: Watch, slug: "accessories", gradient: "linear-gradient(135deg, oklch(0.60 0.16 30), oklch(0.75 0.12 50))" },
    { label: "Sportbekleidung", icon: Dumbbell, slug: "sportswear", gradient: "linear-gradient(135deg, oklch(0.50 0.20 280), oklch(0.65 0.16 300))" },
  ]

  // ==================  trust signals  ==================
  const trustSignals = [
    { icon: Lock, label: "SSL sicher" },
    { icon: Truck, label: "Kostenloser Versand" },
    { icon: RotateCcw, label: "14 Tage Rückgabe" },
    { icon: Headphones, label: "24/7 Support" },
  ]

  // ==================  features  ==================
  const features = [
    { icon: Sparkles, title: "Kuratierte Kollektionen", desc: "Von professionellen Stylisten handverlesene Outfits", gradient: "linear-gradient(135deg, oklch(0.65 0.18 50), oklch(0.78 0.14 85))" },
    { icon: TrendingUp, title: "Loyalitätsprogramm", desc: "Sammeln Sie Punkte und erhalten Sie exklusive Vorteile", gradient: "linear-gradient(135deg, oklch(0.50 0.20 280), oklch(0.65 0.16 300))" },
    { icon: Users, title: "Verifizierte Händler", desc: "Nur geprüfte Premium-Marken und Boutiquen", gradient: "linear-gradient(135deg, oklch(0.55 0.15 160), oklch(0.70 0.12 170))" },
    { icon: Shield, title: "Sichere Zahlungen", desc: "Verschlüsselte Transaktionen und Käuferschutz", gradient: "linear-gradient(135deg, oklch(0.55 0.22 350), oklch(0.70 0.15 330))" },
  ]

  // ==================  stats  ==================
  const stats = [
    { value: "150+", label: "Premium Features", icon: Zap },
    { value: "1.000+", label: "Luxusprodukte", icon: Star },
    { value: "50+", label: "Kuratierte Shops", icon: Users },
    { value: "98%", label: "Zufriedenheit", icon: Heart },
  ]

  // ==================  fake reviews  ==================
  const reviews = [
    { name: "Sophia M.", text: "Absolut begeistert! Die Outfits sind immer perfekt zusammengestellt.", rating: 5 },
    { name: "Lena K.", text: "Schnelle Lieferung und tolle Qualität. Mein Go-To für Mode!", rating: 5 },
    { name: "Marie T.", text: "Der Kundenservice ist erstklassig. Sehr empfehlenswert!", rating: 5 },
    { name: "Anna S.", text: "Endlich eine Plattform, die wirklich versteht, was Stil bedeutet.", rating: 5 },
  ]

  // ==================  advantages  ==================
  const advantages = [
    { icon: Truck, title: "Kostenloser Versand", desc: "Ab 50\u20AC Bestellwert" },
    { icon: RotateCcw, title: "Einfache Rückgabe", desc: "14 Tage kostenlose Retoure" },
    { icon: Headphones, title: "24/7 Support", desc: "Immer für Sie da" },
    { icon: CreditCard, title: "Sichere Zahlung", desc: "SSL-verschlüsselt" },
  ]

  // ==================  SHARED TRUST BAR  ==================
  const TrustBar = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className="w-full overflow-hidden"
    >
      <div
        className="flex items-center justify-center gap-6 md:gap-10 py-4 px-4 flex-wrap"
        style={{
          background: "oklch(1 0 0 / 0.04)",
          borderTop: "1px solid oklch(1 0 0 / 0.06)",
          borderBottom: "1px solid oklch(1 0 0 / 0.06)",
        }}
      >
        {trustSignals.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={i} className="flex items-center gap-2">
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "oklch(0.78 0.14 85)" }} />
              <span className="text-xs md:text-sm font-medium whitespace-nowrap" style={{ color: "oklch(0.75 0.03 85)" }}>{s.label}</span>
            </div>
          )
        })}
      </div>
    </motion.div>
  )

  // ======================================================================
  //  LOGGED-OUT  VIEW
  // ======================================================================
  if (!session) {
    return (
      <div className="min-h-screen relative overflow-hidden" style={{ paddingBottom: "80px" }}>
        {/* ---- deep gradient bg ---- */}
        <div
          className="fixed inset-0"
          style={{
            zIndex: -10,
            background: `
              radial-gradient(ellipse 80% 50% at 50% -20%, oklch(0.35 0.15 300 / 0.6), transparent),
              radial-gradient(ellipse 60% 40% at 80% 50%, oklch(0.25 0.12 350 / 0.4), transparent),
              radial-gradient(ellipse 50% 50% at 20% 80%, oklch(0.30 0.10 260 / 0.3), transparent),
              linear-gradient(to bottom, oklch(0.14 0.04 280), oklch(0.10 0.03 300), oklch(0.12 0.05 330))
            `,
          }}
        />

        <GoldParticles count={25} />

        {/* ====== HERO ====== */}
        <motion.section
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="relative min-h-[92vh] flex items-center justify-center px-4"
        >
          <div className="max-w-6xl mx-auto text-center" style={{ zIndex: 1 }}>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9 }}
            >
              {/* logo orb */}
              <div className="inline-block mb-6">
                <motion.div
                  className="w-28 h-28 md:w-36 md:h-36 rounded-full flex items-center justify-center mx-auto"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.78 0.14 85), oklch(0.65 0.18 50), oklch(0.78 0.14 85))",
                    boxShadow: "0 0 50px oklch(0.78 0.14 85 / 0.45), 0 0 100px oklch(0.78 0.14 85 / 0.2)",
                  }}
                  animate={{
                    boxShadow: [
                      "0 0 50px oklch(0.78 0.14 85 / 0.45), 0 0 100px oklch(0.78 0.14 85 / 0.2)",
                      "0 0 70px oklch(0.78 0.14 85 / 0.55), 0 0 120px oklch(0.78 0.14 85 / 0.3)",
                      "0 0 50px oklch(0.78 0.14 85 / 0.45), 0 0 100px oklch(0.78 0.14 85 / 0.2)",
                    ],
                  }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <span className="text-white font-bold text-5xl md:text-7xl" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.35)" }}>W</span>
                </motion.div>
              </div>

              {/* title */}
              <h1
                className="font-serif text-6xl md:text-8xl lg:text-9xl font-bold mb-4 leading-tight"
                style={{
                  background: "linear-gradient(135deg, oklch(0.85 0.12 85), oklch(0.95 0.05 60), oklch(0.78 0.14 85))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Wearo
              </h1>

              <motion.p
                className="text-xl md:text-3xl mb-3 font-light"
                style={{ color: "oklch(0.82 0.05 300)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.8 }}
              >
                Wo Luxus auf Eleganz trifft
              </motion.p>

              <motion.p
                className="text-sm md:text-lg mb-12 max-w-2xl mx-auto"
                style={{ color: "oklch(0.60 0.03 280)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55, duration: 0.8 }}
              >
                Entdecken Sie kuratierte Outfit-Kollektionen von Premium-Händlern. Sammeln Sie Punkte, genießen Sie exklusive Vorteile.
              </motion.p>

              {/* CTA buttons */}
              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75, duration: 0.7 }}
              >
                <Link
                  href="/auth/signin"
                  className="group px-10 py-4 text-white rounded-full font-semibold transition-all duration-300 inline-flex items-center gap-2 hover:scale-105 text-base"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.78 0.14 85), oklch(0.65 0.18 50))",
                    boxShadow: "0 4px 25px oklch(0.78 0.14 85 / 0.45)",
                  }}
                >
                  Jetzt starten
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="/outfits"
                  className="px-10 py-4 rounded-full font-semibold transition-all duration-300 hover:scale-105 text-base"
                  style={{
                    background: "oklch(1 0 0 / 0.08)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid oklch(1 0 0 / 0.15)",
                    color: "oklch(0.90 0.03 85)",
                  }}
                >
                  Kollektionen ansehen
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </motion.section>

        {/* ====== TRUST SIGNALS BAR ====== */}
        <TrustBar />

        {/* ====== FEATURED CATEGORIES ====== */}
        <section className="relative py-16 md:py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-3" style={{ color: "oklch(0.95 0.01 85)" }}>
                Beliebte Kategorien
              </h2>
              <p className="text-base md:text-lg" style={{ color: "oklch(0.58 0.03 280)" }}>
                Finden Sie genau das, was Sie suchen
              </p>
            </motion.div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.map((cat, i) => {
                const Icon = cat.icon
                return (
                  <motion.div
                    key={cat.slug}
                    initial={{ opacity: 0, y: 25 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: i * 0.07 }}
                    viewport={{ once: true }}
                  >
                    <Link
                      href={`/store?category=${cat.slug}`}
                      className="group flex flex-col items-center gap-3 rounded-2xl p-5 md:p-6 transition-all duration-300 hover:scale-105"
                      style={{
                        background: "oklch(1 0 0 / 0.05)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid oklch(1 0 0 / 0.08)",
                      }}
                    >
                      <div
                        className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                        style={{ background: cat.gradient }}
                      >
                        <Icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                      </div>
                      <span className="text-xs md:text-sm font-semibold text-center" style={{ color: "oklch(0.88 0.02 85)" }}>
                        {cat.label}
                      </span>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ====== WHY WEARO ====== */}
        <section className="relative py-16 md:py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
              className="text-center mb-14"
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-3" style={{ color: "oklch(0.95 0.01 85)" }}>
                Warum Wearo?
              </h2>
              <p className="text-base md:text-lg" style={{ color: "oklch(0.58 0.03 280)" }}>
                Premium E-Commerce neu definiert
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
              {features.map((f, i) => {
                const Icon = f.icon
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="group rounded-2xl p-6 transition-all duration-300 hover:scale-[1.04]"
                    style={{
                      background: "oklch(1 0 0 / 0.05)",
                      backdropFilter: "blur(10px)",
                      border: "1px solid oklch(1 0 0 / 0.08)",
                    }}
                  >
                    <div
                      className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                      style={{ background: f.gradient }}
                    >
                      <Icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold mb-2" style={{ color: "oklch(0.92 0.02 85)" }}>{f.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "oklch(0.55 0.03 280)" }}>{f.desc}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ====== STATS ====== */}
        <section className="relative py-14 md:py-18 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {stats.map((s, i) => {
                const Icon = s.icon
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.7 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="rounded-2xl p-5 md:p-7 text-center transition-all duration-300 hover:scale-105"
                    style={{
                      background: "oklch(1 0 0 / 0.06)",
                      backdropFilter: "blur(10px)",
                      border: "1px solid oklch(1 0 0 / 0.1)",
                    }}
                  >
                    <Icon className="w-7 h-7 md:w-8 md:h-8 mx-auto mb-3" style={{ color: "oklch(0.78 0.14 85)" }} />
                    <p className="text-2xl md:text-4xl font-bold mb-1" style={{ color: "oklch(0.95 0.01 85)" }}>{s.value}</p>
                    <p className="text-xs md:text-sm" style={{ color: "oklch(0.58 0.03 280)" }}>{s.label}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ====== CTA BOTTOM ====== */}
        <section className="relative py-16 md:py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="rounded-3xl p-8 md:p-14"
              style={{
                background: "linear-gradient(135deg, oklch(0.20 0.08 300 / 0.6), oklch(0.18 0.06 330 / 0.4))",
                backdropFilter: "blur(20px)",
                border: "1px solid oklch(0.78 0.14 85 / 0.18)",
                boxShadow: "0 0 60px oklch(0.78 0.14 85 / 0.12)",
              }}
            >
              <Award className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-6" style={{ color: "oklch(0.78 0.14 85)" }} />
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "oklch(0.95 0.01 85)" }}>
                Bereit für Ihr Premium-Shopping-Erlebnis?
              </h2>
              <p className="text-base md:text-lg mb-8 max-w-xl mx-auto" style={{ color: "oklch(0.62 0.03 280)" }}>
                Treten Sie unserer exklusiven Community bei und genießen Sie Vorteile, die es sonst nirgendwo gibt.
              </p>
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 px-10 py-4 text-white rounded-full font-semibold transition-all duration-300 hover:scale-105 text-base"
                style={{
                  background: "linear-gradient(135deg, oklch(0.78 0.14 85), oklch(0.65 0.18 50))",
                  boxShadow: "0 4px 25px oklch(0.78 0.14 85 / 0.45)",
                }}
              >
                Kostenlos registrieren
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </div>
        </section>
      </div>
    )
  }

  // ======================================================================
  //  LOGGED-IN  VIEW
  // ======================================================================
  const userName = session.user?.name?.split(" ")[0] || "Fashionista"

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ paddingBottom: "80px" }}>
      {/* ---- deep gradient bg ---- */}
      <div
        className="fixed inset-0"
        style={{
          zIndex: -10,
          background: `
            radial-gradient(ellipse 70% 50% at 50% 0%, oklch(0.28 0.10 280 / 0.5), transparent),
            radial-gradient(ellipse 50% 40% at 80% 60%, oklch(0.22 0.08 330 / 0.3), transparent),
            radial-gradient(ellipse 50% 50% at 10% 80%, oklch(0.25 0.06 260 / 0.3), transparent),
            linear-gradient(to bottom, oklch(0.13 0.04 280), oklch(0.11 0.03 300))
          `,
        }}
      />

      <section className="relative py-8 md:py-12 px-4">
        <div className="container mx-auto max-w-6xl">

          {/* ====== WELCOME HEADER ====== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 md:mb-8"
          >
            <h1
              className="font-serif text-3xl md:text-5xl font-bold mb-2"
              style={{
                background: "linear-gradient(135deg, oklch(0.85 0.12 85), oklch(0.95 0.05 60), oklch(0.78 0.14 85))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Willkommen zurück, {userName}!
            </h1>
            <p className="text-base md:text-lg" style={{ color: "oklch(0.60 0.03 280)" }}>
              Entdecken Sie heute neue Kollektionen und Angebote
            </p>
          </motion.div>

          {/* ====== TRUST BAR ====== */}
          <div className="mb-8">
            <TrustBar />
          </div>

          {/* ====== QUICK ACTION GRID (2x2) ====== */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 mb-10 md:mb-12">
            {[
              { href: "/outfits", icon: Sparkles, label: "Outfits", sub: "Kollektionen entdecken", gradient: "linear-gradient(135deg, oklch(0.65 0.18 50), oklch(0.78 0.14 85))" },
              { href: "/store", icon: ShoppingBag, label: "Store", sub: "Alle Produkte", gradient: "linear-gradient(135deg, oklch(0.50 0.20 280), oklch(0.65 0.16 300))" },
              { href: "/wishlist", icon: Heart, label: "Wunschliste", sub: "Ihre Favoriten", gradient: "linear-gradient(135deg, oklch(0.55 0.22 350), oklch(0.70 0.15 330))" },
              { href: "/orders", icon: Package, label: "Bestellungen", sub: "Status verfolgen", gradient: "linear-gradient(135deg, oklch(0.55 0.15 160), oklch(0.70 0.12 170))" },
            ].map((item, idx) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.08 }}
                >
                  <Link
                    href={item.href}
                    className="group flex flex-col items-center gap-3 rounded-2xl p-5 md:p-6 transition-all duration-300 hover:scale-105 text-center"
                    style={{
                      background: "oklch(1 0 0 / 0.06)",
                      backdropFilter: "blur(10px)",
                      border: "1px solid oklch(1 0 0 / 0.08)",
                    }}
                  >
                    <div
                      className="w-13 h-13 md:w-14 md:h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                      style={{ background: item.gradient, width: 52, height: 52 }}
                    >
                      <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm md:text-base" style={{ color: "oklch(0.92 0.02 85)" }}>{item.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.03 280)" }}>{item.sub}</p>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>

          {/* ====== FÜR SIE EMPFOHLEN (featured outfits) ====== */}
          {featuredOutfits.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-10 md:mb-12"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl md:text-2xl font-bold" style={{ color: "oklch(0.92 0.02 85)" }}>
                  Für Sie empfohlen
                </h2>
                <Link href="/outfits" className="flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-80" style={{ color: "oklch(0.78 0.14 85)" }}>
                  Alle ansehen <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
                {featuredOutfits.slice(0, 6).map((outfit, i) => (
                  <motion.div
                    key={outfit.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: i * 0.06 }}
                    viewport={{ once: true }}
                  >
                    <Link
                      href={`/outfits/${outfit.id}`}
                      className="group block rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.03]"
                      style={{
                        background: "oklch(1 0 0 / 0.05)",
                        border: "1px solid oklch(1 0 0 / 0.08)",
                      }}
                    >
                      <div
                        className="relative aspect-[3/4]"
                        style={{ background: "linear-gradient(135deg, oklch(0.18 0.06 300), oklch(0.14 0.04 260))" }}
                      >
                        {outfit.coverImageUrl ? (
                          <img
                            src={outfit.coverImageUrl}
                            alt={outfit.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : outfit.items.length > 0 ? (
                          <div className="grid grid-cols-2 gap-1.5 p-3 h-full">
                            {outfit.items.slice(0, 4).map((item, idx) => (
                              <div key={idx} className="aspect-square rounded-lg overflow-hidden" style={{ background: "oklch(0.12 0.03 280)" }}>
                                <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Sparkles className="w-10 h-10" style={{ color: "oklch(0.78 0.14 85 / 0.4)" }} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-white" />
                            <span className="text-white text-xs font-medium">Ansehen</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-3">
                        <h3 className="font-semibold text-sm truncate" style={{ color: "oklch(0.90 0.02 85)" }}>{outfit.name}</h3>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ====== TRENDING PRODUKTE ====== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-10 md:mb-12"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5" style={{ color: "oklch(0.78 0.14 85)" }} />
                <h2 className="text-xl md:text-2xl font-bold" style={{ color: "oklch(0.92 0.02 85)" }}>
                  Trending Produkte
                </h2>
              </div>
              <Link href="/store" className="flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-80" style={{ color: "oklch(0.78 0.14 85)" }}>
                Alle ansehen <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {loadingProducts ? (
              <div className="flex gap-3 overflow-hidden">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-40 md:w-48 rounded-2xl animate-pulse"
                    style={{ background: "oklch(1 0 0 / 0.06)", height: 260 }}
                  />
                ))}
              </div>
            ) : trendingProducts.length > 0 ? (
              <div
                className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide"
                style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
              >
                {trendingProducts.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    viewport={{ once: true }}
                    className="flex-shrink-0"
                    style={{ scrollSnapAlign: "start" }}
                  >
                    <Link
                      href={`/store/${product.id}`}
                      className="group block w-40 md:w-48 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.03]"
                      style={{
                        background: "oklch(1 0 0 / 0.05)",
                        border: "1px solid oklch(1 0 0 / 0.08)",
                      }}
                    >
                      <div
                        className="relative aspect-square"
                        style={{ background: "linear-gradient(135deg, oklch(0.18 0.05 300), oklch(0.14 0.04 260))" }}
                      >
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <ShoppingBag className="w-8 h-8" style={{ color: "oklch(0.78 0.14 85 / 0.3)" }} />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-semibold truncate mb-1" style={{ color: "oklch(0.88 0.02 85)" }}>
                          {product.title}
                        </p>
                        <span className="text-sm font-bold" style={{ color: "oklch(0.78 0.14 85)" }}>
                          {product.price?.toFixed(2)} &euro;
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div
                className="rounded-2xl p-8 text-center"
                style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.06)" }}
              >
                <ShoppingBag className="w-10 h-10 mx-auto mb-3" style={{ color: "oklch(0.78 0.14 85 / 0.4)" }} />
                <p className="text-sm" style={{ color: "oklch(0.55 0.03 280)" }}>Neue Produkte kommen bald!</p>
              </div>
            )}
          </motion.div>

          {/* ====== FLASH DEAL COUNTDOWN ====== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-10 md:mb-12"
          >
            <div
              className="rounded-3xl p-6 md:p-8 relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, oklch(0.22 0.12 50 / 0.5), oklch(0.18 0.10 30 / 0.4))",
                border: "1px solid oklch(0.78 0.14 85 / 0.2)",
                boxShadow: "0 0 40px oklch(0.78 0.14 85 / 0.08)",
              }}
            >
              {/* subtle shimmer bg */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse 50% 80% at 80% 20%, oklch(0.78 0.14 85 / 0.08), transparent)",
                }}
              />

              <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-10">
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                    <Zap className="w-5 h-5" style={{ color: "oklch(0.78 0.14 85)" }} />
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "oklch(0.78 0.14 85)" }}>
                      Flash Deal
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: "oklch(0.95 0.01 85)" }}>
                    Bis zu 40% Rabatt
                  </h3>
                  <p className="text-sm" style={{ color: "oklch(0.62 0.03 280)" }}>
                    Exklusive Angebote nur für begrenzte Zeit. Schnell zugreifen!
                  </p>
                </div>

                {/* countdown timer */}
                <div className="flex items-center gap-3">
                  {[
                    { value: countdown.hours, label: "Std" },
                    { value: countdown.minutes, label: "Min" },
                    { value: countdown.seconds, label: "Sek" },
                  ].map((t, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div
                        className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center"
                        style={{
                          background: "oklch(0 0 0 / 0.35)",
                          border: "1px solid oklch(0.78 0.14 85 / 0.25)",
                        }}
                      >
                        <span className="text-2xl md:text-3xl font-bold tabular-nums" style={{ color: "oklch(0.78 0.14 85)" }}>
                          {String(t.value).padStart(2, "0")}
                        </span>
                      </div>
                      <span className="text-[10px] mt-1 font-medium" style={{ color: "oklch(0.55 0.03 280)" }}>{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative mt-5 text-center md:text-left">
                <Link
                  href="/store"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all duration-300 hover:scale-105"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.78 0.14 85), oklch(0.65 0.18 50))",
                    color: "white",
                    boxShadow: "0 4px 20px oklch(0.78 0.14 85 / 0.35)",
                  }}
                >
                  Jetzt zugreifen
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </motion.div>

          {/* ====== SOCIAL PROOF / REVIEWS ====== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-10 md:mb-12"
          >
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5" style={{ color: "oklch(0.78 0.14 85)" }} />
                <span className="text-sm font-bold uppercase tracking-wider" style={{ color: "oklch(0.78 0.14 85)" }}>
                  Social Proof
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-1" style={{ color: "oklch(0.95 0.01 85)" }}>
                10.000+ zufriedene Kunden
              </h2>
              <p className="text-sm" style={{ color: "oklch(0.55 0.03 280)" }}>
                Entdecken Sie, was unsere Community sagt
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {reviews.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  viewport={{ once: true }}
                  className="rounded-2xl p-5"
                  style={{
                    background: "oklch(1 0 0 / 0.05)",
                    border: "1px solid oklch(1 0 0 / 0.08)",
                  }}
                >
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(r.rating)].map((_, si) => (
                      <Star key={si} className="w-3.5 h-3.5 fill-current" style={{ color: "oklch(0.78 0.14 85)" }} />
                    ))}
                  </div>
                  <div className="flex items-start gap-2 mb-3">
                    <Quote className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "oklch(0.78 0.14 85 / 0.5)" }} />
                    <p className="text-sm leading-relaxed" style={{ color: "oklch(0.75 0.02 280)" }}>
                      {r.text}
                    </p>
                  </div>
                  <p className="text-xs font-semibold" style={{ color: "oklch(0.65 0.03 85)" }}>
                    &mdash; {r.name}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ====== ADVANTAGES / TRUST SECTION ====== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {advantages.map((a, i) => {
                const Icon = a.icon
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    viewport={{ once: true }}
                    className="rounded-2xl p-4 md:p-5 text-center"
                    style={{
                      background: "oklch(1 0 0 / 0.05)",
                      border: "1px solid oklch(1 0 0 / 0.08)",
                    }}
                  >
                    <div
                      className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                      style={{ background: "oklch(0.78 0.14 85 / 0.12)" }}
                    >
                      <Icon className="w-5 h-5 md:w-6 md:h-6" style={{ color: "oklch(0.78 0.14 85)" }} />
                    </div>
                    <p className="text-xs md:text-sm font-semibold mb-0.5" style={{ color: "oklch(0.90 0.02 85)" }}>{a.title}</p>
                    <p className="text-[10px] md:text-xs" style={{ color: "oklch(0.55 0.03 280)" }}>{a.desc}</p>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

        </div>
      </section>
    </div>
  )
}
