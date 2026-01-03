"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Sparkles, TrendingUp, Heart, ShoppingBag } from "lucide-react"
import Link from "next/link"
import FloatingParticles from "@/components/floating-particles"
import { getWeatherByCity, getWeatherIcon } from "@/lib/weather"

export default function Home() {
  const { data: session } = useSession()
  const [weather, setWeather] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWeather()
  }, [])

  const loadWeather = async () => {
    setLoading(true)
    const weatherData = await getWeatherByCity("Stuttgart")
    setWeather(weatherData)
    setLoading(false)
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-serif text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Gardırop AI
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              AI destekli gardırop yönetimi ve stil önerileri
            </p>

            {/* Weather Widget */}
            {weather && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="inline-block mb-8 glass border border-border rounded-2xl p-6"
              >
                <div className="flex items-center gap-4">
                  <span className="text-5xl">{getWeatherIcon(weather.condition)}</span>
                  <div className="text-left">
                    <p className="text-3xl font-bold">{weather.temperature}°C</p>
                    <p className="text-sm text-muted-foreground">{weather.city}</p>
                    <p className="text-sm text-muted-foreground capitalize">{weather.description}</p>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-4">
              {session ? (
                <>
                  <Link href="/wardrobe" className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity">
                    Gardırobum
                  </Link>
                  <Link href="/explore" className="px-8 py-4 glass border border-border rounded-xl font-semibold text-lg hover:border-primary transition-colors">
                    Keşfet
                  </Link>
                </>
              ) : (
                <Link href="/api/auth/signin" className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity">
                  Başla
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-12">Özellikler</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass border border-border rounded-2xl p-8 hover:border-primary transition-colors"
            >
              <Sparkles className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-2xl font-bold mb-4">AI Kombin Önerisi</h3>
              <p className="text-muted-foreground">
                Hava durumuna ve tarzınıza göre akıllı kombin önerileri alın
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="glass border border-border rounded-2xl p-8 hover:border-primary transition-colors"
            >
              <Heart className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-2xl font-bold mb-4">Sosyal Özellikler</h3>
              <p className="text-muted-foreground">
                Kombinlerinizi paylaşın, beğenin ve yorum yapın
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="glass border border-border rounded-2xl p-8 hover:border-primary transition-colors"
            >
              <ShoppingBag className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-2xl font-bold mb-4">Alışveriş</h3>
              <p className="text-muted-foreground">
                Stil tavsiyeleriyle uyumlu ürünleri keşfedin ve satın alın
              </p>
            </motion.div>

          </div>
        </div>
      </section>
    </div>
  )
}