"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Sparkles, Heart, ShoppingBag, Cloud, Loader2, MapPin } from "lucide-react"
import Link from "next/link"
import FloatingParticles from "@/components/floating-particles"
import { getCurrentWeather, getWeatherByCity, getWeatherIcon } from "@/lib/weather"

interface WeatherData {
  temperature: number
  condition: string
  description: string
  humidity: number
  windSpeed: number
  city: string
  icon: string
}

export default function Home() {
  const { data: session } = useSession()
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [locationError, setLocationError] = useState(false)

  useEffect(() => {
    loadWeather()
    
    // Her 30 dakikada bir otomatik güncelle
    const interval = setInterval(() => {
      loadWeather()
    }, 30 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  const loadWeather = async () => {
    setLoading(true)
    setLocationError(false)

    // Konum izni iste
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          // Başarılı - gerçek konum alındı
          const { latitude, longitude } = position.coords
          console.log(`Konum alındı: ${latitude}, ${longitude}`)
          
          try {
            const weatherData = await getCurrentWeather(latitude, longitude)
            setWeather(weatherData)
          } catch (error) {
            console.error("Weather fetch error:", error)
            setLocationError(true)
          } finally {
            setLoading(false)
          }
        },
        async (error) => {
          // Konum izni verilmedi - fallback Stuttgart
          console.warn("Konum izni verilmedi, Stuttgart kullanılıyor:", error.message)
          setLocationError(true)
          
          try {
            const weatherData = await getWeatherByCity("Stuttgart")
            setWeather(weatherData)
          } catch (error) {
            console.error("Weather fetch error:", error)
          } finally {
            setLoading(false)
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 dakika cache
        }
      )
    } else {
      // Geolocation desteklenmiyor - fallback Stuttgart
      console.warn("Geolocation desteklenmiyor")
      setLocationError(true)
      
      try {
        const weatherData = await getWeatherByCity("Stuttgart")
        setWeather(weatherData)
      } catch (error) {
        console.error("Weather fetch error:", error)
      } finally {
        setLoading(false)
      }
    }
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
            {/* Logo/Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="text-9xl mb-6"
            >
              👔
            </motion.div>

            {/* Title */}
            <h1 className="font-serif text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Gardırop AI
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              AI destekli gardırop yönetimi ve stil önerileri
            </p>

            {/* Weather Widget */}
            {loading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="inline-block mb-8 glass border border-border rounded-2xl p-6"
              >
                <div className="flex items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Konumunuz alınıyor...</span>
                </div>
              </motion.div>
            ) : weather ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="inline-block mb-8 glass border border-border rounded-2xl p-6 hover:border-primary transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-6xl">{getWeatherIcon(weather.condition)}</span>
                  <div className="text-left">
                    <p className="text-4xl font-bold">{weather.temperature}°C</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>{weather.city}</span>
                      {locationError && <span className="text-xs">(varsayılan)</span>}
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">{weather.description}</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="inline-block mb-8 glass border border-border rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Cloud className="w-5 h-5" />
                  <span className="text-sm">Hava durumu yüklenemedi</span>
                </div>
              </motion.div>
            )}

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-4"
            >
              {session ? (
                <>
                  <Link href="/wardrobe" className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity inline-flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Gardırobum
                  </Link>
                  <Link href="/explore" className="px-8 py-4 glass border border-border rounded-xl font-semibold text-lg hover:border-primary transition-colors">
                    Keşfet
                  </Link>
                  <Link href="/store" className="px-8 py-4 glass border border-border rounded-xl font-semibold text-lg hover:border-primary transition-colors inline-flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5" />
                    Mağaza
                  </Link>
                </>
              ) : (
                <Link href="/api/auth/signin" className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity">
                  Başla
                </Link>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-center mb-16"
          >
            Neler Sunuyoruz?
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass border border-border rounded-2xl p-8 hover:border-primary transition-colors group"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">AI Kombin Önerisi</h3>
              <p className="text-muted-foreground leading-relaxed">
                Hava durumuna ve tarzınıza göre akıllı kombin önerileri alın. Yapay zeka gardırobunuzu analiz eder.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="glass border border-border rounded-2xl p-8 hover:border-primary transition-colors group"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Sosyal Özellikler</h3>
              <p className="text-muted-foreground leading-relaxed">
                Kombinlerinizi paylaşın, beğenin ve yorum yapın. Stil topluluğuyla etkileşime geçin.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="glass border border-border rounded-2xl p-8 hover:border-primary transition-colors group"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Akıllı Alışveriş</h3>
              <p className="text-muted-foreground leading-relaxed">
                Stil tavsiyeleriyle uyumlu ürünleri keşfedin. Trigema ortaklığıyla kaliteli ürünler.
              </p>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass border border-border rounded-3xl p-12 text-center"
          >
            <h3 className="text-3xl font-bold mb-8">Premium Gardırop Deneyimi</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <p className="text-5xl font-bold text-primary mb-2">AI</p>
                <p className="text-muted-foreground">Yapay Zeka Destekli</p>
              </div>
              <div>
                <p className="text-5xl font-bold text-primary mb-2">24/7</p>
                <p className="text-muted-foreground">Hava Durumu Takibi</p>
              </div>
              <div>
                <p className="text-5xl font-bold text-primary mb-2">∞</p>
                <p className="text-muted-foreground">Sınırsız Kombin</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  )
}